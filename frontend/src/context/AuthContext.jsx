import { createContext, useState } from 'react'
import apiClient from '../api/client'

export const AuthContext = createContext()

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cloudsense_user')) }
    catch { return null }
  })

  // NOTE: baseURL is already "/api" in client.js.
  // All paths here must NOT include "/api" prefix — just the route suffix.
  const login = async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password })
    if (data.success) {
      localStorage.setItem('cloudsense_user', JSON.stringify(data.data.user))
      setUser(data.data.user)
    }
    return data
  }

  const register = async (name, email, password, confirmPassword) => {
    const { data } = await apiClient.post('/auth/register', { name, email, password, confirmPassword })
    if (data.success) {
      localStorage.setItem('cloudsense_user', JSON.stringify(data.data.user))
      setUser(data.data.user)
    }
    return data
  }

  const logout = async () => {
    try { await apiClient.post('/auth/logout') } catch {}
    localStorage.removeItem('cloudsense_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}
