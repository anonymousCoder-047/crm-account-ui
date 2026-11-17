import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import Header from './Header'
import Chatbot from '../chatbot/Chatbot'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/dashboard/sales': 'Sales Dashboard',
  '/settings': 'Settings',
}

export default function DashboardLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Sales Dashboard'
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Initialize isMobile based on window width immediately
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024 // lg breakpoint
    }
    return false
  })

  const prevMobileRef = useRef(isMobile)
  const mobileMenuOpenRef = useRef(mobileMenuOpen)
  
  // Update ref when mobileMenuOpen changes
  useEffect(() => {
    mobileMenuOpenRef.current = mobileMenuOpen
  }, [mobileMenuOpen])
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      const wasMobile = prevMobileRef.current
      
      // Only update state if it actually changed
      if (mobile !== isMobile) {
        setIsMobile(mobile)
        // Only close mobile menu when actually switching from mobile to desktop
        if (!mobile && wasMobile && mobileMenuOpenRef.current) {
          setMobileMenuOpen(false)
        }
        prevMobileRef.current = mobile
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [isMobile]) // Only depend on isMobile, not mobileMenuOpen

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen((prev) => !prev)
    } else {
      setCollapsed(!collapsed)
    }
  }

  const handleCloseMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background decorative shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-[#d4af37]/10 blur-3xl" />
      </div>

      {/* Mobile overlay - removed duplicate, handled in Sidebar component */}

      {/* Sidebar */}
      <Sidebar 
        collapsed={collapsed} 
        mobileOpen={mobileMenuOpen}
        onClose={handleCloseMobileMenu}
        isMobile={isMobile}
      />

      {/* Main content */}
      <div className={cn(
        'flex flex-col transition-all duration-200',
        // Desktop: fixed margin based on collapsed state
        !isMobile && (collapsed ? 'ml-20' : 'ml-64'),
        // Mobile: no margin, full width
        isMobile && 'ml-0'
      )}>
        <Header
          title={title}
          onToggleSidebar={handleToggleSidebar}
          isCollapsed={collapsed}
          isMobile={isMobile}
        />

        <main className="flex-1 p-3 sm:p-4 md:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-7xl"
          >
            <div className="rounded-lg sm:rounded-2xl glass-panel border border-border/60 p-4 sm:p-6 shadow-xl">
              <Outlet />
            </div>
          </motion.div>
        </main>
      </div>
      <Chatbot />
    </div>
  )
}

