import { localDelete, localGet, localGetAll, localPut } from './db'

export const CLIENT_SESSION_STEPS = [
  'Insured',
  'Vehicle',
  'Cover',
  'Dates',
  'Payment',
  'Review',
]

export function clientSessionLabel(session) {
  const name = session?.form?.name?.trim()
  if (name) return name
  const registration = session?.form?.registration?.trim()
  if (registration) return registration.toUpperCase()
  const chassis = session?.form?.chassis?.trim()
  if (chassis) return chassis
  return 'Untitled client'
}

export function clientSessionStepLabel(session) {
  const step = Number(session?.step) || 0
  return CLIENT_SESSION_STEPS[step] ?? CLIENT_SESSION_STEPS[0]
}

export function isClientFormStarted(form) {
  if (!form) return false

  const keys = [
    'name',
    'phone',
    'id_number',
    'email',
    'address',
    'notes',
    'registration',
    'chassis',
    'make',
    'make_other',
    'model',
    'model_other',
    'year',
    'engine_capacity',
    'vehicle_value',
    'vehicle_notes',
    'insurer',
    'insurer_other',
    'policy_number',
    'premium_rate',
    'premium',
    'cover_notes',
    'payment_notes',
  ]

  return keys.some(key => String(form[key] ?? '').trim() !== '')
}

export async function getClientSession(id) {
  if (!id) return null
  return localGet('client_sessions', id)
}

export async function listClientSessions(agentId) {
  if (!agentId) return []
  const rows = await localGetAll('client_sessions', 'agent_id', agentId)
  return rows.sort((a, b) =>
    String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')),
  )
}

export async function saveClientSession({ id, agent_id, step, form }) {
  const now = new Date().toISOString()
  const existing = id ? await getClientSession(id) : null
  const record = {
    id: id || crypto.randomUUID(),
    agent_id,
    step: step ?? 0,
    form: form ?? {},
    created_at: existing?.created_at || now,
    updated_at: now,
  }
  await localPut('client_sessions', record)
  return record
}

export async function deleteClientSession(id) {
  if (!id) return
  return localDelete('client_sessions', id)
}
