import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { formatKSh, hasOverduePayment, getNextDueInstallment, getVehicleSchedules } from '../utils/calculator'
import { differenceInDays, parseISO, isWithinInterval, addDays } from 'date-fns'
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

        const overdueSchedule = getVehicleSchedules(vehicle).find(hasOverduePayment)
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
      expiringVehicles: expiringVehicles.slice(0, 5).sort((a, b) => a.daysLeft - b.daysLeft),
    }
  }, [clients])

  if (loading) return <LottieLoader label="Loading workspace..." />

  return (
    <div className="p-4 space-y-5">
      <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
        <KpiCard
          label="Total premium"
          value={formatKSh(stats.totalPremium)}
          accent="navy"
          badge={
            <span className="text-[10px] font-semibold text-success-700 bg-success-50 px-2 py-0.5 rounded-full">
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
        <div className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase mb-2">
          Quick actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Link to="/clients/add" className="bg-primary-800 text-white rounded-2xl p-3 text-sm font-semibold text-center shadow-card">
            + Add client
          </Link>
          <Link to="/calculator" className="bg-white border border-gray-200 text-gray-700 rounded-2xl p-3 text-sm font-medium text-center shadow-card">
            Calculator
          </Link>
          <Link to="/prospects" className="bg-white border border-gray-200 text-gray-700 rounded-2xl p-3 text-sm font-medium text-center shadow-card">
            Prospects
          </Link>
        </div>
      </div>

      {stats.overdueClients.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase">Overdue payments</h2>
          </div>
          <div className="space-y-3">
            {stats.overdueClients.map(({ client, vehicle, installment }) => (
              <Link
                key={vehicle.id}
                to={`/clients/${client.id}`}
                className="block bg-white border border-gray-200 rounded-2xl p-4 shadow-card"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-sm font-bold text-gray-900">{client.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {vehicle.make} {vehicle.model} · {vehicle.registration}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-danger-700">
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
        </div>
      )}

      {stats.expiringVehicles.length > 0 && (
        <div>
          <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2">Policies expiring soon</h2>
          <div className="space-y-3">
            {stats.expiringVehicles.map(({ client, vehicle, daysLeft }) => (
              <Link
                key={vehicle.id}
                to={`/clients/${client.id}`}
                className="block bg-white border border-gray-200 rounded-2xl p-4 shadow-card"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold text-gray-900">{client.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{vehicle.registration}</div>
                  </div>
                  <StatusBadge status={daysLeft <= 7 ? 'overdue' : 'expiring_soon'} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
