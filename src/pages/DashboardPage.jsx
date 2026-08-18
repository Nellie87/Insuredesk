import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { useAppStore } from '../store/appStore'
import { localGetAll } from '../lib/db'
import {
  formatKSh,
  getInstallmentPaidAmount,
  getNextDueInstallment,
  getVehicleSchedules,
  hasOverduePayment,
} from '../utils/calculator'
import {
  addDays,
  differenceInDays,
  format,
  isSameMonth,
  parseISO,
  startOfDay,
} from 'date-fns'
import LottieLoader from '../components/ui/LottieLoader'
import PageShell from '../components/layout/PageShell'

const DEFAULT_COMMISSION_RATE = 12.5

function parseDate(value) {
  if (!value || typeof value !== 'string') return null
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getCommissionRate(agent, vehicle) {
  const rates = Array.isArray(agent?.commission_rates)
    ? agent.commission_rates
    : []
  if (!rates.length) return DEFAULT_COMMISSION_RATE

  const insurer = (vehicle.insurer || '').toLowerCase()
  const exact = rates.find(
    rate =>
      (rate.insurer || '').toLowerCase() === insurer &&
      rate.policy_type === vehicle.policy_type,
  )
  if (exact) return Number(exact.rate) || DEFAULT_COMMISSION_RATE

  const byInsurer = rates.find(
    rate => (rate.insurer || '').toLowerCase() === insurer,
  )
  if (byInsurer) return Number(byInsurer.rate) || DEFAULT_COMMISSION_RATE

  return Number(rates[0].rate) || DEFAULT_COMMISSION_RATE
}

function overdueInstallmentAmount(installment) {
  if (!installment) return 0
  const owed = Number(installment.amount || 0) - getInstallmentPaidAmount(installment)
  return Math.max(0, owed)
}

function totalOverdueOnSchedule(schedule, today) {
  if (!schedule?.installments?.length) return 0
  return schedule.installments.reduce((sum, installment) => {
    if (installment.paid) return sum
    const due = parseDate(installment.due_date)
    if (!due || due >= today) return sum
    return sum + overdueInstallmentAmount(installment)
  }, 0)
}

export default function DashboardPage() {
  const { clients, loading } = useClients()
  const { agent, session } = useAppStore()
  const agentId = session?.user?.id
  const [confirmedCommission, setConfirmedCommission] = useState(0)
  const [queue, setQueue] = useState(null)

  const periodMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    let cancelled = false

    async function loadCommissions() {
      if (!agentId) {
        setConfirmedCommission(0)
        return
      }

      try {
        const rows = await localGetAll('commissions', 'agent_id', agentId)
        const total = (rows ?? [])
          .filter(
            row =>
              row.period_month === periodMonth &&
              (row.status === 'confirmed' || row.status === 'paid_out'),
          )
          .reduce((sum, row) => sum + Number(row.amount || 0), 0)
        if (!cancelled) setConfirmedCommission(total)
      } catch {
        if (!cancelled) setConfirmedCommission(0)
      }
    }

    loadCommissions()
    return () => {
      cancelled = true
    }
  }, [agentId, periodMonth, clients])

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    const in7Days = addDays(today, 7)
    const in30Days = addDays(today, 30)

    let premiumThisMonth = 0
    let estimatedCommission = 0
    let overdueCount = 0
    let overdueAmount = 0
    let expiringCount = 0
    const overdueClients = []
    const expiringVehicles = []
    const dueSoon = []

    for (const client of clients ?? []) {
      for (const vehicle of client.vehicles ?? []) {
        const start = parseDate(vehicle.start_date)
        if (start && isSameMonth(start, today)) {
          const premium = Number(vehicle.premium ?? 0)
          premiumThisMonth += premium
          estimatedCommission +=
            premium * (getCommissionRate(agent, vehicle) / 100)
        }

        for (const schedule of getVehicleSchedules(vehicle)) {
          if (hasOverduePayment(schedule)) {
            overdueCount++
            const amount = totalOverdueOnSchedule(schedule, today)
            overdueAmount += amount
            const next = getNextDueInstallment(schedule)
            const nextDue = parseDate(next?.due_date)
            overdueClients.push({
              client,
              vehicle,
              installment: next,
              amount,
              daysOverdue: nextDue
                ? Math.max(0, differenceInDays(today, nextDue))
                : 0,
            })
          }

          for (const installment of schedule.installments ?? []) {
            if (installment.paid) continue
            const due = parseDate(installment.due_date)
            if (!due || due < today || due > in7Days) continue
            dueSoon.push({
              client,
              vehicle,
              installment,
              daysLeft: differenceInDays(due, today),
            })
          }
        }

        const expiry = parseDate(vehicle.expiry_date)
        if (!expiry || expiry < today || expiry > in30Days) continue
        expiringCount++
        expiringVehicles.push({
          client,
          vehicle,
          daysLeft: differenceInDays(expiry, today),
        })
      }
    }

    const commissionConfirmed = confirmedCommission
    const commissionDisplay =
      commissionConfirmed > 0 ? commissionConfirmed : estimatedCommission

    return {
      totalClients: clients.length,
      premiumThisMonth,
      commissionDisplay,
      commissionIsConfirmed: commissionConfirmed > 0,
      overdueCount,
      overdueAmount,
      expiringCount,
      dueSoonCount: dueSoon.length,
      overdueClients: overdueClients
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 8),
      expiringVehicles: expiringVehicles
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 8),
      dueSoon: dueSoon
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 8),
    }
  }, [clients, agent, confirmedCommission])

  if (loading) return <LottieLoader label="Loading workspace..." />

  const firstName = agent?.name?.split(' ')[0]
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayLabel = format(new Date(), 'EEEE, d MMMM')

  const queueTabs = [
    {
      id: 'overdue',
      label: 'Overdue',
      count: stats.overdueCount,
      tone: 'danger',
    },
    {
      id: 'expiring',
      label: 'Expiring',
      count: stats.expiringCount,
      tone: 'warning',
    },
    {
      id: 'due',
      label: 'This week',
      count: stats.dueSoonCount,
      tone: 'primary',
    },
  ]

  const activeQueue =
    queue ??
    (stats.overdueCount > 0
      ? 'overdue'
      : stats.expiringCount > 0
        ? 'expiring'
        : 'due')

  const copy = {
    overdue: {
      title: stats.overdueCount
        ? `${stats.overdueCount} payment${stats.overdueCount === 1 ? '' : 's'} to collect`
        : 'Nothing overdue',
      detail:
        stats.overdueAmount > 0
          ? `${formatKSh(stats.overdueAmount)} outstanding`
          : 'All installments are up to date',
      actionTo: '/payments',
      actionLabel: 'Log payment',
      empty: 'No overdue installments.',
      rail: 'bg-danger-500',
    },
    expiring: {
      title: stats.expiringCount
        ? `${stats.expiringCount} ${stats.expiringCount === 1 ? 'policy' : 'policies'} expiring`
        : 'No upcoming renewals',
      detail: 'Cover ending in the next 30 days',
      actionTo: '/reminders',
      actionLabel: 'Calendar',
      empty: 'No policies expiring in the next 30 days.',
      rail: 'bg-warning-500',
    },
    due: {
      title: stats.dueSoonCount
        ? `${stats.dueSoonCount} due this week`
        : 'A quiet week',
      detail: 'Installments due in the next 7 days',
      actionTo: '/payments',
      actionLabel: 'Log payment',
      empty: 'Nothing due this week.',
      rail: 'bg-primary-600',
    },
  }

  const overdueList = (
    <OverdueItems items={stats.overdueClients} rail={copy.overdue.rail} />
  )
  const expiringList = (
    <ExpiringItems items={stats.expiringVehicles} rail={copy.expiring.rail} />
  )
  const dueList = <DueItems items={stats.dueSoon} rail={copy.due.rail} />

  return (
    <PageShell className="lg:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-[1.45rem] text-ink sm:text-2xl lg:text-[1.85rem]">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{todayLabel}</p>
        </div>
        <Link
          to="/clients/add"
          className="hidden rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-soft lg:inline-flex"
        >
          Add client
        </Link>
      </div>

      <div className="grid grid-cols-3 divide-x divide-stone-200/80 lg:gap-4 lg:divide-x-0">
        <StatCell
          to="/clients"
          value={stats.totalClients}
          label="Clients"
        />
        <StatCell
          value={formatKSh(stats.premiumThisMonth)}
          label="Premium this month"
        />
        <StatCell
          to="/commissions"
          value={formatKSh(stats.commissionDisplay)}
          label={
            stats.commissionIsConfirmed ? 'Commission' : 'Est. commission'
          }
        />
      </div>

      {/* Mobile: one queue at a time */}
      <section className="space-y-3 lg:hidden">
        <QueueChips
          tabs={queueTabs}
          active={activeQueue}
          onChange={setQueue}
        />
        <QueuePanel {...copy[activeQueue]} isEmpty={
          activeQueue === 'overdue'
            ? stats.overdueClients.length === 0
            : activeQueue === 'expiring'
              ? stats.expiringVehicles.length === 0
              : stats.dueSoon.length === 0
        }>
          {activeQueue === 'overdue' && overdueList}
          {activeQueue === 'expiring' && expiringList}
          {activeQueue === 'due' && dueList}
        </QueuePanel>
      </section>

      {/* Desktop: three panels fill the width */}
      <section className="hidden gap-6 lg:grid lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          <QueuePanel {...copy.overdue} isEmpty={stats.overdueClients.length === 0}>
            {overdueList}
          </QueuePanel>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <QueuePanel compact {...copy.expiring} isEmpty={stats.expiringVehicles.length === 0}>
            {expiringList}
          </QueuePanel>
          <QueuePanel compact {...copy.due} isEmpty={stats.dueSoon.length === 0}>
            {dueList}
          </QueuePanel>
        </div>
      </section>
    </PageShell>
  )
}

function StatCell({ to, value, label }) {
  const body = (
    <>
      <p className="break-words font-sans text-[15px] font-semibold leading-tight text-ink sm:text-lg lg:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 text-2xs font-medium text-ink-muted lg:mt-1.5 lg:text-sm">
        {label}
      </p>
    </>
  )

  const className =
    'px-3 lg:rounded-2xl lg:border lg:border-stone-200/80 lg:bg-white lg:px-5 lg:py-5 lg:shadow-card'

  if (to) {
    return (
      <Link to={to} className={`${className} block transition hover:border-primary-200 hover:bg-primary-50/40`}>
        {body}
      </Link>
    )
  }

  return <div className={className}>{body}</div>
}

function QueueChips({ tabs, active, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Follow-ups"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 hide-scrollbar"
    >
      {tabs.map(tab => {
        const isActive = active === tab.id
        const tones = {
          danger: 'bg-danger-50 text-danger-700',
          warning: 'bg-warning-50 text-warning-700',
          primary: 'bg-primary-700 text-white',
        }
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition ${
              isActive
                ? tones[tab.tone]
                : 'border border-stone-200 bg-white text-ink-muted'
            }`}
          >
            {tab.label}
            <span
              className={`min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums ${
                isActive
                  ? tab.tone === 'primary'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/70'
                  : 'bg-canvas text-ink'
              }`}
            >
              {tab.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function QueuePanel({
  title,
  detail,
  actionTo,
  actionLabel,
  empty,
  children,
  compact = false,
  isEmpty = false,
}) {

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card">
      <div
        className={`flex items-start justify-between gap-3 border-b border-stone-100 ${
          compact ? 'px-4 py-3' : 'px-4 py-3.5 lg:px-5 lg:py-4'
        }`}
      >
        <div className="min-w-0">
          <p
            className={`font-display text-ink ${
              compact ? 'text-base' : 'text-lg lg:text-xl'
            }`}
          >
            {title}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">{detail}</p>
        </div>
        <Link
          to={actionTo}
          className="shrink-0 rounded-full bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white"
        >
          {actionLabel}
        </Link>
      </div>
      {isEmpty ? <EmptyQueue message={empty} /> : children}
    </div>
  )
}

function OverdueItems({ items, rail }) {
  if (!items.length) return null
  return (
    <div className="divide-y divide-stone-100">
      {items.map(({ client, vehicle, installment, amount, daysOverdue }) => (
        <QueueRow
          key={`${vehicle.id}-${installment?.number ?? 'od'}`}
          to={`/clients/${client.id}`}
          rail={rail}
          title={client.name}
          subtitle={[
            vehicle.registration,
            daysOverdue > 0 ? `${daysOverdue}d late` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          value={formatKSh(amount || installment?.amount || 0)}
          valueClass="text-danger-700"
        />
      ))}
    </div>
  )
}

function ExpiringItems({ items, rail }) {
  if (!items.length) return null
  return (
    <div className="divide-y divide-stone-100">
      {items.map(({ client, vehicle, daysLeft }) => {
        const expiry = parseDate(vehicle.expiry_date)
        return (
          <QueueRow
            key={vehicle.id}
            to={`/clients/${client.id}`}
            rail={rail}
            title={client.name}
            subtitle={[
              vehicle.registration,
              expiry ? format(expiry, 'd MMM') : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            value={
              daysLeft === 0
                ? 'Today'
                : daysLeft === 1
                  ? 'Tomorrow'
                  : `${daysLeft} days`
            }
          />
        )
      })}
    </div>
  )
}

function DueItems({ items, rail }) {
  if (!items.length) return null
  return (
    <div className="divide-y divide-stone-100">
      {items.map(({ client, vehicle, installment, daysLeft }) => (
        <QueueRow
          key={`${vehicle.id}-${installment.number}-${installment.due_date}`}
          to={`/clients/${client.id}`}
          rail={rail}
          title={client.name}
          subtitle={`${vehicle.registration} · #${installment.number}`}
          value={formatKSh(
            Number(installment.amount || 0) -
              getInstallmentPaidAmount(installment),
          )}
          caption={
            daysLeft === 0
              ? 'Today'
              : daysLeft === 1
                ? 'Tomorrow'
                : `In ${daysLeft} days`
          }
        />
      ))}
    </div>
  )
}

function EmptyQueue({ message }) {
  return (
    <div className="px-4 py-10 text-center text-sm text-ink-faint">{message}</div>
  )
}

function QueueRow({
  to,
  title,
  subtitle,
  value,
  valueClass = 'text-ink',
  caption,
  rail,
}) {
  return (
    <Link
      to={to}
      className="flex items-stretch transition hover:bg-canvas/70 active:bg-canvas"
    >
      <span className={`w-1 shrink-0 ${rail}`} aria-hidden />
      <span className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3.5 lg:px-5">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">
            {title}
          </span>
          {subtitle ? (
            <span className="mt-0.5 block truncate text-xs text-ink-muted">
              {subtitle}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-right">
          <span className={`block text-sm font-semibold ${valueClass}`}>
            {value}
          </span>
          {caption ? (
            <span className="mt-0.5 block text-xs text-ink-muted">{caption}</span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}
