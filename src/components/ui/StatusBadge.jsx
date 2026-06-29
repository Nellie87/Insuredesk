const STYLES = {
  active:        'bg-success-50 text-success-700',
  overdue:       'bg-danger-50 text-danger-700',
  expiring_soon: 'bg-warning-50 text-warning-700',
  fully_paid:    'bg-success-50 text-success-700',
  lapsed:        'bg-gray-100 text-gray-500',
  paid:          'bg-success-50 text-success-700',
  due:           'bg-warning-50 text-warning-700',
  pending:       'bg-gray-100 text-gray-600',
}

const LABELS = {
  active:        'Active',
  overdue:       'Overdue',
  expiring_soon: 'Due',
  fully_paid:    'Paid',
  lapsed:        'Lapsed',
  paid:          'Paid',
  due:           'Due',
  pending:       'Pending',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full ${STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
