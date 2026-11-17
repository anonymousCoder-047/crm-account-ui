import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })

    // You can log the error to an error reporting service here
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onReset: () => void
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
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
                {error.toString()}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={onReset}
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

export default ErrorBoundary

