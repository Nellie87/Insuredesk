import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { usePayments } from '../hooks/usePayments'
import {
  amountsFromRates,
  buildInstallmentSchedule,
  formatKSh,
  getVehicleSchedules,
  getInstallmentPaidAmount,
  getNextDueInstallment,
  getVehicleCollectionSummary,
  maxInstallmentsForCover,
  presetInstallmentRates,
  rateFromAmount,
} from '../utils/calculator'
import { formatNumberInput, parseNumberInput, premiumFromRate } from '../utils/numberInput'
import { buildClientActivity, getPreviousPolicies } from '../utils/activity'
import {
  coverMonthsLabel,
  expiryFromCoverMonths,
  formatDisplayDate,
  getCoverMonths,
  isCoverExpired,
  isCoverExpiringSoon,
} from '../utils/policyDates'
import { toast } from '../store/toastStore'
import { INSURER_OPTIONS } from '../constants/insurers'
import { CAR_MAKE_OPTIONS, getCarModelOptions } from '../constants/carMakes'
import {
  INPUT,
  LABEL,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from '../constants/formStyles'
import StatusBadge from '../components/ui/StatusBadge'
import LottieLoader from '../components/ui/LottieLoader'
import DateInput from '../components/ui/DateInput'
import Select from '../components/ui/Select'
import PageShell from '../components/layout/PageShell'
import RenewCoverPanel from '../components/modules/RenewCoverPanel'

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
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
}

const PAYMENT_METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
]

function vehiclePaymentLabel(vehicle) {
  const year = vehicle.year ? `${vehicle.year} ` : ''
  return `${vehicle.registration || 'No Reg'} · ${year}${vehicle.make || ''} ${vehicle.model || ''}`.trim()
}

function suggestedPaymentAmount(vehicle, payments) {
  const schedule = getVehicleSchedules(vehicle)[0]
  const next = getNextDueInstallment(schedule)
  if (next) {
    const remaining =
      Number(next.amount || 0) - getInstallmentPaidAmount(next)
    if (remaining > 0.01) return remaining
  }
  const summary = getVehicleCollectionSummary(vehicle, payments)
  return summary.outstanding > 0.01 ? summary.outstanding : 0
}

function initialPaymentForm(vehicles, payments, preset = null) {
  const vehicleId =
    preset?.vehicleId || (vehicles.length === 1 ? vehicles[0].id : '')
  const vehicle = vehicles.find(item => item.id === vehicleId)
  const presetAmount = Number(preset?.amount)
  const amount =
    presetAmount > 0.01
      ? presetAmount
      : vehicle
        ? suggestedPaymentAmount(vehicle, payments)
        : 0
  return {
    vehicleId,
    amount: amount > 0 ? formatNumberInput(String(amount)) : '',
    method: 'mpesa',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    installmentNumber: preset?.installmentNumber ?? null,
    dueDate: preset?.dueDate ?? null,
  }
}

function formatDate(value) {
  if (!value) return '-'
  return formatDisplayDate(value) || '-'
}

function formatShortDate(value) {
  if (!value) return '-'
  return formatDisplayDate(value) || '-'
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
        badge: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
        dot: 'bg-emerald-500',
      }
    case 'bank_transfer':
      return {
        badge: 'border-blue-200 bg-blue-50/80 text-blue-700',
        dot: 'bg-blue-500',
      }
    case 'cash':
      return {
        badge: 'border-amber-200 bg-amber-50/80 text-amber-700',
        dot: 'bg-amber-500',
      }
    case 'cheque':
      return {
        badge: 'border-violet-200 bg-violet-50/80 text-violet-700',
        dot: 'bg-violet-500',
      }
    default:
      return {
        badge: 'border-slate-200 bg-slate-50/80 text-slate-700',
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

function Field({ label, required, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className={LABEL}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function DetailItem({ label, value, icon, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-slate-50/80 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span>{label}</span>
      </div>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || '-'}
      </dd>
    </div>
  )
}

function EmptyState({ children, icon }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      {icon && <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">{icon}</div>}
      <p className="max-w-xs text-sm font-medium text-slate-500">{children}</p>
    </div>
  )
}

function Subheading({ children, action }) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {children}
      </h4>
      {action}
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
    <div className="group rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 transition-all hover:border-slate-300 hover:bg-slate-50">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-primary-600 transition hover:text-primary-700 focus:outline-none"
          >
            {value ? 'Edit' : '+ Add Note'}
          </button>
        ) : null}
      </div>

      {editing ? (
        <>
          <textarea
            rows={3}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className={`${INPUT} mt-2 text-sm`}
            placeholder={`Add ${title.toLowerCase()} notes…`}
          />
          <EditActions
            onCancel={() => {
              setDraft(value || '')
              setEditing(false)
            }}
            onSave={save}
            saving={saving}
            saveLabel="Save"
          />
        </>
      ) : value ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
          {value}
        </p>
      ) : (
        <p className="mt-1.5 text-xs italic text-slate-400">No notes recorded.</p>
      )}
    </div>
  )
}

function EditActions({ onCancel, onSave, saving, saveLabel = 'Save changes' }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-200/80 pt-4">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

function SectionEditBar({ editing, onEdit }) {
  if (editing) return null

  return (
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
    >
      <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      Edit
    </button>
  )
}

function CompactProgress({
  totalPremium,
  amountPaid,
  outstanding,
  overpayment = 0,
  progress,
  fullyPaid,
  nextDue,
}) {
  const hasOverpayment = overpayment > 0.01

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-slate-500">Collected vs Total</span>
          <p className="mt-0.5 text-base font-bold text-slate-900">
            {formatKSh(amountPaid)}
            <span className="text-xs font-normal text-slate-400"> / {formatKSh(totalPremium)}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-slate-500">
            {hasOverpayment ? 'Overpayment' : 'Remaining'}
          </span>
          <p
            className={`mt-0.5 text-base font-bold ${
              hasOverpayment
                ? 'text-sky-700'
                : fullyPaid
                  ? 'text-emerald-600'
                  : 'text-amber-600'
            }`}
          >
            {hasOverpayment
              ? formatKSh(overpayment)
              : fullyPaid
                ? 'Paid in Full'
                : formatKSh(outstanding)}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
          <span>Payment Completion</span>
          <span>{hasOverpayment ? '100%+' : `${Math.round(progress)}%`}</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80"
          role="progressbar"
          aria-label="Premium payment progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.round(progress))}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              hasOverpayment
                ? 'bg-sky-500'
                : fullyPaid
                  ? 'bg-emerald-500'
                  : 'bg-primary-600'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {nextDue && !fullyPaid && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-xs">
          <span className="text-slate-500">Next due</span>
          <span className="font-semibold text-slate-800">
            {formatKSh(nextDue.amount)} on {formatDate(nextDue.due_date)}
          </span>
        </div>
      )}
    </div>
  )
}

function TopPolicyOverviewCard({ vehicles, onRenew }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || null)
  const [tab, setTab] = useState('current')

  const activeVehicle = useMemo(
    () => vehicles.find(v => v.id === selectedVehicleId) || vehicles[0],
    [vehicles, selectedVehicleId]
  )

  const previousPolicies = useMemo(
    () => (activeVehicle ? getPreviousPolicies(activeVehicle) : []),
    [activeVehicle]
  )

  useEffect(() => {
    setTab('current')
  }, [activeVehicle?.id])

  const expired = isCoverExpired(activeVehicle?.expiry_date)
  const expiringSoon = isCoverExpiringSoon(activeVehicle?.expiry_date)
  const showRenew = Boolean(onRenew && activeVehicle && (expired || expiringSoon))

  if (!activeVehicle) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 h-full flex items-center justify-center shadow-xs">
        <p className="text-xs text-slate-400">No active policy details available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Policy Overview
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {vehicles.length > 1 && (
              <Select
                size="sm"
                value={activeVehicle.id}
                onChange={e => setSelectedVehicleId(e.target.value)}
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registration || v.make} ({POLICY_LABELS[v.policy_type] || 'Policy'})
                  </option>
                ))}
              </Select>
            )}
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setTab('current')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  tab === 'current'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Current
              </button>
              <button
                type="button"
                onClick={() => setTab('previous')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  tab === 'previous'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Previous{previousPolicies.length ? ` (${previousPolicies.length})` : ''}
              </button>
            </div>
          </div>
        </div>

        {tab === 'previous' ? (
          previousPolicies.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No previous cover periods yet. They appear here after a renewal.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {previousPolicies.map(period => (
                <div key={period.id} className="flex flex-wrap items-start justify-between gap-3 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDate(period.start_date)} – {formatDate(period.expiry_date)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {coverMonthsLabel(period.cover_months)}
                      {period.insurer ? ` · ${period.insurer}` : ''}
                      {period.policy_number ? ` · #${period.policy_number}` : ''}
                      {period.policy_type
                        ? ` · ${POLICY_LABELS[period.policy_type] || period.policy_type}`
                        : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatKSh(period.premium || 0)}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : (
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <DetailItem label="Registration" value={activeVehicle.registration || 'Pending'} />
            <DetailItem label="Cover Type" value={POLICY_LABELS[activeVehicle.policy_type] ?? activeVehicle.policy_type} />
            <DetailItem label="Insurer" value={activeVehicle.insurer} />
            <DetailItem label="Policy No." value={activeVehicle.policy_number} />
            <DetailItem label="Vehicle Value" value={formatKSh(activeVehicle.vehicle_value ?? 0)} />
            <DetailItem label="Sum Insured" value={formatKSh(activeVehicle.vehicle_value ?? activeVehicle.sum_insured ?? 0)} />
            <DetailItem label="Start Date" value={formatDate(activeVehicle.start_date)} />
            <DetailItem
              label="Renewal Date"
              value={
                isCoverExpired(activeVehicle.expiry_date)
                  ? `${formatDate(activeVehicle.expiry_date)} · Expired`
                  : formatDate(activeVehicle.expiry_date)
              }
            />
            <DetailItem
              label="Cover length"
              value={coverMonthsLabel(getCoverMonths(activeVehicle))}
            />
            <DetailItem label="Usage" value={USE_LABELS[activeVehicle.use_type] ?? activeVehicle.use_type} />
          </dl>
        )}
      </div>

      {tab === 'current' && showRenew && (
        <div
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            expired
              ? 'border-danger-200 bg-danger-50/80'
              : 'border-warning-200 bg-warning-50/80'
          }`}
        >
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${expired ? 'text-danger-800' : 'text-warning-800'}`}>
              {expired ? 'Cover has lapsed' : 'Cover expiring soon'}
            </p>
            <p className={`mt-0.5 text-xs ${expired ? 'text-danger-700' : 'text-warning-700'}`}>
              {expired
                ? `Ended ${formatDate(activeVehicle.expiry_date)}. Renew to start the next period.`
                : `Renew by ${formatDate(activeVehicle.expiry_date)} to keep this policy in force.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRenew(activeVehicle.id)}
            className={BTN_PRIMARY}
          >
            Renew cover
          </button>
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium text-slate-600">
          {activeVehicle.year ? `${activeVehicle.year} ` : ''}{activeVehicle.make} {activeVehicle.model}
        </span>
        <a href="#vehicles-section" className="font-semibold text-primary-600 hover:text-primary-700">
          Payment schedule ↓
        </a>
      </div>
    </div>
  )
}

function VehicleCard({
  vehicle,
  payments = [],
  showVehicleName = false,
  onUpdateVehicle,
  onUpdateSchedule,
  onCreateSchedule,
  onRenewVehicle,
  onLogPayment,
  startRenewToken = 0,
}) {
  const schedules = getVehicleSchedules(vehicle)
  const schedule = schedules[0] ?? null

  const collection = getVehicleCollectionSummary(vehicle, payments)
  const nextDue = schedule ? getNextDueInstallment(schedule) : null
  const totalPremium = collection.totalPremium
  const amountPaid = collection.amountPaid
  const outstanding = collection.outstanding
  const overpayment = collection.overpayment
  const progress = getProgressPercentage(amountPaid, totalPremium)
  const installments = schedule?.installments ?? []
  const fullyPaid = collection.fullyPaid
  const hasOverpayment = overpayment > 0.01
  const coverMonths = getCoverMonths(vehicle)
  const expired = isCoverExpired(vehicle.expiry_date)
  const expiringSoon = isCoverExpiringSoon(vehicle.expiry_date)

  const [editingVehicle, setEditingVehicle] = useState(false)
  const [editingCover, setEditingCover] = useState(false)
  const [editingDates, setEditingDates] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [renewing, setRenewing] = useState(false)
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

  const openRenew = () => {
    setEditingVehicle(false)
    setEditingCover(false)
    setEditingDates(false)
    setEditingPlan(false)
    setRenewing(true)
  }

  useEffect(() => {
    if (!startRenewToken) return
    openRenew()
  }, [startRenewToken])

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
      premium_rate: '',
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
    const premiumValue = totalPremium || vehicle.premium || 0
    setPlanForm({
      installment_count: Math.min(Math.max(count, 1), 5),
      allow_five: count > 3,
      premium: formatNumberInput(String(premiumValue || '')),
      installments: (installments.length
        ? installments
        : buildInstallmentSchedule({
            premium: premiumValue,
            installmentCount: Math.min(3, maxInstallmentsForCover(coverMonths)),
            startDate: vehicle.start_date,
            coverMonths,
          })?.installments ?? []
      ).map(item => ({
        number: item.number,
        amount: formatNumberInput(String(item.amount ?? '')),
        rate: formatNumberInput(
          String(
            item.rate ??
              rateFromAmount(premiumValue, item.amount ?? 0),
          ),
        ),
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
    { keepPaid = true, rates = null } = {},
  ) => {
    const premiumNumber = Number(parseNumberInput(premium)) || 0
    const resolvedRates =
      Array.isArray(rates) && rates.length === count
        ? rates
        : existingInstallments.length === count &&
            existingInstallments.every(item => item.rate != null && item.rate !== '')
          ? existingInstallments.map(
              item => Number(parseNumberInput(item.rate)) || 0,
            )
          : presetInstallmentRates(count, 'equal')

    const built = buildInstallmentSchedule({
      premium: premiumNumber,
      installmentCount: count,
      startDate,
      rates: resolvedRates,
      maxInstallments: Math.min(
        allowFive ? 5 : 3,
        maxInstallmentsForCover(coverMonths),
      ),
      coverMonths,
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
      rate: formatNumberInput(String(item.rate)),
      due_date: item.due_date,
      paid: item.paid,
      paid_at: item.paid_at,
      paid_amount: item.paid_amount,
    }))
  }

  const applyPlanRatePreset = preset => {
    const rates = presetInstallmentRates(planForm.installment_count, preset)
    setPlanForm(prev => ({
      ...prev,
      installments: regeneratePlanDates(
        prev.installment_count,
        prev.premium,
        vehicle.start_date,
        prev.allow_five,
        prev.installments,
        { keepPaid: true, rates },
      ),
    }))
  }

  const updatePlanInstallment = (index, key, value) => {
    setPlanForm(prev => {
      const premiumNumber = Number(parseNumberInput(prev.premium)) || 0

      if (key === 'due_date') {
        return {
          ...prev,
          installments: prev.installments.map((row, i) =>
            i === index ? { ...row, due_date: value } : row,
          ),
        }
      }

      if (key === 'rate') {
        const rate = formatNumberInput(value)
        const rates = prev.installments.map((row, i) =>
          i === index
            ? Number(parseNumberInput(rate)) || 0
            : Number(parseNumberInput(row.rate)) || 0,
        )
        const amounts = amountsFromRates(premiumNumber, rates)

        return {
          ...prev,
          installments: prev.installments.map((row, i) => ({
            ...row,
            rate: i === index ? rate : row.rate,
            amount: formatNumberInput(String(amounts[i] ?? 0)),
          })),
        }
      }

      const amount = formatNumberInput(value)
      return {
        ...prev,
        installments: prev.installments.map((row, i) =>
          i === index
            ? {
                ...row,
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
            : row,
        ),
      }
    })
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
        sum_insured: Number(parseNumberInput(vehicleForm.vehicle_value) || 0),
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
        sum_insured: Number(vehicle.vehicle_value || 0),
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

    const rateTotal = planForm.installments.reduce(
      (sum, item) => sum + (Number(parseNumberInput(item.rate)) || 0),
      0,
    )
    const amountTotal = planForm.installments.reduce(
      (sum, item) => sum + (Number(parseNumberInput(item.amount)) || 0),
      0,
    )

    if (Math.abs(rateTotal - 100) >= 0.05) {
      toast('Installment rates must add up to 100%.', 'error')
      return
    }
    if (Math.abs(amountTotal - premium) >= 0.5) {
      toast('Installment amounts must add up to the total premium.', 'error')
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
    <article
      id={`vehicle-${vehicle.id}`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-shadow hover:shadow-md"
    >
      {/* Card Header — identity lives in Policy Overview; only disambiguate when there are several vehicles */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40 px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {showVehicleName
              ? vehicle.registration ||
                `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`.trim()
              : 'This cover'}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {showVehicleName
              ? `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`.trim() ||
                'Payment schedule'
              : 'Payment schedule & notes'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {expired ? (
            <span className="inline-flex items-center rounded-full border border-danger-200 bg-danger-50 px-3 py-1 text-xs font-semibold text-danger-700">
              Expired
            </span>
          ) : expiringSoon ? (
            <span className="inline-flex items-center rounded-full border border-warning-200 bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-700">
              Expiring {formatDate(vehicle.expiry_date)}
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                hasOverpayment
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : fullyPaid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {hasOverpayment ? 'Overpaid' : fullyPaid ? 'Paid' : 'Balance due'}
            </span>
          )}
          {onRenewVehicle && !renewing && (expired || expiringSoon) && (
            <button
              type="button"
              onClick={openRenew}
              className="inline-flex items-center rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white shadow-soft transition hover:bg-primary-700"
            >
              Renew cover
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        <CompactProgress
          totalPremium={totalPremium}
          amountPaid={amountPaid}
          outstanding={outstanding}
          overpayment={overpayment}
          progress={progress}
          fullyPaid={fullyPaid}
          nextDue={nextDue}
        />

        {renewing ? (
          <RenewCoverPanel
            vehicle={vehicle}
            saving={saving}
            onCancel={() => setRenewing(false)}
            onSave={async payload => {
              if (!onRenewVehicle) return
              setSaving(true)
              try {
                await onRenewVehicle(payload)
                setRenewing(false)
                toast(
                  `Cover renewed · ${coverMonthsLabel(payload.cover_months)} until ${formatDate(payload.expiry_date)}.`,
                )
              } finally {
                setSaving(false)
              }
            }}
          />
        ) : null}

        {/* Section Editors */}
        {/* <section className="space-y-4">
          <Subheading
            action={
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={startVehicleEdit}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Edit Vehicle
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={startCoverEdit}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Edit Cover
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={startDatesEdit}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Edit Dates
                </button>
              </div>
            }
          >
            Vehicle Configuration
          </Subheading>

          {editingVehicle && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Edit Vehicle Information</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Registration">
                  <input
                    value={vehicleForm.registration}
                    onChange={e => setVehicleForm(prev => ({ ...prev, registration: e.target.value }))}
                    className={INPUT}
                  />
                </Field>
                <Field label="Chassis Number">
                  <input
                    value={vehicleForm.chassis}
                    onChange={e => setVehicleForm(prev => ({ ...prev, chassis: e.target.value }))}
                    className={INPUT}
                  />
                </Field>
                <Field label="Make">
                  <Select
                    value={vehicleForm.make}
                    onChange={e => setVehicleForm(prev => ({ ...prev, make: e.target.value, model: '' }))}
                  >
                    {CAR_MAKE_OPTIONS.map(option => (
                      <option key={option.value || 'empty'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Model">
                  {vehicleForm.make &&
                  CAR_MAKE_OPTIONS.some(o => o.value === vehicleForm.make) &&
                  vehicleForm.make !== 'Other' ? (
                    <Select
                      value={vehicleForm.model}
                      onChange={e => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                    >
                      {modelOptions.map(option => (
                        <option key={option.value || 'empty'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <input
                      value={vehicleForm.model}
                      onChange={e => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                      className={INPUT}
                    />
                  )}
                </Field>
                <Field label="Year">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={vehicleForm.year}
                    onChange={e => setVehicleForm(prev => ({ ...prev, year: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className={INPUT}
                  />
                </Field>
                <Field label="Engine Capacity">
                  <input
                    value={vehicleForm.engine_capacity}
                    onChange={e => setVehicleForm(prev => ({ ...prev, engine_capacity: e.target.value }))}
                    className={INPUT}
                  />
                </Field>
                <Field label="Vehicle Value">
                  <input
                    value={vehicleForm.vehicle_value}
                    onChange={e => setVehicleForm(prev => ({ ...prev, vehicle_value: formatNumberInput(e.target.value) }))}
                    className={INPUT}
                  />
                </Field>
                <Field label="Use Type">
                  <Select
                    value={vehicleForm.use_type}
                    onChange={e => setVehicleForm(prev => ({ ...prev, use_type: e.target.value }))}
                  >
                    {USE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <EditActions
                onCancel={() => setEditingVehicle(false)}
                onSave={saveVehicle}
                saving={saving}
              />
            </div>
          )}

          {editingCover && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Edit Cover Details</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Cover Type">
                  <Select
                    value={coverForm.policy_type}
                    onChange={e => setCoverForm(prev => ({ ...prev, policy_type: e.target.value }))}
                  >
                    {POLICY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Insurer">
                  <Select
                    value={
                      INSURER_OPTIONS.some(o => o.value && o.value === coverForm.insurer)
                        ? coverForm.insurer
                        : 'Other'
                    }
                    onChange={e => setCoverForm(prev => ({ ...prev, insurer: e.target.value === 'Other' ? '' : e.target.value }))}
                  >
                    {INSURER_OPTIONS.map(option => (
                      <option key={option.value || 'empty'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {!INSURER_OPTIONS.some(o => o.value && o.value === coverForm.insurer) && (
                  <Field label="Insurer Name" className="sm:col-span-2">
                    <input
                      value={coverForm.insurer}
                      onChange={e => setCoverForm(prev => ({ ...prev, insurer: e.target.value }))}
                      className={INPUT}
                      placeholder="Enter insurer name"
                    />
                  </Field>
                )}
                <Field label="Policy Number">
                  <input
                    value={coverForm.policy_number}
                    onChange={e => setCoverForm(prev => ({ ...prev, policy_number: e.target.value }))}
                    className={INPUT}
                  />
                </Field>
                <Field label="Sum Insured" hint="Auto-filled from vehicle value">
                  <input
                    type="text"
                    readOnly
                    value={formatNumberInput(String(vehicle.vehicle_value || '')) || '-'}
                    className={`${INPUT} bg-slate-100/60 text-slate-500 cursor-not-allowed`}
                    tabIndex={-1}
                  />
                </Field>
                <Field label="Premium Rate" hint="Optional % of vehicle value">
                  <div className="relative">
                    <input
                      value={coverForm.premium_rate || ''}
                      onChange={e => {
                        const premium_rate = formatNumberInput(e.target.value)
                        setCoverForm(prev => {
                          const calculated = premiumFromRate(vehicle.vehicle_value, premium_rate)
                          return {
                            ...prev,
                            premium_rate,
                            ...(calculated != null ? { premium: calculated } : {}),
                          }
                        })
                      }}
                      placeholder="e.g. 4.5"
                      className={`${INPUT} pr-10`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-slate-400">
                      %
                    </span>
                  </div>
                </Field>
                <Field label="Total Premium" required className="sm:col-span-2">
                  <input
                    value={coverForm.premium}
                    onChange={e => setCoverForm(prev => ({ ...prev, premium: formatNumberInput(e.target.value), premium_rate: '' }))}
                    className={INPUT}
                  />
                </Field>
              </div>
              <EditActions
                onCancel={() => setEditingCover(false)}
                onSave={saveCover}
                saving={saving}
              />
            </div>
          )}

          {editingDates && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Edit Effective Dates</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Start Date" required>
                  <DateInput
                    value={datesForm.start_date}
                    onChange={start_date => {
                      setDatesForm(prev => ({
                        ...prev,
                        start_date,
                        expiry_date: start_date
                          ? expiryFromCoverMonths(start_date, coverMonths)
                          : prev.expiry_date,
                      }))
                    }}
                  />
                </Field>
                <Field label="Expiry / Renewal Date" required hint="Defaults to annual schedule">
                  <DateInput
                    value={datesForm.expiry_date}
                    onChange={expiry_date => setDatesForm(prev => ({ ...prev, expiry_date }))}
                  />
                </Field>
              </div>
              <EditActions
                onCancel={() => setEditingDates(false)}
                onSave={saveDates}
                saving={saving}
              />
            </div>
          )}
        </section> */}

        {/* Installment Plan Section */}
        <section className="border-t border-slate-100 pt-5 space-y-4">
          <Subheading
            action={
              <SectionEditBar
                editing={editingPlan}
                onEdit={startPlanEdit}
              />
            }
          >
            Payment Schedule
          </Subheading>

          {editingPlan ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Total Premium" required>
                  <input
                    value={planForm.premium}
                    onChange={e => setPlanForm(prev => ({ ...prev, premium: formatNumberInput(e.target.value) }))}
                    className={INPUT}
                  />
                </Field>
                <Field label="Number of Installments">
                  <div className="flex gap-2">
                    {(planForm.allow_five ? [1, 2, 3, 4, 5] : [1, 2, 3])
                      .filter(count => count <= maxInstallmentsForCover(coverMonths))
                      .map(count => (
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
                              {
                                keepPaid: false,
                                rates: presetInstallmentRates(count, 'equal'),
                              },
                            ),
                          }))
                        }
                        className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-all ${
                          planForm.installment_count === count
                            ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-b border-slate-200/60 py-3">
                {maxInstallmentsForCover(coverMonths) > 3 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.allow_five}
                    onChange={e => {
                      const allow = e.target.checked
                      setPlanForm(prev => {
                        const count = !allow && prev.installment_count > 3 ? 3 : prev.installment_count
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
                            {
                              keepPaid: false,
                              rates: presetInstallmentRates(count, 'equal'),
                            },
                          ),
                        }
                      })
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  Enable up to 5 installments
                </label>
                )}

                <button
                  type="button"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                  onClick={() =>
                    setPlanForm(prev => ({
                      ...prev,
                      installments: regeneratePlanDates(
                        prev.installment_count,
                        prev.premium,
                        vehicle.start_date,
                        prev.allow_five,
                        prev.installments,
                        { keepPaid: false },
                      ),
                    }))
                  }
                >
                  Reset schedule from policy start
                </button>
              </div>

              {(() => {
                const presets =
                  planForm.installment_count === 2
                    ? [
                        { id: 'equal', label: 'Equal (50/50)' },
                        { id: '60-40', label: '60 / 40' },
                        { id: '70-30', label: '70 / 30' },
                      ]
                    : planForm.installment_count === 3
                      ? [
                          { id: 'equal', label: 'Equal (33/33/33)' },
                          { id: '40-30-30', label: '40 / 30 / 30' },
                          { id: '50-30-20', label: '50 / 30 / 20' },
                        ]
                      : planForm.installment_count === 4
                        ? [
                            { id: 'equal', label: 'Equal' },
                            { id: '40-20-20-20', label: '40 / 20 / 20 / 20' },
                          ]
                        : [{ id: 'equal', label: 'Equal' }]

                const rateTotal = planForm.installments.reduce(
                  (sum, item) => sum + (Number(parseNumberInput(item.rate)) || 0),
                  0,
                )
                const amountTotal = planForm.installments.reduce(
                  (sum, item) => sum + (Number(parseNumberInput(item.amount)) || 0),
                  0,
                )
                const premiumNumber = Number(parseNumberInput(planForm.premium)) || 0
                const ratesBalanced = Math.abs(rateTotal - 100) < 0.05
                const amountsBalanced = premiumNumber > 0 && Math.abs(amountTotal - premiumNumber) < 0.5

                return (
                  <div className="space-y-3">
                    {presets.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-slate-400 font-medium mr-1">Presets:</span>
                        {presets.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPlanRatePreset(preset.id)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      {planForm.installments.map((item, index) => {
                        const status = getInstallmentStatus({
                          ...item,
                          amount: parseNumberInput(item.amount),
                        })

                        return (
                          <div
                            key={item.number || index}
                            className="grid grid-cols-1 items-end gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 sm:grid-cols-[2.5rem_minmax(5rem,0.8fr)_1fr_1.2fr_auto]"
                          >
                            <div className="flex items-center justify-center pb-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                #{index + 1}
                              </span>
                            </div>
                            <Field label="Rate %">
                              <div className="relative">
                                <input
                                  value={item.rate ?? ''}
                                  onChange={e => updatePlanInstallment(index, 'rate', e.target.value)}
                                  className={`${INPUT} pr-7 text-xs`}
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs font-medium text-slate-400">
                                  %
                                </span>
                              </div>
                            </Field>
                            <Field label="Amount">
                              <input
                                value={item.amount}
                                onChange={e => updatePlanInstallment(index, 'amount', e.target.value)}
                                className={`${INPUT} text-xs`}
                              />
                            </Field>
                            <Field label="Due Date">
                              <DateInput
                                value={item.due_date}
                                onChange={due_date => updatePlanInstallment(index, 'due_date', due_date)}
                              />
                            </Field>
                            <div className="pb-1">
                              <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${status.badgeClass}`}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className={`rounded-lg p-2.5 text-xs font-medium ${ratesBalanced && amountsBalanced ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                      Rates total: {rateTotal.toFixed(2)}% {!ratesBalanced && '(must equal 100%)'} • Total amount: {formatKSh(amountTotal)} {!amountsBalanced && `(must equal ${formatKSh(premiumNumber)})`}
                    </div>
                  </div>
                )
              })()}
              <EditActions
                onCancel={() => setEditingPlan(false)}
                onSave={savePlan}
                saving={saving}
              />
            </div>
          ) : schedule && installments.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              <div className="divide-y divide-slate-100">
                {installments.map((installment, index) => {
                  const status = getInstallmentStatus(installment)
                  const canLog = Boolean(onLogPayment) && status.remaining > 0.01
                  const RowTag = canLog ? 'button' : 'div'

                  return (
                    <RowTag
                      key={`${installment.number}-${installment.due_date}-${index}`}
                      type={canLog ? 'button' : undefined}
                      onClick={
                        canLog
                          ? () =>
                              onLogPayment({
                                vehicleId: vehicle.id,
                                amount: status.remaining,
                                installmentNumber: installment.number,
                                dueDate: installment.due_date,
                              })
                          : undefined
                      }
                      className={`group flex w-full flex-wrap items-center justify-between gap-3 p-3.5 text-left transition ${
                        canLog
                          ? 'cursor-pointer hover:bg-primary-50/50 focus:outline-none focus-visible:bg-primary-50/70'
                          : 'hover:bg-slate-50/50'
                      }`}
                      title={canLog ? 'Log payment for this installment' : undefined}
                      aria-label={
                        canLog
                          ? `Log payment for installment ${installment.number}, due ${formatDate(installment.due_date)}`
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                          #{installment.number}
                        </span>
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              canLog
                                ? 'text-primary-700 underline-offset-2 group-hover:underline'
                                : 'text-slate-800'
                            }`}
                          >
                            Due {formatDate(installment.due_date)}
                          </p>
                          {status.paidAmount > 0 && status.remaining > 0 && (
                            <p className="text-xs text-slate-400">
                              {formatKSh(status.paidAmount)} paid • {formatKSh(status.remaining)} remaining
                            </p>
                          )}
                          {canLog && (
                            <p className="mt-0.5 text-[11px] font-semibold text-primary-600">
                              Tap to log payment
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-900">
                          {formatKSh(installment.amount)}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </div>
                    </RowTag>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
              <p className="text-xs font-medium text-slate-500">
                No payment schedule active • Base Premium: {formatKSh(vehicle.premium ?? 0)}
              </p>
            </div>
          )}
        </section>

        {/* Notes Section */}
        <section className="border-t border-slate-100 pt-5 space-y-3">
          <Subheading>Policy Notes</Subheading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NotesBlock
              title="Vehicle Notes"
              value={vehicle.vehicle_notes}
              onSave={text => onUpdateVehicle({ vehicle_notes: text.trim() || null })}
            />
            <NotesBlock
              title="Cover Notes"
              value={vehicle.cover_notes}
              onSave={text => onUpdateVehicle({ cover_notes: text.trim() || null })}
            />
            <NotesBlock
              title="Payment Notes"
              value={vehicle.payment_notes}
              onSave={text => onUpdateVehicle({ payment_notes: text.trim() || null })}
            />
          </div>
        </section>
      </div>
    </article>
  )
}

function LogPaymentDialog({
  client,
  vehicles,
  payments,
  saving,
  preset = null,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => initialPaymentForm(vehicles, payments, preset))
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const multiVehicle = vehicles.length > 1
  const selectedVehicle = vehicles.find(item => item.id === form.vehicleId)

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const selectVehicle = vehicleId => {
    const vehicle = vehicles.find(item => item.id === vehicleId)
    const amount = vehicle ? suggestedPaymentAmount(vehicle, payments) : 0
    setForm(prev => ({
      ...prev,
      vehicleId,
      amount: amount > 0 ? formatNumberInput(String(amount)) : '',
      installmentNumber: null,
      dueDate: null,
    }))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (!form.vehicleId || !parseNumberInput(form.amount)) {
      toast('Vehicle and amount are required.', 'error')
      return
    }
    await onSubmit(form)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-payment-title"
        onClick={event => event.stopPropagation()}
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-600">
              {client.name}
            </p>
            <h2 id="log-payment-title" className="mt-1 text-lg font-bold text-slate-900">
              Log payment
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {form.installmentNumber
                ? `Installment #${form.installmentNumber}${
                    form.dueDate ? ` · due ${formatDate(form.dueDate)}` : ''
                  }. Amount is the remaining balance.`
                : "Record a payment against this client's policy."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Vehicle" required className="sm:col-span-2">
            {multiVehicle ? (
              <Select
                required
                value={form.vehicleId}
                onChange={e => selectVehicle(e.target.value)}
              >
                <option value="">Select vehicle</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehiclePaymentLabel(vehicle)}
                  </option>
                ))}
              </Select>
            ) : (
              <>
                <input type="hidden" name="vehicleId" value={form.vehicleId} />
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
                  {vehicles[0] ? vehiclePaymentLabel(vehicles[0]) : 'No vehicle'}
                </div>
              </>
            )}
          </Field>

          <Field label="Amount" required>
            <input
              required
              type="text"
              inputMode="decimal"
              placeholder="e.g. 12,500"
              value={form.amount}
              onChange={e => set('amount', formatNumberInput(e.target.value))}
              className={INPUT}
            />
          </Field>

          <Field label="Method">
            <Select
              value={form.method}
              onChange={e => set('method', e.target.value)}
            >
              {PAYMENT_METHODS.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Reference">
            <input
              placeholder="e.g. M-Pesa code"
              value={form.reference}
              onChange={e => set('reference', e.target.value)}
              className={INPUT}
            />
          </Field>

          <Field label="Date">
            <DateInput value={form.date} onChange={value => set('date', value)} />
          </Field>

          <Field label="Notes" className="sm:col-span-2">
            <textarea
              placeholder="Notes optional"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className={`${INPUT} min-h-16`}
            />
          </Field>
        </div>

        {selectedVehicle && (
          <p className="mt-3 text-xs text-slate-500">
            Outstanding on this vehicle:{' '}
            <span className="font-semibold text-slate-700">
              {formatKSh(
                getVehicleCollectionSummary(
                  selectedVehicle,
                  payments.filter(item => item.vehicle_id === selectedVehicle.id),
                ).outstanding,
              )}
            </span>
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving ? 'Saving…' : 'Save payment'}
          </button>
        </div>
      </form>
    </div>
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
    renewVehicle,
    refetch,
  } = useClients()
  const {
    payments,
    loading: paymentsLoading,
    logPayment,
    saving: paymentSaving,
  } = usePayments()

  const client = clients.find(item => item.id === id)

  const [editingInsured, setEditingInsured] = useState(false)
  const [insuredForm, setInsuredForm] = useState({})
  const [savingInsured, setSavingInsured] = useState(false)
  const [showLogPayment, setShowLogPayment] = useState(false)
  const [logPaymentPreset, setLogPaymentPreset] = useState(null)
  const [renewIntent, setRenewIntent] = useState({ vehicleId: null, n: 0 })

  const clientPayments = useMemo(
    () =>
      payments
        .filter(payment => payment.client_id === id)
        .slice()
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [payments, id],
  )

  if (loading) {
    return <LottieLoader label="Loading client details..." />
  }

  if (!client) {
    return (
      <PageShell>
        <div className="mb-4">
          <Link
            to="/clients"
            className="hidden items-center text-xs font-semibold text-slate-500 hover:text-slate-700 lg:inline-flex"
          >
            ← Back to Clients
          </Link>
        </div>
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        >
          Client record not found. It may have been deleted or moved.
        </EmptyState>
      </PageShell>
    )
  }

  const vehicles = client.vehicles ?? []
  const activity = buildClientActivity({ vehicles, payments: clientPayments })

  const vehicleSummaries = vehicles.map(vehicle => {
    const summary = getVehicleCollectionSummary(vehicle, clientPayments)
    return {
      total: summary.totalPremium,
      paid: summary.amountPaid,
      outstanding: summary.outstanding,
      overpayment: summary.overpayment,
    }
  })

  const totalPremium = vehicleSummaries.reduce((sum, item) => sum + item.total, 0)
  const totalPaid = vehicleSummaries.reduce((sum, item) => sum + item.paid, 0)
  const totalOutstanding = vehicleSummaries.reduce(
    (sum, item) => sum + item.outstanding,
    0,
  )
  const totalOverpayment = vehicleSummaries.reduce(
    (sum, item) => sum + item.overpayment,
    0,
  )

  const nextRenewal = vehicles
    .filter(vehicle => vehicle.expiry_date)
    .slice()
    .sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date)))[0]

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

  const openLogPayment = (preset = null) => {
    if (!vehicles.length) {
      toast('Add a vehicle before logging a payment.', 'error')
      return
    }
    setLogPaymentPreset(preset)
    setShowLogPayment(true)
  }

  const handleLogPayment = async form => {
    const vehicle = vehicles.find(item => item.id === form.vehicleId)
    if (!vehicle) {
      toast('Vehicle and amount are required.', 'error')
      return
    }

    const schedule = getVehicleSchedules(vehicle)[0]
    const amount = Number(parseNumberInput(form.amount))

    try {
      await logPayment({
        clientId: client.id,
        vehicleId: vehicle.id,
        scheduleId: schedule?.id,
        amount,
        method: form.method,
        reference: form.reference,
        notes: form.notes,
        date: form.date,
      })
      await refetch()
      setShowLogPayment(false)
      setLogPaymentPreset(null)
      toast(`Payment of ${formatKSh(amount)} logged.`)
    } catch (err) {
      toast(err.message || 'Could not log payment.', 'error')
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="hidden lg:block">
          <Link
            to="/clients"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to clients
          </Link>
        </div>

        {/* TOP SECTION: Client Details & Policy Overview Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Client Details Card */}
          <section className="lg:col-span-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col justify-between">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-lg font-bold text-slate-700 shadow-inner">
                    {getInitials(client.name)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-xl text-ink">
                        {client.name}
                      </h1>
                      <StatusBadge status={client.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {vehicles.length} {vehicles.length === 1 ? 'active policy' : 'active policies'}
                      {client.created_at && ` • Since ${formatDate(client.created_at)}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SectionEditBar
                    editing={editingInsured}
                    onEdit={startInsuredEdit}
                  />
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className={BTN_SECONDARY}>
                      Call
                    </a>
                  )}
                  <button
                    type="button"
                    className={BTN_PRIMARY}
                    onClick={() => openLogPayment()}
                  >
                    Log Payment
                  </button>
                </div>
              </div>

              {editingInsured ? (
                <div className="mt-5 border-t border-slate-100 pt-4 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Edit Client Profile</h5>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Full Name" required>
                      <input
                        value={insuredForm.name}
                        onChange={e => setInsuredForm(prev => ({ ...prev, name: e.target.value }))}
                        className={INPUT}
                      />
                    </Field>
                    <Field label="Phone Number" required>
                      <input
                        value={insuredForm.phone}
                        onChange={e => setInsuredForm(prev => ({ ...prev, phone: e.target.value }))}
                        className={INPUT}
                      />
                    </Field>
                    <Field label="National ID / Passport">
                      <input
                        value={insuredForm.id_number}
                        onChange={e => setInsuredForm(prev => ({ ...prev, id_number: e.target.value }))}
                        className={INPUT}
                      />
                    </Field>
                    <Field label="Email Address">
                      <input
                        type="email"
                        value={insuredForm.email}
                        onChange={e => setInsuredForm(prev => ({ ...prev, email: e.target.value }))}
                        className={INPUT}
                      />
                    </Field>
                    <Field label="Physical / Postal Address" className="sm:col-span-2">
                      <input
                        value={insuredForm.address}
                        onChange={e => setInsuredForm(prev => ({ ...prev, address: e.target.value }))}
                        className={INPUT}
                      />
                    </Field>
                  </div>
                  <EditActions
                    onCancel={() => setEditingInsured(false)}
                    onSave={saveInsured}
                    saving={savingInsured}
                  />
                </div>
              ) : (
                <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-medium text-slate-600">
                    {client.phone && (
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone</span>
                        <span className="font-semibold text-slate-800">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                        <span className="font-semibold text-slate-800 truncate block">{client.email}</span>
                      </div>
                    )}
                    {client.id_number && (
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">National ID</span>
                        <span className="font-semibold text-slate-800">{client.id_number}</span>
                      </div>
                    )}
                  </div>

                  {client.address && (
                    <DetailItem label="Address" value={client.address} />
                  )}

                  <NotesBlock
                    title="Client Notes"
                    value={client.notes}
                    onSave={text => updateClient(client.id, { notes: text.trim() || null })}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Policy Overview Top Component */}
          <section className="lg:col-span-6">
            <TopPolicyOverviewCard
              vehicles={vehicles}
              onRenew={vehicleId => {
                setRenewIntent(prev => ({ vehicleId, n: prev.n + 1 }))
                window.requestAnimationFrame(() => {
                  document
                    .getElementById(`vehicle-${vehicleId}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                })
              }}
            />
          </section>
        </div>

        {/* Portfolio Key Financial Metrics */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-card">
            <p className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-faint">
              Total Premium
            </p>
            <p className="mt-1.5 font-sans text-lg font-semibold text-ink sm:text-xl">
              {formatKSh(totalPremium)}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-card">
            <p className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-faint">
              Total Paid
            </p>
            <p className="mt-1.5 font-sans text-lg font-semibold text-success-700 sm:text-xl">
              {formatKSh(totalPaid)}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-card">
            <p className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-faint">
              {totalOverpayment > 0.01 ? 'Overpayment' : 'Outstanding'}
            </p>
            <p
              className={`mt-1.5 font-sans text-lg font-semibold sm:text-xl ${
                totalOverpayment > 0.01
                  ? 'text-primary-700'
                  : totalOutstanding <= 0
                    ? 'text-success-700'
                    : 'text-warning-700'
              }`}
            >
              {formatKSh(totalOverpayment > 0.01 ? totalOverpayment : totalOutstanding)}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-card">
            <p className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-faint">
              Active Policies
            </p>
            <p className="mt-1.5 font-sans text-lg font-semibold text-ink sm:text-xl">
              {vehicles.length}
            </p>
            {nextRenewal && (
              <p className="mt-1 text-xs text-slate-400 truncate">
                Next renewal: {formatShortDate(nextRenewal.expiry_date)}
              </p>
            )}
          </div>
        </section>

        {/* Main Content: Vehicles & Schedules vs Payment History */}
        <div id="vehicles-section" className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          {/* Vehicles & Installments List */}
          <section className="space-y-4 xl:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Payment Schedules & Configurations
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
              </span>
            </div>

            {vehicles.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                }
              >
                No vehicles have been added for this client yet.
              </EmptyState>
            ) : (
              <div className="space-y-5">
                {vehicles.map(vehicle => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    showVehicleName={vehicles.length > 1}
                    payments={clientPayments.filter(p => p.vehicle_id === vehicle.id)}
                    onUpdateVehicle={updates => updateVehicle(vehicle.id, updates)}
                    onUpdateSchedule={updates => {
                      const schedule = getVehicleSchedules(vehicle)[0]
                      if (!schedule) return Promise.resolve()
                      return updatePaymentSchedule(schedule.id, updates)
                    }}
                    onCreateSchedule={payload => createPaymentSchedule(vehicle.id, payload)}
                    onRenewVehicle={payload => renewVehicle(vehicle.id, payload)}
                    onLogPayment={openLogPayment}
                    startRenewToken={
                      renewIntent.vehicleId === vehicle.id ? renewIntent.n : 0
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* Payment Log History Sidebar */}
          <section className="space-y-4 xl:col-span-2">
            <h2 className="text-base font-bold text-slate-900">Activity</h2>

            {paymentsLoading ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center text-xs text-slate-400">
                Loading activity...
              </div>
            ) : activity.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                Payments and renewals for this client will show here.
              </EmptyState>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                <div className="divide-y divide-slate-100">
                  {activity.map(item => {
                    if (item.type === 'renewal') {
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
                                Renewal
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDate(item.date)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                              {item.vehicle?.registration} · {item.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {formatDate(item.period.start_date)} – {formatDate(item.period.expiry_date)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-sm font-bold text-slate-800">
                              {formatKSh(item.period.premium || 0)}
                            </span>
                          </div>
                        </div>
                      )
                    }

                    const payment = item.payment
                    const vehicle = vehicles.find(v => v.id === payment.vehicle_id)
                    const methodStyles = getPaymentMethodStyles(payment.method)

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${methodStyles.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${methodStyles.dot}`} />
                              {METHOD_LABELS[payment.method] ?? payment.method ?? 'Payment'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDate(payment.date)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                            {vehicle?.registration || 'Payment'}
                            {vehicle ? ` · ${vehicle.make} ${vehicle.model}` : ''}
                          </p>
                          {payment.reference && (
                            <p className="mt-0.5 font-mono text-xs text-slate-400">
                              Ref: {payment.reference}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-emerald-600">
                            +{formatKSh(payment.amount)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {showLogPayment && (
        <LogPaymentDialog
          client={client}
          vehicles={vehicles}
          payments={clientPayments}
          saving={paymentSaving}
          preset={logPaymentPreset}
          onClose={() => {
            setShowLogPayment(false)
            setLogPaymentPreset(null)
          }}
          onSubmit={handleLogPayment}
        />
      )}
    </PageShell>
  )
}