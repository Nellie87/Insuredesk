import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { buildInstallmentSchedule, formatKSh } from '../utils/calculator'
import { formatNumberInput, parseNumberInput } from '../utils/numberInput'
import { toast } from '../store/toastStore'
import { INSURER_OPTIONS } from '../constants/insurers'
import { CAR_MAKE_OPTIONS, getCarModelOptions } from '../constants/carMakes'
import {
  INPUT,
  LABEL,
  SECTION_TITLE,
  EYEBROW,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from '../constants/formStyles'
import PageShell from '../components/layout/PageShell'

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

const STEPS = [
  { id: 'insured', title: 'Insured', caption: 'Client details' },
  { id: 'vehicle', title: 'Vehicle', caption: 'Identification' },
  { id: 'cover', title: 'Cover', caption: 'Policy cover' },
  { id: 'dates', title: 'Dates', caption: 'Policy period' },
  { id: 'payment', title: 'Payment', caption: 'Installments' },
  { id: 'review', title: 'Review', caption: 'Confirm & save' },
]

const DEFAULT_INSTALLMENT_OPTIONS = [1, 2, 3]
const EXTENDED_INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5]

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
  notes: '',
  registration: '',
  chassis: '',
  make: '',
  make_other: '',
  model: '',
  model_other: '',
  year: '',
  engine_capacity: '',
  vehicle_value: '',
  use_type: 'private',
  vehicle_notes: '',
  insurer: '',
  insurer_other: '',
  policy_number: '',
  policy_type: 'comprehensive',
  sum_insured: '',
  premium: '',
  cover_notes: '',
  start_date: today,
  expiry_date: defaultExpiryDate(today),
  installment_count: 3,
  allow_five_installments: false,
  payment_notes: '',
  installment_overrides: [],
}

function Field({ label, required, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className={LABEL}>
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function StepHeader({ step }) {
  return (
    <div>
      <p className={EYEBROW}>
        Step {step + 1} of {STEPS.length}
      </p>
      <h2 className={`mt-1 ${SECTION_TITLE}`}>{STEPS[step].title} details</h2>
      <p className="mt-1 text-sm text-slate-500 sm:text-base">
        {STEPS[step].caption}
      </p>
    </div>
  )
}

function StepProgress({ current }) {
  const percent = Math.round(((current + 1) / STEPS.length) * 100)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">
          Step {current + 1} of {STEPS.length}
        </p>
        <p className="text-sm font-bold text-primary-800">{percent}% complete</p>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full bg-primary-700 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEPS.map((step, index) => {
          const active = index === current
          const done = index < current

          return (
            <li
              key={step.id}
              className={`rounded-xl border px-2.5 py-2.5 ${
                active
                  ? 'border-primary-300 bg-primary-50'
                  : done
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <p
                className={`text-xs font-bold uppercase tracking-[0.08em] ${
                  active
                    ? 'text-primary-700'
                    : done
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                }`}
              >
                {index + 1}. {step.title}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="break-words text-base font-semibold text-slate-900 sm:text-right">
        {value || '—'}
      </dd>
    </div>
  )
}

export default function AddClientPage() {
  const navigate = useNavigate()
  const { addClientWithVehicle } = useClients()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [datesTouched, setDatesTouched] = useState(false)

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
      if (key === 'installment_count' || key === 'premium' || key === 'start_date') {
        next.installment_overrides = []
      }
      if (key === 'allow_five_installments' && !value && next.installment_count > 3) {
        next.installment_count = 3
        next.installment_overrides = []
      }
      return next
    })

    if (key === 'start_date') setDatesTouched(false)
  }

  const setAmount = (key, value) => set(key, formatNumberInput(value))

  const modelOptions = getCarModelOptions(form.make)
  const installmentOptions = form.allow_five_installments
    ? EXTENDED_INSTALLMENT_OPTIONS
    : DEFAULT_INSTALLMENT_OPTIONS

  const resolvedMake =
    form.make === 'Other'
      ? form.make_other.trim() || 'Other'
      : form.make.trim() || 'Unknown'
  const resolvedModel =
    form.make === 'Other' || form.model === 'Other'
      ? form.model_other.trim() || 'Other'
      : form.model.trim() || 'Unknown'
  const resolvedInsurer =
    form.insurer === 'Other'
      ? form.insurer_other.trim() || 'Other'
      : form.insurer.trim() || 'Unknown'

  const premiumNumber = Number(parseNumberInput(form.premium)) || 0

  const draftSchedule = useMemo(
    () =>
      buildInstallmentSchedule({
        premium: premiumNumber,
        installmentCount: form.installment_count,
        startDate: form.start_date,
        overrides: form.installment_overrides,
        maxInstallments: form.allow_five_installments ? 5 : 3,
      }),
    [
      premiumNumber,
      form.installment_count,
      form.start_date,
      form.installment_overrides,
      form.allow_five_installments,
    ],
  )

  useEffect(() => {
    if (!draftSchedule?.installments?.length) return
    if (form.installment_overrides.length === draftSchedule.installments.length) return

    setForm(prev => ({
      ...prev,
      installment_overrides: draftSchedule.installments.map(item => ({
        amount: String(item.amount),
        due_date: item.due_date,
      })),
    }))
  }, [draftSchedule, form.installment_overrides.length])

  const updateInstallment = (index, key, value) => {
    setForm(prev => {
      const base =
        prev.installment_overrides.length > 0
          ? prev.installment_overrides
          : (draftSchedule?.installments ?? []).map(item => ({
              amount: String(item.amount),
              due_date: item.due_date,
            }))

      const next = base.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]:
                key === 'amount' ? formatNumberInput(value) : value,
            }
          : item,
      )
      return { ...prev, installment_overrides: next }
    })
  }

  const validateStep = currentStep => {
    if (currentStep === 0) {
      if (!form.name.trim() || !form.phone.trim()) {
        return 'Insured name and phone number are required.'
      }
    }

    if (currentStep === 1) {
      if (!form.registration.trim() && !form.chassis.trim()) {
        return 'Provide a vehicle registration number or chassis number.'
      }
    }

    if (currentStep === 2) {
      if (!premiumNumber) {
        return 'Total premium is required.'
      }
    }

    if (currentStep === 3) {
      if (!form.start_date || !form.expiry_date) {
        return 'Policy start and expiry dates are required.'
      }
    }

    if (currentStep === 4) {
      if (!draftSchedule?.installments?.length) {
        return 'Could not build an installment schedule. Check premium and start date.'
      }
    }

    return null
  }

  const goNext = () => {
    const message = validateStep(step)
    if (message) {
      setError(message)
      toast(message, 'error')
      return
    }
    setError(null)
    setStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setError(null)
    setStep(prev => Math.max(prev - 1, 0))
  }

  const handleSubmit = async () => {
    const message =
      validateStep(0) ||
      validateStep(1) ||
      validateStep(2) ||
      validateStep(3) ||
      validateStep(4)

    if (message) {
      setError(message)
      toast(message, 'error')
      return
    }

    const registration =
      form.registration.trim().toUpperCase() ||
      `PENDING-${Date.now().toString().slice(-6)}`

    const schedule = buildInstallmentSchedule({
      premium: premiumNumber,
      installmentCount: form.installment_count,
      startDate: form.start_date,
      overrides: form.installment_overrides.map(item => ({
        amount: parseNumberInput(item.amount),
        due_date: item.due_date,
      })),
      maxInstallments: form.allow_five_installments ? 5 : 3,
    })

    setSaving(true)
    setError(null)

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
          chassis: form.chassis.trim().toUpperCase() || null,
          make: resolvedMake,
          model: resolvedModel,
          year: form.year,
          engine_capacity: form.engine_capacity,
          vehicle_value: parseNumberInput(form.vehicle_value),
          use_type: form.use_type,
          insurer: resolvedInsurer,
          policy_number: form.policy_number,
          policy_type: form.policy_type,
          start_date: form.start_date,
          expiry_date: form.expiry_date,
          sum_insured: parseNumberInput(form.sum_insured),
          premium: parseNumberInput(form.premium),
          vehicle_notes: form.vehicle_notes,
          cover_notes: form.cover_notes,
          payment_notes: form.payment_notes,
        },
        schedule,
      })

      toast('Client saved successfully.')
      navigate('/clients', { replace: true })
    } catch (err) {
      const failMessage = err.message || 'Could not save client. Try again.'
      setError(failMessage)
      toast(failMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  const policyTypeLabel =
    POLICY_TYPES.find(type => type.value === form.policy_type)?.label ??
    form.policy_type

  return (
    <PageShell narrow>
      <div>
        <Link
          to="/clients"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-primary-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50"
        >
          ← Back to portfolio
        </Link>
      </div>

      <div>
        <p className={EYEBROW}>New policy</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Add client
        </h1>
        <p className="mt-1.5 text-base text-slate-500">
          Guided onboarding — insured, vehicle, cover, dates, and payment plan.
          Fields marked <span className="text-red-600">*</span> are required.
        </p>
      </div>

      <StepProgress current={step} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-base text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
        <StepHeader step={step} />

        {step === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Insured name" required>
              <input
                autoFocus
                placeholder="Full name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Phone" required>
              <input
                placeholder="Phone number"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="National ID">
              <input
                placeholder="ID number"
                value={form.id_number}
                onChange={e => set('id_number', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input
                placeholder="Address"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field
              label="General client notes"
              hint="Internal remarks about the client"
              className="sm:col-span-2"
            >
              <textarea
                rows={3}
                placeholder="General notes…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Registration number"
              hint="Optional if chassis is provided"
            >
              <input
                autoFocus
                placeholder="e.g. KDA 123A"
                value={form.registration}
                onChange={e => set('registration', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field
              label="Chassis number"
              hint="Optional if registration is provided"
            >
              <input
                placeholder="Chassis / VIN"
                value={form.chassis}
                onChange={e => set('chassis', e.target.value)}
                className={INPUT}
              />
            </Field>
            <p className="sm:col-span-2 text-sm text-slate-500">
              At least one of registration or chassis is required
              <span className="ml-0.5 text-red-600">*</span>
            </p>

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

            {form.make === 'Other' && (
              <>
                <Field label="Other make">
                  <input
                    placeholder="Enter make"
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
              </>
            )}

            {form.make !== 'Other' && form.model === 'Other' && (
              <Field label="Other model" className="sm:col-span-2">
                <input
                  placeholder="Enter model"
                  value={form.model_other}
                  onChange={e => set('model_other', e.target.value)}
                  className={INPUT}
                />
              </Field>
            )}

            <Field label="Year">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Year"
                value={form.year}
                onChange={e =>
                  set('year', e.target.value.replace(/\D/g, '').slice(0, 4))
                }
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
            <Field label="Vehicle notes" className="sm:col-span-2">
              <textarea
                rows={3}
                placeholder="Vehicle condition, plate history, garage notes…"
                value={form.vehicle_notes}
                onChange={e => set('vehicle_notes', e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cover type" className="sm:col-span-2">
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
            <Field label="Policy number">
              <input
                placeholder="Policy no."
                value={form.policy_number}
                onChange={e => set('policy_number', e.target.value)}
                className={INPUT}
              />
            </Field>
            {form.insurer === 'Other' && (
              <Field label="Other insurer name" className="sm:col-span-2">
                <input
                  placeholder="Enter insurer name"
                  value={form.insurer_other}
                  onChange={e => set('insurer_other', e.target.value)}
                  className={INPUT}
                />
              </Field>
            )}
            <Field label="Total premium" required>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.premium}
                onChange={e => setAmount('premium', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Sum insured">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.sum_insured}
                onChange={e => setAmount('sum_insured', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Cover / policy notes" className="sm:col-span-2">
              <textarea
                rows={3}
                placeholder="Endorsements, special terms, insurer notes…"
                value={form.cover_notes}
                onChange={e => set('cover_notes', e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Policy start date"
              required
              hint="Installment due dates are generated from this date"
            >
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Annual renewal / expiry" required>
              <input
                type="date"
                value={form.expiry_date}
                onChange={e => {
                  setDatesTouched(true)
                  set('expiry_date', e.target.value)
                }}
                className={INPUT}
              />
            </Field>
            {!datesTouched && (
              <p className="sm:col-span-2 text-sm text-slate-500">
                Expiry defaults to one year after the start date and stays
                editable.
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  Total premium
                </p>
                <p className="mt-1.5 text-lg font-black text-slate-950 sm:text-xl">
                  {formatKSh(premiumNumber)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  Installments
                </p>
                <p className="mt-1.5 text-lg font-black text-slate-950 sm:text-xl">
                  {form.installment_count}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  Per installment
                </p>
                <p className="mt-1.5 text-lg font-black text-slate-950 sm:text-xl">
                  {formatKSh(
                    draftSchedule?.installments?.[0]?.amount ??
                      (premiumNumber / Math.max(form.installment_count, 1)),
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  First due
                </p>
                <p className="mt-1.5 text-lg font-black text-slate-950 sm:text-xl">
                  {form.start_date || '—'}
                </p>
              </div>
            </div>

            <Field label="Number of installments" required>
              <div className="flex flex-wrap gap-2">
                {installmentOptions.map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => set('installment_count', count)}
                    className={`min-w-[3rem] rounded-xl border px-4 py-2.5 text-base font-bold transition ${
                      form.installment_count === count
                        ? 'border-primary-300 bg-primary-50 text-primary-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-primary-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </Field>

            <label className="flex items-center gap-2 text-base text-slate-700">
              <input
                type="checkbox"
                checked={form.allow_five_installments}
                onChange={e => set('allow_five_installments', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary-700 focus:ring-primary-500"
              />
              Allow up to 5 installments
            </label>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Installment schedule
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Due dates auto-fill monthly from the policy start date. Amounts
                  and dates remain editable.
                </p>
              </div>

              {(draftSchedule?.installments ?? []).map((installment, index) => {
                const override = form.installment_overrides[index] ?? {
                  amount: String(installment.amount),
                  due_date: installment.due_date,
                }

                return (
                  <div
                    key={installment.number}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:grid-cols-[auto_1fr_1fr]"
                  >
                    <div className="flex items-center">
                      <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                        #{installment.number}
                      </span>
                    </div>
                    <Field label="Amount">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={override.amount}
                        onChange={e =>
                          updateInstallment(index, 'amount', e.target.value)
                        }
                        className={INPUT}
                      />
                    </Field>
                    <Field label="Due date">
                      <input
                        type="date"
                        value={override.due_date}
                        onChange={e =>
                          updateInstallment(index, 'due_date', e.target.value)
                        }
                        className={INPUT}
                      />
                    </Field>
                  </div>
                )
              })}
            </div>

            <Field label="Payment notes">
              <textarea
                rows={3}
                placeholder="Agreed payment terms, M-Pesa instructions…"
                value={form.payment_notes}
                onChange={e => set('payment_notes', e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <dl className="rounded-xl border border-slate-200 bg-slate-50/70 px-4">
              <ReviewRow label="Insured" value={form.name} />
              <ReviewRow label="Phone" value={form.phone} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow
                label="Registration"
                value={form.registration.trim().toUpperCase() || 'Pending'}
              />
              <ReviewRow
                label="Chassis"
                value={form.chassis.trim().toUpperCase()}
              />
              <ReviewRow
                label="Vehicle"
                value={`${form.year ? `${form.year} ` : ''}${resolvedMake} ${resolvedModel}`}
              />
              <ReviewRow label="Cover" value={policyTypeLabel} />
              <ReviewRow label="Insurer" value={resolvedInsurer} />
              <ReviewRow label="Premium" value={formatKSh(premiumNumber)} />
              <ReviewRow label="Start date" value={form.start_date} />
              <ReviewRow label="Expiry" value={form.expiry_date} />
              <ReviewRow
                label="Installments"
                value={`${form.installment_count} payment${form.installment_count === 1 ? '' : 's'}`}
              />
            </dl>

            {draftSchedule?.installments?.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-base font-bold text-slate-900">
                    Payment schedule
                  </h3>
                </div>
                <ul className="divide-y divide-slate-100">
                  {draftSchedule.installments.map(item => (
                    <li
                      key={item.number}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-base"
                    >
                      <span className="font-semibold text-slate-800">
                        Installment {item.number}
                      </span>
                      <span className="text-slate-500">{item.due_date}</span>
                      <span className="font-bold text-slate-950">
                        {formatKSh(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || saving}
            className={BTN_SECONDARY}
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className={BTN_PRIMARY}>
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className={BTN_PRIMARY}
            >
              {saving ? 'Saving…' : 'Confirm & save client'}
            </button>
          )}
        </div>
      </div>
    </PageShell>
  )
}
