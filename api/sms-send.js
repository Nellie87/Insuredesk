import { sendAfricasTalkingSms, DEFAULT_TEST_MESSAGE } from '../scripts/at-sms.mjs'

async function requireUser(req) {
  const auth = req.headers.authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!token || !url || !anon) return false

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
    },
  })
  return response.ok
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' })
    return
  }

  if (!(await requireUser(req))) {
    res.status(401).json({ error: 'Not signed in.' })
    return
  }

  try {
    const result = await sendAfricasTalkingSms({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME || 'sandbox',
      from: process.env.AT_SENDER_ID || undefined,
      to: req.body?.to,
      message: req.body?.message || DEFAULT_TEST_MESSAGE,
    })
    res.status(200).json(result)
  } catch (error) {
    const message = error.message || 'SMS send failed.'
    const status = /not configured|required|too long|Kenyan number/i.test(message)
      ? 400
      : 502
    res.status(status).json({ error: message, sandbox: error.sandbox })
  }
}
