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

/** Parses engine capacity in cc from a number or strings like "1500" / "1500cc". */
export function parseEngineCapacity(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    const n = Math.round(value)
    return n > 0 ? n : null
  }
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Formats engine capacity for display, e.g. 1500 → "1,500 cc". */
export function formatEngineCapacity(value) {
  const n = parseEngineCapacity(value)
  if (n == null) return ''
  return `${n.toLocaleString('en-KE')} cc`
}

/** Digit string for engine capacity inputs. */
export function engineCapacityInputValue(value) {
  const n = parseEngineCapacity(value)
  return n != null ? String(n) : ''
}

/**
 * Calculates total premium from sum insured and a rate percent.
 * Returns a formatted amount string, or null when inputs are incomplete.
 */
export function premiumFromRate(sumInsured, ratePercent) {
  const sum = Number(parseNumberInput(sumInsured)) || 0
  const rateRaw = parseNumberInput(ratePercent)
  if (rateRaw === '' || sum <= 0) return null
  const rate = Number(rateRaw)
  if (!Number.isFinite(rate)) return null
  const premium = Math.round(((sum * rate) / 100) * 100) / 100
  return formatNumberInput(String(premium))
}
