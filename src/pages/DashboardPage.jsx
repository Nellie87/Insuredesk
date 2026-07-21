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
    <div className="space-y-4 p-4 pb-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700">
          Overview
        </p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
          Dashboard
        </h1>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 hide-scrollbar">
        <KpiCard
          label="Total premium"
          value={formatKSh(stats.totalPremium)}
          accent="navy"
          badge={
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
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
          label="Expiring (30d)"
          value={stats.expiringCount}
          accent="amber"
        />
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Quick actions
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            to="/clients/add"
            className="rounded-2xl bg-primary-800 p-3 text-center text-sm font-bold text-white shadow-card"
          >
            + Add client
          </Link>
          <Link
            to="/calculator"
            className="rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-semibold text-slate-700 shadow-card"
          >
            Calculator
          </Link>
          <Link
            to="/prospects"
            className="col-span-2 rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-semibold text-slate-700 shadow-card"
          >
            Prospects
          </Link>
        </div>
      </div>

      {stats.overdueClients.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Overdue payments
          </h2>
          <div className="space-y-2.5">
            {stats.overdueClients.map(({ client, vehicle, installment }) => (
              <Link
                key={vehicle.id}
                to={`/clients/${client.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
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
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Policies expiring soon
          </h2>
          <div className="space-y-2.5">
            {stats.expiringVehicles.map(({ client, vehicle, daysLeft }) => (
              <Link
                key={vehicle.id}
                to={`/clients/${client.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
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
  )
}
