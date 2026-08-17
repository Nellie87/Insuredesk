import { supabase } from './supabase'
import {
  getPendingSyncItems,
  removeSyncItem,
  localPutMany,
  localPut,
} from './db'

let isSyncing = false

// ─── Main sync function ───────────────────────────────────────────────────────

export async function syncToCloud() {
  if (isSyncing || !navigator.onLine) return
  isSyncing = true

  try {
    const queue = await getPendingSyncItems()
    if (queue.length === 0) {
      isSyncing = false
      return
    }

    console.log(`[Sync] Pushing ${queue.length} pending item(s) to cloud...`)

    for (const item of queue) {
      try {
        await pushItem(item)
        await removeSyncItem(item.id)
      } catch (err) {
        console.warn(`[Sync] Failed to push item ${item.id}:`, err.message)
        // Leave it in the queue to retry next time
      }
    }

    console.log('[Sync] Sync complete.')
  } finally {
    isSyncing = false
  }
}

async function pushItem(item) {
  const { table, operation, payload } = item

  if (operation === 'insert') {
    const { error } = await supabase.from(table).insert(payload)
    if (error) throw error
  } else if (operation === 'update') {
    const { id, ...rest } = payload
    const { error } = await supabase.from(table).update(rest).eq('id', id)
    if (error) throw error
  } else if (operation === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', payload.id)
    if (error) throw error
  }
}

// ─── Pull latest data from cloud into local DB ────────────────────────────────

export async function syncFromCloud(agentId) {
  if (!navigator.onLine) return

  try {
    // Fetch all data for this agent in parallel
    const [clientsRes, vehiclesRes, schedulesRes, paymentsRes, commissionsRes, prospectsRes, remindersRes] =
      await Promise.all([
        supabase.from('clients').select('*, vehicles(*, payment_schedules(*))').eq('agent_id', agentId),
        supabase.from('vehicles').select('*').eq('agent_id', agentId),
        supabase.from('payment_schedules').select('*').eq('agent_id', agentId),
        supabase.from('payments').select('*').eq('agent_id', agentId),
        supabase.from('commissions').select('*').eq('agent_id', agentId),
        supabase.from('prospects').select('*').eq('agent_id', agentId),
        supabase.from('reminders').select('*').eq('agent_id', agentId),
      ])

    if (clientsRes.data)     await localPutMany('clients', clientsRes.data)
    if (vehiclesRes.data)    await localPutMany('vehicles', vehiclesRes.data)
    if (schedulesRes.data)   await localPutMany('payment_schedules', schedulesRes.data)
    if (paymentsRes.data)    await localPutMany('payments', paymentsRes.data)
    if (commissionsRes.data) await localPutMany('commissions', commissionsRes.data)
    if (prospectsRes.data)   await localPutMany('prospects', prospectsRes.data)
    if (remindersRes.data)   await localPutMany('reminders', remindersRes.data)

    console.log('[Sync] Local database updated from cloud.')
  } catch (err) {
    console.warn('[Sync] Could not sync from cloud:', err.message)
  }
}

// ─── Listen for connectivity changes ─────────────────────────────────────────

export function startSyncListener() {
  window.addEventListener('online', () => {
    console.log('[Sync] Back online - starting sync...')
    syncToCloud()
  })
}
