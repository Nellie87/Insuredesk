import { useEffect, useState } from 'react'
import { toast } from '../../store/toastStore'
import { useAppStore } from '../../store/appStore'
import { sendSms } from '../../lib/sms'
import { INPUT_SPACED as INPUT, LABEL } from '../../constants/formStyles'

const SIMULATOR_URL = 'https://developers.africastalking.com/simulator'

export default function SmsSandboxCard() {
  const agentPhone = useAppStore(s => s.agent?.phone) || ''
  const [to, setTo] = useState(agentPhone)

  useEffect(() => {
    if (agentPhone && !to) setTo(agentPhone)
  }, [agentPhone, to])
  const [busy, setBusy] = useState(false)

  const handleSend = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      const result = await sendSms({ to })
      toast(
        result?.sandbox
          ? 'Test SMS sent. Check the Africa’s Talking simulator.'
          : `Test SMS sent to ${result?.to || to}.`,
      )
    } catch (err) {
      toast(err.message || 'Could not send a test SMS.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
      <div>
        <h2 className="text-sm font-bold text-slate-900">SMS sandbox</h2>
        <p className="mt-1 text-xs text-slate-500">
          Send a test reminder through Africa’s Talking. Sandbox messages do not
          reach real phones — add the number in the simulator first.
        </p>
      </div>

      <form onSubmit={handleSend} className="space-y-3">
        <div>
          <label className={LABEL} htmlFor="sms-sandbox-to">
            Test phone
          </label>
          <input
            id="sms-sandbox-to"
            required
            type="tel"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="0712 345678"
            className={INPUT}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy || !to.trim()}
            className="rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Sending...' : 'Send test SMS'}
          </button>
          <a
            href={SIMULATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Open simulator
          </a>
        </div>
      </form>
    </section>
  )
}
