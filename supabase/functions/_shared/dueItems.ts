const PAYMENT_OFFSETS = [14, 7, 1]

function installmentRemaining(installment) {
  if (!installment) return 0
  const amount = Number(installment.amount || 0)
  const paid = installment.paid
    ? amount
    : Number(installment.paid_amount || 0)
  return Math.max(0, Math.round((amount - paid) * 100) / 100)
}

export function todayInNairobi(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function daysUntil(dateStr, todayStr) {
  const due = Date.parse(`${dateStr}T00:00:00+03:00`)
  const today = Date.parse(`${todayStr}T00:00:00+03:00`)
  if (Number.isNaN(due) || Number.isNaN(today)) return null
  return Math.round((due - today) / 86400000)
}

export function collectDueItems({
  today,
  clientsById,
  vehicles,
  schedules,
  prospects,
  reminders,
}) {
  const items = []

  const vehicleById = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]))

  for (const vehicle of vehicles) {
    const client = clientsById.get(vehicle.client_id)
    const clientName = client?.name || 'Client'
    const days = daysUntil(vehicle.expiry_date, today)

    if (days === 0 || days === 7 || days === 14 || days === 30) {
      const when =
        days === 0 ? 'expires today' : days === 1 ? 'expires tomorrow' : `expires in ${days} days`
      items.push({
        key: `renewal:${vehicle.id}:${vehicle.expiry_date}:${days}`,
        type: 'renewal',
        title: `Policy ${when}`,
        body: `${clientName} · ${vehicle.registration}`,
      })
    }
  }

  const currentByVehicle = new Map()
  for (const schedule of schedules) {
    const existing = currentByVehicle.get(schedule.vehicle_id)
    if (
      !existing ||
      String(schedule.created_at || '') > String(existing.created_at || '')
    ) {
      currentByVehicle.set(schedule.vehicle_id, schedule)
    }
  }

  for (const schedule of currentByVehicle.values()) {
    const vehicle = vehicleById.get(schedule.vehicle_id)
    if (!vehicle) continue
    const client = clientsById.get(vehicle.client_id)
    const clientName = client?.name || 'Client'

    for (const installment of schedule.installments ?? []) {
      if (installment.paid || !installment.due_date) continue
      if (installmentRemaining(installment) <= 0.01) continue

      const days = daysUntil(installment.due_date, today)
      if (days == null) continue

      if (days < 0) {
        items.push({
          key: `payment-overdue:${vehicle.id}:${installment.due_date}:${installment.number ?? ''}`,
          type: 'payment',
          title: 'Payment overdue',
          body: `${clientName} · ${vehicle.registration}`,
        })
        continue
      }

      if (days === 0) {
        items.push({
          key: `payment-due:${vehicle.id}:${installment.due_date}:${installment.number ?? ''}`,
          type: 'payment',
          title: 'Payment due today',
          body: `${clientName} · ${vehicle.registration}`,
        })
      }

      if (PAYMENT_OFFSETS.includes(days)) {
        items.push({
          key: `payment-soon:${vehicle.id}:${installment.due_date}:${days}`,
          type: 'payment',
          title: days === 1 ? 'Payment due tomorrow' : `Payment due in ${days} days`,
          body: `${clientName} · ${vehicle.registration}`,
        })
      }
    }
  }

  for (const prospect of prospects) {
    if (!prospect.follow_up_date) continue
    if (['converted', 'lost'].includes(prospect.stage)) continue
    const days = daysUntil(prospect.follow_up_date, today)
    if (days == null) continue
    if (days > 0) continue

    items.push({
      key: `followup:${prospect.id}:${prospect.follow_up_date}`,
      type: 'follow_up',
      title: days < 0 ? 'Overdue follow-up' : 'Follow up today',
      body: prospect.full_name,
    })
  }

  for (const reminder of reminders) {
    if (reminder.status && reminder.status !== 'scheduled') continue
    const dateKey = reminder.scheduled_at?.slice(0, 10)
    if (dateKey !== today) continue
    items.push({
      key: `reminder:${reminder.id}:${dateKey}`,
      type: 'reminder',
      title: String(reminder.trigger_type || 'Reminder').replace(/_/g, ' '),
      body: reminder.message?.slice(0, 80) || 'Scheduled reminder',
    })
  }

  return items
}

export function buildPushPayload(items) {
  if (items.length === 1) {
    return {
      title: items[0].title,
      body: items[0].body,
      tag: items[0].key,
      url: '/reminders',
    }
  }

  const counts = items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {})

  const parts = []
  if (counts.payment) {
    parts.push(`${counts.payment} payment${counts.payment === 1 ? '' : 's'}`)
  }
  if (counts.renewal) {
    parts.push(`${counts.renewal} renewal${counts.renewal === 1 ? '' : 's'}`)
  }
  if (counts.follow_up) {
    parts.push(`${counts.follow_up} follow-up${counts.follow_up === 1 ? '' : 's'}`)
  }
  if (counts.reminder) {
    parts.push(`${counts.reminder} reminder${counts.reminder === 1 ? '' : 's'}`)
  }

  return {
    title: `${items.length} reminders today`,
    body: parts.join(' · ') || 'Open the calendar for details.',
    tag: `digest-${items.length}`,
    url: '/reminders',
  }
}
