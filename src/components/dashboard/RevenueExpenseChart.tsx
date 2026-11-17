import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SalesInvoiceAPI, PurchaseInvoiceAPI, ExpenseAPI, type SalesInvoice, type PurchaseInvoice } from '@/services/api'
import { calculateSalesInvoiceTotal, calculatePurchaseInvoiceTotal } from '@/utils/invoiceCalculations'
import dayjs from 'dayjs'

type TimeRange = '7days' | '30days' | '90days' | '12months'

export default function RevenueExpenseChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30days')
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [salesRes, purchaseRes, expensesRes] = await Promise.all([
          SalesInvoiceAPI.list(),
          PurchaseInvoiceAPI.list(),
          ExpenseAPI.list(),
        ])

        const salesInvoices: SalesInvoice[] = salesRes.data.data || []
        const purchaseInvoices: PurchaseInvoice[] = purchaseRes.data.data || []
        const expenses = expensesRes.data.data || []

        // Calculate date range
        const now = dayjs()
        let startDate = dayjs()
        switch (timeRange) {
          case '7days':
            startDate = now.subtract(7, 'day')
            break
          case '30days':
            startDate = now.subtract(30, 'day')
            break
          case '90days':
            startDate = now.subtract(90, 'day')
            break
          case '12months':
            startDate = now.subtract(12, 'month')
            break
        }

        // Filter data by date range
        const filteredSales = salesInvoices.filter(inv => 
          dayjs(inv.invoice_date).isAfter(startDate) && inv.payment_status === 'paid'
        )
        const filteredPurchases = purchaseInvoices.filter(inv => 
          dayjs(inv.invoice_date).isAfter(startDate) && inv.payment_status === 'paid'
        )
        const filteredExpenses = expenses.filter(exp => 
          dayjs(exp.date).isAfter(startDate)
        )

        // Group by date
        const dataMap = new Map<string, { revenue: number; expenses: number; date: string }>()

        filteredSales.forEach(inv => {
          const dateKey = dayjs(inv.invoice_date).format('YYYY-MM-DD')
          const existing = dataMap.get(dateKey) || { revenue: 0, expenses: 0, date: dateKey }
          existing.revenue += calculateSalesInvoiceTotal(inv)
          dataMap.set(dateKey, existing)
        })

        filteredPurchases.forEach(inv => {
          const dateKey = dayjs(inv.invoice_date).format('YYYY-MM-DD')
          const existing = dataMap.get(dateKey) || { revenue: 0, expenses: 0, date: dateKey }
          existing.expenses += calculatePurchaseInvoiceTotal(inv)
          dataMap.set(dateKey, existing)
        })

        filteredExpenses.forEach(exp => {
          const dateKey = dayjs(exp.date).format('YYYY-MM-DD')
          const existing = dataMap.get(dateKey) || { revenue: 0, expenses: 0, date: dateKey }
          existing.expenses += exp.amount || 0
          dataMap.set(dateKey, existing)
        })

        // Convert to array and sort by date
        const data = Array.from(dataMap.values())
          .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix())
          .map(item => ({
            ...item,
            date: dayjs(item.date).format('MMM DD'),
            profit: item.revenue - item.expenses,
          }))

        setChartData(data)
      } catch (error) {
        console.error('Error fetching chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timeRange])

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
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Revenue vs Expenses</CardTitle>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Revenue"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Expenses"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Profit"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}

