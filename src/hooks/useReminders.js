import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { localPut, localGetAll } from '../lib/db'
import { useAppStore } from '../store/appStore'
import { useClients } from './useClients'
import { useProspects } from './useProspects'
import { getVehicleSchedules } from '../utils/calculator'
import { parseISO, differenceInDays, format, isAfter, isBefore, addDays, subDays } from 'date-fns'

export function useReminders() {
  const { session, isOnline } = useAppStore()
  const agentId = session?.user?.id
  const { clients } = useClients()
  const { prospects } = useProspects()

  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchReminders = useCallback(async () => {
    if (!agentId) {
      setReminders([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('reminders')
          .select(`
            *,
            clients ( id, name, phone ),
            vehicles ( id, registration, make, model )
          `)
          .eq('agent_id', agentId)
          .order('scheduled_at', { ascending: true })

        if (error) throw error
        setReminders(data ?? [])
        for (const row of data ?? []) {
          await localPut('reminders', row)
        }
      } else {
        const local = await localGetAll('reminders')
        setReminders(local.filter(r => r.agent_id === agentId))
      }
    } catch {
      const local = await localGetAll('reminders')
      setReminders(local.filter(r => r.agent_id === agentId))
    } finally {
      setLoading(false)
    }
  }, [agentId, isOnline])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  const calendarEvents = useMemo(() => {
    const today = new Date()
    const rangeStart = subDays(today, 30)
    const rangeEnd = addDays(today, 365)
    const events = []

    const inRange = dateStr => {
      const d = parseISO(dateStr)
      if (Number.isNaN(d.getTime())) return false
      return !isBefore(d, rangeStart) && !isAfter(d, rangeEnd)
    }

    for (const client of clients) {
      for (const vehicle of client.vehicles ?? []) {
        if (vehicle.expiry_date && inRange(vehicle.expiry_date)) {
          const daysLeft = differenceInDays(parseISO(vehicle.expiry_date), today)
          events.push({
            id: `expiry-${vehicle.id}`,
            type: 'renewal',
            date: vehicle.expiry_date,
            title: `Policy expiry · ${vehicle.registration}`,
            subtitle: `${client.name} · ${vehicle.make} ${vehicle.model}`,
            status: daysLeft < 0 ? 'overdue' : daysLeft <= 7 ? 'urgent' : daysLeft <= 30 ? 'soon' : 'upcoming',
            client,
            vehicle,
          })
        }

        for (const schedule of getVehicleSchedules(vehicle)) {
          for (const inst of schedule.installments ?? []) {
            if (inst.paid || !inst.due_date || !inRange(inst.due_date)) continue

            const daysLeft = differenceInDays(parseISO(inst.due_date), today)
            events.push({
              id: `payment-${vehicle.id}-${inst.due_date}-${inst.number ?? ''}`,
              type: 'payment',
              date: inst.due_date,
              title: `Instalment due · ${vehicle.registration}`,
              subtitle: `${client.name}`,
              status: daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'urgent' : 'upcoming',
              client,
              vehicle,
              installment: inst,
            })
          }
        }
      }
    }

    for (const prospect of prospects) {
      if (!prospect.follow_up_date || !inRange(prospect.follow_up_date)) continue

      const daysLeft = differenceInDays(parseISO(prospect.follow_up_date), today)
      events.push({
        id: `prospect-${prospect.id}`,
        type: 'follow_up',
        date: prospect.follow_up_date,
        title: `Follow up · ${prospect.full_name}`,
        subtitle: prospect.vehicle_details || prospect.product_interest || prospect.phone,
        status: daysLeft < 0 ? 'overdue' : daysLeft <= 0 ? 'urgent' : 'upcoming',
        prospect,
      })
    }

    for (const reminder of reminders) {
      const dateKey = reminder.scheduled_at?.slice(0, 10)
      if (!dateKey || !inRange(dateKey)) continue
      events.push({
        id: `reminder-${reminder.id}`,
        type: 'reminder',
        date: dateKey,
        title: reminder.trigger_type.replace(/_/g, ' '),
        subtitle: reminder.clients?.name
          ? `${reminder.clients.name} · ${reminder.vehicles?.registration ?? ''}`
          : reminder.message?.slice(0, 60),
        status: reminder.status === 'sent' ? 'done' : reminder.status === 'failed' ? 'overdue' : 'upcoming',
        reminder,
        client: reminder.clients,
        vehicle: reminder.vehicles,
      })
    }

    return events.sort((a, b) => a.date.localeCompare(b.date))
  }, [clients, prospects, reminders])

  const groupedByDate = useMemo(() => {
    const groups = {}
    for (const event of calendarEvents) {
      if (!groups[event.date]) groups[event.date] = []
      groups[event.date].push(event)
    }
    return Object.entries(groups).map(([date, items]) => ({
      date,
      label: format(parseISO(date), 'EEE, d MMM yyyy'),
      items,
    }))
  }, [calendarEvents])

  return { reminders, calendarEvents, groupedByDate, loading, refetch: fetchReminders }
}
