import { useEffect, useMemo, useState, useCallback } from 'react'
import { Table, message } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, X, FileText, ArrowUpDown, Filter } from 'lucide-react'
import { InventoryAPI, type InventoryTransaction, type InventoryItem } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

export default function InventoryTransactions() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<InventoryTransaction[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [q, setQ] = useState('')
  const [productFilter, setProductFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const navigate = useNavigate()

  // Create lookup map for inventory items
  const inventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>()
    inventoryItems.forEach(item => {
      map.set(item._id, item)
    })
    return map
  }, [inventoryItems])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (productFilter) params.product_id = productFilter
      if (typeFilter) params.type = typeFilter
      
      const res = await InventoryAPI.getTransactions(params)
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fetch transactions')
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInventoryItems = async () => {
    try {
      const res = await InventoryAPI.list()
      setInventoryItems(res.data.data)
    } catch (error) {
      console.error('Error fetching inventory items:', error)
    }
  }

  useEffect(() => {
    fetchData()
    fetchInventoryItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFilter, typeFilter])

  const getProductName = (productId: string | InventoryItem): string => {
    if (typeof productId === 'object' && productId !== null) {
      return productId.product_name || productId.name || '-'
    }
    const item = inventoryMap.get(productId)
    return item ? (item.product_name || item.name || '-') : productId
  }

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      purchase: 'Purchase',
      sale: 'Sale',
      adjustment_in: 'Adjustment In',
      adjustment_out: 'Adjustment Out',
      return_in: 'Return In',
      return_out: 'Return Out',
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      purchase: 'bg-green-500/15 text-green-300 border-green-500/30',
      sale: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      adjustment_in: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      adjustment_out: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      return_in: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
      return_out: 'bg-red-500/15 text-red-300 border-red-500/30',
    }
    return colors[type] || 'bg-muted text-foreground border-border'
  }

  const columns: ColumnsType<InventoryTransaction> = useMemo(
    () => [
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Date</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'date',
        key: 'date',
        sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        width: 120,
        render: (date: string) => (
          <span className="text-muted-foreground">{dayjs(date).format('YYYY-MM-DD')}</span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Product</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'product_id',
        key: 'product_id',
        width: 200,
        sorter: (a, b) => getProductName(a.product_id).localeCompare(getProductName(b.product_id)),
        render: (productId: string | InventoryItem) => (
          <span className="text-foreground font-medium">{getProductName(productId)}</span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Type</span>
            <Filter className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'type',
        key: 'type',
        width: 150,
        render: (type: string) => (
          <Badge className={cn('px-3 py-1 text-xs font-medium rounded-full border', getTypeColor(type))}>
            {getTypeLabel(type)}
          </Badge>
        ),
        filters: [
          { text: 'Purchase', value: 'purchase' },
          { text: 'Sale', value: 'sale' },
          { text: 'Adjustment In', value: 'adjustment_in' },
          { text: 'Adjustment Out', value: 'adjustment_out' },
          { text: 'Return In', value: 'return_in' },
          { text: 'Return Out', value: 'return_out' },
        ],
        onFilter: (value, record) => record.type === value,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Reference</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'reference',
        key: 'reference',
        width: 150,
        sorter: (a, b) => (a.reference || '').localeCompare(b.reference || ''),
        render: (text: string) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Quantity</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'quantity',
        key: 'quantity',
        sorter: (a, b) => a.quantity - b.quantity,
        width: 100,
        render: (qty: number, record: InventoryTransaction) => {
          const isIncrease = ['purchase', 'adjustment_in', 'return_in'].includes(record.type)
          return (
            <span className={cn(
              "font-medium",
              isIncrease ? "text-green-400" : "text-red-400"
            )}>
              {isIncrease ? '+' : '-'}{qty.toLocaleString()}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Unit Cost</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'unit_cost',
        key: 'unit_cost',
        width: 120,
        sorter: (a, b) => a.unit_cost - b.unit_cost,
        render: (cost: number) => (
          <span className="text-foreground">
            AED {cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Total Cost</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'total_cost',
        key: 'total_cost',
        sorter: (a, b) => a.total_cost - b.total_cost,
        width: 130,
        render: (cost: number) => (
          <span className="text-foreground font-semibold">
            AED {cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Notes</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'notes',
        key: 'notes',
        width: 200,
        sorter: (a, b) => (a.notes || '').localeCompare(b.notes || ''),
        render: (text: string) => (
          <span className="text-muted-foreground" title={text || ''}>
            {text ? (text.length > 50 ? `${text.substring(0, 50)}...` : text) : '-'}
          </span>
        ),
      },
    ],
    [inventoryMap]
  )

  // Filter data client-side based on search query
  const filteredData = useMemo(() => {
    if (!q) return data
    const searchLower = q.toLowerCase()
    return data.filter(transaction => {
      const productName = getProductName(transaction.product_id).toLowerCase()
      const reference = (transaction.reference || '').toLowerCase()
      const notes = (transaction.notes || '').toLowerCase()
      const type = getTypeLabel(transaction.type).toLowerCase()
      const date = dayjs(transaction.date).format('YYYY-MM-DD').toLowerCase()
      return productName.includes(searchLower) || 
             reference.includes(searchLower) || 
             notes.includes(searchLower) ||
             type.includes(searchLower) ||
             date.includes(searchLower)
    })
  }, [data, q, inventoryMap])

  const onSearch = () => {
    // Search is handled by filteredData useMemo
    // Also try to filter by product if search matches a product
    if (q) {
      const searchLower = q.toLowerCase()
      const matchingItem = inventoryItems.find(item => 
        (item.product_name || item.name || '').toLowerCase().includes(searchLower) ||
        (item.sku || item.serialNumber || '').toLowerCase().includes(searchLower)
      )
      if (matchingItem && matchingItem._id !== productFilter) {
        setProductFilter(matchingItem._id)
      }
    } else {
      setProductFilter('')
    }
  }

  const onReset = () => {
    setQ('')
    setProductFilter('')
    setTypeFilter('')
  }

  const onChange = (_p: TablePaginationConfig) => {
    // future: server-side pagination
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/inventory/manage')}
            className="border-border hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Stock Movement Ledger
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track all inventory movements • <span className="font-semibold text-foreground">{data.length}</span> transactions
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name or SKU..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="pl-10 pr-10 h-11 border-border focus:border-primary focus:ring-primary"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onSearch}
            className="shadow-sm hover:shadow-md transition-shadow flex-shrink-0"
            size="lg"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Search</span>
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="lg"
            className="border-border hover:bg-muted/50 flex-shrink-0"
          >
            Reset
          </Button>
        </div>
      </motion.div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-card rounded-lg border border-border shadow-sm overflow-hidden"
      >
        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          rowKey="_id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} transactions`,
          }}
          onChange={onChange}
        />
      </motion.div>
    </div>
  )
}

