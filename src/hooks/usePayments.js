import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localPut, localGet, localGetAll, addToSyncQueue } from '../lib/db'
import { useAppStore } from '../store/appStore'
import {
  applyPaymentToSchedule,
  getAmountPaid,
  getOutstandingBalance,
  getVehicleSchedules,
} from '../utils/calculator'

async function findSchedule({ scheduleId, vehicleId, clientId }) {
  let fromClient = null
  if (clientId) {
    const client = await localGet('clients', clientId)
    const vehicle = (client?.vehicles ?? []).find(item => item.id === vehicleId)
    const nested = vehicle ? getVehicleSchedules(vehicle) : []
    if (scheduleId) {
      fromClient = nested.find(schedule => schedule.id === scheduleId) ?? null
    }
    if (!fromClient) fromClient = nested[0] ?? null
  }

  let fromStore = null
  if (scheduleId) {
    fromStore = (await localGet('payment_schedules', scheduleId)) ?? null
  }
  if (!fromStore && vehicleId) {
    const all = await localGetAll('payment_schedules')
    fromStore = all.find(schedule => schedule.vehicle_id === vehicleId) ?? null
  }

  if (fromClient && fromStore) {
    // Prefer whichever already reflects more paid credit (avoids stale store overwrite)
    return getAmountPaid(fromClient) >= getAmountPaid(fromStore) ? fromClient : fromStore
  }

  return fromClient || fromStore
}

async function patchClientNestedSchedule(clientId, vehicleId, updatedSchedule) {
  const client = await localGet('clients', clientId)
  if (!client) return null

  const vehicles = (client.vehicles ?? []).map(vehicle => {
    if (vehicle.id !== vehicleId) return vehicle
    const schedules = getVehicleSchedules(vehicle)
    const nextSchedules = schedules.length
      ? schedules.map(schedule =>
          schedule.id === updatedSchedule.id ? updatedSchedule : schedule
        )
      : [updatedSchedule]
    return { ...vehicle, payment_schedules: nextSchedules }
  })

  const patched = { ...client, vehicles }
  await localPut('clients', patched)
  return patched
}

export function usePayments() {
  const { session, isOnline } = useAppStore()
  const agentId = session?.user?.id

  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchPayments = useCallback(async () => {
    if (!agentId) {
      setPayments([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isOnline) {
        const { data, error: err } = await supabase
          .from('payments')
          .select(`
            *,
            clients ( name, phone ),
            vehicles ( registration, make, model )
          `)
          .eq('agent_id', agentId)
          .order('date', { ascending: false })

        if (err) throw err

        setPayments(data ?? [])
        for (const payment of data ?? []) {
          await localPut('payments', payment)
        }
      } else {
        const local = await localGetAll('payments')
        setPayments(local.filter(p => p.agent_id === agentId))
      }
    } catch (err) {
      setError(err.message)
      const local = await localGetAll('payments')
      setPayments(local.filter(p => p.agent_id === agentId))
    } finally {
      setLoading(false)
    }
  }, [agentId, isOnline])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const persistScheduleUpdate = useCallback(async schedule => {
    await localPut('payment_schedules', schedule)

    const scheduleFields = {
      installments: schedule.installments,
      down_payment_paid: schedule.down_payment_paid,
      down_payment_paid_at: schedule.down_payment_paid_at,
    }

    if (isOnline) {
      const { error: err } = await supabase
        .from('payment_schedules')
        .update(scheduleFields)
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

  const persistClientStatus = useCallback(async (clientId, status) => {
    const updatedAt = new Date().toISOString()
    const client = await localGet('clients', clientId)
    if (client) {
      await localPut('clients', { ...client, status, updated_at: updatedAt })
    }

    if (isOnline) {
      const { error: err } = await supabase
        .from('clients')
        .update({ status, updated_at: updatedAt })
        .eq('id', clientId)
      if (err) {
        await addToSyncQueue({
          table: 'clients',
          operation: 'update',
          payload: { id: clientId, status, updated_at: updatedAt },
        })
      }
    } else {
      await addToSyncQueue({
        table: 'clients',
        operation: 'update',
        payload: { id: clientId, status, updated_at: updatedAt },
      })
    }
  }, [isOnline])

  const logPayment = useCallback(async ({
    scheduleId,
    vehicleId,
    clientId,
    amount,
    method,
    reference,
    notes,
    date,
  }) => {
    setSaving(true)
    setError(null)

    const payment = {
      id: crypto.randomUUID(),
      schedule_id: scheduleId || null,
      vehicle_id: vehicleId,
      client_id: clientId,
      agent_id: agentId,
      amount: Number(amount),
      method,
      reference: reference?.trim() || null,
      notes: notes?.trim() || null,
      date: date ?? new Date().toISOString().split('T')[0],
      logged_by: agentId,
      synced: isOnline,
      created_at: new Date().toISOString(),
    }

    try {
      await localPut('payments', payment)
      setPayments(prev => [payment, ...prev])

      if (isOnline) {
        const { error: err } = await supabase.from('payments').insert(payment)
        if (err) {
          await addToSyncQueue({ table: 'payments', operation: 'insert', payload: payment })
        }
      } else {
        await addToSyncQueue({ table: 'payments', operation: 'insert', payload: payment })
      }

      const schedule = await findSchedule({
        scheduleId: payment.schedule_id,
        vehicleId: payment.vehicle_id,
        clientId,
      })

      if (schedule) {
        const updatedSchedule = applyPaymentToSchedule(
          schedule,
          payment.amount,
          payment.date
        )
        await persistScheduleUpdate(updatedSchedule)
        await patchClientNestedSchedule(clientId, vehicleId, updatedSchedule)

        const outstanding = getOutstandingBalance(updatedSchedule)
        if (outstanding <= 0.01) {
          await persistClientStatus(clientId, 'fully_paid')
        } else {
          const client = await localGet('clients', clientId)
          if (client?.status === 'fully_paid') {
            await persistClientStatus(clientId, 'active')
          }
        }
      }

      return payment
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [agentId, isOnline, persistScheduleUpdate, persistClientStatus])

  return { payments, loading, saving, error, refetch: fetchPayments, logPayment }
}
