import { supabase } from './supabase'
import { toSmsMessage } from '../utils/reminders'

export async function sendSms({ to, message } = {}) {
  const { data, error } = await supabase.functions.invoke('sms-send', {
    body: {
      to,
      message: message ? toSmsMessage(message) : undefined,
    },
  })

  if (error) {
    const unreachable =
      error.message?.includes('Failed to send') || error.message?.includes('Function')
    throw new Error(
      unreachable
        ? 'Could not reach the SMS service. Deploy sms-send first (see README).'
        : error.message || 'SMS send failed.',
    )
  }

  if (data?.error) throw new Error(data.error)
  return data
}
