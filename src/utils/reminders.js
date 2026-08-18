import { differenceInDays, format, startOfDay } from 'date-fns'
import {
  formatKSh,
  getInstallmentRemaining,
} from './calculator'

/** Payment reminders: 2 weeks before, 1 week before, and the day before. */
export const PAYMENT_REMINDER_OFFSETS = [
  { daysBefore: 14, trigger: 'payment_due_14d', title: '14-day reminder' },
  { daysBefore: 7, trigger: 'payment_due_7d', title: '7-day reminder' },
  { daysBefore: 1, trigger: 'payment_due_1d', title: 'Day-before reminder' },
]

const PAYMENT_WHEN = {
  payment_due_14d: 'in 14 days',
  payment_due_7d: 'in 7 days',
  payment_due_3d: 'in 3 days',
  payment_due_1d: '*tomorrow*',
  payment_due_today: '*today*',
}

function parseDueDate(installment) {
  if (!installment?.due_date) return null
  const date = new Date(installment.due_date)
  return Number.isNaN(date.getTime()) ? null : date
}

function paymentBalanceLines(remaining, totalPayable) {
  const remainingStr = formatKSh(remaining)
  const total = Math.max(remaining, Number(totalPayable || 0))
  const totalStr = formatKSh(total)
  return (
    `Remaining balance: *${remainingStr}*\n` +
    `Total payable (to clear the policy): *${totalStr}*\n\n`
  )
}

function paymentContactLines(agentName, agentPhone, urgent = false) {
  const verb = urgent
    ? 'urgently to avoid interruption to your cover'
    : 'to make your payment'
  return (
    `Please contact ${agentName} on ${agentPhone} ${verb}.\n\n` +
    `Thank you for choosing us.`
  )
}

/**
 * Pick the payment reminder trigger from days until the due date.
 * @param {string} dueDate
 * @param {Date} [today]
 * @returns {import('../types').ReminderTrigger}
 */
export function paymentReminderTriggerForDueDate(dueDate, today = new Date()) {
  if (!dueDate) return 'payment_due_14d'
  const due = startOfDay(new Date(dueDate))
  const days = differenceInDays(due, startOfDay(today))
  if (days < 0) return 'payment_overdue_1d'
  if (days === 0) return 'payment_due_today'
  if (days === 1) return 'payment_due_1d'
  if (days <= 7) return 'payment_due_7d'
  return 'payment_due_14d'
}

/**
 * Generates a WhatsApp/SMS reminder message based on trigger type
 *
 * @param {object} params
 * @param {import('../types').ReminderTrigger} params.trigger
 * @param {import('../types').Client} params.client
 * @param {import('../types').Vehicle} params.vehicle
 * @param {import('../types').Installment} [params.installment]
 * @param {number} [params.outstanding] Total remaining on the policy
 * @param {import('../types').Agent} params.agent
 * @returns {string}
 */
export function buildReminderMessage({
  trigger,
  client,
  vehicle,
  installment,
  outstanding,
  agent,
}) {
  const firstName = client.name.split(' ')[0]
  const reg = vehicle.registration
  const agentName = agent.name
  const agentPhone = agent.phone
  const remaining = getInstallmentRemaining(installment)
  const totalPayable = Math.max(remaining, Number(outstanding || 0))
  const due = parseDueDate(installment)
  const dueDate = due ? format(due, 'dd MMM yyyy') : 'soon'
  const balances = paymentBalanceLines(remaining, totalPayable)

  switch (trigger) {
    case 'payment_due_14d':
    case 'payment_due_7d':
    case 'payment_due_3d':
    case 'payment_due_1d':
    case 'payment_due_today': {
      const when = PAYMENT_WHEN[trigger] ?? 'soon'
      return (
        `Hello ${firstName}, this is a reminder that your motor insurance installment for vehicle *${reg}* is due ${when}, on *${dueDate}*.\n\n` +
        balances +
        paymentContactLines(agentName, agentPhone)
      )
    }

    case 'payment_overdue_1d': {
      return (
        `Hello ${firstName}, your motor insurance installment for vehicle *${reg}* was due on *${dueDate}* and has not been received in full.\n\n` +
        balances +
        paymentContactLines(agentName, agentPhone, true)
      )
    }

    case 'policy_expiry_30d': {
      const expiryDate = format(new Date(vehicle.expiry_date), 'dd MMM yyyy')
      return (
        `Hello ${firstName}, your motor insurance policy for *${reg}* expires on *${expiryDate}* - that's in 30 days.\n\n` +
        `Contact ${agentName} on ${agentPhone} to start your renewal and avoid a lapse in cover.`
      )
    }

    case 'policy_expiry_14d': {
      const expiryDate = format(new Date(vehicle.expiry_date), 'dd MMM yyyy')
      return (
        `Hello ${firstName}, only *14 days* left on your motor insurance for *${reg}* (expires ${expiryDate}).\n\n` +
        `Please call or WhatsApp ${agentName} on ${agentPhone} to renew now.`
      )
    }

    case 'policy_expiry_7d': {
      const expiryDate = format(new Date(vehicle.expiry_date), 'dd MMM yyyy')
      return (
        `⚠️ Hello ${firstName}, your motor insurance for *${reg}* expires in *7 days* on ${expiryDate}.\n\n` +
        `Renew now - contact ${agentName} on ${agentPhone}. Driving without valid insurance is an offence.`
      )
    }

    case 'policy_expiry_today': {
      return (
        `🚨 Hello ${firstName}, your motor insurance for *${reg}* expires *today*.\n\n` +
        `Call ${agentName} on ${agentPhone} immediately to renew and stay legally covered.`
      )
    }

    default:
      return `Hello ${firstName}, please contact ${agentName} on ${agentPhone} regarding your insurance policy for ${reg}.`
  }
}

/**
 * Normalize a Kenyan (or already-international) number to +E.164.
 * @param {string} phone
 * @returns {string}
 */
export function normalizeMsisdn(phone) {
  const compact = String(phone || '').trim().replace(/[\s\-().]/g, '')
  if (!compact) throw new Error('Phone number is required.')

  const plus = compact.startsWith('+')
  const digits = (plus ? compact.slice(1) : compact).replace(/\D/g, '')

  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`
  if (digits.length === 9 && digits.startsWith('7')) return `+254${digits}`
  if (plus && digits.length >= 10 && digits.length <= 15) return `+${digits}`

  throw new Error('Use a Kenyan number like 0712 345678 or +254712345678.')
}

/** Strip WhatsApp *bold* markers for SMS. */
export function toSmsMessage(message) {
  return String(message || '')
    .replace(/\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Generates a WhatsApp click-to-chat URL
 * @param {string} phone - in format 0712345678 or +254712345678
 * @param {string} message
 * @returns {string}
 */
export function whatsappUrl(phone, message) {
  let normalized
  try {
    normalized = normalizeMsisdn(phone).replace('+', '')
  } catch {
    normalized = String(phone || '').replace(/\D/g, '')
  }
  if (!normalized) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}
