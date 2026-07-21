import { Outlet, NavLink, Link } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: '⌂' },
  { to: '/clients', label: 'Portfolio', icon: '◫' },
  { to: '/payments', label: 'Pay', icon: '₵' },
  { to: '/reminders', label: 'Calendar', icon: '◷' },
  { to: '/settings', label: 'More', icon: '⋯' },
]

function getInitials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'IA'
  )
}

export default function AppLayout() {
  const { isOnline, isSyncing, agent } = useAppStore()

  return (
    <div className="relative mx-auto flex min-h-screen max-w-lg flex-col bg-slate-100">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg leading-none text-slate-500"
          aria-label="Menu"
        >
          ≡
        </button>

        <div className="text-center">
          <div className="text-base font-bold tracking-tight text-primary-900">
            Agent Workspace
          </div>
          {isSyncing && (
            <div className="animate-pulse text-[10px] text-primary-600">
              Syncing...
            </div>
          )}
        </div>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-200 bg-primary-100 text-xs font-bold text-primary-800"
          title={agent?.name ?? 'Agent'}
        >
          {getInitials(agent?.name)}
        </div>
      </header>

      {!isOnline && (
        <div className="border-b border-warning-500 bg-warning-50 px-4 py-2 text-center text-xs text-warning-700">
          You're offline. Changes will sync when you reconnect.
        </div>
      )}

      <main className="flex-1 overflow-auto pb-24">
        <Outlet />
      </main>

      <Link
        to="/clients/add"
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-800 text-3xl font-light text-white shadow-lg transition-transform active:scale-95"
        aria-label="Add client"
      >
        +
      </Link>

      <nav className="safe-bottom fixed bottom-0 left-1/2 z-10 flex w-full max-w-lg -translate-x-1/2 border-t border-slate-200 bg-white">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                isActive ? 'text-primary-800' : 'text-slate-400'
              }`
            }
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
