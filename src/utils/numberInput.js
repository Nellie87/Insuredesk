/**
 * Formats a numeric string with thousand separators (e.g. 12500 → "12,500").
 * Keeps an optional decimal part.
 */
export function formatNumberInput(value) {
  if (value === '' || value == null) return ''

  const cleaned = String(value).replace(/[^\d.]/g, '')
  if (!cleaned) return ''

  const hasDot = cleaned.includes('.')
  const [intRaw, ...rest] = cleaned.split('.')
  const intPart = intRaw.replace(/^0+(?=\d)/, '') || (hasDot ? '0' : intRaw)
  const decimals = rest.join('').replace(/\D/g, '').slice(0, 2)
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  if (hasDot) return `${formattedInt}.${decimals}`
  return formattedInt
}

/** Strips commas so the value can be parsed / saved as a number. */
export function parseNumberInput(value) {
  if (value === '' || value == null) return ''
  return String(value).replace(/,/g, '')
}

/** Parses to a Number, or null when empty. */
export function toNumberOrNull(value) {
  const raw = parseNumberInput(value)
  if (raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}
