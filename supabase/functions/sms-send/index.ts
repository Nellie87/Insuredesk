import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendAfricasTalkingSms } from '../_shared/africastalking.ts'

const TEST_MESSAGE =
  'InsureAgent sandbox test: the SMS reminder path works. Open the Africa\'s Talking simulator to read this message.'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function env(name: string, fallback = '') {
  return Deno.env.get(name) ?? fallback
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { error: json({ error: 'Not signed in.' }, 401) }

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_ANON_KEY')
  if (!url || !key) return { error: json({ error: 'Missing Supabase credentials.' }, 500) }

  const supabase = createClient(url, key)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return { error: json({ error: 'Not signed in.' }, 401) }
  return { user: data.user }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    return json(result)
  } catch (error) {
    const message = error?.message || 'SMS send failed.'
    const status = /not configured|required|too long|Kenyan number/i.test(message) ? 400 : 502
    return json(
      {
        error: message,
        sandbox: error?.sandbox,
      },
      status,
    )
  }
})
