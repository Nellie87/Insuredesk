import { useMemo, useState } from 'react'
import DateInput from '../ui/DateInput'
import { INPUT, LABEL } from '../../constants/formStyles'
import {
  buildInstallmentSchedule,
  defaultInstallmentCountForCover,
  formatKSh,
  maxInstallmentsForCover,
  proratePremium,
} from '../../utils/calculator'
import { formatNumberInput, parseNumberInput } from '../../utils/numberInput'
import { toast } from '../../store/toastStore'
import {
  COVER_MONTH_OPTIONS,
  coverMonthsLabel,
  expiryFromCoverMonths,
  formatDisplayDate,
  getCoverMonths,
  isCoverExpired,
  suggestedRenewalStart,
} from '../../utils/policyDates'

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

function buildRows(premium, count, startDate, coverMonths, existing = []) {
  const built = buildInstallmentSchedule({
    premium,
    installmentCount: count,
    startDate,
    coverMonths,
    maxInstallments: maxInstallmentsForCover(coverMonths),
    overrides: existing.map(item => ({
      due_date: item.due_date,
      amount: parseNumberInput(item.amount),
    })),
  })

  return (built?.installments ?? []).map(item => ({
    number: item.number,
    amount: formatNumberInput(String(item.amount)),
    due_date: item.due_date,
  }))
}

export default function RenewCoverPanel({ vehicle, onCancel, onSave, saving }) {
  const lastMonths = getCoverMonths(vehicle)
  const lastPremium = Number(vehicle.premium) || 0
  const defaultStart = suggestedRenewalStart(vehicle.expiry_date)
  const expired = isCoverExpired(vehicle.expiry_date)

  const [coverMonths, setCoverMonths] = useState(12)
  const [startDate, setStartDate] = useState(defaultStart)
  const [expiryDate, setExpiryDate] = useState(
    expiryFromCoverMonths(defaultStart, 12),
  )
  const [expiryTouched, setExpiryTouched] = useState(false)
  const [premium, setPremium] = useState(
    formatNumberInput(String(lastPremium || '')),
  )
  const [policyNumber, setPolicyNumber] = useState(vehicle.policy_number || '')
  const [insurer, setInsurer] = useState(vehicle.insurer || '')
  const [installmentCount, setInstallmentCount] = useState(
    defaultInstallmentCountForCover(12),
  )
  const [installments, setInstallments] = useState(() =>
    buildRows(lastPremium, defaultInstallmentCountForCover(12), defaultStart, 12),
  )

  const maxInstallments = maxInstallmentsForCover(coverMonths)
  const premiumNumber = Number(parseNumberInput(premium)) || 0
  const suggested = lastPremium
    ? proratePremium(lastPremium, lastMonths, coverMonths)
    : 0

  const applyDuration = (months, nextStart = startDate) => {
    const count = Math.min(
      defaultInstallmentCountForCover(months),
      maxInstallmentsForCover(months),
    )
    const nextExpiry = expiryFromCoverMonths(nextStart, months)
    const nextPremium = lastPremium
      ? proratePremium(lastPremium, lastMonths, months)
      : premiumNumber
    setCoverMonths(months)
    setInstallmentCount(count)
    setExpiryTouched(false)
    setExpiryDate(nextExpiry)
    setPremium(formatNumberInput(String(nextPremium || '')))
    setInstallments(buildRows(nextPremium, count, nextStart, months))
  }

  const applyStart = value => {
    setStartDate(value)
    const nextExpiry = value ? expiryFromCoverMonths(value, coverMonths) : expiryDate
    if (!expiryTouched) setExpiryDate(nextExpiry)
    setInstallments(buildRows(premiumNumber, installmentCount, value, coverMonths))
  }

  const applyPremium = value => {
    const formatted = formatNumberInput(value)
    const amount = Number(parseNumberInput(formatted)) || 0
    setPremium(formatted)
    setInstallments(buildRows(amount, installmentCount, startDate, coverMonths))
  }

  const applyCount = count => {
    const next = Math.min(count, maxInstallments)
    setInstallmentCount(next)
    setInstallments(buildRows(premiumNumber, next, startDate, coverMonths, []))
  }

  const useSuggestedPremium = () => {
    if (!suggested) return
    applyPremium(String(suggested))
  }

  const schedulePreview = useMemo(
    () =>
      buildInstallmentSchedule({
        premium: premiumNumber,
        installmentCount,
        startDate,
        coverMonths,
        maxInstallments,
        overrides: installments.map(item => ({
          amount: parseNumberInput(item.amount),
          due_date: item.due_date,
        })),
      }),
    [premiumNumber, installmentCount, startDate, coverMonths, maxInstallments, installments],
  )

  const handleSave = async () => {
    if (!startDate || !expiryDate) {
      throw new Error('Start and expiry dates are required.')
    }
    if (!premiumNumber) {
      throw new Error('Premium for this cover period is required.')
    }
    if (!schedulePreview?.installments?.length) {
      throw new Error('Could not build a payment schedule.')
    }
    if (schedulePreview.installments.some(item => !item.due_date)) {
      throw new Error('Each installment needs a due date.')
    }
    const amountTotal = schedulePreview.installments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    )
    if (Math.abs(amountTotal - premiumNumber) >= 0.5) {
      throw new Error('Installment amounts must add up to the premium.')
    }

    await onSave({
      start_date: startDate,
      expiry_date: expiryDate,
      cover_months: coverMonths,
      premium: premiumNumber,
      insurer,
      policy_number: policyNumber,
      policy_type: vehicle.policy_type,
      schedule: schedulePreview,
    })
  }

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 space-y-4">
      <div>
        <h5 className="text-xs font-bold uppercase tracking-wider text-primary-800">
          Renew cover
        </h5>
        <p className="mt-1 text-sm text-slate-600">
          Last period was {coverMonthsLabel(lastMonths)}
          {lastPremium ? ` · ${formatKSh(lastPremium)}` : ''}. Choose 1–12 months
          for the next cover, then confirm premium and payments.
        </p>
      </div>

      <Field label="Cover length" required>
        <div className="flex flex-wrap gap-2">
          {COVER_MONTH_OPTIONS.map(months => (
            <button
              key={months}
              type="button"
              onClick={() => applyDuration(months)}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                coverMonths === months
                  ? 'border-primary-600 bg-white text-primary-800 shadow-xs'
                  : 'border-slate-200 bg-white/80 text-slate-600 hover:border-primary-200'
              }`}
            >
              {coverMonthsLabel(months)}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="New start date"
          required
          hint={
            expired
              ? 'Cover already lapsed — starts today unless you backdate'
              : 'Continues the day after the current expiry'
          }
        >
          <DateInput value={startDate} onChange={applyStart} />
        </Field>
        <Field
          label="New expiry"
          required
          hint={`${coverMonthsLabel(coverMonths)} from start, still editable`}
        >
          <DateInput
            value={expiryDate}
            onChange={value => {
              setExpiryTouched(true)
              setExpiryDate(value)
            }}
          />
        </Field>
        <Field
          label="Premium for this period"
          required
          hint={
            suggested && Math.abs(suggested - lastPremium) > 0.5
              ? `Suggested from last period: ${formatKSh(suggested)}`
              : undefined
          }
          className="sm:col-span-2"
        >
          <div className="flex gap-2">
            <input
              value={premium}
              onChange={e => applyPremium(e.target.value)}
              className={INPUT}
              inputMode="decimal"
            />
            {suggested > 0 && Math.abs(suggested - premiumNumber) > 0.5 && (
              <button
                type="button"
                onClick={useSuggestedPremium}
                className="shrink-0 rounded-xl border border-primary-200 bg-white px-3 text-xs font-semibold text-primary-700 hover:bg-primary-50"
              >
                Use {formatKSh(suggested)}
              </button>
            )}
          </div>
        </Field>
        <Field label="Insurer">
          <input
            value={insurer}
            onChange={e => setInsurer(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Policy number">
          <input
            value={policyNumber}
            onChange={e => setPolicyNumber(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>

      {maxInstallments > 1 && (
        <Field label="How they will pay" hint="Short cover defaults to a single payment">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: maxInstallments }, (_, i) => i + 1).map(count => (
              <button
                key={count}
                type="button"
                onClick={() => applyCount(count)}
                className={`min-w-[2.75rem] rounded-xl border px-3 py-2 text-sm font-bold transition ${
                  installmentCount === count
                    ? 'border-primary-600 bg-white text-primary-800 shadow-xs'
                    : 'border-slate-200 bg-white/80 text-slate-600 hover:border-primary-200'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </Field>
      )}

      {installments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Payment dates
          </p>
          {installments.map((item, index) => (
            <div
              key={item.number}
              className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3"
            >
              <Field label={`#${item.number} amount`}>
                <input
                  value={item.amount}
                  onChange={e =>
                    setInstallments(prev =>
                      prev.map((row, i) =>
                        i === index
                          ? { ...row, amount: formatNumberInput(e.target.value) }
                          : row,
                      ),
                    )
                  }
                  className={INPUT}
                  inputMode="decimal"
                />
              </Field>
              <Field label="Due">
                <DateInput
                  value={item.due_date}
                  onChange={due_date =>
                    setInstallments(prev =>
                      prev.map((row, i) => (i === index ? { ...row, due_date } : row)),
                    )
                  }
                />
              </Field>
            </div>
          ))}
        </div>
      )}

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
          disabled={saving}
          onClick={async () => {
            try {
              await handleSave()
            } catch (err) {
              toast(err.message || 'Could not renew cover.', 'error')
            }
          }}
          className="rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-700 disabled:opacity-50"
        >
          {saving
            ? 'Saving…'
            : `Start ${coverMonthsLabel(coverMonths)} cover · ${formatDisplayDate(expiryDate)}`}
        </button>
      </div>
    </div>
  )
}
