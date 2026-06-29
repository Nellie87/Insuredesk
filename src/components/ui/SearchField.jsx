export default function SearchField({ label, placeholder, value, onChange }) {
  return (
    <div>
      {label && (
        <div className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase mb-2">
          {label}
        </div>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full bg-gray-100 border border-transparent rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white focus:border-primary-200"
        />
      </div>
    </div>
  )
}
