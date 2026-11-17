import { ReactNode, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorFallback from './ErrorFallback'

interface SafeRouteProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: { componentStack: string }) => void
}

export default function SafeRoute({ children, fallback, onError }: SafeRouteProps) {
  const defaultFallback = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  )

  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    console.error('SafeRoute caught an error:', error, errorInfo)
    if (onError) {
      onError(error, errorInfo)
    }
    // You can log to error reporting service here
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Reset app state if needed
        window.location.href = '/'
      }}
    >
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

