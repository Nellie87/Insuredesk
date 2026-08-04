import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import {
  formatKSh,
  hasOverduePayment,
  getNextDueInstallment,
  getVehicleSchedules,
} from '../utils/calculator'
import {
  differenceInDays,
  parseISO,
  isWithinInterval,
  addDays,
} from 'date-fns'
import KpiCard from '../components/ui/KpiCard'
import LottieLoader from '../components/ui/LottieLoader'
import StatusBadge from '../components/ui/StatusBadge'
import PageShell from '../components/layout/PageShell'

export default function DashboardPage() {
  const { clients, loading } = useClients()

  const stats = useMemo(() => {
    const today = new Date()
    const in30Days = addDays(today, 30)

    let totalPremium = 0
    let overdueCount = 0
    let overdueAmount = 0
    let expiringCount = 0
    const overdueClients = []
    const expiringVehicles = []

    for (const client of clients) {
      for (const vehicle of client.vehicles ?? []) {
        totalPremium += Number(vehicle.premium ?? 0)

        const overdueSchedule = getVehicleSchedules(vehicle).find(
          hasOverduePayment,
        )
        if (overdueSchedule) {
          overdueCount++
          const next = getNextDueInstallment(overdueSchedule)
          if (next?.amount) overdueAmount += next.amount
          overdueClients.push({ client, vehicle, installment: next })
        }

        if (!vehicle.expiry_date) continue
        const expiry = parseISO(vehicle.expiry_date)
        if (Number.isNaN(expiry.getTime())) continue
        if (isWithinInterval(expiry, { start: today, end: in30Days })) {
          expiringCount++
          const daysLeft = differenceInDays(expiry, today)
          expiringVehicles.push({ client, vehicle, daysLeft })
        }
      }
    }

    return {
      totalClients: clients.length,
      totalPremium,
      overdueCount,
      overdueAmount,
      expiringCount,
      overdueClients: overdueClients.slice(0, 5),
      expiringVehicles: expiringVehicles
        .slice(0, 5)
        .sort((a, b) => a.daysLeft - b.daysLeft),
    }
  }, [clients])

  if (loading) return <LottieLoader label="Loading workspace..." />

  return (
    <PageShell>
      <div className="lg:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
          Overview
        </p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
          Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total premium"
          value={formatKSh(stats.totalPremium)}
          accent="navy"
          badge={
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              ↑ {stats.totalClients}
            </span>
          }
        />
        <KpiCard
          label="Pending installments"
          value={formatKSh(stats.overdueAmount)}
          accent="brown"
        />
        <KpiCard
          label="Overdue policies"
          value={stats.overdueCount}
          accent="red"
        />
        <KpiCard
          label="Expiring (30d)"
          value={stats.expiringCount}
          accent="amber"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
          Quick actions
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Link
            to="/clients/add"
            className="rounded-2xl bg-primary-800 p-3 text-center text-sm font-bold text-white shadow-card transition hover:bg-primary-700"
          >
            + Add client
          </Link>
          <Link
            to="/calculator"
            className="rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-semibold text-slate-700 shadow-card transition hover:border-primary-200 hover:bg-primary-50"
          >
            Calculator
          </Link>
          <Link
            to="/prospects"
            className="rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-semibold text-slate-700 shadow-card transition hover:border-primary-200 hover:bg-primary-50"
          >
            Prospects
          </Link>
          <Link
            to="/payments"
            className="rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-semibold text-slate-700 shadow-card transition hover:border-primary-200 hover:bg-primary-50"
          >
            Log payment
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {stats.overdueClients.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
              Overdue payments
            </h2>
            <div className="space-y-2.5">
              {stats.overdueClients.map(({ client, vehicle, installment }) => (
                <Link
                  key={vehicle.id}
                  to={`/clients/${client.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-primary-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-sm font-bold text-slate-900">
                        {client.name}
                      </div>
                      <div className="mt-0.5 break-words text-xs text-slate-500">
                        {vehicle.make} {vehicle.model} · {vehicle.registration}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-black text-danger-700">
                        {installment ? formatKSh(installment.amount) : '—'}
                      </div>
                      <div className="mt-1 flex justify-end">
                        <StatusBadge status="overdue" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {stats.expiringVehicles.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
              Policies expiring soon
            </h2>
            <div className="space-y-2.5">
              {stats.expiringVehicles.map(({ client, vehicle, daysLeft }) => (
                <Link
                  key={vehicle.id}
                  to={`/clients/${client.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-primary-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-sm font-bold text-slate-900">
                        {client.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {vehicle.registration}
                      </div>
                    </div>
                    <StatusBadge
                      status={daysLeft <= 7 ? 'overdue' : 'expiring_soon'}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  )
}
