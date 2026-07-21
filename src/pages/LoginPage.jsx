import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../lib/supabase'
import { useAppStore } from '../store/appStore'

const INPUT =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500'

const LABEL =
  'text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400'

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl font-black tracking-tight text-white">
            InsureAgent
          </div>
          <div className="mt-1 text-sm text-primary-200">
            Your insurance management system
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white p-6 shadow-xl">
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            {isSignUp ? 'Create account' : 'Sign in'}
          </h2>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {info && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {info}
            </div>
          )}

          <form
            onSubmit={isSignUp ? handleSignUp : handleSignIn}
            className="space-y-3"
          >
            {isSignUp && (
              <>
                <div>
                  <label className={LABEL}>Full name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={INPUT}
                    placeholder="Jane Agent"
                  />
                </div>
                <div>
                  <label className={LABEL}>Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className={INPUT}
                    placeholder="0700000000"
                  />
                </div>
              </>
            )}

            <div>
              <label className={LABEL}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={INPUT}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className={LABEL}>Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={INPUT}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary-800 py-3 text-sm font-bold text-white disabled:opacity-50"
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

          <p className="text-center text-sm text-slate-500">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="font-bold text-primary-700"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-bold text-primary-700"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
