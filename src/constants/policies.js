export const POLICY_TYPES = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'third_party', label: 'Third Party' },
  { value: 'third_party_fire_theft', label: 'Third Party Fire & Theft' },
]

export const POLICY_LABELS = Object.fromEntries(
  POLICY_TYPES.map(type => [type.value, type.label]),
)

export const USE_TYPES = [
  { value: 'private', label: 'Private' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'psv', label: 'PSV' },
]

export const USE_LABELS = Object.fromEntries(
  USE_TYPES.map(type => [type.value, type.label]),
)
