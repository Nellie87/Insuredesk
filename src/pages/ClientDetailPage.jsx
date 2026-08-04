import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useClients } from '../hooks/useClients'
import { usePayments } from '../hooks/usePayments'
import {
  buildInstallmentSchedule,
  formatKSh,
  getVehicleSchedules,
  getOutstandingBalance,
  getAmountPaid,
  getInstallmentPaidAmount,
  getNextDueInstallment,
} from '../utils/calculator'
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
import StatusBadge from '../components/ui/StatusBadge'
import LottieLoader from '../components/ui/LottieLoader'
import PageShell from '../components/layout/PageShell'

const POLICY_LABELS = {
  comprehensive: 'Comprehensive',
  third_party: 'Third Party',
  third_party_fire_theft: 'Third Party, Fire & Theft',
}

const POLICY_TYPES = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'third_party', label: 'Third Party' },
  { value: 'third_party_fire_theft', label: 'Third Party Fire & Theft' },
]

const USE_LABELS = {
  private: 'Private',
  commercial: 'Commercial',
  psv: 'PSV',
}

const USE_TYPES = [
  { value: 'private', label: 'Private' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'psv', label: 'PSV' },
]

const METHOD_LABELS = {
  mpesa: 'M-Pesa',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  cheque: 'Cheque',
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'd MMM yyyy')
  } catch {
    return value
  }
}

function formatShortDate(value) {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'dd MMM')
  } catch {
    return value
  }
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getProgressPercentage(paid, total) {
  const safePaid = toNumber(paid)
  const safeTotal = toNumber(total)
  if (safeTotal <= 0) return 0
  return Math.min(100, Math.max(0, (safePaid / safeTotal) * 100))
}

function getInitials(name) {
  if (!name) return 'CL'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

function getPaymentMethodStyles(method) {
  switch (method) {
    case 'mpesa':
      return {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
      }
    case 'bank_transfer':
      return {
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        dot: 'bg-blue-500',
      }
    case 'cash':
      return {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
      }
    case 'cheque':
      return {
        badge: 'border-violet-200 bg-violet-50 text-violet-700',
        dot: 'bg-violet-500',
      }
    default:
      return {
        badge: 'border-slate-200 bg-slate-50 text-slate-700',
        dot: 'bg-slate-400',
      }
  }
}

function getInstallmentStatus(installment) {
  const paidAmount = getInstallmentPaidAmount(installment)
  const amount = toNumber(installment.amount)
  const remaining = Math.max(amount - paidAmount, 0)

  if (installment.paid || (amount > 0 && paidAmount >= amount)) {
    return {
      label: 'Paid',
      paidAmount,
      remaining: 0,
      dotClass: 'bg-emerald-500 ring-emerald-100',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      lineClass: 'bg-emerald-200',
    }
  }

  if (paidAmount > 0) {
    return {
      label: 'Partial',
      paidAmount,
      remaining,
      dotClass: 'bg-blue-500 ring-blue-100',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      lineClass: 'bg-blue-200',
    }
  }

  return {
    label: 'Due',
    paidAmount: 0,
    remaining: amount,
    dotClass: 'bg-amber-500 ring-amber-100',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    lineClass: 'bg-slate-200',
  }
}

function Field({ label, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className={LABEL}>
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function DetailItem({ label, value, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold text-slate-800">
        {value || '—'}
      </dd>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  caption,
  valueClassName = 'text-slate-950',
  className = '',
}) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-card ${className}`}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-xl font-black leading-tight tracking-tight sm:text-2xl ${valueClassName}`}
      >
        {value}
      </p>
      {caption && (
        <p className="mt-1.5 text-sm leading-5 text-slate-500">{caption}</p>
      )}
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-base text-slate-400">
      {children}
    </div>
  )
}

function NotesBlock({ title, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(value || '')
  }, [value, editing])

  const save = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
      toast('Notes saved.')
    } catch (err) {
      toast(err.message || 'Could not save notes.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
          {title}
        </p>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-bold text-primary-700 hover:text-primary-800"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(value || '')
                setEditing(false)
              }}
              className="text-sm font-bold text-slate-500"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-sm font-bold text-primary-700"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          rows={3}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className={`${INPUT} mt-2`}
          placeholder={`Add ${title.toLowerCase()}…`}
        />
      ) : value ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-base leading-6 text-slate-700">
          {value}
        </p>
      ) : (
        <p className="mt-2 text-base text-slate-400">No notes yet.</p>
      )}
    </div>
  )
}

function SectionEditBar({ editing, onEdit, onCancel, onSave, saving }) {
  if (editing) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={BTN_SECONDARY}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={BTN_PRIMARY}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={onEdit} className={BTN_SECONDARY}>
      Edit
    </button>
  )
}

function PremiumPanel({ totalPremium, amountPaid, outstanding, progress, fullyPaid, nextDue }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            Total premium
          </p>
          <p className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950">
            {formatKSh(totalPremium)}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            Amount paid
          </p>
          <p className="mt-2 break-words text-2xl font-black tracking-tight text-emerald-700">
            {formatKSh(amountPaid)}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            Outstanding balance
          </p>
          <p
            className={`mt-2 break-words text-2xl font-black tracking-tight ${
              fullyPaid ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {formatKSh(outstanding)}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-base font-bold text-slate-900">Payment progress</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {fullyPaid
                ? 'This premium has been fully paid.'
                : `${Math.round(progress)}% of the premium has been received.`}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-sm font-bold ${
              fullyPaid
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {fullyPaid ? 'Fully paid' : `${Math.round(progress)}% paid`}
          </span>
        </div>

        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Premium payment progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              fullyPaid ? 'bg-emerald-500' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {nextDue && !fullyPaid && (
          <div className="mt-3 flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-700">
                Next installment
              </p>
              <p className="mt-1 text-base font-semibold text-amber-950">
                Due {formatDate(nextDue.due_date)}
              </p>
            </div>
            <p className="text-xl font-black text-amber-900">
              {formatKSh(nextDue.amount)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function VehicleCard({
  vehicle,
  onUpdateVehicle,
  onUpdateSchedule,
  onCreateSchedule,
}) {
  const schedules = getVehicleSchedules(vehicle)
  const schedule = schedules[0] ?? null

  const nextDue = schedule ? getNextDueInstallment(schedule) : null
  const totalPremium = schedule
    ? toNumber(schedule.total_premium ?? vehicle.premium)
    : toNumber(vehicle.premium)
  const amountPaid = schedule ? toNumber(getAmountPaid(schedule)) : 0
  const outstanding = schedule
    ? Math.max(toNumber(getOutstandingBalance(schedule)), 0)
    : totalPremium
  const progress = getProgressPercentage(amountPaid, totalPremium)
  const installments = schedule?.installments ?? []
  const fullyPaid = schedule && outstanding <= 0

  const [editingVehicle, setEditingVehicle] = useState(false)
  const [editingCover, setEditingCover] = useState(false)
  const [editingDates, setEditingDates] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [saving, setSaving] = useState(false)

  const [vehicleForm, setVehicleForm] = useState({})
  const [coverForm, setCoverForm] = useState({})
  const [datesForm, setDatesForm] = useState({})
  const [planForm, setPlanForm] = useState({
    installment_count: 3,
    allow_five: false,
    installments: [],
    premium: '',
  })

  const modelOptions = getCarModelOptions(vehicleForm.make)

  const startVehicleEdit = () => {
    setVehicleForm({
      registration: vehicle.registration || '',
      chassis: vehicle.chassis || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year ?? '',
      engine_capacity: vehicle.engine_capacity || '',
      vehicle_value: formatNumberInput(String(vehicle.vehicle_value || '')),
      use_type: vehicle.use_type || 'private',
    })
    setEditingVehicle(true)
  }

  const startCoverEdit = () => {
    setCoverForm({
      policy_type: vehicle.policy_type || 'comprehensive',
      insurer: vehicle.insurer || '',
      policy_number: vehicle.policy_number || '',
      sum_insured: formatNumberInput(String(vehicle.sum_insured || '')),
      premium: formatNumberInput(String(vehicle.premium || '')),
    })
    setEditingCover(true)
  }

  const startDatesEdit = () => {
    setDatesForm({
      start_date: vehicle.start_date || '',
      expiry_date: vehicle.expiry_date || '',
    })
    setEditingDates(true)
  }

  const startPlanEdit = () => {
    const count = schedule?.installment_count || installments.length || 3
    setPlanForm({
      installment_count: Math.min(Math.max(count, 1), 5),
      allow_five: count > 3,
      premium: formatNumberInput(String(totalPremium || vehicle.premium || '')),
      installments: (installments.length
        ? installments
        : buildInstallmentSchedule({
            premium: totalPremium || vehicle.premium,
            installmentCount: 3,
            startDate: vehicle.start_date,
          })?.installments ?? []
      ).map(item => ({
        number: item.number,
        amount: formatNumberInput(String(item.amount ?? '')),
        due_date: item.due_date || '',
        paid: item.paid,
        paid_at: item.paid_at,
        paid_amount: item.paid_amount,
      })),
    })
    setEditingPlan(true)
  }

  const regeneratePlanDates = (
    count,
    premium,
    startDate,
    allowFive,
    existingInstallments = [],
    keepPaid = true,
  ) => {
    const built = buildInstallmentSchedule({
      premium: Number(parseNumberInput(premium)) || 0,
      installmentCount: count,
      startDate,
      maxInstallments: allowFive ? 5 : 3,
      overrides: keepPaid
        ? existingInstallments.map(item => ({
            paid: item.paid,
            paid_at: item.paid_at,
            paid_amount: item.paid_amount,
          }))
        : [],
    })

    return (built?.installments ?? []).map(item => ({
      number: item.number,
      amount: formatNumberInput(String(item.amount)),
      due_date: item.due_date,
      paid: item.paid,
      paid_at: item.paid_at,
      paid_amount: item.paid_amount,
    }))
  }

  const saveVehicle = async () => {
    if (!vehicleForm.registration.trim() && !vehicleForm.chassis.trim()) {
      toast('Provide a registration number or chassis number.', 'error')
      return
    }

    setSaving(true)
    try {
      await onUpdateVehicle({
        registration:
          vehicleForm.registration.trim().toUpperCase() ||
          vehicle.registration ||
          `PENDING-${Date.now().toString().slice(-6)}`,
        chassis: vehicleForm.chassis.trim().toUpperCase() || null,
        make: vehicleForm.make.trim() || 'Unknown',
        model: vehicleForm.model.trim() || 'Unknown',
        year: vehicleForm.year ? Number(vehicleForm.year) : null,
        engine_capacity: vehicleForm.engine_capacity.trim() || null,
        vehicle_value: Number(parseNumberInput(vehicleForm.vehicle_value) || 0),
        use_type: vehicleForm.use_type,
      })
      setEditingVehicle(false)
      toast('Vehicle details updated.')
    } catch (err) {
      toast(err.message || 'Could not update vehicle.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveCover = async () => {
    const premium = Number(parseNumberInput(coverForm.premium))
    if (!premium) {
      toast('Total premium is required.', 'error')
      return
    }

    setSaving(true)
    try {
      await onUpdateVehicle({
        policy_type: coverForm.policy_type,
        insurer: coverForm.insurer.trim() || 'Unknown',
        policy_number: coverForm.policy_number.trim() || null,
        sum_insured: Number(parseNumberInput(coverForm.sum_insured) || 0),
        premium,
      })

      if (schedule) {
        await onUpdateSchedule({
          total_premium: premium,
        })
      }

      setEditingCover(false)
      toast('Cover details updated.')
    } catch (err) {
      toast(err.message || 'Could not update cover.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveDates = async () => {
    if (!datesForm.start_date || !datesForm.expiry_date) {
      toast('Start and expiry dates are required.', 'error')
      return
    }

    setSaving(true)
    try {
      await onUpdateVehicle({
        start_date: datesForm.start_date,
        expiry_date: datesForm.expiry_date,
      })
      setEditingDates(false)
      toast('Policy dates updated.')
    } catch (err) {
      toast(err.message || 'Could not update dates.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const savePlan = async () => {
    const premium = Number(parseNumberInput(planForm.premium))
    if (!premium) {
      toast('Premium is required for the payment plan.', 'error')
      return
    }

    const nextInstallments = planForm.installments.map((item, index) => ({
      number: index + 1,
      amount: Number(parseNumberInput(item.amount)) || 0,
      due_date: item.due_date,
      paid: Boolean(item.paid),
      paid_at: item.paid_at ?? null,
      paid_amount: item.paid_amount ?? null,
    }))

    if (nextInstallments.some(item => !item.due_date)) {
      toast('Each installment needs a due date.', 'error')
      return
    }

    setSaving(true)
    try {
      await onUpdateVehicle({ premium })

      const schedulePayload = {
        total_premium: premium,
        installment_count: nextInstallments.length,
        installments: nextInstallments,
        down_payment: schedule?.down_payment ?? 0,
        down_payment_paid: schedule?.down_payment_paid ?? false,
        down_payment_paid_at: schedule?.down_payment_paid_at ?? null,
      }

      if (schedule) {
        await onUpdateSchedule(schedulePayload)
      } else if (onCreateSchedule) {
        await onCreateSchedule(schedulePayload)
      }

      setEditingPlan(false)
      toast('Payment plan updated.')
    } catch (err) {
      toast(err.message || 'Could not update payment plan.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-4 text-white sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Insured vehicle
            </p>
            <h3 className="mt-1.5 break-words text-xl font-black tracking-tight">
              {vehicle.year ? `${vehicle.year} ` : ''}
              {vehicle.make} {vehicle.model}
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="inline-flex max-w-full rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-bold uppercase tracking-[0.08em] text-white">
                <span className="truncate">
                  {vehicle.registration || 'No registration'}
                </span>
              </span>
              {vehicle.chassis && (
                <span className="inline-flex max-w-full rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-white/85">
                  Chassis {vehicle.chassis}
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 border-t border-white/10 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              Insurer
            </p>
            <p className="mt-1 break-words text-base font-bold text-white">
              {vehicle.insurer || 'Not specified'}
            </p>
            {vehicle.policy_number && (
              <p className="mt-1 break-all text-sm text-slate-400">
                Policy {vehicle.policy_number}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <PremiumPanel
          totalPremium={totalPremium}
          amountPaid={amountPaid}
          outstanding={outstanding}
          progress={progress}
          fullyPaid={fullyPaid}
          nextDue={nextDue}
        />

        {/* Vehicle details */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className={SECTION_TITLE}>Vehicle details</h4>
            <SectionEditBar
              editing={editingVehicle}
              onEdit={startVehicleEdit}
              onCancel={() => setEditingVehicle(false)}
              onSave={saveVehicle}
              saving={saving}
            />
          </div>

          {editingVehicle ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Registration">
                <input
                  value={vehicleForm.registration}
                  onChange={e =>
                    setVehicleForm(prev => ({
                      ...prev,
                      registration: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Chassis">
                <input
                  value={vehicleForm.chassis}
                  onChange={e =>
                    setVehicleForm(prev => ({ ...prev, chassis: e.target.value }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Make">
                <select
                  value={vehicleForm.make}
                  onChange={e =>
                    setVehicleForm(prev => ({
                      ...prev,
                      make: e.target.value,
                      model: '',
                    }))
                  }
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
                {vehicleForm.make &&
                CAR_MAKE_OPTIONS.some(o => o.value === vehicleForm.make) &&
                vehicleForm.make !== 'Other' ? (
                  <select
                    value={vehicleForm.model}
                    onChange={e =>
                      setVehicleForm(prev => ({ ...prev, model: e.target.value }))
                    }
                    className={INPUT}
                  >
                    {modelOptions.map(option => (
                      <option key={option.value || 'empty'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={vehicleForm.model}
                    onChange={e =>
                      setVehicleForm(prev => ({ ...prev, model: e.target.value }))
                    }
                    className={INPUT}
                  />
                )}
              </Field>
              <Field label="Year">
                <input
                  type="text"
                  inputMode="numeric"
                  value={vehicleForm.year}
                  onChange={e =>
                    setVehicleForm(prev => ({
                      ...prev,
                      year: e.target.value.replace(/\D/g, '').slice(0, 4),
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Engine">
                <input
                  value={vehicleForm.engine_capacity}
                  onChange={e =>
                    setVehicleForm(prev => ({
                      ...prev,
                      engine_capacity: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Vehicle value">
                <input
                  value={vehicleForm.vehicle_value}
                  onChange={e =>
                    setVehicleForm(prev => ({
                      ...prev,
                      vehicle_value: formatNumberInput(e.target.value),
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Use type">
                <select
                  value={vehicleForm.use_type}
                  onChange={e =>
                    setVehicleForm(prev => ({
                      ...prev,
                      use_type: e.target.value,
                    }))
                  }
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
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DetailItem
                label="Registration"
                value={vehicle.registration || 'Pending'}
              />
              <DetailItem label="Chassis" value={vehicle.chassis} />
              <DetailItem
                label="Use"
                value={USE_LABELS[vehicle.use_type] ?? vehicle.use_type}
              />
              <DetailItem
                label="Value"
                value={formatKSh(vehicle.vehicle_value ?? 0)}
              />
            </div>
          )}

          <NotesBlock
            title="Vehicle notes"
            value={vehicle.vehicle_notes}
            onSave={text => onUpdateVehicle({ vehicle_notes: text.trim() || null })}
          />
        </section>

        {/* Cover */}
        <section className="space-y-3 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className={SECTION_TITLE}>Cover information</h4>
            <SectionEditBar
              editing={editingCover}
              onEdit={startCoverEdit}
              onCancel={() => setEditingCover(false)}
              onSave={saveCover}
              saving={saving}
            />
          </div>

          {editingCover ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Cover type">
                <select
                  value={coverForm.policy_type}
                  onChange={e =>
                    setCoverForm(prev => ({
                      ...prev,
                      policy_type: e.target.value,
                    }))
                  }
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
                  value={
                    INSURER_OPTIONS.some(
                      o => o.value && o.value === coverForm.insurer,
                    )
                      ? coverForm.insurer
                      : 'Other'
                  }
                  onChange={e =>
                    setCoverForm(prev => ({
                      ...prev,
                      insurer:
                        e.target.value === 'Other' ? '' : e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  {INSURER_OPTIONS.map(option => (
                    <option key={option.value || 'empty'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              {!INSURER_OPTIONS.some(
                o => o.value && o.value === coverForm.insurer,
              ) && (
                <Field label="Insurer name" className="sm:col-span-2">
                  <input
                    value={coverForm.insurer}
                    onChange={e =>
                      setCoverForm(prev => ({
                        ...prev,
                        insurer: e.target.value,
                      }))
                    }
                    className={INPUT}
                    placeholder="Enter insurer name"
                  />
                </Field>
              )}
              <Field label="Policy number">
                <input
                  value={coverForm.policy_number}
                  onChange={e =>
                    setCoverForm(prev => ({
                      ...prev,
                      policy_number: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Sum insured">
                <input
                  value={coverForm.sum_insured}
                  onChange={e =>
                    setCoverForm(prev => ({
                      ...prev,
                      sum_insured: formatNumberInput(e.target.value),
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Total premium" required className="sm:col-span-2">
                <input
                  value={coverForm.premium}
                  onChange={e =>
                    setCoverForm(prev => ({
                      ...prev,
                      premium: formatNumberInput(e.target.value),
                    }))
                  }
                  className={INPUT}
                />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DetailItem
                label="Cover type"
                value={
                  POLICY_LABELS[vehicle.policy_type] ?? vehicle.policy_type
                }
              />
              <DetailItem label="Insurer" value={vehicle.insurer} />
              <DetailItem label="Policy no." value={vehicle.policy_number} />
              <DetailItem
                label="Sum insured"
                value={formatKSh(vehicle.sum_insured ?? 0)}
              />
            </div>
          )}

          <NotesBlock
            title="Cover / policy notes"
            value={vehicle.cover_notes}
            onSave={text => onUpdateVehicle({ cover_notes: text.trim() || null })}
          />
        </section>

        {/* Policy dates */}
        <section className="space-y-3 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className={SECTION_TITLE}>Policy dates</h4>
            <SectionEditBar
              editing={editingDates}
              onEdit={startDatesEdit}
              onCancel={() => setEditingDates(false)}
              onSave={saveDates}
              saving={saving}
            />
          </div>

          {editingDates ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Start date" required>
                <input
                  type="date"
                  value={datesForm.start_date}
                  onChange={e =>
                    setDatesForm(prev => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Expiry / renewal" required>
                <input
                  type="date"
                  value={datesForm.expiry_date}
                  onChange={e =>
                    setDatesForm(prev => ({
                      ...prev,
                      expiry_date: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <DetailItem
                label="Cover started"
                value={formatDate(vehicle.start_date)}
              />
              <DetailItem
                label="Annual renewal"
                value={formatDate(vehicle.expiry_date)}
              />
            </div>
          )}
        </section>

        {/* Payment plan */}
        <section className="space-y-3 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className={SECTION_TITLE}>Payment plan & installments</h4>
              <p className="mt-1 text-sm text-slate-500">
                Edit installment amounts and due dates without re-onboarding.
              </p>
            </div>
            <SectionEditBar
              editing={editingPlan}
              onEdit={startPlanEdit}
              onCancel={() => setEditingPlan(false)}
              onSave={savePlan}
              saving={saving}
            />
          </div>

          {editingPlan ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Total premium" required>
                  <input
                    value={planForm.premium}
                    onChange={e =>
                      setPlanForm(prev => ({
                        ...prev,
                        premium: formatNumberInput(e.target.value),
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
                <Field label="Installment count">
                  <div className="flex flex-wrap gap-2">
                    {(planForm.allow_five ? [1, 2, 3, 4, 5] : [1, 2, 3]).map(
                      count => (
                        <button
                          key={count}
                          type="button"
                          onClick={() =>
                            setPlanForm(prev => ({
                              ...prev,
                              installment_count: count,
                              installments: regeneratePlanDates(
                                count,
                                prev.premium,
                                vehicle.start_date,
                                prev.allow_five,
                                prev.installments,
                              ),
                            }))
                          }
                          className={`min-w-[3rem] rounded-xl border px-3 py-2 text-base font-bold ${
                            planForm.installment_count === count
                              ? 'border-primary-300 bg-primary-50 text-primary-800'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {count}
                        </button>
                      ),
                    )}
                  </div>
                </Field>
              </div>

              <label className="flex items-center gap-2 text-base text-slate-700">
                <input
                  type="checkbox"
                  checked={planForm.allow_five}
                  onChange={e => {
                    const allow = e.target.checked
                    setPlanForm(prev => {
                      const count =
                        !allow && prev.installment_count > 3
                          ? 3
                          : prev.installment_count
                      return {
                        ...prev,
                        allow_five: allow,
                        installment_count: count,
                        installments: regeneratePlanDates(
                          count,
                          prev.premium,
                          vehicle.start_date,
                          allow,
                          prev.installments,
                        ),
                      }
                    })
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-primary-700"
                />
                Allow up to 5 installments
              </label>

              <button
                type="button"
                className="text-sm font-bold text-primary-700"
                onClick={() =>
                  setPlanForm(prev => ({
                    ...prev,
                    installments: regeneratePlanDates(
                      prev.installment_count,
                      prev.premium,
                      vehicle.start_date,
                      prev.allow_five,
                      prev.installments,
                      false,
                    ),
                  }))
                }
              >
                Regenerate due dates from policy start
              </button>

              <div className="space-y-3">
                {planForm.installments.map((item, index) => {
                  const status = getInstallmentStatus({
                    ...item,
                    amount: parseNumberInput(item.amount),
                  })

                  return (
                    <div
                      key={item.number || index}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-[auto_1fr_1fr_auto]"
                    >
                      <div className="flex items-center">
                        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                          #{index + 1}
                        </span>
                      </div>
                      <Field label="Amount">
                        <input
                          value={item.amount}
                          onChange={e =>
                            setPlanForm(prev => ({
                              ...prev,
                              installments: prev.installments.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      amount: formatNumberInput(e.target.value),
                                    }
                                  : row,
                              ),
                            }))
                          }
                          className={INPUT}
                        />
                      </Field>
                      <Field label="Due date">
                        <input
                          type="date"
                          value={item.due_date}
                          onChange={e =>
                            setPlanForm(prev => ({
                              ...prev,
                              installments: prev.installments.map((row, i) =>
                                i === index
                                  ? { ...row, due_date: e.target.value }
                                  : row,
                              ),
                            }))
                          }
                          className={INPUT}
                        />
                      </Field>
                      <div className="flex items-end">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-sm font-bold ${status.badgeClass}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : schedule && installments.length > 0 ? (
            <div className="mt-1">
              {installments.map((installment, index) => {
                const status = getInstallmentStatus(installment)
                const isLast = index === installments.length - 1

                return (
                  <div
                    key={`${installment.number}-${installment.due_date}-${index}`}
                    className="relative flex gap-3"
                  >
                    <div className="flex w-4 shrink-0 flex-col items-center">
                      <span
                        className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ${status.dotClass}`}
                      />
                      {!isLast && (
                        <span className={`my-1 w-0.5 grow ${status.lineClass}`} />
                      )}
                    </div>

                    <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-base font-bold text-slate-900">
                              Installment {installment.number}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Due {formatDate(installment.due_date)}
                            </p>
                          </div>
                          <span
                            className={`w-fit rounded-full border px-2.5 py-1 text-sm font-bold ${status.badgeClass}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Expected
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-800">
                              {formatKSh(installment.amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Received
                            </p>
                            <p className="mt-1 text-base font-bold text-emerald-700">
                              {formatKSh(status.paidAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Remaining
                            </p>
                            <p className="mt-1 text-base font-bold text-amber-700">
                              {formatKSh(status.remaining)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 py-4">
              <p className="text-base font-semibold text-slate-700">
                No payment schedule has been created.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Recorded premium: {formatKSh(vehicle.premium ?? 0)}.
              </p>
            </div>
          )}

          <NotesBlock
            title="Payment notes"
            value={vehicle.payment_notes}
            onSave={text => onUpdateVehicle({ payment_notes: text.trim() || null })}
          />
        </section>
      </div>
    </article>
  )
}

export default function ClientDetailPage() {
  const { clientId } = useParams()
  const id = clientId?.replace(/-+$/, '')

  const {
    clients,
    loading,
    updateClient,
    updateVehicle,
    updatePaymentSchedule,
    createPaymentSchedule,
  } = useClients()
  const { payments, loading: paymentsLoading } = usePayments()

  const client = clients.find(item => item.id === id)

  const [editingInsured, setEditingInsured] = useState(false)
  const [insuredForm, setInsuredForm] = useState({})
  const [savingInsured, setSavingInsured] = useState(false)

  const clientPayments = useMemo(
    () =>
      payments
        .filter(payment => payment.client_id === id)
        .slice()
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [payments, id],
  )

  if (loading) {
    return <LottieLoader label="Loading client..." />
  }

  if (!client) {
    return (
      <PageShell>
        <Link
          to="/clients"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50"
        >
          ← Back to portfolio
        </Link>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">Client not found</h1>
          <p className="mt-2 text-base text-slate-500">
            This client may have been removed or the link may be incorrect.
          </p>
        </div>
      </PageShell>
    )
  }

  const vehicles = client.vehicles ?? []

  const vehicleSummaries = vehicles.map(vehicle => {
    const schedule = getVehicleSchedules(vehicle)[0] ?? null
    const total = schedule
      ? toNumber(schedule.total_premium ?? vehicle.premium)
      : toNumber(vehicle.premium)
    const paid = schedule ? toNumber(getAmountPaid(schedule)) : 0
    const outstanding = schedule
      ? Math.max(toNumber(getOutstandingBalance(schedule)), 0)
      : total

    return { total, paid, outstanding }
  })

  const totalPremium = vehicleSummaries.reduce((sum, item) => sum + item.total, 0)
  const totalPaid = vehicleSummaries.reduce((sum, item) => sum + item.paid, 0)
  const totalOutstanding = vehicleSummaries.reduce(
    (sum, item) => sum + item.outstanding,
    0,
  )

  const nextRenewal = vehicles
    .filter(vehicle => vehicle.expiry_date)
    .slice()
    .sort((a, b) =>
      String(a.expiry_date).localeCompare(String(b.expiry_date)),
    )[0]

  const portfolioProgress = getProgressPercentage(totalPaid, totalPremium)

  const startInsuredEdit = () => {
    setInsuredForm({
      name: client.name || '',
      phone: client.phone || '',
      id_number: client.id_number || '',
      email: client.email || '',
      address: client.address || '',
    })
    setEditingInsured(true)
  }

  const saveInsured = async () => {
    if (!insuredForm.name.trim() || !insuredForm.phone.trim()) {
      toast('Name and phone are required.', 'error')
      return
    }

    setSavingInsured(true)
    try {
      await updateClient(client.id, {
        name: insuredForm.name.trim(),
        phone: insuredForm.phone.trim(),
        id_number: insuredForm.id_number.trim() || null,
        email: insuredForm.email.trim() || null,
        address: insuredForm.address.trim() || null,
      })
      setEditingInsured(false)
      toast('Insured details updated.')
    } catch (err) {
      toast(err.message || 'Could not update client.', 'error')
    } finally {
      setSavingInsured(false)
    }
  }

  return (
    <PageShell>
      <div>
        <Link
          to="/clients"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-primary-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50"
        >
          ← Back to portfolio
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 p-4 text-white sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-base font-black shadow-inner sm:h-14 sm:w-14 sm:text-lg">
                {getInitials(client.name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">
                  Client profile
                </p>
                <h1 className="mt-1 break-words text-2xl font-black tracking-tight sm:text-3xl">
                  {client.name}
                </h1>
                <div className="mt-2 flex flex-col gap-1 text-base text-white/80 sm:flex-row sm:flex-wrap sm:gap-x-4">
                  <span className="break-all">
                    {client.phone || 'No phone number'}
                  </span>
                  {client.email && (
                    <span className="break-all">{client.email}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              <StatusBadge status={client.status} />
              <Link
                to="/payments"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-base font-bold text-primary-800 shadow-sm transition hover:bg-primary-50 lg:flex-none"
              >
                Log payment
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-white/70">
              <span>Portfolio payment progress</span>
              <span className="shrink-0">
                {Math.round(portfolioProgress)}% paid
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${portfolioProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={SECTION_TITLE}>Insured details</h2>
            <SectionEditBar
              editing={editingInsured}
              onEdit={startInsuredEdit}
              onCancel={() => setEditingInsured(false)}
              onSave={saveInsured}
              saving={savingInsured}
            />
          </div>

          {editingInsured ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" required>
                <input
                  value={insuredForm.name}
                  onChange={e =>
                    setInsuredForm(prev => ({ ...prev, name: e.target.value }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Phone" required>
                <input
                  value={insuredForm.phone}
                  onChange={e =>
                    setInsuredForm(prev => ({ ...prev, phone: e.target.value }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="National ID">
                <input
                  value={insuredForm.id_number}
                  onChange={e =>
                    setInsuredForm(prev => ({
                      ...prev,
                      id_number: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={insuredForm.email}
                  onChange={e =>
                    setInsuredForm(prev => ({ ...prev, email: e.target.value }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <input
                  value={insuredForm.address}
                  onChange={e =>
                    setInsuredForm(prev => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="ID number" value={client.id_number} />
              <DetailItem
                label="Phone number"
                value={client.phone || 'Not provided'}
              />
              <DetailItem label="Email address" value={client.email} />
              <DetailItem label="Address" value={client.address} />
            </dl>
          )}

          <NotesBlock
            title="General client notes"
            value={client.notes}
            onSave={text =>
              updateClient(client.id, { notes: text.trim() || null })
            }
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        <SummaryCard
          label="Total premium"
          value={formatKSh(totalPremium)}
          caption="Across all policies"
          className="border-blue-100"
          valueClassName="text-blue-800"
        />
        <SummaryCard
          label="Amount paid"
          value={formatKSh(totalPaid)}
          caption="Payments received"
          className="border-emerald-100"
          valueClassName="text-emerald-700"
        />
        <SummaryCard
          label="Outstanding"
          value={formatKSh(totalOutstanding)}
          caption={
            totalOutstanding <= 0
              ? 'No balance remaining'
              : 'Still expected from client'
          }
          className="border-amber-100"
          valueClassName={
            totalOutstanding <= 0 ? 'text-emerald-700' : 'text-amber-700'
          }
        />
        <SummaryCard
          label="Active policies"
          value={vehicles.length}
          caption={
            nextRenewal
              ? `Next renewal ${formatShortDate(nextRenewal.expiry_date)}`
              : 'No renewal date recorded'
          }
          className="border-violet-100"
          valueClassName="text-violet-700"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="space-y-3 xl:col-span-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <p className={EYEBROW}>Portfolio</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                Vehicles and policies
              </h2>
              <p className="mt-1 text-base text-slate-500">
                Edit cover, dates, premium, and installment schedules anytime.
              </p>
            </div>
            <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600">
              {vehicles.length}{' '}
              {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
            </span>
          </div>

          {vehicles.length === 0 ? (
            <EmptyState>No vehicles have been added for this client.</EmptyState>
          ) : (
            <div className="space-y-4">
              {vehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onUpdateVehicle={updates => updateVehicle(vehicle.id, updates)}
                  onUpdateSchedule={updates => {
                    const schedule = getVehicleSchedules(vehicle)[0]
                    if (!schedule) return Promise.resolve()
                    return updatePaymentSchedule(schedule.id, updates)
                  }}
                  onCreateSchedule={payload =>
                    createPaymentSchedule(vehicle.id, payload)
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 xl:col-span-2">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className={EYEBROW}>Transactions</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                Payment history
              </h2>
              <p className="mt-1 text-base text-slate-500">
                All payments recorded for this client.
              </p>
            </div>

            <Link
              to="/payments"
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary-700 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-primary-800"
            >
              Log payment
            </Link>
          </div>

          {paymentsLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-base text-slate-400">
              Loading payments...
            </div>
          ) : clientPayments.length === 0 ? (
            <EmptyState>
              No payments have been logged for this client.
            </EmptyState>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="divide-y divide-slate-100">
                {clientPayments.map(payment => {
                  const vehicle = vehicles.find(
                    item => item.id === payment.vehicle_id,
                  )
                  const methodStyles = getPaymentMethodStyles(payment.method)

                  return (
                    <div
                      key={payment.id}
                      className="space-y-3 px-4 py-4 transition hover:bg-slate-50/70"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm font-bold ${methodStyles.badge}`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${methodStyles.dot}`}
                            />
                            {METHOD_LABELS[payment.method] ??
                              payment.method ??
                              'Payment'}
                          </span>
                          <span className="text-sm text-slate-400">
                            {formatDate(payment.date)}
                          </span>
                        </div>

                        {payment.reference && (
                          <p className="mt-2 break-all text-base font-semibold text-slate-800">
                            Ref: {payment.reference}
                          </p>
                        )}

                        {payment.notes && (
                          <p className="mt-1 break-words text-sm leading-5 text-slate-500">
                            {payment.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-end justify-between gap-3 border-t border-slate-50 pt-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-400">
                            Vehicle
                          </p>
                          <p className="mt-1 break-words text-base font-bold text-slate-800">
                            {vehicle?.registration || 'General client payment'}
                          </p>
                          {vehicle && (
                            <p className="mt-0.5 break-words text-sm text-slate-500">
                              {vehicle.make} {vehicle.model}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium text-slate-400">
                            Amount
                          </p>
                          <p className="mt-1 text-xl font-black text-emerald-700">
                            {formatKSh(payment.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
