import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { SalesInvoiceAPI, PurchaseInvoiceAPI, type SalesInvoice, type PurchaseInvoice } from '@/services/api'

export default function InvoiceStatusChart() {
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

        const salesPaid = salesInvoices.filter(inv => inv.payment_status === 'paid').length
        const salesUnpaid = salesInvoices.filter(inv => inv.payment_status === 'unpaid').length
        const purchasePaid = purchaseInvoices.filter(inv => inv.payment_status === 'paid').length
        const purchaseUnpaid = purchaseInvoices.filter(inv => inv.payment_status === 'unpaid').length

        setChartData([
          { name: 'Sales Paid', value: salesPaid, color: '#10b981' },
          { name: 'Sales Unpaid', value: salesUnpaid, color: '#f59e0b' },
          { name: 'Purchase Paid', value: purchasePaid, color: '#3b82f6' },
          { name: 'Purchase Unpaid', value: purchaseUnpaid, color: '#ef4444' },
        ])
      } catch (error) {
        console.error('Error fetching invoice status data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <div className="h-6 bg-muted animate-pulse rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Invoice Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}

