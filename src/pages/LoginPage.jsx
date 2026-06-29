import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../lib/supabase'
import { useAppStore } from '../store/appStore'

const INPUT =
  'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

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
    <div className="min-h-screen bg-primary-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-white">InsureAgent</div>
          <div className="text-primary-200 text-sm mt-1">Your insurance management system</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isSignUp ? 'Create account' : 'Sign in'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {info && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-3 py-2">
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
                  <label className="text-xs font-medium text-gray-500">Full name</label>
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
                  <label className="text-xs font-medium text-gray-500">Phone</label>
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
              <label className="text-xs font-medium text-gray-500">Email</label>
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
              <label className="text-xs font-medium text-gray-500">Password</label>
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
              className="w-full bg-primary-800 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
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

          <p className="text-center text-sm text-gray-500">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-primary-700 font-medium"
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
                  className="text-primary-700 font-medium"
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
