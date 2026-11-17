import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, FileText, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { SalesInvoiceAPI, PurchaseInvoiceAPI, type SalesInvoice, type PurchaseInvoice } from '@/services/api'
import { calculateSalesInvoiceTotal, calculatePurchaseInvoiceTotal } from '@/utils/invoiceCalculations'
import dayjs from 'dayjs'
import { Tag } from 'antd'

const INITIAL_DISPLAY_COUNT = 5

export default function RecentInvoicesTable() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<((SalesInvoice & { type: 'sales' }) | (PurchaseInvoice & { type: 'purchase' }))[]>([])
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

        // Combine and sort by date (most recent first)
        const allInvoices = [
          ...salesInvoices.map(inv => ({ ...inv, type: 'sales' as const })),
          ...purchaseInvoices.map(inv => ({ ...inv, type: 'purchase' as const })),
        ].sort((a, b) => dayjs((b as any).invoice_date).unix() - dayjs((a as any).invoice_date).unix())

        setInvoices(allInvoices)
      } catch (error) {
        console.error('Error fetching recent invoices:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleView = (invoice: (SalesInvoice & { type: 'sales' }) | (PurchaseInvoice & { type: 'purchase' })) => {
    if (invoice.type === 'sales') {
      navigate(`/sales-invoices/view/${invoice._id}`)
    } else {
      navigate(`/purchase-invoices/view/${invoice._id}`)
    }
  }

  const getTotal = (invoice: (SalesInvoice & { type: 'sales' }) | (PurchaseInvoice & { type: 'purchase' })) => {
    if (invoice.type === 'sales') {
      return calculateSalesInvoiceTotal(invoice as SalesInvoice)
    } else {
      return calculatePurchaseInvoiceTotal(invoice as PurchaseInvoice)
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
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
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
          <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
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
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p>No invoices found</p>
              </div>
            ) : (
              <>
                {displayedInvoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag color={invoice.type === 'sales' ? 'blue' : 'green'}>
                          {invoice.type === 'sales' ? 'Sales' : 'Purchase'}
                        </Tag>
                        <span className="font-medium text-foreground">
                          {invoice.type === 'sales' 
                            ? (invoice as SalesInvoice).invoice_number 
                            : (invoice as PurchaseInvoice).invoice_number}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dayjs((invoice as any).invoice_date).format('MMM DD, YYYY')}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          AED {getTotal(invoice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <Tag color={(invoice as any).payment_status === 'paid' ? 'green' : 'orange'} className="mt-1">
                          {(invoice as any).payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </Tag>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
        </CardContent>
      </Card>
    </motion.div>
  )
}

