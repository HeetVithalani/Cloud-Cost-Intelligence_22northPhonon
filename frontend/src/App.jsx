import { useContext } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AppContextProvider, AppContext } from './context/AppContext'
import { AuthContextProvider, AuthContext } from './context/AuthContext'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'

import LoginPage from './pages/LoginPage'
import OverviewPage from './pages/OverviewPage'
import ResourcesPage from './pages/ResourcesPage'
import IAMRolesPage from './pages/IAMRolesPage'
import CostFinOpsPage from './pages/CostFinOpsPage'
import CloudWatchPage from './pages/CloudWatchPage'
import TrustedAdvisorPage from './pages/TrustedAdvisorPage'
import AlertsPage from './pages/AlertsPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/admin/UsersPage'
import LogsPage from './pages/admin/LogsPage'
import InfrastructurePage from './pages/InfrastructurePage'
import SavingsPage from './pages/SavingsPage'

import RoleBasedCostingPage from './pages/RoleBasedCostingPage'
import UserBasedCostingPage from './pages/UserBasedCostingPage'
import ApiBasedCostingPage from './pages/ApiBasedCostingPage'

function AppShell() {
  const { isAuthenticated } = useContext(AuthContext)
  const { sidebarCollapsed } = useContext(AppContext)
  const location = useLocation()

  if (!isAuthenticated && location.pathname !== '/login') return <LoginPage />
  if (location.pathname === '/login') return <LoginPage />

  return (
    <div className="app-shell">
      <Sidebar />
      <Header />
      <main className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/iam" element={<IAMRolesPage />} />
          <Route path="/cost" element={<CostFinOpsPage />} />
          <Route path="/cloudwatch" element={<CloudWatchPage />} />
          <Route path="/advisor" element={<TrustedAdvisorPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/infrastructure" element={<InfrastructurePage />} />
          <Route path="/savings" element={<SavingsPage />} />

          <Route path="/role-costing" element={<RoleBasedCostingPage />} />
          <Route path="/user-costing" element={<UserBasedCostingPage />} />
          <Route path="/api-costing" element={<ApiBasedCostingPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/logs" element={<LogsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30000 } }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        <AuthContextProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </AuthContextProvider>
      </AppContextProvider>
    </QueryClientProvider>
  )
}
