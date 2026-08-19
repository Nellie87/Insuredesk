import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { localPut, localGetAll } from '../lib/db'
import { useAppStore } from '../store/appStore'
import { useClients } from './useClients'
import { useProspects } from './useProspects'
import {
  getInstallmentRemaining,
  getOutstandingBalance,
  getVehicleSchedules,
} from '../utils/calculator'
import { PAYMENT_REMINDER_OFFSETS } from '../utils/reminders'
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

        const schedule = getVehicleSchedules(vehicle)[0]
        if (!schedule) continue

        const outstanding = getOutstandingBalance(schedule)

        for (const inst of schedule.installments ?? []) {
          if (inst.paid || !inst.due_date) continue

          const remaining = getInstallmentRemaining(inst)
          if (remaining <= 0.01) continue

          const due = parseISO(inst.due_date)
          if (Number.isNaN(due.getTime())) continue

          const todayKey = format(today, 'yyyy-MM-dd')

          for (const offset of PAYMENT_REMINDER_OFFSETS) {
            const reminderDate = format(subDays(due, offset.daysBefore), 'yyyy-MM-dd')
            if (reminderDate < todayKey || !inRange(reminderDate)) continue

            events.push({
              id: `payment-reminder-${vehicle.id}-${inst.number ?? inst.due_date}-${offset.daysBefore}`,
              type: 'payment',
              date: reminderDate,
              title: `${offset.title} · ${vehicle.registration}`,
              subtitle: `${client.name} · due ${format(due, 'dd MMM yyyy')}`,
              status: offset.daysBefore <= 1 ? 'urgent' : 'upcoming',
              trigger: offset.trigger,
              client,
              vehicle,
              installment: inst,
              remaining,
              outstanding,
            })
          }

          if (!inRange(inst.due_date)) continue

          const daysLeft = differenceInDays(due, today)
          events.push({
            id: `payment-${vehicle.id}-${inst.due_date}-${inst.number ?? ''}`,
            type: 'payment',
            date: inst.due_date,
            title: `Instalment due · ${vehicle.registration}`,
            subtitle: `${client.name}`,
            status: daysLeft < 0 ? 'overdue' : daysLeft <= 1 ? 'urgent' : 'upcoming',
            trigger:
              daysLeft < 0
                ? 'payment_overdue_1d'
                : daysLeft === 0
                  ? 'payment_due_today'
                  : undefined,
            client,
            vehicle,
            installment: inst,
            remaining,
            outstanding,
          })
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
