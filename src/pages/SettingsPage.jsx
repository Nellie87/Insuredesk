import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'
import { signOut, updateAgentProfile } from '../lib/supabase'
import { format } from 'date-fns'
import PageShell from '../components/layout/PageShell'
import { INPUT_SPACED as INPUT, LABEL, BTN_PRIMARY } from '../constants/formStyles'

const QUICK_LINKS = [
  { to: '/calculator', label: 'Premium calculator' },
  { to: '/prospects', label: 'Prospects pipeline' },
  { to: '/commissions', label: 'Commission dashboard' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const {
    agent,
    session,
    isOnline,
    isSyncing,
    lastSyncAt,
    setAgent,
    triggerSync,
  } = useAppStore()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (agent) {
      setName(agent.name ?? '')
      setPhone(agent.phone ?? '')
    }
  }, [agent])

  const handleSave = async e => {
    e.preventDefault()
    if (!agent?.id) return

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const updated = await updateAgentProfile(agent.id, { name, phone })
      setAgent(updated)
      setMessage('Profile updated.')
      toast('Profile updated.')
    } catch (err) {
      setError(err.message)
      toast(err.message || 'Could not update profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    setMessage(null)
    setError(null)
    try {
      await triggerSync()
      setMessage('Sync complete.')
      toast('Sync complete.')
    } catch (err) {
      setError(err.message)
      toast(err.message || 'Sync failed.', 'error')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const rates = Array.isArray(agent?.commission_rates)
    ? agent.commission_rates
    : []

  return (
    <PageShell narrow>
      <div className="lg:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-600">
          Account
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your agent profile and app preferences.
        </p>
      </div>

      <p className="hidden text-sm text-slate-500 lg:block">
        Your agent profile and app preferences.
      </p>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
          <h2 className="text-sm font-bold text-slate-900">Agent profile</h2>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className={LABEL}>
                Full name <span className="normal-case text-red-600">*</span>
              </label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className={INPUT}
              />
            </div>

            <div>
              <label className={LABEL}>
                Phone <span className="normal-case text-red-600">*</span>
              </label>
              <input
                required
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={INPUT}
              />
            </div>

            <div>
              <label className={LABEL}>Email</label>
              <input
                readOnly
                value={session?.user?.email ?? agent?.email ?? ''}
                className={`${INPUT} bg-slate-50 text-slate-500`}
              />
            </div>

            <button
              type="submit"
              disabled={saving || !agent}
              className="w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </section>

        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
            <h2 className="text-sm font-bold text-slate-900">Commission rates</h2>
            {rates.length === 0 ? (
              <p className="text-sm text-slate-400">
                No commission rates configured yet.
              </p>
            ) : (
              <div className="space-y-2">
                {rates.map((rate, i) => (
                  <div
                    key={i}
                    className="flex justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">{rate.insurer}</span>
                    <span className="font-bold text-slate-900">{rate.rate}%</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
            <h2 className="text-sm font-bold text-slate-900">Data & sync</h2>
            <div className="space-y-1 text-xs text-slate-500">
              <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
              {lastSyncAt && (
                <p>
                  Last sync: {format(new Date(lastSyncAt), 'd MMM yyyy, HH:mm')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className="w-full rounded-xl border border-primary-200 py-2.5 text-sm font-bold text-primary-800 transition hover:bg-primary-50 disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync now'}
            </button>
          </section>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card lg:hidden">
        <h2 className="px-4 pb-2 pt-4 text-sm font-bold text-slate-900">
          Quick links
        </h2>
        {QUICK_LINKS.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="block border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50"
          >
            {link.label}
          </Link>
        ))}
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full rounded-xl border border-danger-200 bg-white py-3 text-sm font-bold text-danger-700 transition hover:bg-danger-50 sm:max-w-xs"
      >
        Sign out
      </button>
    </PageShell>
  )
}
