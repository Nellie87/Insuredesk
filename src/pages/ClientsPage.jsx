import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { formatKSh } from '../utils/calculator'
import SearchField from '../components/ui/SearchField'
import StatusBadge from '../components/ui/StatusBadge'
import LottieLoader from '../components/ui/LottieLoader'

const FILTERS = ['all', 'active', 'overdue', 'expiring_soon', 'fully_paid', 'lapsed']

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
        c.vehicles?.some(v => v.registration.toLowerCase().includes(search.toLowerCase()))

      const matchesFilter = filter === 'all' || c.status === filter

      return matchesSearch && matchesFilter
    })
  }, [clients, search, filter])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-primary-900">Portfolio</h1>
        <Link
          to="/clients/add"
          className="bg-primary-800 text-white text-sm px-3 py-1.5 rounded-xl font-semibold"
        >
          + Add
        </Link>
      </div>

      <SearchField
        label="Search clients"
        placeholder="Search clients or policies..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap text-[10px] font-bold tracking-wider uppercase px-3 py-2 rounded-full border transition-colors ${
              filter === f
                ? 'bg-primary-800 text-white border-primary-800'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <LottieLoader label="Loading clients..." />
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-gray-200">
          {search ? 'No clients found for that search.' : 'No clients yet. Tap + to add your first one.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => {
            const vehicle = client.vehicles?.[0]
            return (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-4 shadow-card active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-gray-900">{client.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {vehicle
                        ? `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`
                        : client.phone}
                    </div>
                    {vehicle && (
                      <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">
                        Plate {vehicle.registration}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {vehicle && (
                      <div className="text-sm font-bold text-primary-900">
                        {formatKSh(vehicle.premium)}
                      </div>
                    )}
                    <div className="mt-1 flex justify-end">
                      <StatusBadge status={client.status} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
