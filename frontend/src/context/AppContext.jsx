import { createContext, useState, useEffect } from 'react'

export const AppContext = createContext()

export function AppContextProvider({ children }) {
  const [region, setRegion] = useState('us-east-1')
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [alertCount, setAlertCount] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Theme: 'dark' | 'light'
  const [theme, setTheme] = useState(() => localStorage.getItem('cloudsense_theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cloudsense_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const toggleSidebar = () => setSidebarCollapsed(c => !c)

  return (
    <AppContext.Provider value={{
      region, setRegion, refreshInterval, setRefreshInterval,
      alertCount, setAlertCount,
      sidebarCollapsed, toggleSidebar,
      theme, toggleTheme,
    }}>
      {children}
    </AppContext.Provider>
  )
}
