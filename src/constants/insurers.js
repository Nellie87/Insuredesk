/** Common Kenyan motor / general insurers for form dropdowns. */
export const INSURERS = [
  'APA',
  'Britam',
  'CIC',
  'Jubilee',
  'UAP Old Mutual',
  'ICEA LION',
  'Madison',
  'Sanlam',
  'Heritage',
  'Directline',
  'Fidelity',
  'AAR',
 
]

export const INSURER_OPTIONS = [
  { value: '', label: 'Select insurer' },
  ...INSURERS.map(name => ({ value: name, label: name })),
  { value: 'Other', label: 'Other' },
]
