import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import {
  amountsFromRates,
  buildInstallmentSchedule,
  formatKSh,
  presetInstallmentRates,
  rateFromAmount,
} from '../utils/calculator'
import { formatNumberInput, parseNumberInput, premiumFromRate } from '../utils/numberInput'
import { defaultExpiryDate, formatDisplayDate } from '../utils/policyDates'
import DateInput from '../components/ui/DateInput'
import { toast } from '../store/toastStore'
import { INSURER_OPTIONS } from '../constants/insurers'
import { CAR_MAKE_OPTIONS, getCarModelOptions } from '../constants/carMakes'
import {
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from '../constants/formStyles'

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
  { id: 'insured', title: 'Insured', caption: 'Enter the insured person’s details. You can add vehicle and cover information in the next steps.' },
  { id: 'vehicle', title: 'Vehicle', caption: 'Identify the vehicle with registration or chassis, then add make, model, and use.' },
  { id: 'cover', title: 'Cover', caption: 'Set the insurer, policy type, and total premium. Sum insured comes from the vehicle value.' },
  { id: 'dates', title: 'Dates', caption: 'Confirm the policy start and expiry dates for this cover period.' },
  { id: 'payment', title: 'Payment', caption: 'Choose installments, set % split (e.g. 40 / 30 / 30), and adjust due dates if needed.' },
  { id: 'review', title: 'Review', caption: 'Confirm the details below, then save.' },
]

const DEFAULT_INSTALLMENT_OPTIONS = [1, 2, 3]
const EXTENDED_INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5]

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
  premium_rate: '',
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
      <label className="text-sm font-medium text-slate-600">
        {label}
        {required && <span className="text-slate-400">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-sm text-slate-400">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function StepHeader({ step }) {
  return (
    <div className="mx-auto w-full max-w-4xl text-left sm:text-center">
      <h2 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
        {STEPS[step].title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 sm:mx-auto">
        {STEPS[step].caption}
      </p>
    </div>
  )
}

function StepProgress({ current }) {
  return (
    <ol className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1 hide-scrollbar">
      {STEPS.map((step, index) => {
        const active = index === current
        const done = index < current

        return (
          <li key={step.id} className="min-w-[7.25rem] flex-1 sm:min-w-0">
            <div
              className={`flex h-full items-center justify-center gap-2 rounded-xl px-2.5 py-3 transition-all sm:px-3 ${
                active
                  ? 'bg-step-active text-white shadow-soft'
                  : done
                    ? 'bg-white text-primary-700 shadow-soft'
                    : 'text-slate-400'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? 'bg-white/20 text-white'
                    : done
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-slate-200/80 text-slate-500'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span
                className={`truncate text-xs font-semibold sm:text-[13px] ${
                  active ? 'text-white' : done ? 'text-primary-700' : 'text-slate-400'
                }`}
              >
                {step.title}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function ReviewFact({ label, value, className = '' }) {
  if (value == null || value === '') return null
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-base font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  )
}

function ReviewSection({ title, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 ${className}`}
    >
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </h3>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </section>
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

  const setVehicleValue = value => {
    const formatted = formatNumberInput(value)
    setForm(prev => {
      const next = {
        ...prev,
        vehicle_value: formatted,
      }
      const calculated = premiumFromRate(formatted, prev.premium_rate)
      if (calculated != null) {
        next.premium = calculated
        next.installment_overrides = []
      }
      return next
    })
  }

  const setPremiumRate = value => {
    const formatted = formatNumberInput(value)
    setForm(prev => {
      const next = { ...prev, premium_rate: formatted }
      const calculated = premiumFromRate(prev.vehicle_value, formatted)
      if (calculated != null) {
        next.premium = calculated
        next.installment_overrides = []
      }
      return next
    })
  }

  const setPremiumAmount = value => {
    setForm(prev => ({
      ...prev,
      premium: formatNumberInput(value),
      premium_rate: '',
      installment_overrides: [],
    }))
  }

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
        amount: formatNumberInput(String(item.amount)),
        rate: formatNumberInput(String(item.rate)),
        due_date: item.due_date,
      })),
    }))
  }, [draftSchedule, form.installment_overrides.length])

  const getInstallmentRows = (prev = form) => {
    if (prev.installment_overrides.length > 0) return prev.installment_overrides
    return (draftSchedule?.installments ?? []).map(item => ({
      amount: formatNumberInput(String(item.amount)),
      rate: formatNumberInput(String(item.rate)),
      due_date: item.due_date,
    }))
  }

  const applyInstallmentRates = (rates, dueDates) => {
    const amounts = amountsFromRates(premiumNumber, rates)
    return rates.map((rate, index) => ({
      rate: formatNumberInput(String(rate)),
      amount: formatNumberInput(String(amounts[index] ?? 0)),
      due_date:
        dueDates?.[index] ||
        draftSchedule?.installments?.[index]?.due_date ||
        form.start_date,
    }))
  }

  const applyRatePreset = preset => {
    const rates = presetInstallmentRates(form.installment_count, preset)
    setForm(prev => ({
      ...prev,
      installment_overrides: applyInstallmentRates(
        rates,
        getInstallmentRows(prev).map(item => item.due_date),
      ),
    }))
  }

  const updateInstallment = (index, key, value) => {
    setForm(prev => {
      const base = getInstallmentRows(prev)

      if (key === 'due_date') {
        return {
          ...prev,
          installment_overrides: base.map((item, i) =>
            i === index ? { ...item, due_date: value } : item,
          ),
        }
      }

      if (key === 'rate') {
        const rate = formatNumberInput(value)
        const rates = base.map((row, i) =>
          i === index
            ? Number(parseNumberInput(rate)) || 0
            : Number(parseNumberInput(row.rate)) || 0,
        )
        const amounts = amountsFromRates(premiumNumber, rates)

        return {
          ...prev,
          installment_overrides: base.map((item, i) => ({
            ...item,
            rate: i === index ? rate : item.rate,
            amount: formatNumberInput(String(amounts[i] ?? 0)),
          })),
        }
      }

      const amount = formatNumberInput(value)
      return {
        ...prev,
        installment_overrides: base.map((item, i) =>
          i === index
            ? {
                ...item,
                amount,
                rate: formatNumberInput(
                  String(
                    rateFromAmount(
                      premiumNumber,
                      parseNumberInput(amount) || 0,
                    ),
                  ),
                ),
              }
            : item,
        ),
      }
    })
  }

  const rateTotal = form.installment_overrides.reduce(
    (sum, item) => sum + (Number(parseNumberInput(item.rate)) || 0),
    0,
  )
  const amountTotal = form.installment_overrides.reduce(
    (sum, item) => sum + (Number(parseNumberInput(item.amount)) || 0),
    0,
  )
  const ratesBalanced = Math.abs(rateTotal - 100) < 0.05
  const amountsBalanced =
    premiumNumber > 0 && Math.abs(amountTotal - premiumNumber) < 0.5

  const installmentPresets =
    form.installment_count === 2
      ? [
          { id: 'equal', label: 'Equal' },
          { id: '60-40', label: '60 / 40' },
          { id: '70-30', label: '70 / 30' },
        ]
      : form.installment_count === 3
        ? [
            { id: 'equal', label: 'Equal' },
            { id: '40-30-30', label: '40 / 30 / 30' },
            { id: '50-30-20', label: '50 / 30 / 20' },
          ]
        : form.installment_count === 4
          ? [
              { id: 'equal', label: 'Equal' },
              { id: '40-20-20-20', label: '40 / 20 / 20 / 20' },
            ]
          : [{ id: 'equal', label: 'Equal' }]

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
      if (form.installment_overrides.length > 0 && !ratesBalanced) {
        return 'Installment rates must add up to 100%.'
      }
      if (form.installment_overrides.length > 0 && !amountsBalanced) {
        return 'Installment amounts must add up to the total premium.'
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
          sum_insured: parseNumberInput(form.vehicle_value),
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
    <div className="flex min-h-full flex-col bg-white lg:min-h-[calc(100vh-4rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/clients"
          className="inline-flex items-center text-sm font-semibold text-primary-600 transition hover:text-primary-700"
        >
          ← Back to portfolio
        </Link>
        <p className="text-sm font-medium text-slate-400">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <div className="border-b border-slate-100 px-4 py-3 sm:px-6 lg:px-8">
        <StepProgress current={step} />
      </div>

      <div className="flex flex-1 flex-col space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <StepHeader step={step} />

        {error && (
          <div className="mx-auto w-full max-w-4xl rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mx-auto w-full max-w-4xl flex-1">
            {step === 0 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
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
                    placeholder="Email address"
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
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
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
                  <span className="text-slate-400">*</span>
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
                onChange={e => setVehicleValue(e.target.value)}
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
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
            <Field
              label="Sum insured"
              hint="Taken from vehicle value"
            >
              <input
                type="text"
                readOnly
                value={form.vehicle_value || '-'}
                className={`${INPUT} bg-slate-50 text-slate-600`}
                tabIndex={-1}
              />
            </Field>
            <Field
              label="Premium rate"
              hint="Optional. Enter % of sum insured to calculate total premium."
            >
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 4.5"
                  value={form.premium_rate}
                  onChange={e => setPremiumRate(e.target.value)}
                  className={`${INPUT} pr-10`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-slate-400">
                  %
                </span>
              </div>
            </Field>
            <Field
              label="Total premium"
              required
              hint={
                form.premium_rate
                  ? 'Calculated from sum insured × rate. Edit to override.'
                  : undefined
              }
              className="sm:col-span-2"
            >
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.premium}
                onChange={e => setPremiumAmount(e.target.value)}
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
            <Field
              label="Policy start date"
              required
              hint="Installment due dates are generated from this date"
            >
              <DateInput
                value={form.start_date}
                onChange={value => set('start_date', value)}
              />
            </Field>
            <Field
              label="Annual renewal / expiry"
              required
              hint="Defaults to one day before the start anniversary (e.g. start 8th → renew 7th)"
            >
              <DateInput
                value={form.expiry_date}
                onChange={value => {
                  setDatesTouched(true)
                  set('expiry_date', value)
                }}
              />
            </Field>
            {!datesTouched && (
              <p className="sm:col-span-2 text-sm text-slate-500">
                Expiry defaults to one day before the start anniversary (e.g.
                start 8th → renew 7th) and stays editable.
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
                <p className="mt-1.5 text-lg font-bold text-slate-950 sm:text-xl">
                  {formatKSh(premiumNumber)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  Installments
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-950 sm:text-xl">
                  {form.installment_count}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  First installment
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-950 sm:text-xl">
                  {formatKSh(
                    Number(
                      parseNumberInput(
                        form.installment_overrides[0]?.amount,
                      ),
                    ) ||
                      draftSchedule?.installments?.[0]?.amount ||
                      0,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  First due
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-950 sm:text-xl">
                  {formatDisplayDate(form.start_date) || '-'}
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
                  Set each installment as a % of total premium (e.g. 40 / 30 /
                  30). Due dates follow the plan and stay editable.
                </p>
              </div>

              {installmentPresets.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {installmentPresets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyRatePreset(preset.id)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}

              {(draftSchedule?.installments ?? []).map((installment, index) => {
                const override = form.installment_overrides[index] ?? {
                  amount: formatNumberInput(String(installment.amount)),
                  rate: formatNumberInput(String(installment.rate)),
                  due_date: installment.due_date,
                }

                return (
                  <div
                    key={installment.number}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:grid-cols-[auto_minmax(5.5rem,0.7fr)_1fr_1fr]"
                  >
                    <div className="flex items-center">
                      <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                        #{installment.number}
                      </span>
                    </div>
                    <Field label="Rate">
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={override.rate ?? ''}
                          onChange={e =>
                            updateInstallment(index, 'rate', e.target.value)
                          }
                          className={`${INPUT} pr-10`}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-slate-400">
                          %
                        </span>
                      </div>
                    </Field>
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
                      <DateInput
                        value={override.due_date}
                        onChange={value =>
                          updateInstallment(index, 'due_date', value)
                        }
                      />
                    </Field>
                  </div>
                )
              })}

              {form.installment_overrides.length > 0 && (
                <p
                  className={`text-sm font-medium ${
                    ratesBalanced && amountsBalanced
                      ? 'text-slate-500'
                      : 'text-amber-700'
                  }`}
                >
                  Rates total {rateTotal.toFixed(2)}%
                  {!ratesBalanced ? ' (should be 100%)' : ''}
                  {' · '}
                  Amounts {formatKSh(amountTotal)}
                  {!amountsBalanced
                    ? ` (should be ${formatKSh(premiumNumber)})`
                    : ''}
                </p>
              )}
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
            <div className="rounded-2xl bg-slate-950 px-5 py-5 text-white sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                Ready to save
              </p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-2xl font-bold tracking-tight">
                    {form.name || '-'}
                  </h3>
                  <p className="mt-1 text-base text-white/70">
                    {form.registration.trim().toUpperCase() || 'Pending reg'}
                    {' · '}
                    {[form.year, resolvedMake, resolvedModel]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                    Total premium
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {formatKSh(premiumNumber)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ReviewSection title="Insured">
                <ReviewFact label="Name" value={form.name} />
                <ReviewFact label="Phone" value={form.phone} />
                <ReviewFact label="ID number" value={form.id_number} />
                <ReviewFact label="Email" value={form.email} />
                <ReviewFact
                  label="Address"
                  value={form.address}
                  className="sm:col-span-2"
                />
              </ReviewSection>

              <ReviewSection title="Vehicle">
                <ReviewFact
                  label="Registration"
                  value={
                    form.registration.trim().toUpperCase() || 'Pending'
                  }
                />
                <ReviewFact
                  label="Chassis"
                  value={form.chassis.trim().toUpperCase()}
                />
                <ReviewFact
                  label="Make / model"
                  value={`${resolvedMake} ${resolvedModel}`}
                />
                <ReviewFact label="Year" value={form.year} />
                <ReviewFact
                  label="Vehicle value(Kshs)"
                  value={
                    form.vehicle_value
                      ? formatKSh(Number(parseNumberInput(form.vehicle_value)) || 0)
                      : null
                  }
                />
                <ReviewFact
                  label="Use"
                  value={
                    USE_TYPES.find(type => type.value === form.use_type)
                      ?.label
                  }
                />
              </ReviewSection>

              <ReviewSection title="Cover" className="lg:col-span-2">
                <ReviewFact label="Cover type" value={policyTypeLabel} />
                <ReviewFact label="Insurer" value={resolvedInsurer} />
                <ReviewFact label="Policy number" value={form.policy_number} />
                <ReviewFact
                  label="Sum insured"
                  value={
                    form.vehicle_value
                      ? formatKSh(Number(parseNumberInput(form.vehicle_value)) || 0)
                      : null
                  }
                />
                <ReviewFact
                  label="Start"
                  value={formatDisplayDate(form.start_date)}
                />
                <ReviewFact
                  label="Renewal / expiry"
                  value={formatDisplayDate(form.expiry_date)}
                />
              </ReviewSection>
            </div>

            {(form.installment_overrides.length > 0 ||
              draftSchedule?.installments?.length > 0) && (
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      Payment plan
                    </h3>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {form.installment_count} installment
                      {form.installment_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    {formatKSh(premiumNumber)} total
                  </p>
                </div>

                <ul className="divide-y divide-slate-100">
                  {(form.installment_overrides.length > 0
                    ? form.installment_overrides
                    : draftSchedule.installments
                  ).map((item, index) => {
                    const amount =
                      Number(parseNumberInput(item.amount)) ||
                      Number(item.amount) ||
                      0
                    const rate =
                      item.rate != null && item.rate !== ''
                        ? Number(parseNumberInput(item.rate)) || item.rate
                        : null

                    return (
                      <li
                        key={item.number || index}
                        className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[3rem_4.5rem_1fr_auto] sm:gap-4 sm:px-5"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                          {index + 1}
                        </span>
                        <span className="hidden text-sm font-semibold text-slate-500 sm:block">
                          {rate != null ? `${rate}%` : '-'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {formatDisplayDate(item.due_date)}
                          </p>
                          <p className="text-sm text-slate-500 sm:hidden">
                            {rate != null ? `${rate}% of premium` : 'Installment'}
                          </p>
                        </div>
                        <span className="text-right text-base font-bold text-slate-950">
                          {formatKSh(amount)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {(form.notes || form.vehicle_notes || form.cover_notes || form.payment_notes) && (
              <ReviewSection title="Notes" className="lg:col-span-2">
                <ReviewFact label="Client notes" value={form.notes} />
                <ReviewFact label="Vehicle notes" value={form.vehicle_notes} />
                <ReviewFact label="Cover notes" value={form.cover_notes} />
                <ReviewFact label="Payment notes" value={form.payment_notes} />
              </ReviewSection>
            )}
          </div>
        )}
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || saving}
            className={BTN_SECONDARY}
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className={`${BTN_PRIMARY} sm:min-w-[9rem]`}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className={`${BTN_PRIMARY} sm:min-w-[9rem]`}
            >
              {saving ? 'Saving…' : 'Confirm & save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
