import { supabase } from './supabase'

/**
 * Server-side reporting query for client → vehicle → insurance package rows.
 * Requires the `vehicle_insurance_report` view (see schema.sql / migrations/007).
 * Falls back to null when the view is missing or the device is offline.
 */
export async function fetchVehicleInsuranceReport(agentId, filters = {}) {
  if (!agentId) return { data: null, error: new Error('Not signed in.') }

  let query = supabase
    .from('vehicle_insurance_report')
    .select('*')
    .eq('agent_id', agentId)
    .order('client_name')

  if (filters.packageType && filters.packageType !== 'all') {
    query = query.eq('package_type', filters.packageType)
  }
  if (filters.clientId) {
    query = query.eq('client_id', filters.clientId)
  }
  if (filters.coverStatus && filters.coverStatus !== 'all') {
    query = query.eq('cover_status', filters.coverStatus)
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim()
    query = query.or(
      [
        `client_name.ilike.%${q}%`,
        `registration.ilike.%${q}%`,
        `make.ilike.%${q}%`,
        `model.ilike.%${q}%`,
        `insurer.ilike.%${q}%`,
        `policy_number.ilike.%${q}%`,
      ].join(','),
    )
  }

  return query
}
