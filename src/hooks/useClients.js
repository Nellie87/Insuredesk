import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localGetAll, localPut, addToSyncQueue } from '../lib/db'
import { useAppStore } from '../store/appStore'

export function useClients() {
  const { session, isOnline } = useAppStore()
  const agentId = session?.user?.id

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchClients = useCallback(async () => {
    if (!agentId) {
      setClients([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      if (isOnline) {
        // Fetch from Supabase and cache locally
        const { data, error: err } = await supabase
          .from('clients')
          .select(`
            *,
            vehicles (
              *,
              payment_schedules (*)
            )
          `)
          .eq('agent_id', agentId)
          .order('name')

        if (err) throw err

        setClients(data ?? [])
        // Cache each client locally
        for (const client of data ?? []) {
          await localPut('clients', client)
        }
      } else {
        // Offline: read from IndexedDB
        const local = await localGetAll('clients', 'agent_id', agentId)
        setClients(local)
      }
    } catch (err) {
      setError(err.message)
      // Try offline fallback even if online fetch failed
      const local = await localGetAll('clients', 'agent_id', agentId)
      setClients(local)
    } finally {
      setLoading(false)
    }
  }, [agentId, isOnline])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const persistRecord = useCallback(async (table, record) => {
    if (isOnline) {
      const { error: err } = await supabase.from(table).insert(record)
      if (err) await addToSyncQueue({ table, operation: 'insert', payload: record })
    } else {
      await addToSyncQueue({ table, operation: 'insert', payload: record })
    }
  }, [isOnline])

  // ─── Add client ─────────────────────────────────────────────────────────────
  const addClient = useCallback(async (clientData) => {
    const newClient = {
      ...clientData,
      id: crypto.randomUUID(),
      agent_id: agentId,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await localPut('clients', newClient)
    setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)))
    await persistRecord('clients', newClient)

    return newClient
  }, [agentId, persistRecord])

  // ─── Add client with first vehicle ───────────────────────────────────────────
  const addClientWithVehicle = useCallback(async ({ client, vehicle }) => {
    const clientId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newClient = {
      id: clientId,
      agent_id: agentId,
      name: client.name.trim(),
      phone: client.phone.trim(),
      id_number: client.id_number?.trim() || null,
      email: client.email?.trim() || null,
      address: client.address?.trim() || null,
      status: 'active',
      created_at: now,
      updated_at: now,
    }

    const newVehicle = {
      id: crypto.randomUUID(),
      client_id: clientId,
      agent_id: agentId,
      registration: vehicle.registration.trim().toUpperCase(),
      make: vehicle.make.trim(),
      model: vehicle.model.trim(),
      year: vehicle.year ? Number(vehicle.year) : null,
      engine_capacity: vehicle.engine_capacity?.trim() || null,
      vehicle_value: Number(vehicle.vehicle_value || 0),
      use_type: vehicle.use_type || 'private',
      insurer: vehicle.insurer.trim(),
      policy_number: vehicle.policy_number?.trim() || null,
      policy_type: vehicle.policy_type,
      start_date: vehicle.start_date,
      expiry_date: vehicle.expiry_date,
      sum_insured: Number(vehicle.sum_insured || 0),
      premium: Number(vehicle.premium),
      created_at: now,
    }

    const clientWithVehicle = { ...newClient, vehicles: [newVehicle] }

    await localPut('clients', newClient)
    await localPut('vehicles', newVehicle)
    setClients(prev =>
      [...prev, clientWithVehicle].sort((a, b) => a.name.localeCompare(b.name))
    )

    await persistRecord('clients', newClient)
    await persistRecord('vehicles', newVehicle)

    return clientWithVehicle
  }, [agentId, persistRecord])

  // ─── Update client ──────────────────────────────────────────────────────────
  const updateClient = useCallback(async (id, updates) => {
    const updated = { id, ...updates, updated_at: new Date().toISOString() }

    await localPut('clients', updated)
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))

    if (isOnline) {
      const { error: err } = await supabase.from('clients').update(updates).eq('id', id)
      if (err) await addToSyncQueue({ table: 'clients', operation: 'update', payload: updated })
    } else {
      await addToSyncQueue({ table: 'clients', operation: 'update', payload: updated })
    }
  }, [isOnline])

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
    addClient,
    addClientWithVehicle,
    updateClient,
  }
}
