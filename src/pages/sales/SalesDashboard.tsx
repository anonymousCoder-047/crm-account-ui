import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  Download,
  ChevronDown,
} from 'lucide-react'
import StatCard from '@/components/dashboard/StatCard'
import {
  SalesInvoiceAPI,
  CustomerAPI,
  type SalesInvoice,
  type Customer,
} from '@/services/api'
import { calculateSalesInvoiceTotal } from '@/utils/invoiceCalculations'
import dayjs from 'dayjs'
import { Tag } from 'antd'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import PptxGenJS from 'pptxgenjs'

type TimeRange = '7days' | '30days' | '90days' | '12months' | 'all'

interface SalesStats {
  totalRevenue: number
  totalInvoices: number
  paidInvoices: number
  unpaidInvoices: number
  paidRevenue: number
  unpaidRevenue: number
  averageOrderValue: number
  totalCustomers: number
  activeCustomers: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
}

export default function SalesDashboard() {
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SalesStats>({
    totalRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    paidRevenue: 0,
    unpaidRevenue: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
    activeCustomers: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [invoicesRes, customersRes] = await Promise.all([
          SalesInvoiceAPI.list(),
          CustomerAPI.list(),
        ])

        setInvoices(invoicesRes.data.data || [])
        setCustomers(customersRes.data.data || [])
      } catch (error) {
        console.error('Error fetching sales data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter invoices by time range
  const filteredInvoices = useMemo(() => {
    if (timeRange === 'all') return invoices

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

    return invoices.filter((inv) => dayjs(inv.invoice_date).isAfter(startDate))
  }, [invoices, timeRange])

  // Calculate stats
  useEffect(() => {
    if (filteredInvoices.length === 0) {
      setStats({
        totalRevenue: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        unpaidInvoices: 0,
        paidRevenue: 0,
        unpaidRevenue: 0,
        averageOrderValue: 0,
        totalCustomers: customers.length,
        activeCustomers: 0,
      })
      return
    }

    const paidInvs = filteredInvoices.filter((inv) => inv.payment_status === 'paid')
    const unpaidInvs = filteredInvoices.filter((inv) => inv.payment_status === 'unpaid')

    const totalRevenue = filteredInvoices.reduce(
      (sum, inv) => sum + calculateSalesInvoiceTotal(inv),
      0
    )
    const paidRevenue = paidInvs.reduce(
      (sum, inv) => sum + calculateSalesInvoiceTotal(inv),
      0
    )
    const unpaidRevenue = unpaidInvs.reduce(
      (sum, inv) => sum + calculateSalesInvoiceTotal(inv),
      0
    )

    const uniqueCustomers = new Set(
      filteredInvoices.map((inv) =>
        typeof inv.customer_id === 'string' ? inv.customer_id : (inv.customer_id as any)?._id
      )
    )
    const activeCustomers = uniqueCustomers.size

    setStats({
      totalRevenue,
      totalInvoices: filteredInvoices.length,
      paidInvoices: paidInvs.length,
      unpaidInvoices: unpaidInvs.length,
      paidRevenue,
      unpaidRevenue,
      averageOrderValue: totalRevenue / filteredInvoices.length,
      totalCustomers: customers.length,
      activeCustomers,
    })
  }, [filteredInvoices, customers])

  // Sales over time chart data
  const salesOverTimeData = useMemo(() => {
    const dataMap = new Map<string, { date: string; revenue: number; count: number }>()

    filteredInvoices.forEach((inv) => {
      const dateKey = dayjs(inv.invoice_date).format('YYYY-MM-DD')
      const existing = dataMap.get(dateKey) || { date: dateKey, revenue: 0, count: 0 }
      existing.revenue += calculateSalesInvoiceTotal(inv)
      existing.count += 1
      dataMap.set(dateKey, existing)
    })

    return Array.from(dataMap.values())
      .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix())
      .map((item) => ({
        ...item,
        date: dayjs(item.date).format('MMM DD'),
      }))
  }, [filteredInvoices])

  // Top customers data
  const topCustomersData = useMemo(() => {
    const customerMap = new Map<string, { name: string; revenue: number; count: number }>()

    filteredInvoices.forEach((inv) => {
      const customerId =
        typeof inv.customer_id === 'string'
          ? inv.customer_id
          : (inv.customer_id as any)?._id
      const customer = customers.find((c) => c._id === customerId)
      const customerName = customer?.name || 'Unknown'
      const existing = customerMap.get(customerId) || {
        name: customerName,
        revenue: 0,
        count: 0,
      }
      existing.revenue += calculateSalesInvoiceTotal(inv)
      existing.count += 1
      customerMap.set(customerId, existing)
    })

    return Array.from(customerMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4)
  }, [filteredInvoices, customers])

  // Sales by status pie chart data
  const salesByStatusData = useMemo(() => {
    const paid = filteredInvoices.filter((inv) => inv.payment_status === 'paid').length
    const unpaid = filteredInvoices.filter((inv) => inv.payment_status === 'unpaid').length

    return [
      { name: 'Paid', value: paid, color: '#10b981' },
      { name: 'Unpaid', value: unpaid, color: '#f59e0b' },
    ]
  }, [filteredInvoices])

  // Recent invoices
  const recentInvoices = useMemo(() => {
    return filteredInvoices
      .sort((a, b) => dayjs(b.invoice_date).unix() - dayjs(a.invoice_date).unix())
      .slice(0, 4)
  }, [filteredInvoices])

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatCurrencyRaw = (amount: number) =>
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const timeRangeLabel =
    timeRange === '7days'
      ? 'Last 7 days'
      : timeRange === '30days'
        ? 'Last 30 days'
        : timeRange === '90days'
          ? 'Last 90 days'
          : timeRange === '12months'
            ? 'Last 12 months'
            : 'All Time'

  const handleExportPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Sales Dashboard Report', pageWidth / 2, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Period: ${timeRangeLabel} | Generated: ${dayjs().format('MMM DD, YYYY HH:mm')}`, pageWidth / 2, 28, {
      align: 'center',
    })

    // KPI Summary
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Key Performance Indicators', margin, 42)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    autoTable(doc, {
      startY: 48,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', `AED ${formatCurrencyRaw(stats.totalRevenue)}`],
        ['Total Invoices', stats.totalInvoices.toString()],
        ['Average Order Value', `AED ${formatCurrencyRaw(stats.averageOrderValue)}`],
        ['Active Customers', `${stats.activeCustomers} / ${stats.totalCustomers}`],
        ['Paid Invoices', `${stats.paidInvoices} (AED ${formatCurrencyRaw(stats.paidRevenue)})`],
        ['Unpaid Invoices', `${stats.unpaidInvoices} (AED ${formatCurrencyRaw(stats.unpaidRevenue)})`],
        [
          'Payment Rate',
          stats.totalInvoices > 0
            ? `${((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(1)}%`
            : '0%',
        ],
        [
          'Collection Rate',
          stats.totalRevenue > 0
            ? `${((stats.paidRevenue / stats.totalRevenue) * 100).toFixed(1)}%`
            : '0%',
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    })

    let lastY = (doc as any).lastAutoTable.finalY + 12

    // Sales Over Time
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Sales Over Time', margin, lastY)
    lastY += 6
    doc.setFont('helvetica', 'normal')

    if (salesOverTimeData.length > 0) {
      autoTable(doc, {
        startY: lastY,
        head: [['Date', 'Revenue (AED)', 'Invoices']],
        body: salesOverTimeData.map((row) => [
          row.date,
          formatCurrencyRaw(row.revenue),
          row.count.toString(),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      })
      lastY = (doc as any).lastAutoTable.finalY + 12
    } else {
      doc.text('No data available', margin, lastY)
      lastY += 10
    }

    // Sales by Status
    if (lastY > 240) {
      doc.addPage()
      lastY = 20
    }
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Sales by Payment Status', margin, lastY)
    lastY += 6
    doc.setFont('helvetica', 'normal')
    autoTable(doc, {
      startY: lastY,
      head: [['Status', 'Count']],
      body: salesByStatusData
        .filter((d) => d.value > 0)
        .map((d) => [d.name, d.value.toString()]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    })
    lastY = (doc as any).lastAutoTable.finalY + 12

    // Top Customers
    if (lastY > 240) {
      doc.addPage()
      lastY = 20
    }
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Customers', margin, lastY)
    lastY += 6
    doc.setFont('helvetica', 'normal')
    if (topCustomersData.length > 0) {
      autoTable(doc, {
        startY: lastY,
        head: [['#', 'Customer', 'Invoices', 'Revenue (AED)']],
        body: topCustomersData.map((c, i) => [
          (i + 1).toString(),
          c.name,
          c.count.toString(),
          formatCurrencyRaw(c.revenue),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      })
      lastY = (doc as any).lastAutoTable.finalY + 12
    } else {
      doc.text('No customer data available', margin, lastY)
      lastY += 10
    }

    // Recent Invoices
    if (lastY > 240) {
      doc.addPage()
      lastY = 20
    }
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Recent Invoices', margin, lastY)
    lastY += 6
    doc.setFont('helvetica', 'normal')
    if (recentInvoices.length > 0) {
      autoTable(doc, {
        startY: lastY,
        head: [['Invoice #', 'Date', 'Status', 'Amount (AED)']],
        body: recentInvoices.map((inv) => [
          inv.invoice_number,
          dayjs(inv.invoice_date).format('MMM DD, YYYY'),
          inv.payment_status,
          formatCurrencyRaw(calculateSalesInvoiceTotal(inv)),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      })
    } else {
      doc.text('No invoices found', margin, lastY)
    }

    doc.save(`sales-dashboard-${dayjs().format('YYYY-MM-DD')}.pdf`)
  }

  const handleExportPPT = () => {
    const pptx = new PptxGenJS()
    pptx.title = 'Sales Dashboard'
    pptx.author = 'CRM Accounts'
    pptx.subject = `Sales Performance - ${timeRangeLabel}`

    // Slide 1: Title
    const slide1 = pptx.addSlide()
    slide1.addText('Sales Dashboard', {
      x: 0.5,
      y: 1,
      w: 9,
      h: 1,
      fontSize: 32,
      bold: true,
      align: 'center',
      color: '1e293b',
    })
    slide1.addText(`Period: ${timeRangeLabel} | ${dayjs().format('MMM DD, YYYY')}`, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 0.5,
      fontSize: 14,
      align: 'center',
      color: '64748b',
    })
    slide1.addText('Overview of sales performance and key metrics', {
      x: 0.5,
      y: 2.6,
      w: 9,
      h: 0.5,
      fontSize: 12,
      align: 'center',
      color: '94a3b8',
    })

    // Slide 2: KPI Summary
    const slide2 = pptx.addSlide()
    slide2.addText('Key Performance Indicators', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: '1e293b',
    })
    slide2.addTable(
      [
        [
          { text: 'Metric', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
          { text: 'Value', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
        ],
        [
          'Total Revenue',
          `AED ${formatCurrencyRaw(stats.totalRevenue)}`,
        ],
        ['Total Invoices', stats.totalInvoices.toString()],
        ['Average Order Value', `AED ${formatCurrencyRaw(stats.averageOrderValue)}`],
        ['Active Customers', `${stats.activeCustomers} / ${stats.totalCustomers}`],
        ['Paid Invoices', `${stats.paidInvoices} (AED ${formatCurrencyRaw(stats.paidRevenue)})`],
        ['Unpaid Invoices', `${stats.unpaidInvoices} (AED ${formatCurrencyRaw(stats.unpaidRevenue)})`],
        [
          'Payment Rate',
          stats.totalInvoices > 0
            ? `${((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(1)}%`
            : '0%',
        ],
        [
          'Collection Rate',
          stats.totalRevenue > 0
            ? `${((stats.paidRevenue / stats.totalRevenue) * 100).toFixed(1)}%`
            : '0%',
        ],
      ],
      {
        x: 0.5,
        y: 1,
        w: 9,
        colW: [4.5, 4.5],
        fontSize: 11,
        border: { pt: 0.5, color: 'e2e8f0' },
      }
    )

    // Slide 3: Sales Over Time Chart
    const slide3 = pptx.addSlide()
    slide3.addText('Sales Over Time', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: '1e293b',
    })
    if (salesOverTimeData.length > 0) {
      const lineChartData = [
        {
          name: 'Revenue',
          labels: salesOverTimeData.map((d) => d.date),
          values: salesOverTimeData.map((d) => d.revenue),
        },
      ]
      slide3.addChart(pptx.ChartType.line, lineChartData, {
        x: 0.5,
        y: 1,
        w: 9,
        h: 4.5,
        showTitle: false,
        showLegend: true,
        legendPos: 'r',
        chartColors: ['3b82f6'],
        lineSize: 2,
        valAxisLabelFormatCode: '#,##0',
      })
    } else {
      slide3.addText('No sales data available for the selected period', {
        x: 2,
        y: 2.5,
        w: 6,
        h: 0.5,
        fontSize: 14,
        align: 'center',
        color: '64748b',
      })
    }

    // Slide 4: Sales by Status (Pie)
    const slide4 = pptx.addSlide()
    slide4.addText('Sales by Payment Status', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: '1e293b',
    })
    const hasPaidUnpaid = salesByStatusData.some((d) => d.value > 0)
    if (hasPaidUnpaid) {
      const pieChartData = [
        {
          name: 'Payment Status',
          labels: salesByStatusData.map((d) => d.name),
          values: salesByStatusData.map((d) => d.value),
        },
      ]
      slide4.addChart(pptx.ChartType.pie, pieChartData, {
        x: 2.5,
        y: 1.2,
        w: 5,
        h: 4,
        showTitle: false,
        showLegend: true,
        legendPos: 'r',
        chartColors: ['10b981', 'f59e0b'],
        showPercent: true,
      })
    } else {
      slide4.addText('No payment status data available', {
        x: 2,
        y: 2.5,
        w: 6,
        h: 0.5,
        fontSize: 14,
        align: 'center',
        color: '64748b',
      })
    }

    // Slide 5: Top Customers
    const slide5 = pptx.addSlide()
    slide5.addText('Top Customers', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: '1e293b',
    })
    if (topCustomersData.length > 0) {
      slide5.addTable(
        [
          [
            { text: '#', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
            { text: 'Customer', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
            { text: 'Invoices', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
            { text: 'Revenue (AED)', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
          ],
          ...topCustomersData.map((c, i) => [
            (i + 1).toString(),
            c.name,
            c.count.toString(),
            formatCurrencyRaw(c.revenue),
          ]),
        ],
        {
          x: 0.5,
          y: 1,
          w: 9,
          colW: [1, 4, 2, 2],
          fontSize: 11,
          border: { pt: 0.5, color: 'e2e8f0' },
        }
      )
    } else {
      slide5.addText('No customer data available', {
        x: 2,
        y: 2.5,
        w: 6,
        h: 0.5,
        fontSize: 14,
        align: 'center',
        color: '64748b',
      })
    }

    // Slide 6: Recent Invoices
    const slide6 = pptx.addSlide()
    slide6.addText('Recent Invoices', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: '1e293b',
    })
    if (recentInvoices.length > 0) {
      slide6.addTable(
        [
          [
            { text: 'Invoice #', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
            { text: 'Date', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
            { text: 'Status', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
            { text: 'Amount (AED)', options: { bold: true, fill: '3b82f6', color: 'ffffff' } },
          ],
          ...recentInvoices.map((inv) => [
            inv.invoice_number,
            dayjs(inv.invoice_date).format('MMM DD, YYYY'),
            inv.payment_status,
            formatCurrencyRaw(calculateSalesInvoiceTotal(inv)),
          ]),
        ],
        {
          x: 0.5,
          y: 1,
          w: 9,
          colW: [2.5, 2.5, 2, 2],
          fontSize: 11,
          border: { pt: 0.5, color: 'e2e8f0' },
        }
      )
    } else {
      slide6.addText('No invoices found', {
        x: 2,
        y: 2.5,
        w: 6,
        h: 0.5,
        fontSize: 14,
        align: 'center',
        color: '64748b',
      })
    }

    pptx.writeFile({ fileName: `sales-dashboard-${dayjs().format('YYYY-MM-DD')}.pptx` })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sales Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Overview of your sales performance</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPPT}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PowerPoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => navigate('/sales-invoices/create')} className="w-full sm:w-auto">
            <FileText className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          iconColor="text-green-400"
          bgColor="bg-green-500/10"
        />
        <StatCard
          icon={FileText}
          label="Total Invoices"
          value={stats.totalInvoices.toString()}
          iconColor="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Average Order Value"
          value={formatCurrency(stats.averageOrderValue)}
          iconColor="text-purple-400"
          bgColor="bg-purple-500/10"
        />
        <StatCard
          icon={Users}
          label="Active Customers"
          value={`${stats.activeCustomers} / ${stats.totalCustomers}`}
          iconColor="text-orange-400"
          bgColor="bg-orange-500/10"
        />
        <StatCard
          icon={CheckCircle2}
          label="Paid Invoices"
          value={`${stats.paidInvoices} (${formatCurrency(stats.paidRevenue)})`}
          iconColor="text-green-400"
          bgColor="bg-green-500/10"
        />
        <StatCard
          icon={Clock}
          label="Unpaid Invoices"
          value={`${stats.unpaidInvoices} (${formatCurrency(stats.unpaidRevenue)})`}
          iconColor="text-yellow-400"
          bgColor="bg-yellow-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Payment Rate"
          value={
            stats.totalInvoices > 0
              ? `${((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(1)}%`
              : '0%'
          }
          iconColor="text-indigo-400"
          bgColor="bg-indigo-500/10"
        />
        <StatCard
          icon={DollarSign}
          label="Collection Rate"
          value={
            stats.totalRevenue > 0
              ? `${((stats.paidRevenue / stats.totalRevenue) * 100).toFixed(1)}%`
              : '0%'
          }
          iconColor="text-teal-400"
          bgColor="bg-teal-500/10"
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Sales Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) =>
                      `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Revenue"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sales by Status */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Sales by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={salesByStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {salesByStatusData.map((entry, index) => (
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
      </div>

      {/* Top Customers and Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Top Customers</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/crm-settings/customers')}
              >
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCustomersData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p>No customer data available</p>
                  </div>
                ) : (
                  topCustomersData.map((customer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-400 font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">{customer.count} invoices</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          {formatCurrency(customer.revenue)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Invoices */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/sales-invoices/manage')}
              >
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p>No invoices found</p>
                  </div>
                ) : (
                  recentInvoices.map((invoice) => (
                    <div
                      key={invoice._id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {invoice.invoice_number}
                          </span>
                          <Tag color={invoice.payment_status === 'paid' ? 'green' : 'orange'}>
                            {invoice.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </Tag>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {dayjs(invoice.invoice_date).format('MMM DD, YYYY')}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold text-foreground">
                            {formatCurrency(calculateSalesInvoiceTotal(invoice))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/sales-invoices/view/${invoice._id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

