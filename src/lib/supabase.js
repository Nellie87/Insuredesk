import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  // Automatically falls back gracefully when offline
  global: {
    headers: {
      'x-app-version': '1.0.0',
    },
  },
})

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data.user) await fetchOrCreateAgent(data.user)
  return data
}

export async function signUp({ email, password, name, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name.trim(),
        phone: phone.trim(),
      },
    },
  })
  if (error) throw error

  if (data.session && data.user) {
    await fetchOrCreateAgent(data.user)
  }

  return data
}

export async function fetchOrCreateAgent(user) {
  const { data: existing, error: fetchError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (existing) return existing

  const name =
    user.user_metadata?.name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Agent'

  const phone = user.user_metadata?.phone?.trim() || '0700000000'

  const { data, error } = await supabase
    .from('agents')
    .insert({
      id: user.id,
      name,
      phone,
      email: user.email,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAgentProfile(id, { name, phone }) {
  const { data, error } = await supabase
    .from('agents')
    .update({ name: name.trim(), phone: phone.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
