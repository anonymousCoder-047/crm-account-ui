import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Unauthorized from '@/pages/Unauthorized'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'superadmin' | 'admin' | 'user' | 'manager'
  allowedRoles?: ('superadmin' | 'admin' | 'user' | 'manager')[]
}

export default function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Superadmin has access to all routes
  if (user?.role === 'superadmin') {
    return <>{children}</>
  }

  // Check role-based access
  if (requiredRole && user?.role !== requiredRole) {
    return <Unauthorized />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as any)) {
    return <Unauthorized />
  }

  return <>{children}</>
}

