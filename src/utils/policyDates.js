export const COVER_MONTH_OPTIONS = [1, 2, 3, 4, 6, 12]

export function clampCoverMonths(value) {
  const months = Math.round(Number(value) || 12)
  return Math.min(12, Math.max(1, months))
}

export function getCoverMonths(vehicle) {
  return clampCoverMonths(vehicle?.cover_months || 12)
}

export function coverMonthsLabel(months) {
  const n = clampCoverMonths(months)
  if (n === 12) return '1 year'
  if (n === 1) return '1 month'
  return `${n} months`
}

function parseIsoParts(value) {
  const [year, month, day] = String(value || '')
    .slice(0, 10)
    .split('-')
    .map(Number)
  if (!year || !month || !day) return null
  return { year, month, day }
}

export function todayIso(date = new Date()) {
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function addIsoDays(iso, days) {
  const parsed = parseIsoParts(iso)
  if (!parsed) return ''
  const date = new Date(parsed.year, parsed.month - 1, parsed.day + Number(days || 0))
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function compareIsoDates(a, b) {
  return String(a || '')
    .slice(0, 10)
    .localeCompare(String(b || '').slice(0, 10))
}

export function isCoverExpired(expiryDate, today = todayIso()) {
  if (!expiryDate) return false
  return compareIsoDates(expiryDate, today) < 0
}

export function isCoverExpiringSoon(expiryDate, withinDays = 30, today = todayIso()) {
  if (!expiryDate || isCoverExpired(expiryDate, today)) return false
  return compareIsoDates(expiryDate, addIsoDays(today, withinDays)) <= 0
}

/**
 * If cover is still in force, start the day after expiry.
 * If it has already lapsed, start today (gap stays visible on the old period).
 */
export function suggestedRenewalStart(expiryDate, today = todayIso()) {
  if (!expiryDate) return today
  const dayAfter = addIsoDays(expiryDate, 1)
  return compareIsoDates(dayAfter, today) > 0 ? dayAfter : today
}

/**
 * Cover starting on the 8th for N months expires on the 7th N months later
 * (start + N months − 1 day). 12 months matches the annual rule:
 * 2025-08-08 → 2026-08-07
 */
export function expiryFromCoverMonths(startDate, coverMonths = 12) {
  const parsed = parseIsoParts(startDate)
  if (!parsed) return ''

  const months = clampCoverMonths(coverMonths)
  const date = new Date(parsed.year, parsed.month - 1 + months, parsed.day)
  date.setDate(date.getDate() - 1)

  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/**
 * Annual policy expiry / renewal date.
 * Cover starting on the 8th renews on the 7th next year (start + 1 year − 1 day).
 */
export function defaultExpiryDate(startDate) {
  return expiryFromCoverMonths(startDate, 12)
}

/** Formats an ISO date (yyyy-MM-dd) as dd/mm/yy. */
export function formatDisplayDate(value) {
  if (!value) return ''
  const [year, month, day] = String(value).slice(0, 10).split('-')
  if (!year || !month || !day) return ''
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`
}

/**
 * Parses dd/mm/yy or dd/mm/yyyy into ISO yyyy-MM-dd.
 * Returns null when the text is not a valid calendar date.
 */
export function parseDisplayDate(text) {
  if (text == null) return null
  const cleaned = String(text).trim()
  if (!cleaned) return ''

  const match = cleaned.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])
  if (match[3].length === 2) year += year >= 70 ? 1900 : 2000

  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return toIsoDate(year, month, day)
}

function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
