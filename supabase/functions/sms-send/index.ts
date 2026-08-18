import { sendAfricasTalkingSms } from '../_shared/africastalking.ts'

const TEST_MESSAGE =
  "InsureAgent sandbox test: the SMS reminder path works. Open the Africa's Talking simulator to read this message."

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      req.headers.get('Access-Control-Request-Headers') ||
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function env(name: string, fallback = '') {
  return Deno.env.get(name) ?? fallback
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { error: json(req, { error: 'Not signed in.' }, 401) }

  const url = env('SUPABASE_URL')
  const anonKey = env('SUPABASE_ANON_KEY')
  if (!url || !anonKey) {
    return { error: json(req, { error: 'Missing Supabase credentials.' }, 500) }
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  })

  if (!response.ok) return { error: json(req, { error: 'Not signed in.' }, 401) }
  const user = await response.json()
  if (!user?.id) return { error: json(req, { error: 'Not signed in.' }, 401) }
  return { user }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  try {
    const auth = await requireUser(req)
    if ('error' in auth && auth.error) return auth.error

    const body = await req.json().catch(() => ({}))
    const to = String(body.to || '').trim()
    const message = String(body.message || TEST_MESSAGE)

    const result = await sendAfricasTalkingSms({
      apiKey: env('AT_API_KEY'),
      username: env('AT_USERNAME', 'sandbox'),
      from: env('AT_SENDER_ID') || undefined,
      to,
      message,
    })

    return json(req, result)
  } catch (error) {
    const err = error as { message?: string; sandbox?: boolean }
    const message = err?.message || 'SMS send failed.'
    const status = /not configured|required|too long|Kenyan number/i.test(message) ? 400 : 502
    return json(req, { error: message, sandbox: err?.sandbox }, status)
  }
})
