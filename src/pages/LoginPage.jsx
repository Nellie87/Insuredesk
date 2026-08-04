import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { INPUT, LABEL, BTN_PRIMARY } from '../constants/formStyles'

export default function LoginPage() {
  const { session, authLoading } = useAppStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  if (!authLoading && session) return <Navigate to="/dashboard" replace />

  const switchMode = next => {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  const handleSignIn = async e => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async e => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required.')
      setLoading(false)
      return
    }

    try {
      const data = await signUp({
        email,
        password,
        name,
        phone,
      })

      if (data.session) {
        navigate('/dashboard', { replace: true })
      } else {
        setInfo('Account created. Check your email to confirm, then sign in.')
        switchMode('signin')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isSignUp = mode === 'signup'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas bg-login-atmosphere px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-primary-300/30 blur-3xl" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/95 shadow-panel backdrop-blur-sm">
        <div className="border-b border-slate-100 px-6 pb-5 pt-7 sm:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-step-active text-sm font-extrabold text-white shadow-soft">
              IA
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-900">
                InsureAgent
              </div>
              <div className="text-xs font-medium text-slate-400">
                Agent workspace
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                !isSignUp
                  ? 'bg-step-active text-white shadow-soft'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                isSignUp
                  ? 'bg-step-active text-white shadow-soft'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Create account
            </button>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-600">
            {isSignUp ? 'Step 1' : 'Welcome back'}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            {isSignUp ? 'Your profile' : 'Sign in'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {isSignUp
              ? 'Enter the login information for your account. You can manage clients and policies right away.'
              : 'Sign in to manage clients, policies, payments, and renewals.'}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {info && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
              {info}
            </div>
          )}

          <form
            onSubmit={isSignUp ? handleSignUp : handleSignIn}
            className="mt-5 space-y-4"
          >
            {isSignUp && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>
                    Full name <span className="text-primary-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={`mt-1.5 ${INPUT}`}
                    placeholder="Jane Agent"
                  />
                </div>
                <div>
                  <label className={LABEL}>
                    Phone <span className="text-primary-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className={`mt-1.5 ${INPUT}`}
                    placeholder="0700000000"
                  />
                </div>
              </div>
            )}

            <div>
              <label className={LABEL}>
                Email <span className="text-primary-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`mt-1.5 ${INPUT}`}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className={LABEL}>
                Password <span className="text-primary-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`mt-1.5 ${INPUT}`}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`mt-2 w-full ${BTN_PRIMARY}`}
            >
              {loading
                ? isSignUp
                  ? 'Creating account...'
                  : 'Signing in...'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
