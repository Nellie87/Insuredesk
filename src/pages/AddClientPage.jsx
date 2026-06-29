import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClients } from '../hooks/useClients'

const INPUT =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

const POLICY_TYPES = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'third_party', label: 'Third Party' },
  { value: 'third_party_fire_theft', label: 'Third Party Fire & Theft' },
]

const USE_TYPES = [
  { value: 'private', label: 'Private' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'psv', label: 'PSV' },
]

function defaultExpiryDate(startDate) {
  const date = new Date(startDate)
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

const today = new Date().toISOString().slice(0, 10)

const INITIAL_FORM = {
  name: '',
  phone: '',
  id_number: '',
  email: '',
  address: '',
  registration: '',
  make: '',
  model: '',
  year: '',
  engine_capacity: '',
  vehicle_value: '',
  use_type: 'private',
  insurer: '',
  policy_number: '',
  policy_type: 'comprehensive',
  start_date: today,
  expiry_date: defaultExpiryDate(today),
  sum_insured: '',
  premium: '',
}

export default function AddClientPage() {
  const navigate = useNavigate()
  const { addClientWithVehicle } = useClients()

  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'start_date' && value) {
        next.expiry_date = defaultExpiryDate(value)
      }
      return next
    })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim() || !form.phone.trim()) {
      setError('Client name and phone are required.')
      return
    }

    if (
      !form.registration.trim() ||
      !form.make.trim() ||
      !form.model.trim() ||
      !form.insurer.trim() ||
      !form.premium
    ) {
      setError('Fill in registration, make, model, insurer, and premium.')
      return
    }

    if (!form.start_date || !form.expiry_date) {
      setError('Policy start and expiry dates are required.')
      return
    }

    setSaving(true)

    try {
      await addClientWithVehicle({
        client: {
          name: form.name,
          phone: form.phone,
          id_number: form.id_number,
          email: form.email,
          address: form.address,
        },
        vehicle: {
          registration: form.registration,
          make: form.make,
          model: form.model,
          year: form.year,
          engine_capacity: form.engine_capacity,
          vehicle_value: form.vehicle_value,
          use_type: form.use_type,
          insurer: form.insurer,
          policy_number: form.policy_number,
          policy_type: form.policy_type,
          start_date: form.start_date,
          expiry_date: form.expiry_date,
          sum_insured: form.sum_insured,
          premium: form.premium,
        },
      })

      navigate('/clients', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not save client. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Link
          to="/clients"
          className="text-sm text-primary-700 font-medium"
        >
          ← Back
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Add Client</h1>
      </div>

      <p className="text-sm text-gray-500">
        Register a new client and their first vehicle policy.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Client details</h2>

          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className={INPUT}
          />

          <input
            required
            placeholder="Phone number"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            className={INPUT}
          />

          <input
            placeholder="National ID optional"
            value={form.id_number}
            onChange={e => set('id_number', e.target.value)}
            className={INPUT}
          />

          <input
            type="email"
            placeholder="Email optional"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            className={INPUT}
          />

          <input
            placeholder="Address optional"
            value={form.address}
            onChange={e => set('address', e.target.value)}
            className={INPUT}
          />
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Vehicle</h2>

          <input
            required
            placeholder="Registration e.g. KDA 123A"
            value={form.registration}
            onChange={e => set('registration', e.target.value)}
            className={INPUT}
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Make e.g. Toyota"
              value={form.make}
              onChange={e => set('make', e.target.value)}
              className={INPUT}
            />
            <input
              required
              placeholder="Model e.g. Axio"
              value={form.model}
              onChange={e => set('model', e.target.value)}
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Year"
              value={form.year}
              onChange={e => set('year', e.target.value)}
              className={INPUT}
            />
            <input
              placeholder="Engine e.g. 1500cc"
              value={form.engine_capacity}
              onChange={e => set('engine_capacity', e.target.value)}
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Vehicle value"
              value={form.vehicle_value}
              onChange={e => set('vehicle_value', e.target.value)}
              className={INPUT}
            />
            <select
              value={form.use_type}
              onChange={e => set('use_type', e.target.value)}
              className={INPUT}
            >
              {USE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Policy</h2>

          <input
            required
            placeholder="Insurer e.g. APA, Britam"
            value={form.insurer}
            onChange={e => set('insurer', e.target.value)}
            className={INPUT}
          />

          <input
            placeholder="Policy number optional"
            value={form.policy_number}
            onChange={e => set('policy_number', e.target.value)}
            className={INPUT}
          />

          <select
            value={form.policy_type}
            onChange={e => set('policy_type', e.target.value)}
            className={INPUT}
          >
            {POLICY_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Start date</label>
              <input
                required
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className={`mt-1 ${INPUT}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Expiry date</label>
              <input
                required
                type="date"
                value={form.expiry_date}
                onChange={e => set('expiry_date', e.target.value)}
                className={`mt-1 ${INPUT}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Sum insured"
              value={form.sum_insured}
              onChange={e => set('sum_insured', e.target.value)}
              className={INPUT}
            />
            <input
              required
              type="number"
              placeholder="Annual premium"
              value={form.premium}
              onChange={e => set('premium', e.target.value)}
              className={INPUT}
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary-800 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save client'}
        </button>
      </form>
    </div>
  )
}
