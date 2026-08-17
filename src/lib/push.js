import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '').trim()

export function isPushConfigured() {
  return Boolean(VAPID_PUBLIC_KEY)
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOS = /iPad|iPhone|iPod/.test(ua)
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOS || iPadOs
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported'
  }
  return Notification.permission
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

async function serviceWorkerReady(timeoutMs = 10000) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser cannot receive push notifications.')
  }

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'The app worker is not ready yet. Open the installed app, or run a production build.',
          ),
        )
      }, timeoutMs)
    }),
  ])
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null
  try {
    const registration = await serviceWorkerReady()
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

async function saveSubscription(agentId, subscription) {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('This device did not return a valid push subscription.')
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      agent_id: agentId,
      endpoint: json.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )

  if (error) throw error
}

export async function enablePushNotifications(agentId) {
  if (!agentId) throw new Error('You need to be signed in.')
  if (!isPushConfigured()) {
    throw new Error('Push notifications are not configured on this server yet.')
  }
  if (!isPushSupported()) {
    throw new Error('This browser does not support push notifications.')
  }
  if (isIosDevice() && !isStandalonePwa()) {
    throw new Error(
      'On iPhone, add InsureAgent to your Home Screen first, then open it from there and try again.',
    )
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Enable them in your phone settings, then try again.'
        : 'Notification permission was not granted.',
    )
  }

  const registration = await serviceWorkerReady()
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  await saveSubscription(agentId, subscription)
  return subscription
}

export async function disablePushNotifications(agentId) {
  const subscription = await getCurrentPushSubscription()
  if (subscription) {
    if (agentId) {
      await supabase
        .from('push_subscriptions')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('agent_id', agentId)
        .eq('endpoint', subscription.endpoint)
    }
    await subscription.unsubscribe()
  } else if (agentId) {
    await supabase
      .from('push_subscriptions')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('agent_id', agentId)
  }
}

export async function disablePushForThisDevice() {
  const subscription = await getCurrentPushSubscription()
  if (!subscription) return
  try {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint)
  } catch {
    // Best-effort: still drop the browser subscription on sign-out.
  }
  try {
    await subscription.unsubscribe()
  } catch {
    // ignore
  }
}

export async function showLocalNotification(title, options = {}) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false
  }

  const payload = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    ...options,
  }

  try {
    const registration = await serviceWorkerReady(4000)
    await registration.showNotification(title, payload)
    return true
  } catch {
    try {
      new Notification(title, payload)
      return true
    } catch {
      return false
    }
  }
}

export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('push-notify', {
    body: { mode: 'test' },
  })
  if (error) {
    const message =
      error.message?.includes('Failed to send') || error.message?.includes('Function')
        ? 'Could not reach the push service. Deploy the push-notify function first (see README).'
        : error.message
    throw new Error(message || 'Test push failed.')
  }
  if (data?.error) throw new Error(data.error)
  return data
}
