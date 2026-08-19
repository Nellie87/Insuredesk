import { addMonths, format } from 'date-fns'

/**
 * Calculates down payment, installment schedule, and commission
 * from a set of policy inputs.
 *
 * @param {import('../types').CalculatorInput} input
 * @returns {import('../types').CalculatorResult}
 */
export function calculatePolicy(input) {
  const {
    total_premium,
    down_payment_percent,
    installment_months,
    first_payment_date,
    commission_rate,
  } = input

  const down_payment = round2(total_premium * (down_payment_percent / 100))
  const remaining_balance = round2(total_premium - down_payment)
  const monthly_installment = round2(remaining_balance / installment_months)
  const commission = round2(total_premium * (commission_rate / 100))

  // Generate installment schedule with due dates
  const baseDate = new Date(first_payment_date)
  const installment_schedule = Array.from({ length: installment_months }, (_, i) => ({
    due_date: format(addMonths(baseDate, i + 1), 'yyyy-MM-dd'),
    amount: monthly_installment,
  }))

  // Adjust last installment for any rounding difference
  const totalScheduled = monthly_installment * installment_months
  const diff = round2(remaining_balance - totalScheduled)
  if (diff !== 0 && installment_schedule.length > 0) {
    installment_schedule[installment_schedule.length - 1].amount =
      round2(installment_schedule[installment_schedule.length - 1].amount + diff)
  }

  return {
    down_payment,
    remaining_balance,
    monthly_installment,
    installment_schedule,
    commission,
  }
}

/**
 * Formats a number as KSh currency string
 * @param {number} amount
 * @returns {string}
 */
export function formatKSh(amount) {
  return `KSh ${Number(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

/**
 * Amount credited toward a single installment (full or partial).
 * @param {import('../types').Installment} installment
 * @returns {number}
 */
export function getInstallmentPaidAmount(installment) {
  if (!installment) return 0
  if (installment.paid) return Number(installment.amount || 0)
  return Number(installment.paid_amount || 0)
}

/**
 * Remaining amount on a single installment after partial credit.
 * @param {import('../types').Installment} installment
 * @returns {number}
 */
export function getInstallmentRemaining(installment) {
  if (!installment) return 0
  return Math.max(
    0,
    round2(Number(installment.amount || 0) - getInstallmentPaidAmount(installment)),
  )
}

/**
 * Total amount paid against a schedule (down payment + installments).
 * @param {import('../types').PaymentSchedule} schedule
 * @returns {number}
 */
export function getAmountPaid(schedule) {
  if (!schedule) return 0
  const installments = schedule.installments ?? []
  const paidInstallments = installments.reduce(
    (sum, item) => sum + getInstallmentPaidAmount(item),
    0
  )
  const downPaymentPaid = schedule.down_payment_paid ? Number(schedule.down_payment || 0) : 0
  return round2(paidInstallments + downPaymentPaid)
}

/**
 * Calculates outstanding balance for a vehicle
 * @param {import('../types').PaymentSchedule} schedule
 * @returns {number}
 */
export function getOutstandingBalance(schedule) {
  if (!schedule) return 0
  return Math.max(0, round2(Number(schedule.total_premium || 0) - getAmountPaid(schedule)))
}

/**
 * Sum of logged payment amounts.
 * @param {import('../types').Payment[]} payments
 * @returns {number}
 */
export function sumPayments(payments) {
  return round2((payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0))
}

/**
 * Collected / outstanding for a vehicle using schedule credit and logged payments.
 * Logged payments always count - even when no payment schedule exists yet.
 *
 * @param {object} vehicle
 * @param {import('../types').Payment[]} [payments]
 * @returns {{
 *   schedule: import('../types').PaymentSchedule | null,
 *   totalPremium: number,
 *   amountPaid: number,
 *   outstanding: number,
 *   overpayment: number,
 *   fullyPaid: boolean,
 *   paymentsTotal: number,
 *   schedulePaid: number,
 * }}
 */
export function getVehicleCollectionSummary(vehicle, payments = []) {
  const schedules = getVehicleSchedules(vehicle)
  const schedule = schedules[0] ?? null
  const totalPremium = round2(
    Number(
      schedule
        ? schedule.total_premium ?? vehicle?.premium
        : vehicle?.premium
    ) || 0
  )

  const related = paymentsForSchedule(schedule, payments, schedules, vehicle?.id)
  const paymentsTotal = sumPayments(related)
  const schedulePaid = schedule ? getAmountPaid(schedule) : 0
  const amountPaid = round2(Math.max(schedulePaid, paymentsTotal))
  const outstanding = Math.max(0, round2(totalPremium - amountPaid))
  const overpayment =
    totalPremium > 0 ? Math.max(0, round2(amountPaid - totalPremium)) : 0
  const fullyPaid = totalPremium > 0 ? outstanding <= 0.01 : amountPaid > 0

  return {
    schedule,
    totalPremium,
    amountPaid,
    outstanding,
    overpayment,
    fullyPaid,
    paymentsTotal,
    schedulePaid,
  }
}

/**
 * Apply a payment amount to the next unpaid down payment / installments (FIFO).
 * Supports partial installment credit via `paid_amount`.
 *
 * @param {import('../types').PaymentSchedule} schedule
 * @param {number} amount
 * @param {string} [paidAt] ISO date or datetime
 * @returns {import('../types').PaymentSchedule}
 */
export function applyPaymentToSchedule(schedule, amount, paidAt) {
  if (!schedule || !(Number(amount) > 0)) return schedule

  const paidAtValue = (() => {
    if (!paidAt) return new Date().toISOString()
    return String(paidAt).includes('T') ? paidAt : `${paidAt}T12:00:00.000Z`
  })()

  const next = {
    ...schedule,
    installments: (schedule.installments ?? []).map(item => ({ ...item })),
  }
  let remaining = round2(Number(amount))

  if (!next.down_payment_paid && Number(next.down_payment) > 0) {
    const due = Number(next.down_payment)
    if (remaining + 0.01 >= due) {
      remaining = round2(remaining - due)
      next.down_payment_paid = true
      next.down_payment_paid_at = paidAtValue
    }
  }

  for (const installment of next.installments) {
    if (remaining <= 0) break
    if (installment.paid) continue

    const already = Number(installment.paid_amount || 0)
    const due = round2(Number(installment.amount || 0) - already)
    if (due <= 0) {
      installment.paid = true
      installment.paid_at = installment.paid_at || paidAtValue
      installment.paid_amount = Number(installment.amount || 0)
      continue
    }

    if (remaining + 0.01 >= due) {
      remaining = round2(remaining - due)
      installment.paid = true
      installment.paid_amount = Number(installment.amount || 0)
      installment.paid_at = paidAtValue
    } else {
      installment.paid_amount = round2(already + remaining)
      remaining = 0
    }
  }

  return next
}

/**
 * If logged payments exceed what the schedule shows as paid, apply the gap.
 * Covers payments that were logged before Pay ↔ Portfolio were linked.
 *
 * @param {import('../types').PaymentSchedule} schedule
 * @param {import('../types').Payment[]} payments
 * @returns {import('../types').PaymentSchedule}
 */
export function reconcileScheduleWithPayments(schedule, payments, allSchedules) {
  if (!schedule) return schedule

  const related = paymentsForSchedule(
    schedule,
    payments,
    allSchedules ?? [schedule],
    schedule.vehicle_id,
  )
  const paymentsTotal = sumPayments(related)
  const schedulePaid = getAmountPaid(schedule)
  const gap = round2(paymentsTotal - schedulePaid)
  if (gap <= 0.01) return schedule

  const latest = [...related].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
  return applyPaymentToSchedule(
    schedule,
    gap,
    latest?.date || new Date().toISOString().slice(0, 10)
  )
}

/**
 * Gets the next unpaid installment
 * @param {import('../types').PaymentSchedule} schedule
 * @returns {import('../types').Installment | null}
 */
export function getNextDueInstallment(schedule) {
  if (!schedule?.installments?.length) return null
  return schedule.installments.find(i => !i.paid) ?? null
}

/**
 * Normalises payment_schedules from Supabase (array) or legacy single object.
 * Newest first so index 0 is the current cover period.
 * @param {object} vehicle
 * @returns {import('../types').PaymentSchedule[]}
 */
export function getVehicleSchedules(vehicle) {
  const schedules = vehicle?.payment_schedules
  if (!schedules) return []
  const list = Array.isArray(schedules) ? schedules : [schedules]
  return list.slice().sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || '')),
  )
}

/** Current (newest) payment schedule for a vehicle. */
export function getCurrentSchedule(vehicle) {
  return getVehicleSchedules(vehicle)[0] ?? null
}

/**
 * Payments that belong to one schedule.
 * Unscoped legacy payments (no schedule_id) stay on the oldest schedule
 * so a renewal does not look fully paid from last year's receipts.
 */
export function paymentsForSchedule(schedule, payments, allSchedules, vehicleId) {
  const resolvedVehicleId = vehicleId || schedule?.vehicle_id
  if (!schedule) {
    return (payments ?? []).filter(payment => payment.vehicle_id === resolvedVehicleId)
  }

  const schedules = allSchedules?.length ? allSchedules : [schedule]
  const oldest = [...schedules].sort((a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || '')),
  )[0]

  return (payments ?? []).filter(payment => {
    if (payment.schedule_id === schedule.id) return true
    if (payment.schedule_id) return false
    if (payment.vehicle_id !== resolvedVehicleId) return false
    return oldest?.id === schedule.id
  })
}

/**
 * Checks if any installment is overdue (past due date and unpaid)
 * @param {import('../types').PaymentSchedule} schedule
 * @returns {boolean}
 */
export function hasOverduePayment(schedule) {
  if (!schedule?.installments?.length) return false
  const today = new Date()
  return schedule.installments.some(i => !i.paid && new Date(i.due_date) < today)
}

/**
 * Months between installment due dates.
 * Annual (12 months) keeps the existing half-yearly / quarterly spacing.
 * Short cover spaces payments across the chosen months.
 */
export function installmentMonthStep(installmentCount, coverMonths = 12) {
  const count = Math.max(Math.round(Number(installmentCount) || 1), 1)
  const months = Math.max(Math.round(Number(coverMonths) || 12), 1)
  if (count <= 1) return 0
  if (months >= 12) {
    const steps = { 2: 6, 3: 3, 4: 3, 5: 2 }
    return steps[count] ?? Math.max(1, Math.round(12 / count))
  }
  return Math.max(1, Math.floor(months / count))
}

export function maxInstallmentsForCover(coverMonths = 12) {
  return Math.min(5, Math.max(1, Math.round(Number(coverMonths) || 12)))
}

export function defaultInstallmentCountForCover(coverMonths = 12) {
  const months = Math.max(1, Math.round(Number(coverMonths) || 12))
  if (months <= 2) return 1
  if (months <= 6) return Math.min(2, months)
  return 3
}

export function proratePremium(premium, fromMonths, toMonths) {
  const from = Math.max(1, Number(fromMonths) || 12)
  const to = Math.max(1, Number(toMonths) || 12)
  return round2(((Number(premium) || 0) * to) / from)
}

/** Equal rate split that always sums to 100 (last installment takes the remainder). */
export function equalInstallmentRates(count) {
  const n = Math.max(Math.round(Number(count) || 1), 1)
  const base = round2(100 / n)
  return Array.from({ length: n }, (_, i) =>
    i === n - 1 ? round2(100 - base * (n - 1)) : base,
  )
}

/** Common unequal splits agents use; falls back to equal rates. */
export function presetInstallmentRates(count, preset = 'equal') {
  const n = Math.max(Math.round(Number(count) || 1), 1)
  const presets = {
    equal: equalInstallmentRates(n),
    '40-30-30': n === 3 ? [40, 30, 30] : null,
    '50-30-20': n === 3 ? [50, 30, 20] : null,
    '60-40': n === 2 ? [60, 40] : null,
    '70-30': n === 2 ? [70, 30] : null,
    '40-20-20-20': n === 4 ? [40, 20, 20, 20] : null,
  }
  return presets[preset] ?? equalInstallmentRates(n)
}

/** Converts rate percents into installment amounts that sum to the premium. */
export function amountsFromRates(premium, rates) {
  const total = Number(premium) || 0
  const list = Array.isArray(rates) ? rates : []
  if (list.length === 0) return []

  const amounts = []
  let allocated = 0

  for (let i = 0; i < list.length; i++) {
    if (i === list.length - 1) {
      amounts.push(round2(Math.max(0, total - allocated)))
    } else {
      const rate = Number(list[i]) || 0
      const amount = round2((total * rate) / 100)
      amounts.push(amount)
      allocated = round2(allocated + amount)
    }
  }

  return amounts
}

/** Rate percent for an amount against the total premium. */
export function rateFromAmount(premium, amount) {
  const total = Number(premium) || 0
  if (total <= 0) return 0
  return round2((Number(amount) / total) * 100)
}

function parseAmountValue(value) {
  if (value === '' || value == null) return null
  const number = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(number) ? number : null
}

/**
 * Builds an installment schedule from policy start date.
 * Due dates are spaced across the policy year by installment count
 * (e.g. 2 = half-yearly, 3 = quarterly). Installment 1 = start date.
 * Pass `rates` (e.g. [40, 30, 30]) to split the premium by percent.
 * Amounts and due dates can be overridden via `overrides`.
 *
 * @param {{
 *   premium: number,
 *   installmentCount: number,
 *   startDate: string,
 *   rates?: number[],
 *   overrides?: Array<{ amount?: number|string|null, due_date?: string|null, rate?: number|string|null, paid?: boolean, paid_at?: string|null, paid_amount?: number|null }>,
 *   maxInstallments?: number,
 *   coverMonths?: number,
 * }} input
 * @returns {Omit<import('../types').PaymentSchedule, 'id'|'vehicle_id'|'created_at'> | null}
 */
export function buildInstallmentSchedule({
  premium,
  installmentCount,
  startDate,
  rates,
  overrides = [],
  maxInstallments = 5,
  coverMonths = 12,
}) {
  const totalPremium = Number(premium)
  if (!startDate || !Number.isFinite(totalPremium) || totalPremium <= 0) return null

  const months = Math.max(Math.round(Number(coverMonths) || 12), 1)
  const count = Math.min(
    Math.max(Math.round(Number(installmentCount) || 1), 1),
    maxInstallments,
    months,
  )
  const baseDate = new Date(`${startDate}T12:00:00`)
  if (Number.isNaN(baseDate.getTime())) return null

  const monthStep = installmentMonthStep(count, months)
  const resolvedRates =
    Array.isArray(rates) && rates.length === count
      ? rates.map(rate => Number(rate) || 0)
      : equalInstallmentRates(count)
  const defaultAmounts = amountsFromRates(totalPremium, resolvedRates)
  const installments = []

  for (let i = 0; i < count; i++) {
    const override = overrides[i] ?? {}
    const defaultAmount = defaultAmounts[i]
    const parsedAmount = parseAmountValue(override.amount)
    const amount = parsedAmount == null ? defaultAmount : parsedAmount
    const parsedRate = parseAmountValue(override.rate)
    const rate =
      parsedRate == null
        ? resolvedRates[i]
        : parsedRate

    installments.push({
      number: i + 1,
      amount: Number.isFinite(amount) ? round2(amount) : defaultAmount,
      rate: Number.isFinite(rate) ? round2(rate) : resolvedRates[i],
      due_date:
        override.due_date ||
        format(addMonths(baseDate, i * monthStep), 'yyyy-MM-dd'),
      paid: Boolean(override.paid),
      paid_at: override.paid_at ?? null,
      paid_amount: override.paid_amount ?? null,
    })
  }

  return {
    total_premium: totalPremium,
    down_payment: 0,
    down_payment_paid: false,
    down_payment_paid_at: null,
    installment_count: installments.length,
    installments,
  }
}

/**
 * Builds a payment schedule from agent Preliminary renewals fields
 * (Renewal 1–4 dates, Payment 1–4 amounts, Total Premium, Bal.).
 *
 * @param {{
 *   renewalDates: (string|null)[],
 *   paymentAmounts: (number|null)[],
 *   premium: number|null,
 *   balance: number|null,
 * }} input
 * @returns {Omit<import('../types').PaymentSchedule, 'id'|'vehicle_id'|'created_at'> | null}
 */
export function buildPaymentScheduleFromPlan({
  renewalDates = [],
  paymentAmounts = [],
  premium,
  balance,
}) {
  const installments = []

  for (let i = 0; i < 4; i++) {
    const dueDate = renewalDates[i] || null
    const amount = paymentAmounts[i]
    if (!dueDate && (amount == null || amount === '')) continue

    installments.push({
      number: installments.length + 1,
      amount: Number(amount) || 0,
      due_date: dueDate,
      paid: false,
      paid_at: null,
    })
  }

  if (installments.length === 0) return null

  const totalPremium =
    premium == null || premium === ''
      ? installments.reduce((sum, item) => sum + item.amount, 0)
      : Number(premium)

  const outstanding = balance == null || balance === '' ? null : Math.max(0, Number(balance))
  let paidBudget = outstanding == null ? 0 : Math.max(0, totalPremium - outstanding)

  for (const installment of installments) {
    if (installment.amount <= 0 || paidBudget <= 0) continue
    if (paidBudget + 0.01 >= installment.amount) {
      installment.paid = true
      paidBudget -= installment.amount
    } else {
      break
    }
  }

  return {
    total_premium: totalPremium,
    down_payment: 0,
    down_payment_paid: false,
    down_payment_paid_at: null,
    installment_count: installments.length,
    installments,
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}
