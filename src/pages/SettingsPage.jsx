import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { signOut, updateAgentProfile } from '../lib/supabase'
import { format } from 'date-fns'

const INPUT =
  'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

const QUICK_LINKS = [
  { to: '/calculator', label: 'Premium calculator' },
  { to: '/prospects', label: 'Prospects pipeline' },
  { to: '/commissions', label: 'Commission dashboard' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { agent, session, isOnline, isSyncing, lastSyncAt, setAgent, triggerSync } = useAppStore()

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
    } catch (err) {
      setError(err.message)
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
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const rates = Array.isArray(agent?.commission_rates) ? agent.commission_rates : []

  return (
    <div className="p-4 space-y-5 pb-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Your agent profile and app preferences.</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-3 py-2">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Agent profile</h2>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Full name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Phone</label>
            <input
              required
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Email</label>
            <input
              readOnly
              value={session?.user?.email ?? agent?.email ?? ''}
              className={`${INPUT} bg-gray-50 text-gray-500`}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !agent}
            className="w-full bg-primary-800 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Commission rates</h2>
        {rates.length === 0 ? (
          <p className="text-sm text-gray-400">No commission rates configured yet.</p>
        ) : (
          <div className="space-y-2">
            {rates.map((rate, i) => (
              <div
                key={i}
                className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="text-gray-700">{rate.insurer}</span>
                <span className="font-semibold text-gray-900">{rate.rate}%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Data & sync</h2>
        <div className="text-xs text-gray-500 space-y-1">
          <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
          {lastSyncAt && (
            <p>Last sync: {format(new Date(lastSyncAt), 'd MMM yyyy, HH:mm')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
          className="w-full border border-primary-200 text-primary-800 rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50"
        >
          {isSyncing ? 'Syncing...' : 'Sync now'}
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-800 px-4 pt-4 pb-2">Quick links</h2>
        {QUICK_LINKS.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="block px-4 py-3 text-sm text-gray-700 border-t border-gray-100 active:bg-gray-50"
          >
            {link.label}
          </Link>
        ))}
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full bg-white border border-danger-200 text-danger-700 rounded-xl py-3 font-semibold text-sm"
      >
        Sign out
      </button>
    </div>
  )
}
