import { useMemo, useState } from 'react'
import { useProspects } from '../hooks/useProspects'
import { formatKSh } from '../utils/calculator'
import { formatNumberInput, parseNumberInput } from '../utils/numberInput'
import { toast } from '../store/toastStore'
import { INSURER_OPTIONS } from '../constants/insurers'

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500'

const LABEL = 'text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400'

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
  lead: 'border-blue-200 bg-blue-50 text-blue-700',
  contacted: 'border-violet-200 bg-violet-50 text-violet-700',
  quoted: 'border-amber-200 bg-amber-50 text-amber-700',
  negotiating: 'border-orange-200 bg-orange-50 text-orange-700',
  awaiting_payment: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  converted: 'border-emerald-200 bg-success-50 text-success-700',
  lost: 'border-red-200 bg-danger-50 text-danger-700',
  follow_up_later: 'border-slate-200 bg-slate-100 text-slate-600',
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
      toast('Enter prospect name and phone number.', 'error')
      return
    }

    try {
      await addProspect({
        ...form,
        email: form.email || null,
        vehicle_details: form.vehicle_details || null,
        product_interest: form.product_interest || null,
        preferred_insurer: form.preferred_insurer || null,
        follow_up_date: form.follow_up_date || null,
        notes: form.notes || null,
        estimated_premium: Number(
          parseNumberInput(form.estimated_premium) || 0,
        ),
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
      toast('Prospect saved successfully.')
    } catch (err) {
      toast(err.message || 'Could not save prospect.', 'error')
    }
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700">
            Pipeline
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            Prospects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track leads, quotes, follow-ups and conversions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          className="shrink-0 rounded-xl bg-primary-800 px-3 py-1.5 text-sm font-semibold text-white"
        >
          {showForm ? 'Close' : '+ Add'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-blue-100 bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Total prospects
          </p>
          <p className="mt-2 text-base font-black text-blue-800">
            {prospects.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Converted
          </p>
          <p className="mt-2 text-base font-black text-emerald-700">
            {prospects.filter(p => p.stage === 'converted').length}
          </p>
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar">
        <button
          type="button"
          onClick={() => setStageFilter('all')}
          className={`whitespace-nowrap rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${
            stageFilter === 'all'
              ? 'border-primary-800 bg-primary-800 text-white'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          All
        </button>

        {stats.map(stage => (
          <button
            key={stage.value}
            type="button"
            onClick={() => setStageFilter(stage.value)}
            className={`whitespace-nowrap rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${
              stageFilter === stage.value
                ? 'border-primary-800 bg-primary-800 text-white'
                : 'border-slate-200 bg-white text-slate-500'
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
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
        >
          <h2 className="text-sm font-bold text-slate-900">Add new prospect</h2>

          <div>
            <label className={LABEL}>
              Full name <span className="normal-case text-red-600">*</span>
            </label>
            <input
              required
              placeholder="Full name"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </div>

          <div>
            <label className={LABEL}>
              Phone number <span className="normal-case text-red-600">*</span>
            </label>
            <input
              required
              placeholder="Phone number"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </div>

          <input
            type="email"
            placeholder="Email optional"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            className={INPUT}
          />

          <input
            placeholder="Vehicle details e.g. KDA 123A Toyota Axio"
            value={form.vehicle_details}
            onChange={e => set('vehicle_details', e.target.value)}
            className={INPUT}
          />

          <input
            placeholder="Product interest e.g. Comprehensive"
            value={form.product_interest}
            onChange={e => set('product_interest', e.target.value)}
            className={INPUT}
          />

          <div>
            <label className={LABEL}>Estimated premium</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 36,000"
              value={form.estimated_premium}
              onChange={e =>
                set('estimated_premium', formatNumberInput(e.target.value))
              }
              className={`mt-1.5 ${INPUT}`}
            />
          </div>

          <select
            value={form.preferred_insurer}
            onChange={e => set('preferred_insurer', e.target.value)}
            className={INPUT}
          >
            {INSURER_OPTIONS.map(option => (
              <option key={option.value || 'empty'} value={option.value}>
                {option.value ? option.label : 'Preferred insurer (optional)'}
              </option>
            ))}
          </select>

          <div>
            <label className={LABEL}>Follow-up date</label>
            <input
              type="date"
              value={form.follow_up_date}
              onChange={e => set('follow_up_date', e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </div>

          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className={`${INPUT} min-h-20`}
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-primary-800 py-3 text-sm font-bold text-white"
          >
            Save prospect
          </button>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          Loading prospects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          No prospects found.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(prospect => (
            <div
              key={prospect.id}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words text-sm font-bold text-slate-900">
                    {prospect.full_name}
                  </div>

                  <div className="mt-0.5 break-all text-xs text-slate-500">
                    {prospect.phone}
                  </div>

                  {prospect.vehicle_details && (
                    <div className="mt-0.5 break-words text-xs text-slate-400">
                      {prospect.vehicle_details}
                    </div>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    STAGE_COLORS[prospect.stage] ??
                    'border-slate-200 bg-slate-100 text-slate-500'
                  }`}
                >
                  {STAGES.find(s => s.value === prospect.stage)?.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Product
                  </div>
                  <div className="mt-1 break-words text-xs font-semibold text-slate-800">
                    {prospect.product_interest || 'Not set'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Premium
                  </div>
                  <div className="mt-1 break-words text-xs font-semibold text-slate-800">
                    {formatKSh(prospect.estimated_premium || 0)}
                  </div>
                </div>
              </div>

              {prospect.follow_up_date && (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-800">
                  Follow up on {prospect.follow_up_date}
                </div>
              )}

              {prospect.notes && (
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-500">
                  {prospect.notes}
                </div>
              )}

              <select
                value={prospect.stage}
                onChange={async e => {
                  try {
                    await updateProspect(prospect.id, { stage: e.target.value })
                    toast('Stage updated.')
                  } catch (err) {
                    toast(err.message || 'Could not update stage.', 'error')
                  }
                }}
                className={`mt-3 ${INPUT}`}
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
