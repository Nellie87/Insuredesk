const DEV_AGENT_ID = import.meta.env.VITE_DEV_AGENT_ID || '00000000-0000-4000-8000-000000000001'
const DEV_AGENT_NAME = import.meta.env.VITE_DEV_AGENT_NAME || 'Dev Agent'

export function isDevAuthBypass() {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'
}

export function getDevSession() {
  return {
    access_token: 'dev-bypass',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'dev-bypass',
    user: {
      id: DEV_AGENT_ID,
      email: 'dev@localhost',
      aud: 'authenticated',
      role: 'authenticated',
    },
  }
}

export function getDevAgent() {
  return {
    id: DEV_AGENT_ID,
    name: DEV_AGENT_NAME,
    phone: '0700000000',
    email: 'dev@localhost',
  }
}
