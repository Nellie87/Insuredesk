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
export function reconcileScheduleWithPayments(schedule, payments) {
  if (!schedule) return schedule

  const related = (payments ?? []).filter(
    payment =>
      payment.schedule_id === schedule.id || payment.vehicle_id === schedule.vehicle_id
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
 * @param {object} vehicle
 * @returns {import('../types').PaymentSchedule[]}
 */
export function getVehicleSchedules(vehicle) {
  const schedules = vehicle?.payment_schedules
  if (!schedules) return []
  return Array.isArray(schedules) ? schedules : [schedules]
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
 * Builds an equal installment schedule from policy start date.
 * Due dates are monthly from the start date (installment 1 = start date).
 * Amounts and due dates can be overridden via `overrides`.
 *
 * @param {{
 *   premium: number,
 *   installmentCount: number,
 *   startDate: string,
 *   overrides?: Array<{ amount?: number|string|null, due_date?: string|null, paid?: boolean, paid_at?: string|null, paid_amount?: number|null }>,
 *   maxInstallments?: number,
 * }} input
 * @returns {Omit<import('../types').PaymentSchedule, 'id'|'vehicle_id'|'created_at'> | null}
 */
export function buildInstallmentSchedule({
  premium,
  installmentCount,
  startDate,
  overrides = [],
  maxInstallments = 5,
}) {
  const totalPremium = Number(premium)
  if (!startDate || !Number.isFinite(totalPremium) || totalPremium <= 0) return null

  const count = Math.min(
    Math.max(Math.round(Number(installmentCount) || 1), 1),
    maxInstallments,
  )
  const baseDate = new Date(`${startDate}T12:00:00`)
  if (Number.isNaN(baseDate.getTime())) return null

  const baseAmount = round2(totalPremium / count)
  const installments = []

  for (let i = 0; i < count; i++) {
    const override = overrides[i] ?? {}
    const isLast = i === count - 1
    const defaultAmount = isLast
      ? round2(totalPremium - baseAmount * (count - 1))
      : baseAmount

    const rawAmount = override.amount
    const amount =
      rawAmount === '' || rawAmount == null
        ? defaultAmount
        : Number(rawAmount)

    installments.push({
      number: i + 1,
      amount: Number.isFinite(amount) ? round2(amount) : defaultAmount,
      due_date:
        override.due_date ||
        format(addMonths(baseDate, i), 'yyyy-MM-dd'),
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
