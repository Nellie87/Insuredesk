import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'

const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '⌂', short: 'Home' },
  { to: '/clients', label: 'Portfolio', icon: '◫', short: 'Portfolio' },
  { to: '/payments', label: 'Payments', icon: '₵', short: 'Pay' },
  { to: '/reminders', label: 'Calendar', icon: '◷', short: 'Calendar' },
]

const SECONDARY_NAV = [
  { to: '/prospects', label: 'Prospects', icon: '◎' },
  { to: '/calculator', label: 'Calculator', icon: '⌗' },
  { to: '/commissions', label: 'Commissions', icon: '٪' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

const MOBILE_NAV = [
  ...PRIMARY_NAV,
  { to: '/settings', label: 'More', icon: '⋯', short: 'More' },
]

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/clients': 'Portfolio',
  '/clients/add': 'Add client',
  '/clients/import': 'Import clients',
  '/payments': 'Payments',
  '/reminders': 'Calendar',
  '/prospects': 'Prospects',
  '/calculator': 'Calculator',
  '/commissions': 'Commissions',
  '/settings': 'Settings',
}

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

function navClass({ isActive }) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-primary-800 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`
}

function mobileNavClass({ isActive }) {
  return `flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
    isActive ? 'text-primary-800' : 'text-slate-400'
  }`
}

export default function AppLayout() {
  const { isOnline, isSyncing, agent } = useAppStore()
  const location = useLocation()

  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/clients/') ? 'Client detail' : 'InsureAgent')

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-800 text-sm font-black text-white">
            IA
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black tracking-tight text-primary-900">
              InsureAgent
            </div>
            <div className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
              Agent workspace
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <p className="mb-1 px-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Main
          </p>
          {PRIMARY_NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={navClass}>
              <span className="w-5 text-center text-base leading-none">{icon}</span>
              {label}
            </NavLink>
          ))}

          <p className="mb-1 mt-4 px-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Tools
          </p>
          {SECONDARY_NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={navClass}>
              <span className="w-5 text-center text-base leading-none">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <Link
            to="/clients/add"
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-800 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700"
          >
            <span className="text-lg leading-none">+</span>
            Add client
          </Link>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-primary-100 text-xs font-bold text-primary-800">
              {getInitials(agent?.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                {agent?.name ?? 'Agent'}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {isSyncing ? 'Syncing…' : isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight text-primary-900">
              InsureAgent
            </div>
            {isSyncing && (
              <div className="animate-pulse text-xs text-primary-600">
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

        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur lg:flex">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-950">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isSyncing && (
              <span className="animate-pulse text-xs font-semibold text-primary-600">
                Syncing...
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </header>

        {!isOnline && (
          <div className="border-b border-warning-500 bg-warning-50 px-4 py-2 text-center text-xs text-warning-700 sm:px-6 lg:px-8">
            You're offline. Changes will sync when you reconnect.
          </div>
        )}

        <main className="flex-1 overflow-auto pb-24 lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile FAB */}
        <Link
          to="/clients/add"
          className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-800 text-3xl font-light text-white shadow-lg transition-transform active:scale-95 lg:hidden"
          aria-label="Add client"
        >
          +
        </Link>

        {/* Mobile bottom nav */}
        <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-10 flex border-t border-slate-200 bg-white lg:hidden">
          {MOBILE_NAV.map(({ to, short, icon }) => (
            <NavLink key={to} to={to} className={mobileNavClass}>
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                {short}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
