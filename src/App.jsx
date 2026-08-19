import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/appStore'

// Pages
import LoginPage       from './pages/LoginPage'
import DashboardPage   from './pages/DashboardPage'
import ClientsPage     from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import AddClientPage   from './pages/AddClientPage'
import ImportClientsPage from './pages/ImportClientsPage'
import CalculatorPage  from './pages/CalculatorPage'
import PaymentsPage    from './pages/PaymentsPage'
import RemindersPage   from './pages/RemindersPage'
import CommissionsPage from './pages/CommissionsPage'
import SettingsPage    from './pages/SettingsPage'
import ProspectsPage from './pages/ProspectsPage'

// Layout
import AppLayout from './components/layout/AppLayout'
import Toaster from './components/ui/Toaster'

function ProtectedRoute({ children }) {
  const { session, authLoading } = useAppStore()
  if (authLoading) return <SplashScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas bg-login-atmosphere">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-step-active text-sm font-semibold text-white shadow-soft">
          IA
        </div>
        <div className="mb-1 font-display text-2xl text-ink">
          InsureAgent
        </div>
        <div className="text-sm font-medium text-ink-muted">Loading...</div>
      </div>
    </div>
  )
}

export default function App() {
  const init = useAppStore(s => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"           element={<DashboardPage />} />
          <Route path="prospects"           element={<ProspectsPage />} />
          <Route path="clients"             element={<ClientsPage />} />
          <Route path="clients/add"         element={<AddClientPage />} />
          <Route path="clients/import"      element={<ImportClientsPage />} />
          <Route path="clients/:clientId"   element={<ClientDetailPage />} />
          <Route path="calculator"          element={<CalculatorPage />} />
          <Route path="payments"            element={<PaymentsPage />} />
          <Route path="reminders"           element={<RemindersPage />} />
          <Route path="commissions"         element={<CommissionsPage />} />
          <Route path="settings"            element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
