import { POLICY_LABELS, POLICY_TYPES } from '../constants/policies'
import {
  getAmountPaid,
  getOutstandingBalance,
  getVehicleCollectionSummary,
  getVehicleSchedules,
} from './calculator'
import { isCoverExpired, isCoverExpiringSoon } from './policyDates'

export function vehicleCoverStatus(vehicle) {
  if (isCoverExpired(vehicle?.expiry_date)) return 'expired'
  if (isCoverExpiringSoon(vehicle?.expiry_date)) return 'expiring_soon'
  return 'in_force'
}

export function flattenVehiclePortfolio(clients = [], payments = []) {
  const rows = []

  for (const client of clients) {
    for (const vehicle of client.vehicles ?? []) {
      const relatedPayments = payments.filter(
        payment => payment.vehicle_id === vehicle.id,
      )
      const summary = getVehicleCollectionSummary(vehicle, relatedPayments)
      rows.push({
        vehicleId: vehicle.id,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientStatus: client.status,
        registration: vehicle.registration || '',
        chassis: vehicle.chassis || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || null,
        insurer: vehicle.insurer || '',
        packageType: vehicle.policy_type,
        packageLabel: POLICY_LABELS[vehicle.policy_type] || vehicle.policy_type,
        policyNumber: vehicle.policy_number || '',
        premium: summary.totalPremium,
        amountPaid: summary.amountPaid,
        outstanding: summary.outstanding,
        startDate: vehicle.start_date,
        expiryDate: vehicle.expiry_date,
        coverStatus: vehicleCoverStatus(vehicle),
        useType: vehicle.use_type,
        vehicle,
        client,
      })
    }
  }

  return rows.sort((a, b) => {
    const byClient = String(a.clientName).localeCompare(String(b.clientName))
    if (byClient !== 0) return byClient
    return String(a.registration).localeCompare(String(b.registration))
  })
}

export function filterVehiclePortfolio(
  rows,
  { search = '', packageType = 'all', clientId = '', coverStatus = 'all' } = {},
) {
  const q = search.trim().toLowerCase()

  return rows.filter(row => {
    if (packageType !== 'all' && row.packageType !== packageType) return false
    if (clientId && row.clientId !== clientId) return false
    if (coverStatus !== 'all' && row.coverStatus !== coverStatus) return false
    if (!q) return true

    return [
      row.clientName,
      row.clientPhone,
      row.registration,
      row.chassis,
      row.make,
      row.model,
      row.insurer,
      row.policyNumber,
      row.packageLabel,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
}

export function summarizeVehiclePortfolio(rows) {
  const byPackage = Object.fromEntries(
    POLICY_TYPES.map(type => [type.value, { count: 0, premium: 0 }]),
  )

  let totalPremium = 0
  let totalOutstanding = 0
  let expiringCount = 0
  let expiredCount = 0

  for (const row of rows) {
    totalPremium += Number(row.premium) || 0
    totalOutstanding += Number(row.outstanding) || 0
    if (row.coverStatus === 'expiring_soon') expiringCount += 1
    if (row.coverStatus === 'expired') expiredCount += 1
    if (byPackage[row.packageType]) {
      byPackage[row.packageType].count += 1
      byPackage[row.packageType].premium += Number(row.premium) || 0
    }
  }

  return {
    totalVehicles: rows.length,
    totalPremium,
    totalOutstanding,
    expiringCount,
    expiredCount,
    byPackage,
  }
}

export function clientPortfolioTotals(client) {
  const vehicles = client?.vehicles ?? []
  let premium = 0
  let paid = 0
  let outstanding = 0

  for (const vehicle of vehicles) {
    const schedule = getVehicleSchedules(vehicle)[0]
    premium += Number(schedule?.total_premium ?? vehicle.premium ?? 0)
    if (schedule) {
      paid += getAmountPaid(schedule)
      outstanding += getOutstandingBalance(schedule)
    }
  }

  return { vehicles, premium, paid, outstanding }
}

export function vehiclePortfolioCsv(rows) {
  const headers = [
    'Client',
    'Phone',
    'Registration',
    'Make',
    'Model',
    'Year',
    'Insurance package',
    'Insurer',
    'Policy number',
    'Premium',
    'Paid',
    'Outstanding',
    'Start date',
    'Expiry date',
    'Cover status',
  ]

  const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      [
        row.clientName,
        row.clientPhone,
        row.registration,
        row.make,
        row.model,
        row.year,
        row.packageLabel,
        row.insurer,
        row.policyNumber,
        row.premium,
        row.amountPaid,
        row.outstanding,
        row.startDate,
        row.expiryDate,
        row.coverStatus,
      ]
        .map(escape)
        .join(','),
    ),
  ]

  return lines.join('\n')
}
