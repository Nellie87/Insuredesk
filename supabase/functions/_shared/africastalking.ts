const SANDBOX_HOST = 'https://api.sandbox.africastalking.com'
const LIVE_HOST = 'https://api.africastalking.com'
const MAX_MESSAGE_LENGTH = 1000

export function normalizeMsisdn(raw: string): string {
  const compact = String(raw || '').trim().replace(/[\s\-().]/g, '')
  if (!compact) throw new Error('Phone number is required.')

  const plus = compact.startsWith('+')
  const digits = (plus ? compact.slice(1) : compact).replace(/\D/g, '')

  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`
  if (digits.length === 9 && digits.startsWith('7')) return `+254${digits}`
  if (plus && digits.length >= 10 && digits.length <= 15) return `+${digits}`

  throw new Error('Use a Kenyan number like 0712 345678 or +254712345678.')
}

export function toSmsMessage(message: string): string {
  return String(message || '')
    .replace(/\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function atMessagingUrl(username: string): string {
  const host = username === 'sandbox' ? SANDBOX_HOST : LIVE_HOST
  return `${host}/version1/messaging`
}

export async function sendAfricasTalkingSms({
  apiKey,
  username,
  to,
  message,
  from,
}: {
  apiKey: string
  username: string
  to: string
  message: string
  from?: string
}) {
  if (!apiKey || !username) {
    throw new Error("Africa's Talking is not configured. Set AT_API_KEY and AT_USERNAME.")
  }

  const recipient = normalizeMsisdn(to)
  const text = toSmsMessage(message)
  if (!text) throw new Error('Message is required.')
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message is too long (${text.length} chars). Keep it under ${MAX_MESSAGE_LENGTH}.`)
  }

  const params = new URLSearchParams()
  params.set('username', username)
  params.set('to', recipient)
  params.set('message', text)
  if (from) params.set('from', from)

  const response = await fetch(atMessagingUrl(username), {
    method: 'POST',
    headers: {
      apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data = await response.json().catch(() => ({}))
  const recipients = data?.SMSMessageData?.Recipients ?? []
  const first = recipients[0]
  const ok =
    response.ok &&
    first &&
    (first.status === 'Success' || first.statusCode === 100 || first.statusCode === 101)

  if (!ok) {
    const detail =
      first?.status ||
      data?.SMSMessageData?.Message ||
      data?.message ||
      `HTTP ${response.status}`
    const error = new Error(`SMS was not accepted: ${detail}`)
    Object.assign(error, { details: data, sandbox: username === 'sandbox' })
    throw error
  }

  return {
    ok: true,
    sandbox: username === 'sandbox',
    to: first.number || recipient,
    status: first.status,
    messageId: first.messageId,
    cost: first.cost,
    summary: data?.SMSMessageData?.Message,
  }
}
