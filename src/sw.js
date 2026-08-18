import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { ExpirationPlugin } from 'workbox-expiration'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(event.request)
        if (fresh.ok) return fresh
      } catch {
        // offline or the host has no file for this React route
      }

      return (
        (await matchPrecache('/index.html')) ||
        (await matchPrecache('index.html')) ||
        fetch('/index.html')
      )
    })(),
  )
})

registerRoute(
  ({ url }) =>
    url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/rest/v1/'),
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  }),
)

self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data?.text() || '' }
  }

  const title = data.title || 'InsureAgent'
  const options = {
    body: data.body || 'You have a new reminder.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'insureagent-reminder',
    renotify: true,
    data: { url: data.url || '/reminders' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const path = event.notification.data?.url || '/reminders'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const origin = self.location.origin

      for (const client of allClients) {
        if (client.url.startsWith(origin) && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            await client.navigate(path)
          }
          return
        }
      }

      await self.clients.openWindow(path)
    })(),
  )
})
