const encoder = new TextEncoder()

function pad32(bytes) {
  if (bytes.length === 32) return bytes
  if (bytes.length > 32) return bytes.slice(bytes.length - 32)
  const out = new Uint8Array(32)
  out.set(bytes, 32 - bytes.length)
  return out
}

export function b64urlDecode(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export function b64urlEncode(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concat(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  )
  return new Uint8Array(bits)
}

async function vapidJwt(audience, subject, publicKeyBytes, privateKeyBytes) {
  const header = b64urlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = b64urlEncode(
    encoder.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
      }),
    ),
  )
  const unsigned = `${header}.${payload}`

  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: b64urlEncode(pad32(publicKeyBytes.slice(1, 33))),
      y: b64urlEncode(pad32(publicKeyBytes.slice(33, 65))),
      d: b64urlEncode(pad32(privateKeyBytes)),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      encoder.encode(unsigned),
    ),
  )

  return `${unsigned}.${b64urlEncode(signature)}`
}

async function encryptPayload(plaintext, userPublicKey, userAuth) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const localKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )
  const localPublicJwk = await crypto.subtle.exportKey('jwk', localKeys.publicKey)
  const localPublicKey = concat(
    new Uint8Array([0x04]),
    pad32(b64urlDecode(localPublicJwk.x)),
    pad32(b64urlDecode(localPublicJwk.y)),
  )

  const userKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: b64urlEncode(pad32(userPublicKey.slice(1, 33))),
      y: b64urlEncode(pad32(userPublicKey.slice(33, 65))),
    },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: userKey },
      localKeys.privateKey,
      256,
    ),
  )

  const ikm = await hkdf(
    sharedSecret,
    userAuth,
    concat(encoder.encode('WebPush: info\0'), userPublicKey, localPublicKey),
    32,
  )
  const cek = await hkdf(ikm, salt, encoder.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(ikm, salt, encoder.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      concat(plaintext, new Uint8Array([2])),
    ),
  )

  const recordSize = new Uint8Array(4)
  new DataView(recordSize.buffer).setUint32(0, 4096)

  return concat(
    salt,
    recordSize,
    new Uint8Array([localPublicKey.length]),
    localPublicKey,
    ciphertext,
  )
}

export async function sendWebPush({
  endpoint,
  p256dh,
  auth,
  payload,
  vapidPublicKey,
  vapidPrivateKey,
  vapidSubject,
  ttl = 86400,
}) {
  const body = await encryptPayload(
    encoder.encode(payload),
    b64urlDecode(p256dh),
    b64urlDecode(auth),
  )

  const jwt = await vapidJwt(
    new URL(endpoint).origin,
    vapidSubject,
    b64urlDecode(vapidPublicKey),
    b64urlDecode(vapidPrivateKey),
  )

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: String(ttl),
      Urgency: 'high',
    },
    body,
  })

  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  }
}
