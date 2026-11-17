import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Boxes,
  Truck,
  ReceiptText,
  FileSpreadsheet,
  Wallet,
  HandCoins,
  CreditCard,
  Building2,
  Users,
  Calendar,
  Briefcase,
  FileText,
  MessageSquare,
  Settings as SettingsIcon,
  ChevronDown,
  Cog,
  BookOpen,
  TrendingUp,
  Scale,
  DollarSign,
  Users as UsersIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Logo from '@/components/Logo'
import { useEffect, useState, useRef } from 'react'

interface SidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  onClose?: () => void
  isMobile?: boolean
}

export default function Sidebar({ collapsed = false, mobileOpen = false, onClose, isMobile = false }: SidebarProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => {
    setOpen({ ...open, [key]: !open[key] })
  }
  const location = useLocation()

  // Track previous path to only close on actual route change
  const prevPathRef = useRef<string | null>(null)
  
  // Close mobile menu when route changes (but not on initial mount or when opening)
  useEffect(() => {
    // Skip on initial mount
    if (prevPathRef.current === null) {
      prevPathRef.current = location.pathname
      return
    }
    
    // Only close if the path actually changed and sidebar is open
    if (isMobile && mobileOpen && onClose && prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname
      const timer = setTimeout(() => {
        onClose()
      }, 100)
      return () => clearTimeout(timer)
    }
    
    // Update ref even if we don't close
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname
    }
  }, [location.pathname, isMobile, mobileOpen, onClose])

  // Persist open state based on current route
  useEffect(() => {
    const path = location.pathname
    setOpen({
      inventory: path.startsWith('/inventory'),
      // Only open Sales menu for actual sales-invoice routes, not the Sales Dashboard
      sales: path.startsWith('/sales-invoices') || path.startsWith('/sales-invoice-templates'),
      purchase: path.startsWith('/purchase-invoices') || path.startsWith('/purchase-invoice-templates'),
      expenses: path.startsWith('/expenses'),
      receivables: path.startsWith('/receivables'),
      payables: path.startsWith('/payables'),
      delivery: path.startsWith('/delivery-orders'),
      ledger: path.startsWith('/ledger') || path.startsWith('/general-ledger') || path.startsWith('/trial-balance'),
      statements: path.startsWith('/statements'),
      reports: path.startsWith('/reports'),
      crmSettings: path.startsWith('/crm-settings'),
    })
  }, [location.pathname])

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden"
          onClick={onClose}
          style={{ 
            zIndex: 9998,
          }}
        />
      )}

      {/* Sidebar - Always render, transform on mobile */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-gradient-surface border-r border-border/70 shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          // Desktop styles
          !isMobile && (collapsed ? 'w-20' : 'w-64'),
          // Mobile styles
          isMobile && 'w-64',
        )}
        style={{
          // Very high z-index to ensure it's on top of everything
          zIndex: isMobile ? 9999 : 50,
          // Transform on mobile based on open state - use inline style to ensure it works
          transform: isMobile 
            ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)')
            : 'translateX(0)',
        }}
      >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="relative flex h-20 items-center justify-center border-b border-border px-2 overflow-hidden flex-shrink-0">
          <Logo size={collapsed ? 'xs' : 'sm'} />
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        </div>

        {/* Navigation - Scrollable on mobile */}
        <nav className={cn(
          'flex-1 space-y-1 py-6 overflow-y-auto overscroll-contain',
          // Ensure smooth scrolling on mobile
          isMobile && 'min-h-0',
          collapsed ? 'px-2' : 'px-4'
        )}>
          {/* Sales Dashboard */}
          <div>
            <NavLink
              to="/dashboard/sales"
              className={({ isActive }) =>
                cn(
                  'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <LayoutDashboard className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">Sales Dashboard</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/15 to-primary/5 -z-10"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          </div>

          {/* Inventory */}
          <div>
            <button
              onClick={() => toggle('inventory')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.inventory ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Boxes className={cn('h-5 w-5 flex-shrink-0', open.inventory ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Inventory</span>
                  <motion.div
                    animate={{ rotate: open.inventory ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.inventory ? 'auto' : 0,
                  opacity: open.inventory ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/inventory/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/inventory/create"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Create</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sales Invoices */}
          <div>
            <button
              onClick={() => toggle('sales')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.sales ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <ReceiptText className={cn('h-5 w-5 flex-shrink-0', open.sales ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Sales Invoices</span>
                  <motion.div
                    animate={{ rotate: open.sales ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.sales ? 'auto' : 0,
                  opacity: open.sales ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/sales-invoices/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Invoices</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/sales-invoices/create"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Create Invoice</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/sales-invoice-templates/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Template</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>

          {/* Purchase Invoices */}
          <div>
            <button
              onClick={() => toggle('purchase')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.purchase ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <FileSpreadsheet className={cn('h-5 w-5 flex-shrink-0', open.purchase ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Purchase Invoices</span>
                  <motion.div
                    animate={{ rotate: open.purchase ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.purchase ? 'auto' : 0,
                  opacity: open.purchase ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/purchase-invoices/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Invoices</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/purchase-invoices/create"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Create Invoice</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/purchase-invoice-templates/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Template</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>

          {/* Expenses */}
          <div>
            <button
              onClick={() => toggle('expenses')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.expenses ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Wallet className={cn('h-5 w-5 flex-shrink-0', open.expenses ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Expenses</span>
                  <motion.div
                    animate={{ rotate: open.expenses ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.expenses ? 'auto' : 0,
                  opacity: open.expenses ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/expenses/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/expenses/create"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Create</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>

          {/* Receivables */}
          <div>
            <button
              onClick={() => toggle('receivables')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.receivables ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <HandCoins className={cn('h-5 w-5 flex-shrink-0', open.receivables ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Payment In</span>
                  <motion.div
                    animate={{ rotate: open.receivables ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.receivables ? 'auto' : 0,
                  opacity: open.receivables ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/receivables/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/receivables/create"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Create</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>

          {/* Payables (Payment Out) */}
          <div>
            <button
              onClick={() => toggle('payables')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.payables ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <CreditCard className={cn('h-5 w-5 flex-shrink-0', open.payables ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Payment Out</span>
                  <motion.div
                    animate={{ rotate: open.payables ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.payables ? 'auto' : 0,
                  opacity: open.payables ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/payables/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/payables/create"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Create</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>

          {/* Delivery Orders */}
          <div>
            <button
              onClick={() => toggle('delivery')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.delivery ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Truck className={cn('h-5 w-5 flex-shrink-0', open.delivery ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Delivery Orders</span>
                  <motion.div
                    animate={{ rotate: open.delivery ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.delivery ? 'auto' : 0,
                  opacity: open.delivery ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/delivery-orders/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/delivery-orders/create"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Create</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/delivery-order-templates/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Template</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>

          {/* Ledger */}
          <div>
            <button
              onClick={() => toggle('ledger')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.ledger ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <BookOpen className={cn('h-5 w-5 flex-shrink-0', open.ledger ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Ledger</span>
                  <motion.div
                    animate={{ rotate: open.ledger ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.ledger ? 'auto' : 0,
                  opacity: open.ledger ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/ledger/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Journal Entries</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/general-ledger/manage"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>General Ledger</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/trial-balance"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Trial Balance</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>

          {/* Financial Statements */}
          <div>
            <button
              onClick={() => toggle('statements')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.statements ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <TrendingUp className={cn('h-5 w-5 flex-shrink-0', open.statements ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Financial Statements</span>
                  <motion.div
                    animate={{ rotate: open.statements ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.statements ? 'auto' : 0,
                  opacity: open.statements ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/statements/income"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        <span>Income Statement</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/statements/balance-sheet"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Scale className="h-4 w-4" />
                        <span>Balance Sheet</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/statements/cashflow"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <DollarSign className="h-4 w-4" />
                        <span>Cash Flow</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/statements/equity"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <UsersIcon className="h-4 w-4" />
                        <span>Statement of Equity</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/statements/vat201"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <FileText className="h-4 w-4" />
                        <span>VAT 201 Return</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>

          {/* CRM Settings */}
          <div>
            <button
              onClick={() => toggle('crmSettings')}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                open.crmSettings ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary' : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Cog className={cn('h-5 w-5 flex-shrink-0', open.crmSettings ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">CRM Settings</span>
                  <motion.div
                    animate={{ rotate: open.crmSettings ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </>
              )}
            </button>
            {!collapsed && (
              <motion.div
                initial={false}
                animate={{
                  height: open.crmSettings ? 'auto' : 0,
                  opacity: open.crmSettings ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 pl-4 border-l-2 border-border space-y-0.5">
                  <NavLink
                    to="/crm-settings/suppliers"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Suppliers</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/crm-settings/customers"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Customers</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/crm-settings/units"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Units</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/crm-settings/brands"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Brands</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/crm-settings/payment-methods"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Payment Methods</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/crm-settings/payment-statuses"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Manage Payment Statuses</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/crm-settings/chart-of-accounts"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Chart of Accounts</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/crm-settings/opening-balances"
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>Opening Balances</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              </motion.div>
            )}
          </div>
        </nav>

        {/* Bottom Settings Menu */}
        <div className={cn('border-t border-border', collapsed ? 'px-2 py-3' : 'px-4 py-4')}>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-foreground hover:bg-muted/50 hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <SettingsIcon
                  className={cn('h-5 w-5 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')}
                />
                {!collapsed && <span className="flex-1">Settings</span>}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/15 to-primary/5 -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </>
            )}
          </NavLink>
        </div>
      </div>
    </aside>
    </>
  )
}

