import { useId } from 'react'

export default function BrandMark({ className = 'h-9 w-9', title }) {
  const rawId = useId()
  const gradientId = `wp-bg-${rawId.replace(/:/g, '')}`

  return (
    <svg
      viewBox="0 0 512 512"
      className={`shrink-0 overflow-hidden rounded-xl shadow-soft ${className}`}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d8077" />
          <stop offset="100%" stopColor="#234640" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill={`url(#${gradientId})`} />
      <g
        fill="none"
        stroke="#ffffff"
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M108 156L156 356L204 156L252 356L300 156" />
        <path d="M348 156V356" />
        <path d="M348 156C416 156 416 262 348 262" />
      </g>
    </svg>
  )
}
