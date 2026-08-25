import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { usePayments } from '../hooks/usePayments'
import {
  filterVehiclePortfolio,
  flattenVehiclePortfolio,
  summarizeVehiclePortfolio,
  vehiclePortfolioCsv,
} from '../utils/vehiclePortfolio'
import { formatKSh } from '../utils/calculator'
import { formatDisplayDate } from '../utils/policyDates'
import { POLICY_TYPES } from '../constants/policies'
import { toast } from '../store/toastStore'
import SearchField from '../components/ui/SearchField'
import Select from '../components/ui/Select'
import StatusBadge from '../components/ui/StatusBadge'
import LottieLoader from '../components/ui/LottieLoader'
import PageShell from '../components/layout/PageShell'
import PageHeader from '../components/layout/PageHeader'

const COVER_FILTERS = [
  { value: 'all', label: 'All cover' },
  { value: 'in_force', label: 'In force' },
  { value: 'expiring_soon', label: 'Expiring soon' },
  { value: 'expired', label: 'Expired' },
]

const COVER_BADGE = {
  in_force: 'active',
  expiring_soon: 'expiring_soon',
  expired: 'lapsed',
}

function downloadCsv(rows) {
  const csv = vehiclePortfolioCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vehicle-insurance-report-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function VehiclesPage() {
  const { clients, loading } = useClients()
  const { payments } = usePayments()
  const [search, setSearch] = useState('')
  const [packageType, setPackageType] = useState('all')
  const [coverStatus, setCoverStatus] = useState('all')
  const [clientId, setClientId] = useState('all')

  const rows = useMemo(
    () => flattenVehiclePortfolio(clients, payments),
    [clients, payments],
  )

  const filtered = useMemo(
    () =>
      filterVehiclePortfolio(rows, {
        search,
        packageType,
        coverStatus,
        clientId: clientId === 'all' ? '' : clientId,
      }),
    [rows, search, packageType, coverStatus, clientId],
  )

  const stats = useMemo(() => summarizeVehiclePortfolio(filtered), [filtered])
  const allStats = useMemo(() => summarizeVehiclePortfolio(rows), [rows])

  const clientOptions = useMemo(
    () =>
      [...clients].sort((a, b) => a.name.localeCompare(b.name)).map(client => ({
        id: client.id,
        name: client.name,
        count: client.vehicles?.length ?? 0,
      })),
    [clients],
  )

  const handleExport = () => {
    if (!filtered.length) {
      toast('Nothing to export for these filters.', 'error')
      return
    }
    downloadCsv(filtered)
    toast(`Exported ${filtered.length} vehicle ${filtered.length === 1 ? 'row' : 'rows'}.`)
  }

  return (
    <PageShell>
      <PageHeader
        description="Every vehicle and its insurance package, filterable by client, plate, and cover type."
        actions={
          <>
            <button
              type="button"
              onClick={handleExport}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-soft transition hover:border-primary-200 hover:bg-primary-50 sm:flex-none"
            >
              Export CSV
            </button>
            <Link
              to="/vehicles/add"
              className="flex-1 rounded-xl bg-primary-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700 sm:flex-none"
            >
              Add vehicle
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-card sm:p-4">
          <p className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-faint">
            Vehicles
          </p>
          <p className="mt-1 break-words font-sans text-base font-semibold leading-tight text-ink sm:text-xl">
            {stats.totalVehicles}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {allStats.totalVehicles} in portfolio
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-card sm:p-4">
          <p className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-faint">
            Premium
          </p>
          <p className="mt-1 break-words font-sans text-base font-semibold leading-tight text-ink sm:text-xl">
            {formatKSh(stats.totalPremium)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-card sm:p-4">
          <p className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-faint">
            Outstanding
          </p>
          <p className="mt-1 break-words font-sans text-base font-semibold leading-tight text-warning-700 sm:text-xl">
            {formatKSh(stats.totalOutstanding)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-card sm:p-4">
          <p className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-faint">
            Cover alerts
          </p>
          <p className="mt-1 break-words font-sans text-base font-semibold leading-tight text-ink sm:text-xl">
            {stats.expiringCount + stats.expiredCount}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {stats.expiringCount} expiring · {stats.expiredCount} expired
          </p>
        </div>
      </section>

      <div className="sticky top-0 z-10 -mx-4 space-y-2.5 border-b border-stone-200/70 bg-canvas/95 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <SearchField
          placeholder="Search plate, client, insurer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Select
            searchable
            title="Client"
            aria-label="Filter by client"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
          >
            <option value="all">All clients</option>
            {clientOptions.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.count ? ` (${client.count})` : ''}
              </option>
            ))}
          </Select>
          <Select
            title="Cover status"
            aria-label="Filter by cover"
            value={coverStatus}
            onChange={e => setCoverStatus(e.target.value)}
          >
            {COVER_FILTERS.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 hide-scrollbar">
          <button
            type="button"
            onClick={() => setPackageType('all')}
            className={`min-h-10 shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              packageType === 'all'
                ? 'bg-primary-600 text-white shadow-soft'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            All packages
          </button>
          {POLICY_TYPES.map(type => {
            const bucket = stats.byPackage[type.value] || { count: 0, premium: 0 }
            const active = packageType === type.value
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setPackageType(active ? 'all' : type.value)}
                className={`min-h-10 shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-primary-600 text-white shadow-soft'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {type.label}
                <span className={`ml-1.5 ${active ? 'text-white/80' : 'text-slate-400'}`}>
                  {bucket.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <LottieLoader label="Loading vehicles..." />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 py-14 text-center text-sm text-slate-400">
          {rows.length === 0
            ? 'No vehicles yet. Add a client or attach a vehicle to an existing client.'
            : 'No vehicles match those filters.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:hidden">
            {filtered.map(row => (
              <Link
                key={row.vehicleId}
                to={`/clients/${row.clientId}`}
                className="block min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card transition-transform active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {row.registration || 'Pending reg'}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">
                      {row.clientName}
                      {' · '}
                      {[row.year, row.make, row.model].filter(Boolean).join(' ') || 'Vehicle'}
                    </div>
                  </div>
                  <StatusBadge status={COVER_BADGE[row.coverStatus] || 'pending'} />
                </div>
                <div className="mt-1 truncate text-xs font-medium text-slate-400">
                  {row.packageLabel}
                  {row.insurer ? ` · ${row.insurer}` : ''}
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-2.5">
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Premium
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold tabular-nums text-slate-900 sm:text-sm">
                      {formatKSh(row.premium)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Paid
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold tabular-nums text-success-700 sm:text-sm">
                      {formatKSh(row.amountPaid)}
                    </div>
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Expiry
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold tabular-nums text-slate-900 sm:text-sm">
                      {formatDisplayDate(row.expiryDate) || '-'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="surface-table hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3.5">Vehicle</th>
                  <th className="px-5 py-3.5">Client</th>
                  <th className="px-5 py-3.5">Package</th>
                  <th className="px-5 py-3.5">Cover</th>
                  <th className="px-5 py-3.5 text-right">Premium</th>
                  <th className="px-5 py-3.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(row => (
                  <tr key={row.vehicleId} className="transition hover:bg-primary-50/40">
                    <td className="max-w-[12rem] px-5 py-3.5">
                      <Link
                        to={`/clients/${row.clientId}`}
                        className="block truncate font-semibold text-slate-900 hover:text-primary-600"
                      >
                        {row.registration || 'Pending reg'}
                      </Link>
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        {[row.year, row.make, row.model].filter(Boolean).join(' ')}
                      </div>
                    </td>
                    <td className="max-w-[12rem] px-5 py-3.5">
                      <Link
                        to={`/clients/${row.clientId}`}
                        className="block truncate font-medium text-slate-800 hover:text-primary-600"
                      >
                        {row.clientName}
                      </Link>
                      <div className="mt-0.5 truncate text-xs text-slate-500">{row.clientPhone}</div>
                    </td>
                    <td className="max-w-[14rem] px-5 py-3.5 text-slate-600">
                      <div className="truncate">{row.packageLabel}</div>
                      <div className="mt-0.5 truncate text-xs text-slate-400">
                        {row.insurer || '—'}
                        {row.policyNumber ? ` · #${row.policyNumber}` : ''}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={COVER_BADGE[row.coverStatus] || 'pending'} />
                      <div className="mt-1 text-xs text-slate-400">
                        {formatDisplayDate(row.expiryDate) || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                      {formatKSh(row.premium)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-amber-700">
                      {formatKSh(row.outstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageShell>
  )
}
