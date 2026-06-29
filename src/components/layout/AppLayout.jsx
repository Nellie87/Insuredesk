import { Outlet, NavLink, Link } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Home',      icon: '⌂' },
  { to: '/clients',     label: 'Portfolio', icon: '◫' },
  { to: '/payments',    label: 'Pay',       icon: '₵' },
  { to: '/reminders',   label: 'Calendar',  icon: '◷' },
  { to: '/settings',    label: 'More',      icon: '⋯' },
]

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'IA'
}

export default function AppLayout() {
  const { isOnline, isSyncing, agent } = useAppStore()

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-lg mx-auto relative">

      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button
          type="button"
          className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 text-lg leading-none"
          aria-label="Menu"
        >
          ≡
        </button>

        <div className="text-center">
          <div className="text-base font-bold text-primary-900 tracking-tight">Agent Workspace</div>
          {isSyncing && (
            <div className="text-[10px] text-primary-600 animate-pulse">Syncing...</div>
          )}
        </div>

        <div
          className="w-9 h-9 rounded-full bg-primary-100 text-primary-800 text-xs font-bold flex items-center justify-center border border-primary-200"
          title={agent?.name ?? 'Agent'}
        >
          {getInitials(agent?.name)}
        </div>
      </header>

      {!isOnline && (
        <div className="bg-warning-50 border-b border-warning-500 px-4 py-2 text-xs text-warning-700 text-center">
          You're offline. Changes will sync when you reconnect.
        </div>
      )}

      <main className="flex-1 overflow-auto pb-24">
        <Outlet />
      </main>

      <Link
        to="/clients/add"
        className="fixed bottom-20 right-4 z-20 w-14 h-14 rounded-2xl bg-primary-800 text-white text-3xl font-light shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Add client"
      >
        +
      </Link>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 flex z-10 safe-bottom">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 gap-1 transition-colors ${
                isActive ? 'text-primary-800' : 'text-gray-400'
              }`
            }
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-[10px] font-semibold tracking-wider uppercase">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
