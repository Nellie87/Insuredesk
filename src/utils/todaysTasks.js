import {
  formatKSh,
  getInstallmentRemaining,
  getOutstandingBalance,
  getVehicleSchedules,
} from './calculator'
import { daysBetweenIso, todayIso } from './policyDates'

const CLOSED_PROSPECT_STAGES = new Set(['converted', 'lost'])
const RECENTLY_EXPIRED_DAYS = 30

export const TASK_META = {
  collect: {
    label: 'Collect',
    rail: 'bg-danger-500',
    railToday: 'bg-primary-600',
  },
  renew: {
    label: 'Renew',
    rail: 'bg-warning-500',
  },
  follow_up: {
    label: 'Follow up',
    rail: 'bg-violet-500',
  },
  reminder: {
    label: 'Reminder',
    rail: 'bg-teal-500',
  },
}

function isoDate(value) {
  const key = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : ''
}

function whenLabel(daysFromToday) {
  if (daysFromToday < 0) {
    const late = Math.abs(daysFromToday)
    return late === 1 ? '1d late' : `${late}d late`
  }
  if (daysFromToday === 0) return 'Today'
  return `In ${daysFromToday} days`
}

function sortTasks(a, b) {
  if (a.daysFromToday !== b.daysFromToday) return a.daysFromToday - b.daysFromToday
  const order = { collect: 0, renew: 1, follow_up: 2, reminder: 3 }
  return (order[a.type] ?? 9) - (order[b.type] ?? 9)
}

/**
 * Work that needs the agent today: overdue collections, dues and renewals
 * today, follow-ups that are due or late, and reminders scheduled for today.
 */
export function getTodaysTasks({
  clients = [],
  prospects = [],
  reminders = [],
  today = todayIso(),
} = {}) {
  const tasks = []
  const todayKey = isoDate(today) || todayIso()

  for (const client of clients ?? []) {
    for (const vehicle of client.vehicles ?? []) {
      const schedule = getVehicleSchedules(vehicle)[0]
      if (schedule) {
        const outstanding = getOutstandingBalance(schedule)
        const overdueInstallments = []
        let earliestOverdueDays = 0

        for (const installment of schedule.installments ?? []) {
          if (installment.paid || !installment.due_date) continue
          const remaining = getInstallmentRemaining(installment)
          if (remaining <= 0.01) continue

          const due = isoDate(installment.due_date)
          const days = daysBetweenIso(todayKey, due)
          if (days == null) continue

          if (days < 0) {
            overdueInstallments.push({ installment, remaining, days })
            earliestOverdueDays = Math.min(earliestOverdueDays, days)
            continue
          }

          if (days === 0) {
            tasks.push({
              id: `collect-today-${vehicle.id}-${installment.number ?? due}`,
              type: 'collect',
              title: client.name,
              subtitle: [vehicle.registration, installment.number != null ? `#${installment.number}` : null]
                .filter(Boolean)
                .join(' · '),
              when: 'Today',
              value: formatKSh(remaining),
              daysFromToday: 0,
              href: `/clients/${client.id}`,
              phone: client.phone,
              client,
              vehicle,
              installment,
              remaining,
              outstanding,
              trigger: 'payment_due_today',
            })
          }
        }

        if (overdueInstallments.length) {
          const remaining = overdueInstallments.reduce(
            (sum, row) => sum + row.remaining,
            0,
          )
          const next = overdueInstallments.sort((a, b) => a.days - b.days)[0]
          tasks.push({
            id: `collect-overdue-${vehicle.id}`,
            type: 'collect',
            title: client.name,
            subtitle: vehicle.registration,
            when: whenLabel(earliestOverdueDays),
            value: formatKSh(remaining),
            daysFromToday: earliestOverdueDays,
            href: `/clients/${client.id}`,
            phone: client.phone,
            client,
            vehicle,
            installment: next.installment,
            remaining,
            outstanding,
            trigger: 'payment_overdue_1d',
          })
        }
      }

      const expiry = isoDate(vehicle.expiry_date)
      if (!expiry) continue
      const days = daysBetweenIso(todayKey, expiry)
      if (days == null) continue
      if (days > 0) continue
      if (days < -RECENTLY_EXPIRED_DAYS) continue

      tasks.push({
        id: `renew-${vehicle.id}`,
        type: 'renew',
        title: client.name,
        subtitle: [vehicle.registration, vehicle.make, vehicle.model]
          .filter(Boolean)
          .join(' · '),
        when:
          days === 0
            ? 'Today'
            : days === -1
              ? '1d expired'
              : `${Math.abs(days)}d expired`,
        daysFromToday: days,
        href: `/clients/${client.id}`,
        phone: client.phone,
        client,
        vehicle,
        trigger: days === 0 ? 'policy_expiry_today' : 'policy_expired',
      })
    }
  }

  for (const prospect of prospects ?? []) {
    if (CLOSED_PROSPECT_STAGES.has(prospect.stage)) continue
    const followUp = isoDate(prospect.follow_up_date)
    if (!followUp) continue
    const days = daysBetweenIso(todayKey, followUp)
    if (days == null || days > 0) continue

    tasks.push({
      id: `followup-${prospect.id}`,
      type: 'follow_up',
      title: prospect.full_name,
      subtitle: prospect.vehicle_details || prospect.product_interest || prospect.phone,
      when: whenLabel(days),
      daysFromToday: days,
      href: '/prospects',
      phone: prospect.phone,
      prospect,
    })
  }

  for (const reminder of reminders ?? []) {
    if (reminder.status && reminder.status !== 'scheduled') continue
    const dateKey = isoDate(reminder.scheduled_at)
    if (dateKey !== todayKey) continue

    const client = reminder.clients || reminder.client
    const vehicle = reminder.vehicles || reminder.vehicle
    const title = client?.name || String(reminder.trigger_type || 'Reminder').replace(/_/g, ' ')

    tasks.push({
      id: `reminder-${reminder.id}`,
      type: 'reminder',
      title,
      subtitle:
        vehicle?.registration ||
        reminder.message?.slice(0, 80) ||
        'Scheduled reminder',
      when: 'Today',
      daysFromToday: 0,
      href: client?.id ? `/clients/${client.id}` : '/reminders',
      phone: client?.phone,
      client,
      vehicle,
      reminder,
      trigger: reminder.trigger_type,
    })
  }

  return tasks.sort(sortTasks)
}

export function summarizeTodaysTasks(tasks = []) {
  const counts = { collect: 0, renew: 0, follow_up: 0, reminder: 0 }
  for (const task of tasks) {
    if (counts[task.type] != null) counts[task.type] += 1
  }

  const parts = []
  if (counts.collect) {
    parts.push(`${counts.collect} collection${counts.collect === 1 ? '' : 's'}`)
  }
  if (counts.renew) {
    parts.push(`${counts.renew} renewal${counts.renew === 1 ? '' : 's'}`)
  }
  if (counts.follow_up) {
    parts.push(`${counts.follow_up} follow-up${counts.follow_up === 1 ? '' : 's'}`)
  }
  if (counts.reminder) {
    parts.push(`${counts.reminder} reminder${counts.reminder === 1 ? '' : 's'}`)
  }

  const total = tasks.length
  return {
    counts,
    total,
    label: parts.join(' · '),
    headline:
      total === 0
        ? 'Nothing needs you today'
        : total === 1
          ? '1 thing needs you today'
          : `${total} things need you today`,
  }
}
