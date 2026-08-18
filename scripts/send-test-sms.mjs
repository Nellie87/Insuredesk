import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sendAfricasTalkingSms, DEFAULT_TEST_MESSAGE } from './at-sms.mjs'

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

loadEnv(resolve(process.cwd(), '.env'))

const toArg = arg('to') || process.argv[2]
const message = arg('message', DEFAULT_TEST_MESSAGE)

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

try {
  const result = await sendAfricasTalkingSms({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME || 'sandbox',
    from: process.env.AT_SENDER_ID || undefined,
    to: toArg,
    message,
  })
  console.log(`Sent to ${result.to}`)
  console.log(`Status: ${result.status}`)
  if (result.messageId) console.log(`Message ID: ${result.messageId}`)
  if (result.sandbox) {
    console.log("Read it in the Africa's Talking simulator — it will not reach a real phone.")
  }
} catch (error) {
  console.error(error.message || 'SMS was not accepted.')
  if ((process.env.AT_USERNAME || 'sandbox') === 'sandbox') {
    console.error('\nSandbox tips:')
    console.error('- AT_USERNAME must be exactly: sandbox')
    console.error('- Add this number in https://developers.africastalking.com/simulator')
    console.error('- Use the sandbox app API key, not a live key')
  }
  process.exit(1)
}
