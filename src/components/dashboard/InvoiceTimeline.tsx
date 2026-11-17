import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, ArrowRight, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { SalesInvoiceAPI, PurchaseInvoiceAPI, type SalesInvoice, type PurchaseInvoice } from '@/services/api'
import { calculateSalesInvoiceTotal, calculatePurchaseInvoiceTotal } from '@/utils/invoiceCalculations'
import dayjs from 'dayjs'

interface TimelineInvoice {
  _id: string
  type: 'sales' | 'purchase'
  number: string
  date: string
  status: 'paid' | 'unpaid'
  amount: number
  createdAt: string
}

const INITIAL_DISPLAY_COUNT = 5

export default function InvoiceTimeline() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<TimelineInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [salesRes, purchaseRes] = await Promise.all([
          SalesInvoiceAPI.list(),
          PurchaseInvoiceAPI.list(),
        ])

        const salesInvoices: SalesInvoice[] = salesRes.data.data || []
        const purchaseInvoices: PurchaseInvoice[] = purchaseRes.data.data || []

        // Combine and sort by creation date (most recent first)
        const allInvoices: TimelineInvoice[] = [
          ...salesInvoices.map(inv => ({
            _id: inv._id,
            type: 'sales' as const,
            number: inv.invoiceNumber,
            date: inv.date,
            status: inv.status,
            amount: calculateSalesInvoiceTotal(inv),
            createdAt: inv.createdAt,
          })),
          ...purchaseInvoices.map(inv => ({
            _id: inv._id,
            type: 'purchase' as const,
            number: inv.supplierNumber,
            date: inv.date,
            status: inv.status,
            amount: calculatePurchaseInvoiceTotal(inv),
            createdAt: inv.createdAt,
          })),
        ].sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix())

        setInvoices(allInvoices)
      } catch (error) {
        console.error('Error fetching invoice timeline:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleView = (invoice: TimelineInvoice) => {
    if (invoice.type === 'sales') {
      navigate(`/sales-invoices/view/${invoice._id}`)
    } else {
      navigate(`/purchase-invoices/view/${invoice._id}`)
    }
  }

  const displayedInvoices = showAll ? invoices : invoices.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMore = invoices.length > INITIAL_DISPLAY_COUNT

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <div className="h-6 bg-muted animate-pulse rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Invoice Timeline</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/sales-invoices')}
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
            
            <div className="space-y-6">
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p>No invoices found</p>
                </div>
              ) : (
                <>
                  {displayedInvoices.map((invoice, index) => (
                    <div key={invoice._id} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          invoice.status === 'paid' ? 'bg-green-500/15' : 'bg-yellow-500/15'
                        }`}>
                          {invoice.status === 'paid' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                invoice.type === 'sales' 
                                  ? 'bg-blue-500/15 text-blue-300' 
                                  : 'bg-purple-500/15 text-purple-300'
                              }`}>
                                {invoice.type === 'sales' ? 'SALES' : 'PURCHASE'}
                              </span>
                              <span className="font-medium text-foreground">{invoice.number}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {dayjs(invoice.date).format('MMM DD, YYYY')}
                            </div>
                            <div className="text-lg font-semibold text-foreground">
                              AED {invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(invoice)}
                            className="ml-4"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowAll(!showAll)}
                      >
                        {showAll ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Show More ({invoices.length - INITIAL_DISPLAY_COUNT} more)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

