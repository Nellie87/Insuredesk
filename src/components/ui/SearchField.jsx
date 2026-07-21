export default function SearchField({ label, placeholder, value, onChange }) {
  return (
    <div>
      {label && (
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </div>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          ⌕
        </span>
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  )
}
