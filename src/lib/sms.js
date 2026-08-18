import { supabase } from './supabase'
import { toSmsMessage } from '../utils/reminders'

export async function sendSms({ to, message } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not signed in.')

  const response = await fetch('/api/sms-send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      to,
      message: message ? toSmsMessage(message) : undefined,
    }),
  })

  const text = await response.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(
      'SMS API is not running. Restart npm run dev, then hard-refresh this page.',
    )
  }

  if (!response.ok || data.error) {
    throw new Error(data.error || 'SMS send failed.')
  }
  return data
}
