export default function KpiCard({ label, value, accent, badge }) {
  const accents = {
    navy:   'text-primary-900',
    green:  'text-success-700',
    amber:  'text-warning-700',
    red:    'text-danger-700',
    brown:  'text-amber-800',
  }

  return (
    <div className="min-w-[160px] flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-4 shadow-card">
      <div className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
        {label}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className={`text-2xl font-bold leading-tight ${accents[accent] ?? accents.navy}`}>
          {value}
        </div>
        {badge}
      </div>
    </div>
  )
}
