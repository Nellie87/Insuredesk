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
 * Calculates outstanding balance for a vehicle
 * @param {import('../types').PaymentSchedule} schedule
 * @returns {number}
 */
export function getOutstandingBalance(schedule) {
  if (!schedule) return 0
  const installments = schedule.installments ?? []
  const paidInstallments = installments
    .filter(i => i.paid)
    .reduce((sum, i) => sum + i.amount, 0)

  const downPaymentPaid = schedule.down_payment_paid ? schedule.down_payment : 0
  const totalPaid = paidInstallments + downPaymentPaid
  return round2(schedule.total_premium - totalPaid)
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

function round2(n) {
  return Math.round(n * 100) / 100
}
