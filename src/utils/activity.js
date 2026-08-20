import { coverMonthsLabel } from './policyDates'
import { getVehicleSchedules } from './calculator'

/**
 * Combined payment + renewal timeline for a client.
 */
export function buildClientActivity({ vehicles = [], payments = [] }) {
  const items = []

  for (const payment of payments) {
    items.push({
      id: `pay-${payment.id}`,
      type: 'payment',
      sortKey: `${payment.created_at || payment.date || ''}`,
      date: payment.date,
      payment,
    })
  }

  for (const vehicle of vehicles) {
    const historyIds = new Set(
      (vehicle.cover_history ?? [])
        .map(period => period.schedule_id)
        .filter(Boolean),
    )

    for (const period of vehicle.cover_history ?? []) {
      const when = String(period.archived_at || period.expiry_date || '').slice(
        0,
        10,
      )
      items.push({
        id: `renew-${vehicle.id}-${period.archived_at || period.start_date || when}`,
        type: 'renewal',
        sortKey: period.archived_at || when,
        date: when,
        vehicle,
        period,
        title: `Renewed ${coverMonthsLabel(period.cover_months || 12)}`,
      })
    }

    const [, ...pastSchedules] = getVehicleSchedules(vehicle)
    for (const schedule of pastSchedules) {
      if (historyIds.has(schedule.id)) continue
      const when = String(schedule.created_at || '').slice(0, 10)
      items.push({
        id: `renew-sched-${schedule.id}`,
        type: 'renewal',
        sortKey: schedule.created_at || when,
        date: when,
        vehicle,
        period: {
          start_date: when,
          expiry_date: vehicle.expiry_date,
          cover_months: 12,
          premium: schedule.total_premium,
        },
        title: 'Previous cover',
      })
    }
  }

  return items.sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)))
}

/** Archived cover periods for a vehicle, newest first. */
export function getPreviousPolicies(vehicle) {
  const history = Array.isArray(vehicle?.cover_history) ? vehicle.cover_history : []
  const fromHistory = history.map((period, index) => ({
    id: period.schedule_id || `hist-${period.archived_at || period.start_date || index}`,
    start_date: period.start_date,
    expiry_date: period.expiry_date,
    cover_months: period.cover_months || 12,
    premium: period.premium,
    insurer: period.insurer,
    policy_number: period.policy_number,
    policy_type: period.policy_type,
    sortKey: period.archived_at || period.expiry_date || period.start_date || '',
  }))

  if (fromHistory.length) {
    return fromHistory.sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)))
  }

  const [, ...pastSchedules] = getVehicleSchedules(vehicle)
  return pastSchedules.map(schedule => ({
    id: schedule.id,
    start_date: String(schedule.created_at || '').slice(0, 10),
    expiry_date: null,
    cover_months: 12,
    premium: schedule.total_premium,
    insurer: vehicle?.insurer,
    policy_number: vehicle?.policy_number,
    policy_type: vehicle?.policy_type,
  }))
}
