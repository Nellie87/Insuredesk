import { SELECT } from '../../constants/formStyles'

const SIZES = {
  md: SELECT,
  sm: 'cursor-pointer appearance-none bg-none rounded-lg border border-stone-200 bg-white py-1 pl-2.5 pr-8 text-xs font-semibold text-ink transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
}

function Chevron({ className }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function Select({
  className = '',
  size = 'md',
  value,
  disabled,
  ...props
}) {
  const empty = value === '' || value == null
  const compact = size === 'sm'

  return (
    <div className={`relative ${compact ? 'inline-block max-w-full' : ''} ${className}`}>
      <select
        {...props}
        value={value}
        disabled={disabled}
        className={`${SIZES[size] || SIZES.md} ${empty ? 'text-ink-faint' : ''}`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 flex items-center ${
          compact ? 'right-2' : 'right-3.5'
        } ${disabled ? 'text-ink-faint/70' : 'text-ink-faint'}`}
      >
        <Chevron className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </span>
    </div>
  )
}
