export default function SearchField({ label, placeholder, value, onChange }) {
  return (
    <div>
      {label && (
        <div className="mb-2 text-sm font-medium text-slate-600">{label}</div>
      )}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-soft transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
        />
      </div>
    </div>
  )
}
