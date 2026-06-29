// src/hooks/useProspects.js

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localPut, localGetAll, addToSyncQueue } from '../lib/db'
import { useAppStore } from '../store/appStore'

export function useProspects() {
  const { session, isOnline } = useAppStore()
  const agentId = session?.user?.id

  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProspects = useCallback(async () => {
    if (!agentId) return

    setLoading(true)
    setError(null)

    try {
      if (isOnline) {
        const { data, error: err } = await supabase
          .from('prospects')
          .select('*')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false })

        if (err) throw err

        setProspects(data ?? [])

        for (const prospect of data ?? []) {
          await localPut('prospects', prospect)
        }
      } else {
        const local = await localGetAll('prospects', 'agent_id', agentId)
        setProspects(local)
      }
    } catch (err) {
      setError(err.message)

      const local = await localGetAll('prospects', 'agent_id', agentId)
      setProspects(local)
    } finally {
      setLoading(false)
    }
  }, [agentId, isOnline])

  useEffect(() => {
    fetchProspects()
  }, [fetchProspects])

  const addProspect = useCallback(async (prospectData) => {
    const newProspect = {
      full_name: prospectData.full_name,
      phone: prospectData.phone,
      email: prospectData.email || null,
      vehicle_details: prospectData.vehicle_details || null,
      product_interest: prospectData.product_interest || null,
      estimated_premium: Number(prospectData.estimated_premium || 0),
      preferred_insurer: prospectData.preferred_insurer || null,
      follow_up_date: prospectData.follow_up_date || null,
      notes: prospectData.notes || null,
      id: crypto.randomUUID(),
      agent_id: agentId,
      stage: prospectData.stage ?? 'lead',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await localPut('prospects', newProspect)

    setProspects(prev => [newProspect, ...prev])

    if (isOnline) {
      const { error: err } = await supabase
        .from('prospects')
        .insert(newProspect)

      if (err) {
        await addToSyncQueue({
          table: 'prospects',
          operation: 'insert',
          payload: newProspect,
        })
      }
    } else {
      await addToSyncQueue({
        table: 'prospects',
        operation: 'insert',
        payload: newProspect,
      })
    }

    return newProspect
  }, [agentId, isOnline])

  const updateProspect = useCallback(async (id, updates) => {
    let merged

    setProspects(prev => {
      const existing = prev.find(p => p.id === id)
      if (!existing) return prev
      merged = { ...existing, ...updates, updated_at: new Date().toISOString() }
      return prev.map(p => (p.id === id ? merged : p))
    })

    if (!merged) return

    await localPut('prospects', merged)

    if (isOnline) {
      const { error: err } = await supabase
        .from('prospects')
        .update({
          ...updates,
          updated_at: merged.updated_at,
        })
        .eq('id', id)

      if (err) {
        await addToSyncQueue({
          table: 'prospects',
          operation: 'update',
          payload: merged,
        })
      }
    } else {
      await addToSyncQueue({
        table: 'prospects',
        operation: 'update',
        payload: merged,
      })
    }
  }, [isOnline])

  return {
    prospects,
    loading,
    error,
    refetch: fetchProspects,
    addProspect,
    updateProspect,
  }
}