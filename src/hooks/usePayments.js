import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localPut, localGetAll, addToSyncQueue } from '../lib/db'
import { useAppStore } from '../store/appStore'

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

      return payment
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [agentId, isOnline])

  return { payments, loading, saving, error, refetch: fetchPayments, logPayment }
}
