import { useMemo, useState } from 'react'
import SearchField from '../ui/SearchField'

export default function ClientSearchSelect({
  clients,
  value,
  onChange,
  locked = false,
  emptyLabel = 'No clients yet. Add a client first.',
}) {
  const [query, setQuery] = useState('')
  const selected = clients.find(client => client.id === value) || null

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(client => {
      const plates = (client.vehicles ?? [])
        .map(vehicle => vehicle.registration)
        .join(' ')
      return (
        client.name.toLowerCase().includes(q) ||
        String(client.phone || '').includes(query.trim()) ||
        String(client.id_number || '').toLowerCase().includes(q) ||
        plates.toLowerCase().includes(q)
      )
    })
  }, [clients, query])

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{selected.name}</p>
          <p className="truncate text-xs text-slate-500">
            {[
              selected.phone,
              selected.id_number,
              `${selected.vehicles?.length ?? 0} vehicle${
                (selected.vehicles?.length ?? 0) === 1 ? '' : 's'
              }`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              setQuery('')
            }}
            className="shrink-0 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Change
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <SearchField
        placeholder="Search by name, phone, ID, or plate..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {options.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-slate-400">
            {query.trim() ? 'No clients found for that search.' : emptyLabel}
          </p>
        ) : (
          options.map(client => {
            const plates = (client.vehicles ?? [])
              .map(vehicle => vehicle.registration)
              .filter(Boolean)
              .join(', ')
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => onChange(client.id)}
                className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-primary-50/60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {client.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {[client.phone, plates || 'No vehicles yet']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
