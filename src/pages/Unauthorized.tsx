import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Lock, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Logo from '@/components/Logo'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500/10 via-card to-green-500/10 p-4">
      {/* Background decorative shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-500/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-green-500/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-secondary/20 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <Logo size="md" />
            </div>
            <CardTitle className="text-4xl font-bold text-secondary">403</CardTitle>
            <p className="text-lg text-muted-foreground mt-2">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have permission to access this resource.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <Link to="/">
                <Button className="w-full rounded-lg">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full rounded-lg"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

