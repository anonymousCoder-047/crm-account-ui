import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ServerError() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500/10 via-card to-orange-500/10 p-4">
      {/* Background decorative shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-500/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-orange-500/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-red-500/30 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-500/15 p-4">
                <AlertTriangle className="h-12 w-12 text-red-400" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-red-200">500</CardTitle>
            <p className="text-lg text-muted-foreground mt-2">Server Error</p>
            <p className="text-sm text-muted-foreground mt-1">
              Something went wrong on our end. Please try again later.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleRefresh}
                className="w-full rounded-lg"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              <Link to="/">
                <Button variant="outline" className="w-full rounded-lg">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

