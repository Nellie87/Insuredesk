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

function describeStatus({ supported, configured, permission, subscribed, iosNeedsInstall }) {
  if (!supported) return 'This browser cannot receive push alerts.'
  if (!configured) return 'Push alerts are not configured on this server yet.'
  if (iosNeedsInstall) {
    return 'On iPhone, add InsureAgent to your Home Screen, open it from there, then enable alerts.'
  }
  if (permission === 'denied') {
    return 'Notifications are blocked for this app. Enable them in your phone or browser settings.'
  }
  if (subscribed) return 'Alerts are on for this phone.'
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
    setSubscribed(Boolean(subscription))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      await enablePushNotifications(agentId)
      await refresh()
      await showLocalNotification('InsureAgent alerts are on', {
        body: 'You will get a summary when payments, renewals, or follow-ups are due.',
        tag: 'insureagent-enabled',
        data: { url: '/reminders' },
      })
    } finally {
      setBusy(false)
    }
  }, [agentId, refresh])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      await disablePushNotifications(agentId)
      await refresh()
    } finally {
      setBusy(false)
    }
  }, [agentId, refresh])

  const sendTest = useCallback(async () => {
    setBusy(true)
    try {
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
      setBusy(false)
    }
  }, [])

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
