const STYLES = {
  active: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-danger-700',
  expiring_soon: 'bg-amber-50 text-warning-700',
  fully_paid: 'bg-emerald-50 text-emerald-700',
  lapsed: 'bg-slate-100 text-slate-500',
  paid: 'bg-emerald-50 text-emerald-700',
  due: 'bg-amber-50 text-warning-700',
  pending: 'bg-slate-100 text-slate-600',
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
      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
        STYLES[status] ?? 'bg-slate-100 text-slate-500'
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  )
}
