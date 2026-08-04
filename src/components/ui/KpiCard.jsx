export default function KpiCard({ label, value, accent, badge, className = '' }) {
  const accents = {
    navy: 'text-primary-800',
    green: 'text-success-700',
    amber: 'text-warning-700',
    red: 'text-danger-700',
    brown: 'text-amber-800',
  }

  return (
    <div
      className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-card backdrop-blur-sm sm:p-5 ${className}`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div
          className={`break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${
            accents[accent] ?? accents.navy
          }`}
        >
          {value}
        </div>
        {badge}
      </div>
    </div>
  )
}
