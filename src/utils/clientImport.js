import * as XLSX from 'xlsx'
import { buildPaymentScheduleFromPlan } from './calculator'

const COLUMN_ALIASES = {
  name: ['insured', 'name', 'full name', 'client name', 'client', 'customer name', 'customer'],
  phone: ['contacts', 'contact', 'phone', 'phone number', 'mobile', 'tel', 'telephone'],
  id_number: ['id number', 'national id', 'id no', 'idno'],
  email: ['email', 'e-mail', 'email address'],
  address: ['address', 'location', 'area'],
  registration: ['registration', 'reg no', 'regno', 'number plate', 'plate'],
  make: ['make', 'vehicle make', 'car make'],
  model: ['model', 'vehicle model', 'car model'],
  year: ['year', 'vehicle year', 'yom', 'year of manufacture'],
  engine_capacity: ['engine capacity', 'engine', 'cc', 'capacity'],
  vehicle_value: ['vehicle value', 'value', 'car value'],
  use_type: ['use type', 'usage', 'vehicle use'],
  insurer: ['insurer', 'insurance company', 'company', 'underwriter'],
  policy_number: ['policy number', 'policy no', 'policy ref'],
  policy_type: ['cover type', 'policy type', 'cover', 'type of cover'],
  start_date: ['from', 'start date', 'policy start', 'inception date', 'inception', 'commencement'],
  expiry_date: [
    'annual renewal',
    'expiry date',
    'expiry',
    'end date',
    'renewal date',
    'policy expiry',
  ],
  sum_insured: ['sum insured', 'insured value', 'cover amount'],
  premium: ['total premium', 'annual premium', 'premium amount', 'premium', 'amount'],
  balance: ['bal.', 'bal', 'balance', 'outstanding', 'outstanding balance'],
  comment: ['comment', 'comments', 'notes', 'remark', 'remarks'],
  renewal_1: ['renewal 1'],
  renewal_2: ['renewal 2'],
  renewal_3: ['renewal 3'],
  renewal_4: ['renewal 4'],
  payment_1: ['payment 1'],
  payment_2: ['payment 2'],
  payment_3: ['payment 3'],
  payment_4: ['payment 4'],
}

const POLICY_TYPE_MAP = {
  comprehensive: 'comprehensive',
  comp: 'comprehensive',
  'third party': 'third_party',
  'third party only': 'third_party',
  tp: 'third_party',
  tpo: 'third_party',
  'third party fire theft': 'third_party_fire_theft',
  'third party fire & theft': 'third_party_fire_theft',
  tpft: 'third_party_fire_theft',
}

const USE_TYPE_MAP = {
  private: 'private',
  personal: 'private',
  commercial: 'commercial',
  business: 'commercial',
  psv: 'psv',
  'public service': 'psv',
}

const HEADER_HINTS = new Set([
  'insured',
  'name',
  'contacts',
  'contact',
  'phone',
  'cover type',
  'from',
  'total premium',
  'annual renewal',
])

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function matchAlias(header, alias) {
  return header === alias || header.startsWith(`${alias} `) || header.endsWith(` ${alias}`)
}

function buildHeaderMap(headers) {
  const map = {}
  const normalizedHeaders = headers.map(normalizeHeader)
  const claimed = new Set()

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const index = normalizedHeaders.findIndex((header, headerIndex) => {
      if (claimed.has(headerIndex) || !header) return false
      return aliases.some(alias => matchAlias(header, alias))
    })
    if (index >= 0) {
      map[field] = index
      claimed.add(index)
    }
  }

  return map
}

function findHeaderRowIndex(rows) {
  const limit = Math.min(rows.length, 8)
  for (let i = 0; i < limit; i++) {
    const normalized = (rows[i] ?? []).map(normalizeHeader)
    const hits = normalized.filter(header =>
      HEADER_HINTS.has(header) ||
      header.startsWith('renewal ') ||
      header.startsWith('payment ')
    ).length
    if (hits >= 2) return i
  }
  return 0
}

function cellValue(row, index) {
  if (index == null || index < 0) return ''
  const value = row[index]
  if (value == null) return ''
  return value
}

function parseExcelDate(value) {
  if (value == null || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const date = new Date(parsed.y, parsed.m - 1, parsed.d)
      return date.toISOString().slice(0, 10)
    }
  }

  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const [, day, month, year] = dmy
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const parsedDate = new Date(text)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10)
  }

  return null
}

function parseNumber(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const cleaned = String(value).replace(/[, ]/g, '').replace(/ksh|kes|\/-/gi, '').trim()
  if (!cleaned) return null
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

function defaultExpiryDate(startDate) {
  const date = new Date(startDate)
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

function normalizePolicyType(value) {
  const key = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/\s+/g, ' ')
  if (!key) return 'comprehensive'
  return POLICY_TYPE_MAP[key] ?? null
}

function normalizeUseType(value) {
  const key = String(value ?? '').trim().toLowerCase()
  if (!key) return 'private'
  return USE_TYPE_MAP[key] ?? null
}

function parseRow(row, headerMap, rowNumber) {
  const get = field => {
    const raw = cellValue(row, headerMap[field])
    return typeof raw === 'string' ? raw.trim() : raw
  }

  const name = String(get('name') ?? '').trim()
  const phone = String(get('phone') ?? '').trim()
  const comment = String(get('comment') ?? '').trim()

  let registration = String(get('registration') ?? '').trim()
  let make = String(get('make') ?? '').trim()
  let model = String(get('model') ?? '').trim()
  let insurer = String(get('insurer') ?? '').trim()

  const isRenewalsSheet =
    headerMap.renewal_1 != null ||
    headerMap.payment_1 != null ||
    headerMap.balance != null ||
    (headerMap.name != null && headerMap.premium != null && headerMap.registration == null)

  if (isRenewalsSheet) {
    if (!registration) registration = `PENDING-${rowNumber}`
    if (!make) make = 'Unknown'
    if (!model) model = 'Unknown'
    if (!insurer) insurer = 'Unknown'
  }

  const premiumRaw = get('premium')
  const premium = parseNumber(premiumRaw)
  const balance = parseNumber(get('balance'))

  const startDate = parseExcelDate(get('start_date'))
  let expiryDate = parseExcelDate(get('expiry_date'))

  let inferredStartDate = startDate
  if (!inferredStartDate && expiryDate) {
    const date = new Date(expiryDate)
    date.setFullYear(date.getFullYear() - 1)
    inferredStartDate = date.toISOString().slice(0, 10)
  }
  if (inferredStartDate && !expiryDate) {
    expiryDate = defaultExpiryDate(inferredStartDate)
  }

  const policyType = normalizePolicyType(get('policy_type'))
  const useType = normalizeUseType(get('use_type'))

  const renewalDates = [1, 2, 3, 4].map(n => parseExcelDate(get(`renewal_${n}`)))
  const paymentAmounts = [1, 2, 3, 4].map(n => parseNumber(get(`payment_${n}`)))
  const schedule = buildPaymentScheduleFromPlan({
    renewalDates,
    paymentAmounts,
    premium,
    balance,
  })

  const errors = []
  if (!name) errors.push('Insured / Name is required')
  if (!phone) errors.push('Contacts / Phone is required')
  if (!registration) errors.push('Registration is required')
  if (!make) errors.push('Make is required')
  if (!model) errors.push('Model is required')
  if (!insurer) errors.push('Insurer is required')
  if (premium == null) errors.push('Total Premium must be a number')
  if (!inferredStartDate) errors.push('From / Start date is required or invalid')
  if (!expiryDate) errors.push('Annual Renewal / Expiry date is required or invalid')
  if (get('policy_type') && !policyType) errors.push('Unrecognized cover type')
  if (get('use_type') && !useType) errors.push('Unrecognized use type')

  return {
    rowNumber,
    valid: errors.length === 0,
    errors,
    data: {
      client: {
        name,
        phone,
        id_number: String(get('id_number') ?? '').trim(),
        email: String(get('email') ?? '').trim(),
        address: String(get('address') ?? '').trim(),
        notes: comment,
      },
      vehicle: {
        registration,
        make,
        model,
        year: get('year') ? String(get('year')).trim() : '',
        engine_capacity: String(get('engine_capacity') ?? '').trim(),
        vehicle_value: get('vehicle_value') ?? '',
        use_type: useType || 'private',
        insurer,
        policy_number: String(get('policy_number') ?? '').trim(),
        policy_type: policyType || 'comprehensive',
        start_date: inferredStartDate,
        expiry_date: expiryDate,
        sum_insured: get('sum_insured') ?? '',
        premium,
      },
      schedule,
    },
  }
}

export function parseClientSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('The file has no worksheets.')
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (rows.length < 2) {
    throw new Error('Add at least one data row below the header row.')
  }

  const headerRowIndex = findHeaderRowIndex(rows)
  const headers = rows[headerRowIndex]
  const headerMap = buildHeaderMap(headers)

  if (headerMap.name == null || headerMap.phone == null || headerMap.premium == null) {
    throw new Error(
      'Could not find INSURED, CONTACTS, and Total Premium columns. Check the header row and try again.'
    )
  }

  const parsedRows = rows
    .slice(headerRowIndex + 1)
    .map((row, index) => {
      const hasContent = row.some(cell => String(cell ?? '').trim() !== '')
      if (!hasContent) return null
      return parseRow(row, headerMap, headerRowIndex + index + 2)
    })
    .filter(Boolean)

  if (parsedRows.length === 0) {
    throw new Error('No client rows found in the file.')
  }

  return {
    sheetName,
    format: headerMap.registration == null ? 'preliminary_renewals' : 'full',
    rows: parsedRows,
    validCount: parsedRows.filter(row => row.valid).length,
    invalidCount: parsedRows.filter(row => !row.valid).length,
  }
}

export function buildClientImportTemplate() {
  const headers = [
    'INSURED',
    'CONTACTS',
    'COVER TYPE',
    'FROM',
    'Renewal 1',
    'Renewal 2',
    'Renewal 3',
    'Renewal 4',
    'Annual Renewal',
    'Total Premium',
    'Payment 1',
    'Payment 2',
    'Payment 3',
    'Payment 4',
    'Bal.',
    'Comment',
  ]

  const example = [
    'James Mwangi',
    '0722111222',
    'Comprehensive',
    '2025-09-01',
    '2025-10-01',
    '2025-11-01',
    '2025-12-01',
    '2026-01-01',
    '2026-09-01',
    48500,
    15000,
    11250,
    11250,
    11000,
    0,
    'APA — KDA 123A Toyota Axio',
  ]

  const sheet = XLSX.utils.aoa_to_sheet([['Preliminary renewals'], headers, example])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Preliminary renewals')
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
}

export function downloadClientImportTemplate() {
  const buffer = buildClientImportTemplate()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'preliminary-renewals-template.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}
