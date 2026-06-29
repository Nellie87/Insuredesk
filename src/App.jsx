import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/appStore'

// Pages
import LoginPage       from './pages/LoginPage'
import DashboardPage   from './pages/DashboardPage'
import ClientsPage     from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import AddClientPage   from './pages/AddClientPage'
import CalculatorPage  from './pages/CalculatorPage'
import PaymentsPage    from './pages/PaymentsPage'
import RemindersPage   from './pages/RemindersPage'
import CommissionsPage from './pages/CommissionsPage'
import SettingsPage    from './pages/SettingsPage'
import ProspectsPage from './pages/ProspectsPage'

// Layout
import AppLayout from './components/layout/AppLayout'

function ProtectedRoute({ children }) {
  const { session, authLoading } = useAppStore()
  if (authLoading) return <SplashScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function SplashScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-900">
      <div className="text-center text-white">
        <div className="text-3xl font-bold mb-2">InsureAgent</div>
        <div className="text-primary-200 text-sm">Loading...</div>
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
