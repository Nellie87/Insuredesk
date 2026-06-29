// src/pages/ProspectsPage.jsx

import { useMemo, useState } from 'react'
import { useProspects } from '../hooks/useProspects'
import { formatKSh } from '../utils/calculator'

const STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'awaiting_payment', label: 'Awaiting Payment' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
  { value: 'follow_up_later', label: 'Follow Up Later' },
]

const STAGE_COLORS = {
  lead: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  quoted: 'bg-amber-100 text-amber-700',
  negotiating: 'bg-orange-100 text-orange-700',
  awaiting_payment: 'bg-green-100 text-green-700',
  converted: 'bg-success-50 text-success-700',
  lost: 'bg-danger-50 text-danger-700',
  follow_up_later: 'bg-gray-100 text-gray-600',
}

export default function ProspectsPage() {
  const { prospects, loading, addProspect, updateProspect } = useProspects()

  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    vehicle_details: '',
    product_interest: '',
    estimated_premium: '',
    preferred_insurer: '',
    follow_up_date: '',
    notes: '',
  })

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      const q = search.toLowerCase()

      const matchesSearch =
        p.full_name?.toLowerCase().includes(q) ||
        p.phone?.includes(search) ||
        p.vehicle_details?.toLowerCase().includes(q) ||
        p.product_interest?.toLowerCase().includes(q)

      const matchesStage = stageFilter === 'all' || p.stage === stageFilter

      return matchesSearch && matchesStage
    })
  }, [prospects, search, stageFilter])

  const stats = useMemo(() => {
    return STAGES.map(stage => ({
      ...stage,
      count: prospects.filter(p => p.stage === stage.value).length,
    }))
  }, [prospects])

  const handleSubmit = async e => {
    e.preventDefault()

    if (!form.full_name.trim() || !form.phone.trim()) {
      alert('Enter prospect name and phone number.')
      return
    }

    await addProspect({
      ...form,
      email: form.email || null,
      vehicle_details: form.vehicle_details || null,
      product_interest: form.product_interest || null,
      preferred_insurer: form.preferred_insurer || null,
      follow_up_date: form.follow_up_date || null,
      notes: form.notes || null,
      estimated_premium: Number(form.estimated_premium || 0),
    })

    setForm({
      full_name: '',
      phone: '',
      email: '',
      vehicle_details: '',
      product_interest: '',
      estimated_premium: '',
      preferred_insurer: '',
      follow_up_date: '',
      notes: '',
    })

    setShowForm(false)
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Prospects</h1>
          <p className="text-sm text-gray-500">
            Track leads, quotes, follow-ups and conversions.
          </p>
        </div>

        <button
          onClick={() => setShowForm(prev => !prev)}
          className="bg-primary-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
        >
          {showForm ? 'Close' : '+ Add'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 bg-primary-50 text-primary-800">
          <div className="text-2xl font-bold">{prospects.length}</div>
          <div className="text-xs font-medium mt-0.5 opacity-80">
            Total prospects
          </div>
        </div>

        <div className="rounded-xl p-4 bg-success-50 text-success-700">
          <div className="text-2xl font-bold">
            {prospects.filter(p => p.stage === 'converted').length}
          </div>
          <div className="text-xs font-medium mt-0.5 opacity-80">
            Converted
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setStageFilter('all')}
          className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium border ${
            stageFilter === 'all'
              ? 'bg-primary-700 text-white border-primary-700'
              : 'bg-white text-gray-600 border-gray-300'
          }`}
        >
          All
        </button>

        {stats.map(stage => (
          <button
            key={stage.value}
            onClick={() => setStageFilter(stage.value)}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium border ${
              stageFilter === stage.value
                ? 'bg-primary-700 text-white border-primary-700'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {stage.label} ({stage.count})
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search name, phone, vehicle or product..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-gray-800">
            Add new prospect
          </h2>

          <input
            required
            placeholder="Full name"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />

          <input
            required
            placeholder="Phone number"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />

          <input
            type="email"
            placeholder="Email optional"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />

          <input
            placeholder="Vehicle details e.g. KDA 123A Toyota Axio"
            value={form.vehicle_details}
            onChange={e => set('vehicle_details', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />

          <input
            placeholder="Product interest e.g. Comprehensive"
            value={form.product_interest}
            onChange={e => set('product_interest', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />

          <input
            type="number"
            placeholder="Estimated premium"
            value={form.estimated_premium}
            onChange={e => set('estimated_premium', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />

          <input
            placeholder="Preferred insurer optional"
            value={form.preferred_insurer}
            onChange={e => set('preferred_insurer', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />

          <div>
            <label className="text-xs font-medium text-gray-500">
              Follow-up date
            </label>
            <input
              type="date"
              value={form.follow_up_date}
              onChange={e => set('follow_up_date', e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-20"
          />

          <button
            type="submit"
            className="w-full bg-primary-700 text-white rounded-xl py-3 font-semibold text-sm"
          >
            Save prospect
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">
          Loading prospects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No prospects found.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(prospect => (
            <div
              key={prospect.id}
              className="bg-white rounded-xl border border-gray-200 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {prospect.full_name}
                  </div>

                  <div className="text-xs text-gray-500 mt-0.5">
                    {prospect.phone}
                  </div>

                  {prospect.vehicle_details && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {prospect.vehicle_details}
                    </div>
                  )}
                </div>

                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    STAGE_COLORS[prospect.stage] ?? 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {STAGES.find(s => s.value === prospect.stage)?.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-gray-400">Product</div>
                  <div className="font-medium text-gray-800">
                    {prospect.product_interest || 'Not set'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-gray-400">Premium</div>
                  <div className="font-medium text-gray-800">
                    {formatKSh(prospect.estimated_premium || 0)}
                  </div>
                </div>
              </div>

              {prospect.follow_up_date && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                  Follow up on {prospect.follow_up_date}
                </div>
              )}

              {prospect.notes && (
                <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                  {prospect.notes}
                </div>
              )}

              <select
                value={prospect.stage}
                onChange={e =>
                  updateProspect(prospect.id, { stage: e.target.value })
                }
                className="mt-3 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {STAGES.map(stage => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}