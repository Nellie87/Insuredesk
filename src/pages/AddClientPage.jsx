import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { buildPaymentScheduleFromPlan } from '../utils/calculator'
import { formatNumberInput, parseNumberInput, toNumberOrNull } from '../utils/numberInput'
import { toast } from '../store/toastStore'
import { INSURER_OPTIONS } from '../constants/insurers'
import { CAR_MAKE_OPTIONS, getCarModelOptions } from '../constants/carMakes'

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500'

const LABEL =
  'text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400'

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

const EMPTY_PLAN = {
  renewal_1: '',
  renewal_2: '',
  renewal_3: '',
  renewal_4: '',
  payment_1: '',
  payment_2: '',
  payment_3: '',
  payment_4: '',
  balance: '',
}

const INITIAL_FORM = {
  name: '',
  phone: '',
  id_number: '',
  email: '',
  address: '',
  notes: '',
  registration: '',
  make: '',
  make_other: '',
  model: '',
  model_other: '',
  year: '',
  engine_capacity: '',
  vehicle_value: '',
  use_type: 'private',
  insurer: '',
  insurer_other: '',
  policy_number: '',
  policy_type: 'comprehensive',
  start_date: today,
  expiry_date: defaultExpiryDate(today),
  sum_insured: '',
  premium: '',
  ...EMPTY_PLAN,
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className={LABEL}>
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
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
      if (key === 'make') {
        next.model = ''
        next.model_other = ''
        if (value !== 'Other') next.make_other = ''
      }
      return next
    })
  }

  const modelOptions = getCarModelOptions(form.make)

  const setAmount = (key, value) => set(key, formatNumberInput(value))

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim() || !form.phone.trim()) {
      const message = 'Insured name and contacts (phone) are required.'
      setError(message)
      toast(message, 'error')
      return
    }

    if (!parseNumberInput(form.premium)) {
      const message = 'Total premium is required.'
      setError(message)
      toast(message, 'error')
      return
    }

    if (!form.start_date || !form.expiry_date) {
      const message = 'From (start) and Annual Renewal (expiry) dates are required.'
      setError(message)
      toast(message, 'error')
      return
    }

    const registration = form.registration.trim() || `PENDING-${Date.now().toString().slice(-6)}`
    const make =
      form.make === 'Other'
        ? form.make_other.trim() || 'Other'
        : form.make.trim() || 'Unknown'
    const model =
      form.make === 'Other' || form.model === 'Other'
        ? form.model_other.trim() || 'Other'
        : form.model.trim() || 'Unknown'
    const insurer =
      form.insurer === 'Other'
        ? form.insurer_other.trim() || 'Other'
        : form.insurer.trim() || 'Unknown'

    const renewalDates = [1, 2, 3, 4].map(n => form[`renewal_${n}`] || null)
    const paymentAmounts = [1, 2, 3, 4].map(n => toNumberOrNull(form[`payment_${n}`]))
    const balance = toNumberOrNull(form.balance)
    const premium = Number(parseNumberInput(form.premium))

    const schedule = buildPaymentScheduleFromPlan({
      renewalDates,
      paymentAmounts,
      premium,
      balance,
    })

    setSaving(true)

    try {
      await addClientWithVehicle({
        client: {
          name: form.name,
          phone: form.phone,
          id_number: form.id_number,
          email: form.email,
          address: form.address,
          notes: form.notes,
        },
        vehicle: {
          registration,
          make,
          model,
          year: form.year,
          engine_capacity: form.engine_capacity,
          vehicle_value: parseNumberInput(form.vehicle_value),
          use_type: form.use_type,
          insurer,
          policy_number: form.policy_number,
          policy_type: form.policy_type,
          start_date: form.start_date,
          expiry_date: form.expiry_date,
          sum_insured: parseNumberInput(form.sum_insured),
          premium: parseNumberInput(form.premium),
        },
        schedule,
      })

      toast('Client saved successfully.')
      navigate('/clients', { replace: true })
    } catch (err) {
      const message = err.message || 'Could not save client. Try again.'
      setError(message)
      toast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      <div>
        <Link
          to="/clients"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-primary-700 shadow-sm"
        >
          ← Back to portfolio
        </Link>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700">
          New policy
        </p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
          Add client
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Same fields as the Preliminary renewals sheet — insured, contacts,
          cover, renewals, and payments. Fields marked{' '}
          <span className="text-red-600">*</span> are required.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h2 className="text-sm font-bold text-slate-900">Insured</h2>

          <Field label="INSURED" required>
            <input
              required
              placeholder="Full name"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={INPUT}
            />
          </Field>

          <Field label="CONTACTS" required>
            <input
              required
              placeholder="Phone number"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className={INPUT}
            />
          </Field>

          <Field label="Comment">
            <textarea
              rows={2}
              placeholder="Remarks, plate, insurer notes…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className={INPUT}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="National ID (optional)">
              <input
                placeholder="ID number"
                value={form.id_number}
                onChange={e => set('id_number', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Email (optional)">
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>

          <Field label="Address (optional)">
            <input
              placeholder="Address"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              className={INPUT}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h2 className="text-sm font-bold text-slate-900">Cover & dates</h2>

          <Field label="COVER TYPE">
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
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="FROM" required>
              <input
                required
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Annual Renewal" required>
              <input
                required
                type="date"
                value={form.expiry_date}
                onChange={e => set('expiry_date', e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>

          <Field label="Total Premium" required>
            <input
              required
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={form.premium}
              onChange={e => setAmount('premium', e.target.value)}
              className={INPUT}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Insurer">
              <select
                value={form.insurer}
                onChange={e => set('insurer', e.target.value)}
                className={INPUT}
              >
                {INSURER_OPTIONS.map(option => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Policy number (optional)">
              <input
                placeholder="Policy no."
                value={form.policy_number}
                onChange={e => set('policy_number', e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>

          {form.insurer === 'Other' && (
            <Field label="Other insurer name">
              <input
                placeholder="Enter insurer name"
                value={form.insurer_other}
                onChange={e => set('insurer_other', e.target.value)}
                className={INPUT}
              />
            </Field>
          )}

          <Field label="Sum insured (optional)">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={form.sum_insured}
              onChange={e => setAmount('sum_insured', e.target.value)}
              className={INPUT}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h2 className="text-sm font-bold text-slate-900">Payment plan</h2>
          <p className="text-xs text-slate-500">
            Renewal dates and payment amounts (same as the agent sheet). Leave
            blank if paid in full.
          </p>

          {[1, 2, 3, 4].map(n => (
            <div key={n} className="grid grid-cols-2 gap-3">
              <Field label={`Renewal ${n}`}>
                <input
                  type="date"
                  value={form[`renewal_${n}`]}
                  onChange={e => set(`renewal_${n}`, e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label={`Payment ${n}`}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount"
                  value={form[`payment_${n}`]}
                  onChange={e => setAmount(`payment_${n}`, e.target.value)}
                  className={INPUT}
                />
              </Field>
            </div>
          ))}

          <Field label="Bal.">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Outstanding balance"
              value={form.balance}
              onChange={e => setAmount('balance', e.target.value)}
              className={INPUT}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h2 className="text-sm font-bold text-slate-900">Vehicle (optional)</h2>
          <p className="text-xs text-slate-500">
            Fill when known. Otherwise the app stores placeholders you can update
            later.
          </p>

          <Field label="Registration">
            <input
              placeholder="e.g. KDA 123A"
              value={form.registration}
              onChange={e => set('registration', e.target.value)}
              className={INPUT}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Make of car">
              <select
                value={form.make}
                onChange={e => set('make', e.target.value)}
                className={INPUT}
              >
                {CAR_MAKE_OPTIONS.map(option => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model">
              <select
                value={form.model}
                onChange={e => set('model', e.target.value)}
                disabled={!form.make || form.make === 'Other'}
                className={INPUT}
              >
                {modelOptions.map(option => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {form.make === 'Other' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Other make">
                <input
                  placeholder="Enter make of car"
                  value={form.make_other}
                  onChange={e => set('make_other', e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Model">
                <input
                  placeholder="Enter model"
                  value={form.model_other}
                  onChange={e => set('model_other', e.target.value)}
                  className={INPUT}
                />
              </Field>
            </div>
          )}

          {form.make !== 'Other' && form.model === 'Other' && (
            <Field label="Other model">
              <input
                placeholder="Enter model"
                value={form.model_other}
                onChange={e => set('model_other', e.target.value)}
                className={INPUT}
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Year">
              <input
                type="number"
                placeholder="Year"
                value={form.year}
                onChange={e => set('year', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Engine">
              <input
                placeholder="1500cc"
                value={form.engine_capacity}
                onChange={e => set('engine_capacity', e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle value">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.vehicle_value}
                onChange={e => setAmount('vehicle_value', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Use type">
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
            </Field>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-primary-800 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save client'}
        </button>
      </form>
    </div>
  )
}
