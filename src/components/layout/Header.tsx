import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Home, Bell, ChevronDown, LogOut, PanelLeft, PanelRight, Menu, FileText, ShoppingCart, UserPlus, Building2, Package, Receipt, CreditCard, X, Check, Users, BookOpen, Loader2, Sun, Moon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { SearchAPI, type SearchResult } from '@/services/api'

interface HeaderProps {
  title: string
  onToggleSidebar?: () => void
  isCollapsed?: boolean
  isMobile?: boolean
}

// Quick Add menu items
const quickAddItems = [
  {
    label: 'Sales Invoice',
    icon: FileText,
    path: '/sales-invoices/create',
  },
  {
    label: 'Purchase Invoice',
    icon: ShoppingCart,
    path: '/purchase-invoices/create',
  },
  {
    label: 'Customer',
    icon: UserPlus,
    path: '/crm-settings/customers/manage?action=create',
  },
  {
    label: 'Supplier',
    icon: Building2,
    path: '/crm-settings/suppliers/manage?action=create',
  },
  {
    label: 'Inventory',
    icon: Package,
    path: '/inventory/create',
  },
  {
    label: 'Expense',
    icon: Receipt,
    path: '/expenses/create',
  },
  {
    label: 'Receivable',
    icon: CreditCard,
    path: '/receivables/create',
  },
  {
    label: 'Payable',
    icon: CreditCard,
    path: '/payables/create',
  },
]

export default function Header({ title, onToggleSidebar, isCollapsed, isMobile = false }: HeaderProps) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()

  // Check if we're on the Sales Dashboard
  const isSalesDashboard = location.pathname === '/dashboard/sales'

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleQuickAdd = (path: string) => {
    navigate(path)
  }

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id)
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await SearchAPI.search(searchQuery, 8)
        let results = response.data.data
        
        // Filter to only show inventory products when on Sales Dashboard
        if (isSalesDashboard) {
          results = results.filter(result => result.type === 'inventory')
        }
        
        setSearchResults(results)
        setShowSearchResults(true)
      } catch (error: any) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, isSalesDashboard])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSearchResultClick = (result: SearchResult) => {
    setSearchQuery('')
    setShowSearchResults(false)
    navigate(result.url)
  }

  const getSearchIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer':
        return Users
      case 'supplier':
        return Building2
      case 'inventory':
        return Package
      case 'sales_invoice':
        return FileText
      case 'purchase_invoice':
        return ShoppingCart
      case 'expense':
        return Receipt
      case 'receivable':
      case 'payable':
        return CreditCard
      case 'journal_entry':
        return BookOpen
      default:
        return Search
    }
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer':
        return 'Customer'
      case 'supplier':
        return 'Supplier'
      case 'inventory':
        return 'Inventory'
      case 'sales_invoice':
        return 'Sales Invoice'
      case 'purchase_invoice':
        return 'Purchase Invoice'
      case 'expense':
        return 'Expense'
      case 'receivable':
        return 'Receivable'
      case 'payable':
        return 'Payable'
      case 'journal_entry':
        return 'Journal Entry'
      default:
        return type
    }
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-30 flex h-16 items-center gap-2 sm:gap-4 border-b border-border/70 glass-panel px-3 sm:px-6 shadow-sm"
    >
      {/* Hamburger menu for mobile, toggle icon for desktop */}
      {isMobile ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open sidebar"
          onClick={onToggleSidebar}
          className="mr-1 flex-shrink-0 z-50"
          type="button"
        >
          <Menu className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="mr-1 flex-shrink-0 z-50"
          type="button"
        >
          {isCollapsed ? <PanelRight className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
        </Button>
      )}
      <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate flex-1 min-w-0">{title}</h1>

      <div className="ml-auto flex items-center gap-1 sm:gap-2 md:gap-3">
        {/* Search - Hidden on mobile, visible on tablet+ */}
        <div ref={searchContainerRef} className="relative hidden md:block w-48 lg:w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={isSalesDashboard ? "Search products" : "Search customers, invoices, inventory..."}
              className="pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowSearchResults(true)
                }
              }}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showSearchResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
              >
                <div className="p-2">
                  {searchResults.map((result) => {
                    const Icon = getSearchIcon(result.type)
                    return (
                      <div
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSearchResultClick(result)}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {result.title}
                            </p>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {getTypeLabel(result.type)}
                            </Badge>
                          </div>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                          {result.description && (
                            <p className="text-xs text-muted-foreground mt-1">{result.description}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
            {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 p-4"
              >
                <p className="text-sm text-muted-foreground text-center">No results found</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Add Button - Icon only on mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size={isMobile ? "icon" : "sm"} className="gap-2">
              <Plus className="h-4 w-4" />
              {!isMobile && <span className="hidden lg:inline">QUICK ADD</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Add</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {quickAddItems.map((item) => {
              const Icon = item.icon
              return (
                <DropdownMenuItem
                  key={item.path}
                  onClick={() => handleQuickAdd(item.path)}
                  className="cursor-pointer"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
          className="flex-shrink-0"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Main Page Link - Hidden on mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="hidden sm:flex"
          onClick={() => navigate('/')}
        >
          <Home className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative flex-shrink-0">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500/100 animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
            <div className="flex items-center justify-between p-2">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-500/10' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeNotification(notification.id)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile - Compact on mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1 sm:gap-2 px-1 sm:px-2">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <>
                  <span className="text-sm font-medium hidden lg:inline">
                    {user?.name || 'User'}
                  </span>
                  <ChevronDown className="h-4 w-4 hidden lg:block" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Settings
            </DropdownMenuItem>
            {user?.role && (user.role === 'admin' || user.role === 'superadmin') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                  <Users className="w-4 h-4 mr-2" />
                  <span>User Management</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-400">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  )
}

