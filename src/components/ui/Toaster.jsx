import { useToastStore } from '../../store/toastStore'

const STYLES = {
  success: 'bg-primary-700 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-slate-800 text-white',
}

export default function Toaster() {
  const toasts = useToastStore(s => s.toasts)
  const dismissToast = useToastStore(s => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed top-4 left-1/2 z-[100] w-full max-w-sm -translate-x-1/2 space-y-2 px-4 lg:left-auto lg:right-6 lg:translate-x-0"
      aria-live="polite"
    >
      {toasts.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismissToast(item.id)}
          className={`pointer-events-auto w-full rounded-xl px-4 py-3 text-left text-sm font-medium shadow-panel ${
            STYLES[item.type] ?? STYLES.info
          }`}
        >
          {item.message}
        </button>
      ))}
    </div>
  )
}
