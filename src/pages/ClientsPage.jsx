import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import {
  formatKSh,
  getVehicleSchedules,
  getOutstandingBalance,
  getAmountPaid,
} from '../utils/calculator'
import SearchField from '../components/ui/SearchField'
import StatusBadge from '../components/ui/StatusBadge'
import LottieLoader from '../components/ui/LottieLoader'
import PageShell from '../components/layout/PageShell'

const FILTERS = [
  'all',
  'active',
  'overdue',
  'expiring_soon',
  'fully_paid',
  'lapsed',
]

const FILTER_LABELS = {
  all: 'All',
  active: 'Active',
  overdue: 'Overdue',
  expiring_soon: 'Upcoming',
  fully_paid: 'Paid',
  lapsed: 'Lapsed',
}

export default function ClientsPage() {
  const { clients, loading } = useClients()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.vehicles?.some(v =>
          v.registration.toLowerCase().includes(search.toLowerCase()),
        )

      const matchesFilter = filter === 'all' || c.status === filter

      return matchesSearch && matchesFilter
    })
  }, [clients, search, filter])

  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-600 lg:hidden">
            Clients
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 lg:hidden">
            Portfolio
          </h1>
          <p className="mt-1 hidden text-sm text-slate-500 lg:block">
            Search and manage insured clients and policies.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/clients/import"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-soft transition hover:border-primary-200 hover:bg-primary-50"
          >
            Import
          </Link>
          <Link
            to="/clients/add"
            className="rounded-xl bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
          >
            + Add client
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <SearchField
            placeholder="Search by name, phone, or plate..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar sm:flex-wrap sm:overflow-visible">
        {FILTERS.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white shadow-soft'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <LottieLoader label="Loading clients..." />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 py-14 text-center text-sm text-slate-400">
          {search
            ? 'No clients found for that search.'
            : 'No clients yet. Tap + to add your first one.'}
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="space-y-2.5 lg:hidden">
            {filtered.map(client => {
              const vehicle = client.vehicles?.[0]
              const schedule = vehicle ? getVehicleSchedules(vehicle)[0] : null
              const outstanding = schedule
                ? getOutstandingBalance(schedule)
                : null
              const amountPaid = schedule ? getAmountPaid(schedule) : null
              return (
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className="block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition-transform active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-sm font-semibold text-slate-900">
                        {client.name}
                      </div>
                      <div className="mt-0.5 break-words text-xs text-slate-500">
                        {vehicle
                          ? `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`
                          : client.phone}
                      </div>
                      {vehicle && (
                        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                          Plate {vehicle.registration}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {vehicle && !schedule && (
                        <div className="break-words text-sm font-bold text-primary-800">
                          {formatKSh(vehicle.premium)}
                        </div>
                      )}
                      <div
                        className={
                          vehicle && !schedule
                            ? 'mt-1 flex justify-end'
                            : 'flex justify-end'
                        }
                      >
                        <StatusBadge status={client.status} />
                      </div>
                    </div>
                  </div>
                  {schedule && (
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          To pay
                        </div>
                        <div className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                          {formatKSh(schedule.total_premium ?? vehicle.premium)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Paid
                        </div>
                        <div className="mt-0.5 break-words text-sm font-semibold text-success-700">
                          {formatKSh(amountPaid)}
                        </div>
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Balance
                        </div>
                        <div className="mt-0.5 break-words text-sm font-semibold text-amber-700">
                          {formatKSh(outstanding)}
                        </div>
                      </div>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="surface-table hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Vehicle</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Premium</th>
                  <th className="px-5 py-3.5 text-right">Paid</th>
                  <th className="px-5 py-3.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(client => {
                  const vehicle = client.vehicles?.[0]
                  const schedule = vehicle
                    ? getVehicleSchedules(vehicle)[0]
                    : null
                  const outstanding = schedule
                    ? getOutstandingBalance(schedule)
                    : null
                  const amountPaid = schedule ? getAmountPaid(schedule) : null
                  return (
                    <tr
                      key={client.id}
                      className="transition hover:bg-primary-50/40"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/clients/${client.id}`}
                          className="font-semibold text-slate-900 hover:text-primary-600"
                        >
                          {client.name}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {client.phone}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {vehicle ? (
                          <>
                            <div>
                              {vehicle.year ? `${vehicle.year} ` : ''}
                              {vehicle.make} {vehicle.model}
                            </div>
                            <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                              {vehicle.registration}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        {formatKSh(
                          schedule?.total_premium ?? vehicle?.premium ?? 0,
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-success-700">
                        {schedule ? formatKSh(amountPaid) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-amber-700">
                        {schedule ? formatKSh(outstanding) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageShell>
  )
}
