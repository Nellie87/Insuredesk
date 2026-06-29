import { format } from 'date-fns'
import { formatKSh } from './calculator'

/**
 * Generates a WhatsApp/SMS reminder message based on trigger type
 *
 * @param {object} params
 * @param {import('../types').ReminderTrigger} params.trigger
 * @param {import('../types').Client} params.client
 * @param {import('../types').Vehicle} params.vehicle
 * @param {import('../types').Installment} [params.installment]
 * @param {import('../types').Agent} params.agent
 * @returns {string}
 */
export function buildReminderMessage({ trigger, client, vehicle, installment, agent }) {
  const firstName = client.name.split(' ')[0]
  const reg = vehicle.registration
  const agentName = agent.name
  const agentPhone = agent.phone

  switch (trigger) {
    case 'payment_due_7d':
    case 'payment_due_3d': {
      const days = trigger === 'payment_due_7d' ? 7 : 3
      const dueDate = installment ? format(new Date(installment.due_date), 'dd MMM yyyy') : 'soon'
      const amount = installment ? formatKSh(installment.amount) : ''
      return (
        `Hello ${firstName}, this is a reminder that your motor insurance installment of *${amount}* for vehicle *${reg}* is due in ${days} days, on *${dueDate}*.\n\n` +
        `Please contact ${agentName} on ${agentPhone} to make your payment.\n\n` +
        `Thank you for choosing us.`
      )
    }

    case 'payment_due_today': {
      const amount = installment ? formatKSh(installment.amount) : ''
      return (
        `Hello ${firstName}, your motor insurance payment of *${amount}* for vehicle *${reg}* is due *today*.\n\n` +
        `Please contact ${agentName} on ${agentPhone} to arrange payment and keep your policy active.\n\n` +
        `Thank you.`
      )
    }

    case 'payment_overdue_1d': {
      const amount = installment ? formatKSh(installment.amount) : ''
      return (
        `Hello ${firstName}, your motor insurance installment of *${amount}* for vehicle *${reg}* was due yesterday and has not been received.\n\n` +
        `Please contact ${agentName} on ${agentPhone} urgently to avoid interruption to your cover.\n\n` +
        `Thank you.`
      )
    }

    case 'policy_expiry_30d': {
      const expiryDate = format(new Date(vehicle.expiry_date), 'dd MMM yyyy')
      return (
        `Hello ${firstName}, your motor insurance policy for *${reg}* expires on *${expiryDate}* — that's in 30 days.\n\n` +
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
        `Renew now — contact ${agentName} on ${agentPhone}. Driving without valid insurance is an offence.`
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
 * Generates a WhatsApp click-to-chat URL
 * @param {string} phone - in format 0712345678 or +254712345678
 * @param {string} message
 * @returns {string}
 */
export function whatsappUrl(phone, message) {
  // Normalize to international format
  const normalized = phone.startsWith('+')
    ? phone.replace('+', '')
    : phone.startsWith('0')
    ? `254${phone.slice(1)}`
    : phone

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}
