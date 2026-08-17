import { generateKeyPairSync, randomBytes } from 'node:crypto'

function pad32(buf) {
  if (buf.length === 32) return buf
  if (buf.length > 32) return buf.subarray(buf.length - 32)
  return Buffer.concat([Buffer.alloc(32 - buf.length), buf])
}

const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
})

const pubJwk = publicKey.export({ format: 'jwk' })
const privJwk = privateKey.export({ format: 'jwk' })

const uncompressed = Buffer.concat([
  Buffer.from([0x04]),
  pad32(Buffer.from(pubJwk.x, 'base64url')),
  pad32(Buffer.from(pubJwk.y, 'base64url')),
])

const vapidPublicKey = uncompressed.toString('base64url')
const vapidPrivateKey = Buffer.from(privJwk.d, 'base64url').toString('base64url')

console.log(`
Add this to the app .env (public, safe to expose in the client):

VITE_VAPID_PUBLIC_KEY=${vapidPublicKey}

Set these as Supabase Edge Function secrets (Dashboard → Edge Functions → Secrets):

VAPID_PUBLIC_KEY=${vapidPublicKey}
VAPID_PRIVATE_KEY=${vapidPrivateKey}
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=${randomBytes(24).toString('base64url')}

Keep VAPID_PRIVATE_KEY and CRON_SECRET private. Do not commit them.
`)
