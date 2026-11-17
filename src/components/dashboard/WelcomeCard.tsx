import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play, Folder } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { SalesInvoiceAPI, type SalesInvoice } from '@/services/api'

export default function WelcomeCard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [unpaidCount, setUnpaidCount] = useState(0)

  useEffect(() => {
    const fetchUnpaidInvoices = async () => {
      try {
        const res = await SalesInvoiceAPI.list({ status: 'unpaid' })
        const invoices: SalesInvoice[] = res.data.data || []
        setUnpaidCount(invoices.length)
      } catch (error) {
        console.error('Error fetching unpaid invoices:', error)
      }
    }

    fetchUnpaidInvoices()
  }, [])

  const userName = user?.name || user?.email?.split('@')[0] || 'User'

  return (
    <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-500/15 border-blue-500/30">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-200/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-300/20 blur-xl" />
          
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Welcome back, {userName}!
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {unpaidCount > 0 
                    ? `You have ${unpaidCount} unpaid invoice${unpaidCount > 1 ? 's' : ''} to review.`
                    : 'All invoices are up to date.'}
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-card text-foreground hover:bg-muted/50 shadow-sm"
                  onClick={() => navigate('/sales-invoices')}
                >
                  <Play className="h-4 w-4 mr-2" />
                  View Invoices
                </Button>
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="ml-4"
              >
                <div className="h-16 w-16 rounded-lg bg-blue-500/100 flex items-center justify-center shadow-lg">
                  <Folder className="h-8 w-8 text-white" />
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
  )
}

