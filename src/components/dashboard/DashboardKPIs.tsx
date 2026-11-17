import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  Package, 
  FileText,
  Receipt,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react'
import StatCard from './StatCard'
import {
  SalesInvoiceAPI,
  PurchaseInvoiceAPI,
  CustomerAPI,
  SupplierAPI,
  InventoryAPI,
  ExpenseAPI,
  ReceivableAPI,
  PayableAPI,
  type SalesInvoice,
  type PurchaseInvoice,
} from '@/services/api'
import { calculateSalesInvoiceTotal, calculatePurchaseInvoiceTotal } from '@/utils/invoiceCalculations'

interface DashboardStats {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  totalCustomers: number
  totalSuppliers: number
  totalInventory: number
  totalReceivables: number
  totalPayables: number
  paidInvoices: number
  unpaidInvoices: number
}

export default function DashboardKPIs() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalInventory: 0,
    totalReceivables: 0,
    totalPayables: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        
        // Fetch all data in parallel
        const [
          salesInvoicesRes,
          purchaseInvoicesRes,
          expensesRes,
          customersRes,
          suppliersRes,
          inventoryRes,
          receivablesRes,
          payablesRes,
        ] = await Promise.all([
          SalesInvoiceAPI.list(),
          PurchaseInvoiceAPI.list(),
          ExpenseAPI.list(),
          CustomerAPI.list(),
          SupplierAPI.list(),
          InventoryAPI.list(),
          ReceivableAPI.list(),
          PayableAPI.list(),
        ])

        const salesInvoices: SalesInvoice[] = salesInvoicesRes.data.data || []
        const purchaseInvoices: PurchaseInvoice[] = purchaseInvoicesRes.data.data || []
        const expenses = expensesRes.data.data || []
        const customers = customersRes.data.data || []
        const suppliers = suppliersRes.data.data || []
        const inventory = inventoryRes.data.data || []
        const receivables = receivablesRes.data.data || []
        const payables = payablesRes.data.data || []

        // Calculate revenue (from paid sales invoices)
        const totalRevenue = salesInvoices
          .filter(inv => inv.payment_status === 'paid')
          .reduce((sum, inv) => sum + calculateSalesInvoiceTotal(inv), 0)

        // Calculate expenses (from purchase invoices + expenses)
        const purchaseTotal = purchaseInvoices
          .filter(inv => inv.payment_status === 'paid')
          .reduce((sum, inv) => sum + calculatePurchaseInvoiceTotal(inv), 0)
        const expenseTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
        const totalExpenses = purchaseTotal + expenseTotal

        // Calculate receivables (outstanding amounts)
        // 1) Outstanding from sales invoices that don't have a linked Receivable (legacy cash/credit handling)
        const invoiceReceivables = salesInvoices
          .filter(inv => inv.payment_status !== 'paid' && !inv.receivable_id)
          .reduce((sum, inv) => sum + (inv.balance_due ?? calculateSalesInvoiceTotal(inv)), 0)

        // 2) Outstanding from Receivable records (preferred AR source)
        const receivableBalance = receivables
          .filter(rec => rec.status !== 'paid')
          .reduce((sum, rec) => sum + (rec.balance_due ?? 0), 0)

        const totalReceivables = invoiceReceivables + receivableBalance

        // Calculate payables (outstanding amounts)
        const invoicePayables = purchaseInvoices
          .filter(inv => inv.payment_status !== 'paid' && !inv.payable_id)
          .reduce((sum, inv) => sum + (inv.balance_due ?? calculatePurchaseInvoiceTotal(inv)), 0)

        const payableBalance = payables
          .filter(pay => pay.status !== 'paid')
          .reduce((sum, pay) => sum + (pay.balance_due ?? 0), 0)

        const totalPayables = invoicePayables + payableBalance

        const paidInvoices = salesInvoices.filter(inv => inv.payment_status === 'paid').length
        const unpaidInvoices = salesInvoices.filter(inv => inv.payment_status === 'unpaid').length

        setStats({
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          totalCustomers: customers.length,
          totalSuppliers: suppliers.length,
          totalInventory: inventory.length,
          totalReceivables,
          totalPayables,
          paidInvoices,
          unpaidInvoices,
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        icon={DollarSign}
        label="Total Revenue"
        value={formatCurrency(stats.totalRevenue)}
        iconColor="text-green-400"
        bgColor="bg-green-500/10"
      />
      <StatCard
        icon={TrendingDown}
        label="Total Expenses"
        value={formatCurrency(stats.totalExpenses)}
        iconColor="text-red-400"
        bgColor="bg-red-500/10"
      />
      <StatCard
        icon={TrendingUp}
        label="Net Profit"
        value={formatCurrency(stats.netProfit)}
        iconColor={stats.netProfit >= 0 ? "text-green-400" : "text-red-400"}
        bgColor={stats.netProfit >= 0 ? "bg-green-500/10" : "bg-red-500/10"}
      />
      <StatCard
        icon={Users}
        label="Total Customers"
        value={stats.totalCustomers.toString()}
        iconColor="text-blue-400"
        bgColor="bg-blue-500/10"
      />
      <StatCard
        icon={Building2}
        label="Total Suppliers"
        value={stats.totalSuppliers.toString()}
        iconColor="text-purple-400"
        bgColor="bg-purple-500/10"
      />
      <StatCard
        icon={Package}
        label="Inventory Items"
        value={stats.totalInventory.toString()}
        iconColor="text-orange-400"
        bgColor="bg-orange-500/10"
      />
      <StatCard
        icon={ArrowUpCircle}
        label="Receivables"
        value={formatCurrency(stats.totalReceivables)}
        iconColor="text-indigo-400"
        bgColor="bg-indigo-500/10"
      />
      <StatCard
        icon={ArrowDownCircle}
        label="Payables"
        value={formatCurrency(stats.totalPayables)}
        iconColor="text-pink-400"
        bgColor="bg-pink-500/10"
      />
    </div>
  )
}

