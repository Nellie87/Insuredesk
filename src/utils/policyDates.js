/**
 * Annual policy expiry / renewal date.
 * Cover starting on the 8th renews on the 7th next year (start + 1 year − 1 day).
 * e.g. 2025-08-08 → 2026-08-07
 */
export function defaultExpiryDate(startDate) {
  if (!startDate) return ''

  const [year, month, day] = String(startDate)
    .slice(0, 10)
    .split('-')
    .map(Number)

  if (!year || !month || !day) return ''

  const date = new Date(year + 1, month - 1, day)
  date.setDate(date.getDate() - 1)

  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
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
