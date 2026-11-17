import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios, { AxiosError } from 'axios'
import { handleApiError } from '@/utils/errorHandler'

interface User {
  id: string
  email: string
  name: string
  role: 'superadmin' | 'admin' | 'user' | 'manager'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Setup axios interceptors
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const appError = handleApiError(error)

        // Handle 401 - Unauthorized
        if (appError.statusCode === 401) {
          localStorage.removeItem('token')
          delete axios.defaults.headers.common['Authorization']
          setUser(null)
          // Don't redirect if already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }

        return Promise.reject(appError)
      }
    )

    // Check if user is logged in on mount
    const token = localStorage.getItem('token')
    if (token) {
      // Validate token and get user info
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      axios
        .get('/api/auth/me')
        .then((response) => {
          setUser(response.data.user)
        })
        .catch(() => {
          localStorage.removeItem('token')
          delete axios.defaults.headers.common['Authorization']
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }

    // Cleanup interceptors
    return () => {
      axios.interceptors.request.eject(requestInterceptor)
      axios.interceptors.response.eject(responseInterceptor)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      const { token, user: userData } = response.data

      // Store encrypted token
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(userData)
    } catch (error: any) {
      const appError = handleApiError(error)
      throw appError
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

