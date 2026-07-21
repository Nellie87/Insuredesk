export default function KpiCard({ label, value, accent, badge }) {
  const accents = {
    navy: 'text-primary-900',
    green: 'text-success-700',
    amber: 'text-warning-700',
    red: 'text-danger-700',
    brown: 'text-amber-800',
  }

  return (
    <div className="min-w-[160px] flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-card">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div
          className={`break-words text-xl font-black leading-tight tracking-tight ${
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
