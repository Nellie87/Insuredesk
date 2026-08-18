import { sendAfricasTalkingSms, DEFAULT_TEST_MESSAGE } from './at-sms.mjs'

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function isSignedIn(req, env) {
  const auth = req.headers.authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token || !env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return false

  const response = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.VITE_SUPABASE_ANON_KEY,
    },
  })
  return response.ok
}

function smsHandler(env) {
  return async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST.' })
      return
    }

    try {
      if (!(await isSignedIn(req, env))) {
        sendJson(res, 401, { error: 'Not signed in.' })
        return
      }

      const body = await readJson(req)
      const result = await sendAfricasTalkingSms({
        apiKey: env.AT_API_KEY,
        username: env.AT_USERNAME || 'sandbox',
        from: env.AT_SENDER_ID || undefined,
        to: body.to,
        message: body.message || DEFAULT_TEST_MESSAGE,
      })
      sendJson(res, 200, result)
    } catch (error) {
      const message = error.message || 'SMS send failed.'
      const status = /not configured|required|too long|Kenyan number/i.test(message)
        ? 400
        : 502
      sendJson(res, status, { error: message, sandbox: error.sandbox })
    }
  }
}

export function smsDevPlugin(env) {
  return {
    name: 'sms-dev',
    configureServer(server) {
      server.middlewares.use('/api/sms-send', smsHandler(env))
    },
  }
}
