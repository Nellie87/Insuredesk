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
import KpiCard from '../components/ui/KpiCard'
import LottieLoader from '../components/ui/LottieLoader'
import StatusBadge from '../components/ui/StatusBadge'
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
      overdueClients: overdueClients
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 6),
      expiringVehicles: expiringVehicles
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 6),
      dueSoon: dueSoon
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 6),
    }
  }, [clients, agent, confirmedCommission])

  if (loading) return <LottieLoader label="Loading workspace..." />

  const firstName = agent?.name?.split(' ')[0]
  const monthLabel = format(new Date(), 'MMMM yyyy')

  return (
    <PageShell>
      <div>
        <p className="text-sm text-slate-500">
          {firstName ? `Hi ${firstName} ,in ` : ''}
          {monthLabel} at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard
          label="Clients"
          value={stats.totalClients}
          accent="navy"
        />
        <KpiCard
          label="Premium this month"
          value={formatKSh(stats.premiumThisMonth)}
          accent="green"
        />
        <KpiCard
          label={
            stats.commissionIsConfirmed
              ? 'Commission confirmed'
              : 'Est. commission'
          }
          value={formatKSh(stats.commissionDisplay)}
          accent="brown"
        />
        <KpiCard
          label="Overdue"
          value={stats.overdueCount}
          accent="red"
          badge={
            stats.overdueAmount > 0 ? (
              <span className="rounded-lg bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700">
                {formatKSh(stats.overdueAmount)}
              </span>
            ) : null
          }
        />
        <KpiCard
          label="Expiring (30d)"
          value={stats.expiringCount}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Overdue payments
            </h2>
            {stats.overdueCount > 0 && (
              <Link
                to="/payments"
                className="text-xs font-semibold text-primary-600 hover:text-primary-800"
              >
                Log payment
              </Link>
            )}
          </div>
          {stats.overdueClients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              No overdue installments.
            </div>
          ) : (
            <div className="surface-table divide-y divide-slate-100">
              {stats.overdueClients.map(
                ({ client, vehicle, installment, amount, daysOverdue }) => (
                  <Link
                    key={`${vehicle.id}-${installment?.number ?? 'od'}`}
                    to={`/clients/${client.id}`}
                    className="block px-4 py-3.5 transition hover:bg-primary-50/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold text-slate-900">
                          {client.name}
                        </div>
                        <div className="mt-0.5 break-words text-xs text-slate-500">
                          {vehicle.make} {vehicle.model} · {vehicle.registration}
                          {daysOverdue > 0 ? ` · ${daysOverdue}d overdue` : ''}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-danger-700">
                          {formatKSh(amount || installment?.amount || 0)}
                        </div>
                        <div className="mt-1 flex justify-end">
                          <StatusBadge status="overdue" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Policies expiring soon
            </h2>
            {stats.expiringCount > 0 && (
              <Link
                to="/reminders"
                className="text-xs font-semibold text-primary-600 hover:text-primary-800"
              >
                View calendar
              </Link>
            )}
          </div>
          {stats.expiringVehicles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              No policies expiring in the next 30 days.
            </div>
          ) : (
            <div className="surface-table divide-y divide-slate-100">
              {stats.expiringVehicles.map(({ client, vehicle, daysLeft }) => {
                const expiry = parseDate(vehicle.expiry_date)
                return (
                <Link
                  key={vehicle.id}
                  to={`/clients/${client.id}`}
                  className="block px-4 py-3.5 transition hover:bg-primary-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-sm font-semibold text-slate-900">
                        {client.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {vehicle.registration}
                        {expiry ? ` · ${format(expiry, 'dd MMM yyyy')}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-semibold text-slate-600">
                        {daysLeft === 0
                          ? 'Today'
                          : daysLeft === 1
                            ? '1 day'
                            : `${daysLeft} days`}
                      </div>
                      <div className="mt-1 flex justify-end">
                        <StatusBadge
                          status={daysLeft <= 7 ? 'overdue' : 'expiring_soon'}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          Due in the next 7 days
        </h2>
        {stats.dueSoon.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            Nothing due this week.
          </div>
        ) : (
          <div className="surface-table divide-y divide-slate-100">
            {stats.dueSoon.map(({ client, vehicle, installment, daysLeft }) => (
              <Link
                key={`${vehicle.id}-${installment.number}-${installment.due_date}`}
                to={`/clients/${client.id}`}
                className="block px-4 py-3.5 transition hover:bg-primary-50/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-slate-900">
                      {client.name}
                    </div>
                    <div className="mt-0.5 break-words text-xs text-slate-500">
                      {vehicle.registration} · installment #{installment.number}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatKSh(
                        Number(installment.amount || 0) -
                          getInstallmentPaidAmount(installment),
                      )}
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-slate-500">
                      {daysLeft === 0
                        ? 'Due today'
                        : daysLeft === 1
                          ? 'Due tomorrow'
                          : `In ${daysLeft} days`}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  )
}
