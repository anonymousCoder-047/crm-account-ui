import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500/10 via-card to-orange-500/10 p-4">
      <Card className="w-full max-w-md border-red-500/30 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-500/15 p-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-200">Something went wrong</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            We're sorry, but something unexpected happened.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs font-mono text-red-300 break-all">
                {error.message || error.toString()}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-300 cursor-pointer">Stack trace</summary>
                  <pre className="text-xs text-red-400 mt-2 overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={resetErrorBoundary}
              className="w-full rounded-lg"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full rounded-lg"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

