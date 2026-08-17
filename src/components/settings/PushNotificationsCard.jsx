import { toast } from '../../store/toastStore'
import { usePushNotifications } from '../../hooks/usePushNotifications'

export default function PushNotificationsCard({ compact = false }) {
  const push = usePushNotifications()
  const blocked =
    !push.supported ||
    !push.configured ||
    push.iosNeedsInstall ||
    push.permission === 'denied'

  const handleEnable = async () => {
    try {
      await push.enable()
      toast('Phone alerts are on.')
    } catch (err) {
      toast(err.message || 'Could not enable alerts.', 'error')
    }
  }

  const handleDisable = async () => {
    try {
      await push.disable()
      toast('Phone alerts are off on this device.')
    } catch (err) {
      toast(err.message || 'Could not disable alerts.', 'error')
    }
  }

  const handleTest = async () => {
    try {
      const kind = await push.sendTest()
      toast(
        kind === 'push'
          ? 'Test alert sent. Check your notifications.'
          : 'Test alert shown. Check the corner of the screen or the notification shade.',
      )
    } catch (err) {
      toast(err.message || 'Could not send a test alert.', 'error')
    }
  }

  if (compact && (push.subscribed || !push.configured)) return null

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card sm:p-5">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Phone alerts</h2>
        <p className="mt-1 text-xs text-slate-500">{push.statusText}</p>
      </div>

      {!compact && (
        <p className="text-xs text-slate-500">
          You will get a lock-screen summary when payments, renewals, or follow-ups
          are due. On iPhone this only works after you add the app to your Home Screen.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {push.subscribed ? (
          <button
            type="button"
            onClick={handleDisable}
            disabled={push.busy}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            {push.busy ? 'Working...' : 'Turn off'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={push.busy || blocked}
            className="rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {push.busy ? 'Enabling...' : 'Enable alerts'}
          </button>
        )}

        {!compact && (
          <button
            type="button"
            onClick={handleTest}
            disabled={push.busy || blocked}
            className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-800 disabled:opacity-50"
          >
            {push.busy ? 'Sending...' : 'Send test'}
          </button>
        )}
      </div>
    </section>
  )
}
