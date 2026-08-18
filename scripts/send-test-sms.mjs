import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SANDBOX_HOST = 'https://api.sandbox.africastalking.com'
const LIVE_HOST = 'https://api.africastalking.com'
const DEFAULT_MESSAGE =
  "InsureAgent sandbox test: the SMS reminder path works. Open the Africa's Talking simulator to read this message."

function loadEnv(filePath) {
  try {
    const text = readFileSync(filePath, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // Missing .env is fine if the variables are already in the environment.
  }
}

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] || fallback
}

function normalizeMsisdn(raw) {
  const compact = String(raw || '').trim().replace(/[\s\-().]/g, '')
  if (!compact) throw new Error('Phone number is required. Pass --to 0712345678')

  const plus = compact.startsWith('+')
  const digits = (plus ? compact.slice(1) : compact).replace(/\D/g, '')

  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`
  if (digits.length === 9 && digits.startsWith('7')) return `+254${digits}`
  if (plus && digits.length >= 10 && digits.length <= 15) return `+${digits}`

  throw new Error('Use a Kenyan number like 0712 345678 or +254712345678.')
}

loadEnv(resolve(process.cwd(), '.env'))

const username = process.env.AT_USERNAME || 'sandbox'
const apiKey = process.env.AT_API_KEY || ''
const senderId = process.env.AT_SENDER_ID || ''
const toArg = arg('to') || process.argv[2]
const message = arg('message', DEFAULT_MESSAGE)

if (!toArg || toArg === '--help' || toArg === '-h') {
  console.log(`
Send a sandbox SMS through Africa's Talking.

  npm run sms:test -- --to 0712345678
  npm run sms:test -- --to +254712345678 --message "Payment due tomorrow"

Then add that number in the simulator:
https://developers.africastalking.com/simulator
`)
  process.exit(toArg ? 0 : 1)
}

if (!apiKey || apiKey.includes('your-africas-talking')) {
  console.error('Set AT_API_KEY in .env to your Africa\'s Talking sandbox API key.')
  process.exit(1)
}

const to = normalizeMsisdn(toArg)
const host = username === 'sandbox' ? SANDBOX_HOST : LIVE_HOST
const params = new URLSearchParams()
params.set('username', username)
params.set('to', to)
params.set('message', message.replace(/\*/g, '').trim())
if (senderId) params.set('from', senderId)

const response = await fetch(`${host}/version1/messaging`, {
  method: 'POST',
  headers: {
    apiKey,
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: params.toString(),
})

const data = await response.json().catch(() => ({}))
const first = data?.SMSMessageData?.Recipients?.[0]
const ok =
  response.ok &&
  first &&
  (first.status === 'Success' || first.statusCode === 100 || first.statusCode === 101)

if (!ok) {
  console.error('SMS was not accepted.')
  console.error(first?.status || data?.SMSMessageData?.Message || data)
  if (username === 'sandbox') {
    console.error('\nSandbox tips:')
    console.error('- AT_USERNAME must be exactly: sandbox')
    console.error('- Add this number in https://developers.africastalking.com/simulator')
    console.error('- Use the sandbox app API key, not a live key')
  }
  process.exit(1)
}

console.log(`Sent to ${first.number || to}`)
console.log(`Status: ${first.status} (${first.statusCode})`)
if (first.messageId) console.log(`Message ID: ${first.messageId}`)
if (username === 'sandbox') {
  console.log("Read it in the Africa's Talking simulator — it will not reach a real phone.")
}
