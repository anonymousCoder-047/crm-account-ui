import { useState, useEffect, useCallback } from 'react'
import { InventoryAPI } from '@/services/api'

export interface Notification {
  id: string
  type: 'low_stock' | 'new_order' | 'payment_due' | 'invoice_overdue'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      const currentPermission = Notification.permission
      setPermission(currentPermission)

      if (currentPermission === 'default') {
        Notification.requestPermission().then((perm) => {
          setPermission(perm)
        })
      }
    }
  }, [])

  // Check for low stock items
  const checkLowStock = useCallback(async () => {
    try {
      const response = await InventoryAPI.list()
      const items = response.data.data || []
      
      const lowStockItems = items.filter((item: any) => {
        // Consider items with quantity less than or equal to 10 as low stock
        // You can adjust this threshold
        // Note: Inventory model uses 'qty' field
        const quantity = item.qty !== undefined ? item.qty : item.quantity
        return quantity !== undefined && quantity <= 10
      })

      if (lowStockItems.length > 0) {
        const newNotifications: Notification[] = lowStockItems.map((item: any) => ({
          id: `low_stock_${item._id}_${Date.now()}`,
          type: 'low_stock' as const,
          title: 'Low Stock Alert',
          message: `${item.name} is running low (${item.qty !== undefined ? item.qty : item.quantity} remaining)`,
          timestamp: new Date(),
          read: false,
          actionUrl: `/inventory/manage`,
        }))

        // Only add new notifications (avoid duplicates)
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id))
          const toAdd = newNotifications.filter((n) => !existingIds.has(n.id))
          
          if (toAdd.length > 0) {
            // Show browser notification
            toAdd.forEach((notif) => {
              if (permission === 'granted') {
                new Notification(notif.title, {
                  body: notif.message,
                  icon: '/favicon.ico',
                  tag: notif.id,
                })
              }
            })
          }
          
          return [...toAdd, ...prev].slice(0, 50) // Keep last 50 notifications
        })
      }
    } catch (error) {
      console.error('Error checking low stock:', error)
    }
  }, [permission])

  // Simulate new order notification (you can replace this with actual order checking)
  const checkNewOrders = useCallback(() => {
    // This is a placeholder - you can implement actual order checking logic
    // For now, we'll skip this or implement it based on your order system
  }, [])

  // Check for notifications periodically
  useEffect(() => {
    // Check immediately
    checkLowStock()
    checkNewOrders()

    // Check every 5 minutes
    const interval = setInterval(() => {
      checkLowStock()
      checkNewOrders()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [checkLowStock, checkNewOrders])

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length)
  }, [notifications])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  })

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  })

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  })

  const clearAll = useCallback(() => {
    setNotifications([])
  })

  return {
    notifications,
    unreadCount,
    permission,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  }
}

