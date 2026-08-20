import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localGet, localGetAll, localPut, addToSyncQueue } from '../lib/db'
import { useAppStore } from '../store/appStore'
import {
  getOutstandingBalance,
  getVehicleSchedules,
  reconcileScheduleWithPayments,
} from '../utils/calculator'
import { isCoverExpired, todayIso } from '../utils/policyDates'

function asCoverHistory(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function vehicleCloudPayload(updates) {
  const {
    payment_schedules: _schedules,
    payment_schedule: _schedule,
    ...payload
  } = updates
  return payload
}

function schedulesEqual(a, b) {
  return (
    a?.down_payment_paid === b?.down_payment_paid &&
    a?.down_payment_paid_at === b?.down_payment_paid_at &&
    JSON.stringify(a?.installments ?? []) === JSON.stringify(b?.installments ?? [])
  )
}

export function useClients() {
  const { session, isOnline } = useAppStore()
  const agentId = session?.user?.id

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const persistScheduleUpdate = useCallback(async schedule => {
    await localPut('payment_schedules', schedule)
    const cloudPayload = {
      installments: schedule.installments,
      installment_count: schedule.installment_count,
      total_premium: schedule.total_premium,
      down_payment: schedule.down_payment,
      down_payment_paid: schedule.down_payment_paid,
      down_payment_paid_at: schedule.down_payment_paid_at,
    }
    if (isOnline) {
      const { error: err } = await supabase
        .from('payment_schedules')
        .update(cloudPayload)
        .eq('id', schedule.id)
      if (err) {
        await addToSyncQueue({
          table: 'payment_schedules',
          operation: 'update',
          payload: schedule,
        })
      }
    } else {
      await addToSyncQueue({
        table: 'payment_schedules',
        operation: 'update',
        payload: schedule,
      })
    }
  }, [isOnline])

  const applyPaymentsToClients = useCallback(async (clientList, payments) => {
    const nextClients = []
    const statusUpdates = []

    for (const client of clientList) {
      let clientChanged = false
      const vehicles = []

      for (const vehicle of client.vehicles ?? []) {
        const existingSchedules = getVehicleSchedules(vehicle)
        const schedules = existingSchedules.map(schedule => {
          const reconciled = reconcileScheduleWithPayments(
            schedule,
            payments,
            existingSchedules,
            vehicle.start_date,
          )
          if (!schedulesEqual(schedule, reconciled)) {
            clientChanged = true
            void persistScheduleUpdate(reconciled)
            return reconciled
          }
          return schedule
        })

        vehicles.push(
          schedules.length || vehicle.payment_schedules
            ? { ...vehicle, payment_schedules: schedules }
            : vehicle
        )
      }

      let status = client.status
      const today = todayIso()
      const allExpired =
        vehicles.length > 0 &&
        vehicles.every(vehicle => isCoverExpired(vehicle.expiry_date, today))
      const currentSchedules = vehicles
        .map(vehicle => getVehicleSchedules(vehicle)[0])
        .filter(Boolean)

      if (allExpired && status !== 'lapsed') {
        status = 'lapsed'
        clientChanged = true
        statusUpdates.push({ id: client.id, status })
      } else if (!allExpired && currentSchedules.length > 0) {
        const fullyPaid = currentSchedules.every(
          schedule => getOutstandingBalance(schedule) <= 0.01,
        )
        if (fullyPaid && status !== 'fully_paid') {
          status = 'fully_paid'
          clientChanged = true
          statusUpdates.push({ id: client.id, status })
        } else if (!fullyPaid && (status === 'fully_paid' || status === 'lapsed')) {
          status = 'active'
          clientChanged = true
          statusUpdates.push({ id: client.id, status })
        }
      }

      const nextClient = clientChanged ? { ...client, status, vehicles } : client
      if (clientChanged) await localPut('clients', nextClient)
      nextClients.push(nextClient)
    }

    for (const update of statusUpdates) {
      const updatedAt = new Date().toISOString()
      if (isOnline) {
        const { error: err } = await supabase
          .from('clients')
          .update({ status: update.status, updated_at: updatedAt })
          .eq('id', update.id)
        if (err) {
          await addToSyncQueue({
            table: 'clients',
            operation: 'update',
            payload: { id: update.id, status: update.status, updated_at: updatedAt },
          })
        }
      } else {
        await addToSyncQueue({
          table: 'clients',
          operation: 'update',
          payload: { id: update.id, status: update.status, updated_at: updatedAt },
        })
      }
    }

    return nextClients
  }, [isOnline, persistScheduleUpdate])

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
        const [clientsRes, paymentsRes] = await Promise.all([
          supabase
            .from('clients')
            .select(`
              *,
              vehicles (
                *,
                payment_schedules (*)
              )
            `)
            .eq('agent_id', agentId)
            .order('name'),
          supabase.from('payments').select('*').eq('agent_id', agentId),
        ])

        if (clientsRes.error) throw clientsRes.error

        const reconciled = await applyPaymentsToClients(
          clientsRes.data ?? [],
          paymentsRes.data ?? []
        )
        setClients(reconciled)
        for (const client of reconciled) {
          await localPut('clients', client)
          for (const vehicle of client.vehicles ?? []) {
            for (const schedule of getVehicleSchedules(vehicle)) {
              await localPut('payment_schedules', schedule)
            }
          }
        }
      } else {
        const local = await localGetAll('clients', 'agent_id', agentId)
        const payments = (await localGetAll('payments')).filter(p => p.agent_id === agentId)
        const reconciled = await applyPaymentsToClients(local, payments)
        setClients(reconciled)
        for (const client of reconciled) {
          await localPut('clients', client)
          for (const vehicle of client.vehicles ?? []) {
            for (const schedule of getVehicleSchedules(vehicle)) {
              await localPut('payment_schedules', schedule)
            }
          }
        }
      }
    } catch (err) {
      setError(err.message)
      const local = await localGetAll('clients', 'agent_id', agentId)
      setClients(local)
    } finally {
      setLoading(false)
    }
  }, [agentId, isOnline, applyPaymentsToClients])

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
  const addClientWithVehicle = useCallback(async ({ client, vehicle, schedule }) => {
    const clientId = crypto.randomUUID()
    const vehicleId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newClient = {
      id: clientId,
      agent_id: agentId,
      name: client.name.trim(),
      phone: client.phone.trim(),
      id_number: client.id_number?.trim() || null,
      email: client.email?.trim() || null,
      address: client.address?.trim() || null,
      notes: client.notes?.trim() || null,
      status: 'active',
      created_at: now,
      updated_at: now,
    }

    const newVehicle = {
      id: vehicleId,
      client_id: clientId,
      agent_id: agentId,
      registration: vehicle.registration.trim().toUpperCase(),
      chassis: vehicle.chassis?.trim().toUpperCase() || null,
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
      cover_months: Number(vehicle.cover_months) || 12,
      cover_history: asCoverHistory(vehicle.cover_history),
      sum_insured: Number(vehicle.sum_insured || 0),
      premium: Number(vehicle.premium),
      vehicle_notes: vehicle.vehicle_notes?.trim() || null,
      cover_notes: vehicle.cover_notes?.trim() || null,
      payment_notes: vehicle.payment_notes?.trim() || null,
      created_at: now,
    }

    let newSchedule = null
    if (schedule?.installments?.length) {
      newSchedule = {
        id: crypto.randomUUID(),
        vehicle_id: vehicleId,
        agent_id: agentId,
        total_premium: Number(schedule.total_premium ?? vehicle.premium),
        down_payment: Number(schedule.down_payment || 0),
        down_payment_paid: Boolean(schedule.down_payment_paid),
        down_payment_paid_at: schedule.down_payment_paid_at || null,
        installment_count: schedule.installments.length,
        installments: schedule.installments,
        created_at: now,
      }
    }

    const clientWithVehicle = {
      ...newClient,
      vehicles: [
        {
          ...newVehicle,
          payment_schedules: newSchedule ? [newSchedule] : [],
        },
      ],
    }

    await localPut('clients', newClient)
    await localPut('vehicles', newVehicle)
    if (newSchedule) await localPut('payment_schedules', newSchedule)

    setClients(prev =>
      [...prev, clientWithVehicle].sort((a, b) => a.name.localeCompare(b.name))
    )

    await persistRecord('clients', newClient)
    await persistRecord('vehicles', newVehicle)
    if (newSchedule) await persistRecord('payment_schedules', newSchedule)

    return clientWithVehicle
  }, [agentId, persistRecord])

  // ─── Update client ──────────────────────────────────────────────────────────
  const updateClient = useCallback(async (id, updates) => {
    const updatedAt = new Date().toISOString()
    let merged = null

    setClients(prev => {
      const existing = prev.find(c => c.id === id)
      if (!existing) return prev
      merged = { ...existing, ...updates, updated_at: updatedAt }
      return prev.map(c => (c.id === id ? merged : c))
    })

    if (!merged) {
      const existing = await localGet('clients', id)
      if (!existing) throw new Error('Client not found')
      merged = { ...existing, ...updates, updated_at: updatedAt }
      setClients(prev => prev.map(c => (c.id === id ? { ...c, ...merged } : c)))
    }

    await localPut('clients', merged)

    const payload = { id, ...updates, updated_at: updatedAt }
    if (isOnline) {
      const { error: err } = await supabase
        .from('clients')
        .update({ ...updates, updated_at: updatedAt })
        .eq('id', id)
      if (err) await addToSyncQueue({ table: 'clients', operation: 'update', payload })
    } else {
      await addToSyncQueue({ table: 'clients', operation: 'update', payload })
    }

    return merged
  }, [isOnline])

  // ─── Update vehicle (fill in placeholders after import / quick add) ──────────
  const updateVehicle = useCallback(async (vehicleId, updates) => {
    let nextVehicle = null
    let parentClient = null

    setClients(prev =>
      prev.map(client => {
        const vehicles = client.vehicles ?? []
        const index = vehicles.findIndex(v => v.id === vehicleId)
        if (index < 0) return client

        nextVehicle = { ...vehicles[index], ...updates }
        const nextVehicles = vehicles.slice()
        nextVehicles[index] = nextVehicle
        parentClient = { ...client, vehicles: nextVehicles }
        return parentClient
      })
    )

    if (!nextVehicle) {
      const existing = await localGet('vehicles', vehicleId)
      if (!existing) throw new Error('Vehicle not found')
      nextVehicle = { ...existing, ...updates }
    }

    const { payment_schedules: _schedules, ...vehicleRecord } = nextVehicle
    await localPut('vehicles', vehicleRecord)
    if (parentClient) await localPut('clients', parentClient)

    const payload = { id: vehicleId, ...vehicleCloudPayload(updates) }
    if (isOnline) {
      const cloudPayload = vehicleCloudPayload(updates)
      const { error: err } = await supabase
        .from('vehicles')
        .update(cloudPayload)
        .eq('id', vehicleId)
      if (err) {
        const fallback = { ...cloudPayload }
        delete fallback.cover_history
        delete fallback.cover_months
        const { error: retryErr } = await supabase
          .from('vehicles')
          .update(fallback)
          .eq('id', vehicleId)
        if (retryErr) {
          await addToSyncQueue({ table: 'vehicles', operation: 'update', payload })
        }
      }
    } else {
      await addToSyncQueue({ table: 'vehicles', operation: 'update', payload })
    }

    return nextVehicle
  }, [isOnline])

  // ─── Update / replace a payment schedule ────────────────────────────────────
  const updatePaymentSchedule = useCallback(async (scheduleId, updates) => {
    let nextSchedule = null
    let parentClient = null

    setClients(prev =>
      prev.map(client => {
        let changed = false
        const vehicles = (client.vehicles ?? []).map(vehicle => {
          const schedules = getVehicleSchedules(vehicle)
          const index = schedules.findIndex(s => s.id === scheduleId)
          if (index < 0) return vehicle

          nextSchedule = { ...schedules[index], ...updates }
          const nextSchedules = schedules.slice()
          nextSchedules[index] = nextSchedule
          changed = true
          return { ...vehicle, payment_schedules: nextSchedules }
        })

        if (!changed) return client
        parentClient = { ...client, vehicles }
        return parentClient
      })
    )

    if (!nextSchedule) {
      const existing = await localGet('payment_schedules', scheduleId)
      if (!existing) throw new Error('Payment schedule not found')
      nextSchedule = { ...existing, ...updates }
    }

    await persistScheduleUpdate(nextSchedule)
    if (parentClient) await localPut('clients', parentClient)

    return nextSchedule
  }, [persistScheduleUpdate])

  // ─── Create a payment schedule for a vehicle that has none ──────────────────
  const createPaymentSchedule = useCallback(async (vehicleId, scheduleData) => {
    const now = new Date().toISOString()
    const newSchedule = {
      id: crypto.randomUUID(),
      vehicle_id: vehicleId,
      agent_id: agentId,
      total_premium: Number(scheduleData.total_premium || 0),
      down_payment: Number(scheduleData.down_payment || 0),
      down_payment_paid: Boolean(scheduleData.down_payment_paid),
      down_payment_paid_at: scheduleData.down_payment_paid_at || null,
      installment_count: scheduleData.installments?.length || 0,
      installments: scheduleData.installments || [],
      created_at: now,
    }

    let parentClient = null
    setClients(prev =>
      prev.map(client => {
        const vehicles = client.vehicles ?? []
        const index = vehicles.findIndex(v => v.id === vehicleId)
        if (index < 0) return client

        const nextVehicles = vehicles.slice()
        const existing = getVehicleSchedules(vehicles[index])
        nextVehicles[index] = {
          ...vehicles[index],
          payment_schedules: [
            newSchedule,
            ...existing.filter(schedule => schedule.id !== newSchedule.id),
          ],
        }
        parentClient = { ...client, vehicles: nextVehicles }
        return parentClient
      })
    )

    await localPut('payment_schedules', newSchedule)
    if (parentClient) await localPut('clients', parentClient)
    await persistRecord('payment_schedules', newSchedule)

    return newSchedule
  }, [agentId, persistRecord])

  const renewVehicle = useCallback(async (vehicleId, renewal) => {
    const now = new Date().toISOString()
    const coverMonths = Number(renewal.cover_months) || 12
    const premium = Number(renewal.premium)
    if (!renewal.start_date || !renewal.expiry_date || !premium) {
      throw new Error('Start date, expiry date, and premium are required.')
    }

    const newSchedule = renewal.schedule?.installments?.length
      ? {
          id: crypto.randomUUID(),
          vehicle_id: vehicleId,
          agent_id: agentId,
          total_premium: Number(renewal.schedule.total_premium ?? premium),
          down_payment: Number(renewal.schedule.down_payment || 0),
          down_payment_paid: Boolean(renewal.schedule.down_payment_paid),
          down_payment_paid_at: renewal.schedule.down_payment_paid_at || null,
          installment_count: renewal.schedule.installments.length,
          installments: renewal.schedule.installments,
          created_at: now,
        }
      : null

    let nextVehicle = null
    let parentClient = null

    setClients(prev =>
      prev.map(client => {
        const vehicles = client.vehicles ?? []
        const index = vehicles.findIndex(item => item.id === vehicleId)
        if (index < 0) return client

        const current = vehicles[index]
        const archived = {
          start_date: current.start_date,
          expiry_date: current.expiry_date,
          cover_months: Number(current.cover_months) || 12,
          premium: Number(current.premium) || 0,
          insurer: current.insurer || null,
          policy_number: current.policy_number || null,
          policy_type: current.policy_type,
          schedule_id: getVehicleSchedules(current)[0]?.id ?? null,
          archived_at: now,
        }

        nextVehicle = {
          ...current,
          start_date: renewal.start_date,
          expiry_date: renewal.expiry_date,
          cover_months: coverMonths,
          premium,
          insurer: renewal.insurer?.trim() || current.insurer,
          policy_number: renewal.policy_number?.trim() || null,
          policy_type: renewal.policy_type || current.policy_type,
          cover_history: [archived, ...asCoverHistory(current.cover_history)],
          payment_schedules: newSchedule
            ? [newSchedule, ...getVehicleSchedules(current)]
            : getVehicleSchedules(current),
        }

        const nextVehicles = vehicles.slice()
        nextVehicles[index] = nextVehicle
        parentClient = {
          ...client,
          status: 'active',
          updated_at: now,
          vehicles: nextVehicles,
        }
        return parentClient
      })
    )

    if (!nextVehicle || !parentClient) {
      throw new Error('Vehicle not found')
    }

    const { payment_schedules: _schedules, ...vehicleRecord } = nextVehicle
    await localPut('vehicles', vehicleRecord)
    if (newSchedule) await localPut('payment_schedules', newSchedule)
    await localPut('clients', parentClient)

    const vehicleUpdates = {
      start_date: nextVehicle.start_date,
      expiry_date: nextVehicle.expiry_date,
      cover_months: nextVehicle.cover_months,
      premium: nextVehicle.premium,
      insurer: nextVehicle.insurer,
      policy_number: nextVehicle.policy_number,
      policy_type: nextVehicle.policy_type,
      cover_history: nextVehicle.cover_history,
    }

    if (isOnline) {
      const { error: err } = await supabase
        .from('vehicles')
        .update(vehicleUpdates)
        .eq('id', vehicleId)
      if (err) {
        const fallback = { ...vehicleUpdates }
        delete fallback.cover_history
        delete fallback.cover_months
        const { error: retryErr } = await supabase
          .from('vehicles')
          .update(fallback)
          .eq('id', vehicleId)
        if (retryErr) {
          await addToSyncQueue({
            table: 'vehicles',
            operation: 'update',
            payload: { id: vehicleId, ...vehicleUpdates },
          })
        }
      }

      const { error: clientErr } = await supabase
        .from('clients')
        .update({ status: 'active', updated_at: now })
        .eq('id', parentClient.id)
      if (clientErr) {
        await addToSyncQueue({
          table: 'clients',
          operation: 'update',
          payload: { id: parentClient.id, status: 'active', updated_at: now },
        })
      }
    } else {
      await addToSyncQueue({
        table: 'vehicles',
        operation: 'update',
        payload: { id: vehicleId, ...vehicleUpdates },
      })
      await addToSyncQueue({
        table: 'clients',
        operation: 'update',
        payload: { id: parentClient.id, status: 'active', updated_at: now },
      })
    }

    if (newSchedule) await persistRecord('payment_schedules', newSchedule)

    return nextVehicle
  }, [agentId, isOnline, persistRecord])

  const importClientsBatch = useCallback(async rows => {
    const imported = []
    const failures = []

    for (const row of rows) {
      try {
        const saved = await addClientWithVehicle(row)
        imported.push(saved)
      } catch (err) {
        failures.push({
          name: row.client?.name || 'Unknown',
          message: err.message || 'Import failed',
        })
      }
    }

    return { imported, failures }
  }, [addClientWithVehicle])

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
    addClient,
    addClientWithVehicle,
    importClientsBatch,
    updateClient,
    updateVehicle,
    updatePaymentSchedule,
    createPaymentSchedule,
    renewVehicle,
  }
}
