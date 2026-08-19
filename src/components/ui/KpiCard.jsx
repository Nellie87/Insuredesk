import { Link } from 'react-router-dom'

export default function KpiCard({
  label,
  value,
  accent,
  badge,
  to,
  className = '',
}) {
  const accents = {
    navy: 'text-primary-800',
    green: 'text-success-700',
    amber: 'text-warning-700',
    red: 'text-danger-700',
    brown: 'text-warning-700',
  }

  const body = (
    <>
      <div className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-muted">
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div
          className={`break-words font-sans text-lg font-semibold leading-tight sm:text-xl xl:text-2xl ${
            accents[accent] ?? accents.navy
          }`}
        >
          {value}
        </div>
        {badge}
      </div>
    </>
  )

  const classes = `min-w-0 rounded-2xl border border-stone-200/80 bg-white/90 p-3.5 shadow-card backdrop-blur-sm sm:p-5 ${className}`

  if (to) {
    return (
      <Link
        to={to}
        className={`${classes} block transition hover:border-primary-200 hover:bg-primary-50/50 active:scale-[0.99]`}
      >
        {body}
      </Link>
    )
  }

  return <div className={classes}>{body}</div>
}
