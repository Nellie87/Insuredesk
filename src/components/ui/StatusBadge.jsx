const STYLES = {
  active: 'bg-success-50 text-success-700',
  overdue: 'bg-danger-50 text-danger-700',
  expiring_soon: 'bg-warning-50 text-warning-700',
  fully_paid: 'bg-success-50 text-success-700',
  lapsed: 'bg-stone-100 text-ink-muted',
  paid: 'bg-success-50 text-success-700',
  due: 'bg-warning-50 text-warning-700',
  pending: 'bg-stone-100 text-ink-muted',
}

const LABELS = {
  active: 'Active',
  overdue: 'Overdue',
  expiring_soon: 'Due',
  fully_paid: 'Paid',
  lapsed: 'Lapsed',
  paid: 'Paid',
  due: 'Due',
  pending: 'Pending',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-2xs font-medium ${
        STYLES[status] ?? 'bg-stone-100 text-ink-muted'
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  )
}
