const STYLES = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  overdue: 'border-red-200 bg-danger-50 text-danger-700',
  expiring_soon: 'border-amber-200 bg-warning-50 text-warning-700',
  fully_paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  lapsed: 'border-slate-200 bg-slate-100 text-slate-500',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  due: 'border-amber-200 bg-warning-50 text-warning-700',
  pending: 'border-slate-200 bg-slate-100 text-slate-600',
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
      className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
        STYLES[status] ?? 'border-slate-200 bg-slate-100 text-slate-500'
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  )
}
