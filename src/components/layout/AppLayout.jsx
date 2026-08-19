import { useEffect, useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import {
  HomeIcon,
  ClientsIcon,
  PaymentsIcon,
  CalendarIcon,
  ProspectsIcon,
  CalculatorIcon,
  CommissionsIcon,
  SettingsIcon,
  MoreIcon,
  PlusIcon,
  ChevronLeftIcon,
  CloseIcon,
} from '../icons/NavIcons'

const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Home', icon: HomeIcon, end: true },
  { to: '/clients', label: 'Clients', icon: ClientsIcon },
  { to: '/payments', label: 'Payments', icon: PaymentsIcon },
  { to: '/reminders', label: 'Calendar', icon: CalendarIcon },
]

const MORE_NAV = [
  {
    to: '/prospects',
    label: 'Prospects',
    hint: 'Leads, quotes, follow-ups',
    icon: ProspectsIcon,
  },
  {
    to: '/calculator',
    label: 'Calculator',
    hint: 'Premium and installments',
    icon: CalculatorIcon,
  },
  {
    to: '/commissions',
    label: 'Commissions',
    hint: 'Earnings overview',
    icon: CommissionsIcon,
  },
  {
    to: '/settings',
    label: 'Settings',
    hint: 'Profile, sync, notifications',
    icon: SettingsIcon,
  },
]

const PAGE_META = {
  '/dashboard': { title: 'Home' },
  '/clients': { title: 'Clients' },
  '/clients/add': { title: 'Add client', backTo: '/clients' },
  '/clients/import': { title: 'Import clients', backTo: '/clients' },
  '/payments': { title: 'Payments' },
  '/reminders': { title: 'Calendar' },
  '/prospects': { title: 'Prospects' },
  '/calculator': { title: 'Calculator' },
  '/commissions': { title: 'Commissions' },
  '/settings': { title: 'Settings' },
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

function getPageMeta(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname]
  if (pathname.startsWith('/clients/')) {
    return { title: 'Client', backTo: '/clients' }
  }
  return { title: 'InsureAgent' }
}

function isMoreRoute(pathname) {
  return MORE_NAV.some(
    item => pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
}

function sidebarLinkClass({ isActive }) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-step-active text-white shadow-soft'
      : 'text-slate-600 hover:bg-primary-50 hover:text-primary-800'
  }`
}

export default function AppLayout() {
  const { isOnline, isSyncing, agent } = useAppStore()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const page = getPageMeta(location.pathname)
  const moreActive = isMoreRoute(location.pathname)
  const isHome = location.pathname === '/dashboard'

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!moreOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = event => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  return (
    <div className="app-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-md lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-step-active text-sm font-semibold text-white shadow-soft">
            IA
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] text-ink">
              InsureAgent
            </div>
            <div className="truncate text-2xs font-medium text-ink-faint">
              Agent workspace
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={sidebarLinkClass}>
              <Icon className="h-5 w-5 shrink-0 opacity-90" />
              {label}
            </NavLink>
          ))}

          <div className="my-3 h-px bg-slate-200/80" />

          {MORE_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={sidebarLinkClass}>
              <Icon className="h-5 w-5 shrink-0 opacity-90" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200/80 p-3">
          <Link
            to="/clients/add"
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4" />
            Add client
          </Link>

          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-canvas/60 px-3 py-2.5 transition hover:border-primary-200 hover:bg-primary-50/60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              {getInitials(agent?.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {agent?.name ?? 'Agent'}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {isSyncing ? 'Syncing…' : isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="safe-top sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-4 lg:h-16 lg:px-8">
            {page.backTo ? (
              <Link
                to={page.backTo}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 lg:hidden"
                aria-label="Go back"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </Link>
            ) : null}

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-[1.05rem] text-ink lg:text-xl">
                {isHome ? (
                  <>
                    <span className="lg:hidden">InsureAgent</span>
                    <span className="hidden lg:inline">Home</span>
                  </>
                ) : (
                  page.title
                )}
              </h1>
              {isSyncing && (
                <p className="truncate text-[11px] font-medium text-primary-600 lg:hidden">
                  Syncing...
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isSyncing && (
                <span className="hidden animate-pulse text-xs font-semibold text-primary-600 lg:inline">
                  Syncing...
                </span>
              )}
              <span
                className={`hidden rounded-lg px-2.5 py-1 text-[11px] font-semibold lg:inline ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {isOnline ? 'Online' : 'Offline'}
              </span>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 lg:hidden"
                aria-label="Open menu"
              >
                {getInitials(agent?.name)}
              </button>
            </div>
          </div>
        </header>

        {!isOnline && (
          <div className="border-b border-warning-500/40 bg-warning-50 px-4 py-2 text-center text-xs font-medium text-warning-700 sm:px-6 lg:px-8">
            You're offline. Changes will sync when you reconnect.
          </div>
        )}

        <main className="flex-1 overflow-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>

        <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg">
            {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-2xs font-medium transition-colors ${
                    isActive ? 'text-primary-600' : 'text-slate-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        isActive ? 'bg-primary-50' : ''
                      }`}
                    >
                      <Icon className="h-[1.15rem] w-[1.15rem]" />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-2xs font-medium transition-colors ${
                moreActive || moreOpen ? 'text-primary-600' : 'text-slate-400'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  moreActive || moreOpen ? 'bg-primary-50' : ''
                }`}
              >
                <MoreIcon className="h-[1.15rem] w-[1.15rem]" />
              </span>
              More
            </button>
          </div>
        </nav>
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More"
            className="sheet-up absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-panel"
          >
            <div className="sticky top-0 flex items-center justify-between bg-white px-5 pb-2 pt-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 pt-1">
              <p className="px-1 font-display text-xl text-ink">
                Menu
              </p>
              <p className="mt-0.5 px-1 text-sm text-ink-muted">
                Jump to tools and your account
              </p>

              <Link
                to="/clients/add"
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-soft"
              >
                <PlusIcon className="h-4 w-4" />
                Add client
              </Link>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80">
                {MORE_NAV.map(({ to, label, hint, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 last:border-b-0 ${
                        isActive ? 'bg-primary-50' : 'bg-white active:bg-slate-50'
                      }`
                    }
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">
                        {label}
                      </span>
                      <span className="block text-xs text-slate-500">{hint}</span>
                    </span>
                  </NavLink>
                ))}
              </div>

              <Link
                to="/settings"
                className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                  {getInitials(agent?.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {agent?.name ?? 'Agent'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isSyncing ? 'Syncing…' : isOnline ? 'Online' : 'Offline'} · Settings
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
