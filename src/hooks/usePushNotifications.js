import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import {
  disablePushNotifications,
  enablePushNotifications,
  getCurrentPushSubscription,
  getNotificationPermission,
  isIosDevice,
  isPushConfigured,
  isPushSupported,
  isStandalonePwa,
  sendTestPush,
  showLocalNotification,
} from '../lib/push'

function describeStatus({
  supported,
  configured,
  permission,
  subscribed,
  iosNeedsInstall,
}) {
  if (permission === 'granted' && subscribed) {
    return 'Notifications are allowed, and alerts are connected on this phone.'
  }
  if (permission === 'granted' && iosNeedsInstall) {
    return 'Notifications are allowed. Add InsureAgent to your Home Screen, open it from there, then tap Enable alerts.'
  }
  if (permission === 'granted') {
    return 'Notifications are allowed. Tap Enable alerts to finish connecting this phone.'
  }
  if (!supported) return 'This browser cannot receive push alerts.'
  if (!configured) return 'Push alerts are not configured on this server yet.'
  if (iosNeedsInstall) {
    return 'On iPhone, add InsureAgent to your Home Screen, open it from there, then enable alerts.'
  }
  if (permission === 'denied') {
    return 'Notifications are blocked for this app. Enable them in your phone or browser settings, then tap Enable alerts again.'
  }
  return 'Turn on alerts to get due payments, renewals, and follow-ups on this phone.'
}

export function usePushNotifications() {
  const agentId = useAppStore(s => s.session?.user?.id)
  const [permission, setPermission] = useState(getNotificationPermission)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  const supported = isPushSupported()
  const configured = isPushConfigured()
  const iosNeedsInstall = isIosDevice() && !isStandalonePwa()

  const refresh = useCallback(async () => {
    setPermission(getNotificationPermission())
    const subscription = await getCurrentPushSubscription()
    setPermission(getNotificationPermission())
    setSubscribed(Boolean(subscription))
  }, [])

  useEffect(() => {
    refresh()

    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    let permissionStatus
    const watch = async () => {
      try {
        permissionStatus = await navigator.permissions?.query({ name: 'notifications' })
        if (permissionStatus) permissionStatus.onchange = () => refresh()
      } catch {
        // Safari and some WebViews do not support this query.
      }
    }
    watch()

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      if (permissionStatus) permissionStatus.onchange = null
    }
  }, [refresh])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      await enablePushNotifications(agentId)
      await showLocalNotification('InsureAgent alerts are on', {
        body: 'You will get a summary when payments, renewals, or follow-ups are due.',
        tag: 'insureagent-enabled',
        data: { url: '/reminders' },
      })
    } finally {
      await refresh()
      setBusy(false)
    }
  }, [agentId, refresh])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      await disablePushNotifications(agentId)
    } finally {
      await refresh()
      setBusy(false)
    }
  }, [agentId, refresh])

  const sendTest = useCallback(async () => {
    setBusy(true)
    try {
      if (!subscribed) {
        await enablePushNotifications(agentId)
        await refresh()
      }

      try {
        await sendTestPush()
        return 'push'
      } catch {
        const shown = await showLocalNotification('InsureAgent test alert', {
          body: 'If you can read this, notification permission is working on this phone.',
          tag: 'insureagent-test',
          data: { url: '/reminders' },
        })
        if (!shown) throw new Error('Could not show a test alert.')
        return 'local'
      }
    } finally {
      await refresh()
      setBusy(false)
    }
  }, [agentId, refresh, subscribed])

  return {
    supported,
    configured,
    permission,
    subscribed,
    busy,
    iosNeedsInstall,
    statusText: describeStatus({
      supported,
      configured,
      permission,
      subscribed,
      iosNeedsInstall,
    }),
    enable,
    disable,
    sendTest,
    refresh,
  }
}
