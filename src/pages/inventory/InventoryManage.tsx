import { useEffect, useMemo, useState } from 'react'
import { Table, Tag, Popconfirm, message, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, X, Plus, Package, ArrowUpDown, Filter, Download, FileSpreadsheet, FileText, Printer, ChevronDown, Eye, Edit, Trash2, DollarSign, TrendingUp, History, Trash } from 'lucide-react'
import { InventoryAPI, SupplierAPI, BrandAPI, UnitAPI, type InventoryItem, type Supplier, type Brand, type Unit } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { ColumnsDropdown } from '@/components/ColumnsDropdown'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'

export default function InventoryManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [q, setQ] = useState('')
  const [materialCostModalVisible, setMaterialCostModalVisible] = useState(false)
  const [priceHistoryModalVisible, setPriceHistoryModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [priceHistory, setPriceHistory] = useState<{
    averagePrice: number
    purchaseCount: number
    totalQuantity: number
    priceHistory: Array<{ date: string; unit_cost: number; quantity: number; reference: string }>
  } | null>(null)
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false)

  const INVENTORY_COLUMN_KEYS = ['sku', 'product_name', 'description', 'supplier', 'brand', 'current_qty', 'qty_sold', 'total_qty', 'unit', 'unit_price', 'materialCost', 'vat_amount', 'total_cost', 'average_purchase_price', 'tax_percent', 'productionDate', 'expiryDate', 'status'] as const
  const INVENTORY_COLUMN_LABELS: Record<string, string> = {
    sku: 'SKU',
    product_name: 'Product Name',
    description: 'Description',
    supplier: 'Supplier',
    brand: 'Brand',
    current_qty: 'Current QTY in Hand',
    qty_sold: 'QTY Sold',
    total_qty: 'Total QTY',
    unit: 'Unit',
    unit_price: 'Unit Price',
    materialCost: 'Material Cost',
    vat_amount: 'VAT Amount',
    total_cost: 'Total Cost',
    average_purchase_price: 'Avg Purchase Price',
    tax_percent: 'Tax %',
    productionDate: 'Production Date',
    expiryDate: 'Expiry Date',
    status: 'Status',
  }
  const { visibleColumns, toggleColumn, columnKeys: invColumnKeys, columnLabels: invColumnLabels } = useColumnVisibility(
    'inventory-visible-columns',
    INVENTORY_COLUMN_KEYS,
    INVENTORY_COLUMN_LABELS
  )

  const navigate = useNavigate()

  // Create lookup maps for suppliers, brands, and units
  const supplierMap = useMemo(() => {
    const map = new Map<string, string>()
    suppliers.forEach(s => map.set(s._id, s.name))
    return map
  }, [suppliers])

  const brandMap = useMemo(() => {
    const map = new Map<string, string>()
    brands.forEach(b => map.set(b._id, b.name))
    return map
  }, [brands])

  const unitMap = useMemo(() => {
    const map = new Map<string, string>()
    units.forEach(u => map.set(u._id, u.name))
    return map
  }, [units])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all data; search is done client-side with case-insensitive match across all columns
      const res = await InventoryAPI.list()
      setData(res.data.data)
    } finally {
      setLoading(false)
    }
  }

  const fetchReferenceData = async () => {
    try {
      const [suppliersRes, brandsRes, unitsRes] = await Promise.all([
        SupplierAPI.list(),
        BrandAPI.list(),
        UnitAPI.list(),
      ])
      setSuppliers(suppliersRes.data.data)
      setBrands(brandsRes.data.data)
      setUnits(unitsRes.data.data)
    } catch (error) {
      console.error('Error fetching reference data:', error)
    }
  }

  useEffect(() => {
    fetchReferenceData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleView = (item: InventoryItem) => {
    // Navigate to view page or open modal
    navigate(`/inventory/view/${item._id}`)
  }

  const handleEdit = (item: InventoryItem) => {
    navigate(`/inventory/edit/${item._id}`)
  }

  const handleDelete = async (id: string) => {
    try {
      await InventoryAPI.remove(id)
      message.success('Inventory item deleted successfully')
      fetchData()
    } catch (error) {
      message.error('Failed to delete inventory item')
      console.error('Error deleting inventory item:', error)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select items to delete')
      return
    }
    setBulkDeleteModalVisible(true)
  }

  const handleBulkDeleteConfirm = async () => {
    if (selectedRowKeys.length === 0) {
      return
    }

    setBulkDeleteLoading(true)
    try {
      const deletePromises = selectedRowKeys.map((key) => InventoryAPI.remove(key as string))
      await Promise.all(deletePromises)
      message.success(`Successfully deleted ${selectedRowKeys.length} item(s)`)
      setSelectedRowKeys([])
      setBulkDeleteModalVisible(false)
      fetchData()
    } catch (error) {
      message.error('Failed to delete some items')
      console.error('Error deleting items:', error)
      fetchData() // Refresh to show current state
    } finally {
      setBulkDeleteLoading(false)
    }
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys)
    },
    getCheckboxProps: (record: InventoryItem) => ({
      disabled: false,
    }),
  }

  // Client-side filtering with case-insensitive search across all columns (text + numeric)
  const filteredData = useMemo(() => {
    if (!q.trim()) return data
    const searchLower = q.trim().toLowerCase()
    return data.filter((item) => {
      const qty = item.quantity_on_hand ?? item.qty ?? 0
      const status = item.status || 'normal'
      const statusLabel = status === 'pending_purchase'
        ? 'pending purchase'
        : status === 'pending_delivery'
          ? 'pending delivery'
          : qty > 0
            ? 'in stock'
            : 'out of stock'
      const unitCost = item.unit_cost ?? item.costPrice ?? 0
      const materialCost = item.materialCostComponents?.reduce((sum, comp) => sum + (comp.amount || 0), 0) || 0
      const vatPercent = item.tax_percent ?? item.vat ?? 0
      const vatAmount = unitCost * (vatPercent / 100)
      const totalCost = unitCost + materialCost + vatAmount
      const values: string[] = [
        item.sku || item.serialNumber || '',
        item.product_name || item.name || '',
        item.description || '',
        item.category || '',
        typeof item.supplier === 'object' && item.supplier?.name
          ? item.supplier.name
          : supplierMap.get(typeof item.supplier === 'string' ? item.supplier : item.supplier?._id || '') || '',
        typeof item.brand === 'object' && item.brand?.name
          ? item.brand.name
          : brandMap.get(typeof item.brand === 'string' ? item.brand : item.brand?._id || '') || '',
        typeof item.unit === 'object' && item.unit?.name
          ? item.unit.name
          : unitMap.get(typeof item.unit === 'string' ? item.unit : item.unit?._id || '') || '',
        status,
        statusLabel,
        item.is_active !== false ? 'active' : 'inactive',
        item.productionDate ? dayjs(item.productionDate).format('YYYY-MM-DD') : '',
        item.expiryDate ? dayjs(item.expiryDate).format('YYYY-MM-DD') : '',
        (item.tax_percent ?? item.vat) ? `${item.tax_percent ?? item.vat}%` : '',
        ...(item.materialCostComponents?.flatMap((c) => [c.account_name || '', c.description || '']) ?? []),
        // Numeric columns - include as strings so "75" matches quantity 75, price 75, etc.
        String(qty),
        String((item as any).qty_sold ?? 0),
        String((item as any).total_qty ?? 0),
        String(unitCost),
        String(materialCost),
        String(Math.round(vatAmount * 100) / 100),
        String(Math.round(totalCost * 100) / 100),
        String(item.average_purchase_price ?? 0),
        String(item.reorder_level ?? ''),
      ]
      return values.some((v) => v.toLowerCase().includes(searchLower))
    })
  }, [data, q, supplierMap, brandMap, unitMap])

  const columns: ColumnsType<InventoryItem> = useMemo(
    () => [
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>SKU</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'sku',
        key: 'sku',
        sorter: (a, b) => (a.sku || a.serialNumber || '').localeCompare(b.sku || b.serialNumber || ''),
        width: 150,
        render: (_: any, record: InventoryItem) => (
          <span className="text-foreground font-medium">{record.sku || record.serialNumber || '-'}</span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Product Name</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'product_name',
        key: 'product_name',
        sorter: (a, b) => (a.product_name || a.name || '').localeCompare(b.product_name || b.name || ''),
        width: 200,
        render: (_: any, record: InventoryItem) => (
          <span className="text-foreground font-medium">{record.product_name || record.name || '-'}</span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Description</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'description',
        key: 'description',
        width: 250,
        sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
        render: (text) => (
          <span className="text-muted-foreground" title={text || ''}>
            {text ? (text.length > 50 ? `${text.substring(0, 50)}...` : text) : '-'}
          </span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Supplier</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'supplier',
        key: 'supplier',
        width: 150,
        sorter: (a, b) => {
          const getSupplierName = (supplier: any) => {
            if (!supplier) return ''
            if (typeof supplier === 'object' && supplier?.name) return supplier.name
            return supplierMap.get(supplier?._id || supplier || '') || ''
          }
          return getSupplierName(a.supplier).localeCompare(getSupplierName(b.supplier))
        },
        render: (supplier) => {
          // Handle both string ID and populated object
          const supplierId = typeof supplier === 'string' ? supplier : supplier?._id
          const supplierName = typeof supplier === 'object' && supplier?.name ? supplier.name : supplierMap.get(supplierId || '')
          return <span className="text-muted-foreground">{supplierName || supplierId || '-'}</span>
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Brand</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'brand',
        key: 'brand',
        width: 120,
        sorter: (a, b) => {
          const getBrandName = (brand: any) => {
            if (!brand) return ''
            if (typeof brand === 'object' && brand?.name) return brand.name
            return brandMap.get(brand?._id || brand || '') || ''
          }
          return getBrandName(a.brand).localeCompare(getBrandName(b.brand))
        },
        render: (brand) => {
          if (!brand) return <span className="text-muted-foreground">-</span>
          // Handle both string ID and populated object
          const brandId = typeof brand === 'string' ? brand : brand?._id
          const brandName = typeof brand === 'object' && brand?.name ? brand.name : brandMap.get(brandId || '')
          return <span className="text-muted-foreground">{brandName || brandId || '-'}</span>
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Current QTY in Hand</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'quantity_on_hand',
        key: 'current_qty',
        sorter: (a, b) => (a.quantity_on_hand || a.qty || 0) - (b.quantity_on_hand || b.qty || 0),
        width: 150,
        render: (_: any, record: InventoryItem) => {
          const qty = record.quantity_on_hand ?? record.qty ?? 0
          const reorderLevel = record.reorder_level
          const isLowStock = reorderLevel !== undefined && qty <= reorderLevel
          return (
            <span className={cn(
              "font-medium",
              isLowStock ? "text-red-400" : "text-foreground"
            )}>
              {qty.toLocaleString()}
              {isLowStock && <span className="ml-1 text-xs">⚠️</span>}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>QTY Sold</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'qty_sold',
        key: 'qty_sold',
        sorter: (a: any, b: any) => (a.qty_sold || 0) - (b.qty_sold || 0),
        width: 120,
        render: (_: any, record: any) => {
          const qtySold = record.qty_sold || 0
          return (
            <span className="text-foreground font-medium">
              {qtySold.toLocaleString()}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Total QTY</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'total_qty',
        key: 'total_qty',
        sorter: (a: any, b: any) => (a.total_qty || 0) - (b.total_qty || 0),
        width: 120,
        render: (_: any, record: any) => {
          const totalQty = record.total_qty || 0
          return (
            <span className="text-foreground font-medium">
              {totalQty.toLocaleString()}
            </span>
          )
        },
      },
      {
        title: <span className="text-foreground font-semibold">Unit</span>,
        dataIndex: 'unit',
        key: 'unit',
        width: 100,
        render: (unit) => {
          if (!unit) return <span className="text-muted-foreground">-</span>
          // Handle both string ID and populated object
          const unitId = typeof unit === 'string' ? unit : unit?._id
          const unitName = typeof unit === 'object' && unit?.name ? unit.name : unitMap.get(unitId || '')
          return <span className="text-muted-foreground">{unitName || unitId || '-'}</span>
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Unit Price</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'unit_price',
        key: 'unit_price',
        sorter: (a, b) => (a.unit_cost ?? a.costPrice ?? 0) - (b.unit_cost ?? b.costPrice ?? 0),
        width: 130,
        render: (_: any, record: InventoryItem) => {
          const unitPrice = record.unit_cost ?? record.costPrice ?? 0
          return (
            <span className="text-foreground font-medium">
              AED {unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Material Cost</span>
          </div>
        ),
        dataIndex: 'materialCostComponents',
        key: 'materialCost',
        width: 150,
        render: (_: any, record: InventoryItem) => {
          if (!record.materialCostComponents || record.materialCostComponents.length === 0) {
            return <span className="text-muted-foreground">-</span>
          }
          const totalMaterialCost = record.materialCostComponents.reduce((sum, comp) => sum + (comp.amount || 0), 0)
          return (
            <span 
              className="text-blue-400 font-medium cursor-pointer hover:text-blue-300 hover:underline transition-colors"
              onClick={() => {
                setSelectedItem(record)
                setMaterialCostModalVisible(true)
              }}
              title="Click to view material cost breakdown"
            >
              AED {totalMaterialCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>VAT Amount</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'vat_amount',
        key: 'vat_amount',
        sorter: (a, b) => {
          const unitCostA = a.unit_cost ?? a.costPrice ?? 0
          const vatPercentA = a.tax_percent ?? a.vat ?? 0
          const vatAmountA = unitCostA * (vatPercentA / 100)
          
          const unitCostB = b.unit_cost ?? b.costPrice ?? 0
          const vatPercentB = b.tax_percent ?? b.vat ?? 0
          const vatAmountB = unitCostB * (vatPercentB / 100)
          
          return vatAmountA - vatAmountB
        },
        width: 130,
        render: (_: any, record: InventoryItem) => {
          const unitCost = record.unit_cost ?? record.costPrice ?? 0
          const vatPercent = record.tax_percent ?? record.vat ?? 0
          const vatAmount = Math.round(unitCost * (vatPercent / 100) * 100) / 100
          return (
            <span className="text-foreground font-medium">
              AED {vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )
        },
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
        sorter: (a, b) => {
          const unitCostA = a.unit_cost ?? a.costPrice ?? 0
          const materialCostA = a.materialCostComponents?.reduce((sum, comp) => sum + (comp.amount || 0), 0) || 0
          const vatPercentA = a.tax_percent ?? a.vat ?? 0
          const vatAmountA = unitCostA * (vatPercentA / 100)
          const totalCostA = unitCostA + materialCostA + vatAmountA
          
          const unitCostB = b.unit_cost ?? b.costPrice ?? 0
          const materialCostB = b.materialCostComponents?.reduce((sum, comp) => sum + (comp.amount || 0), 0) || 0
          const vatPercentB = b.tax_percent ?? b.vat ?? 0
          const vatAmountB = unitCostB * (vatPercentB / 100)
          const totalCostB = unitCostB + materialCostB + vatAmountB
          
          return totalCostA - totalCostB
        },
        width: 150,
        render: (_: any, record: InventoryItem) => {
          const unitCost = record.unit_cost ?? record.costPrice ?? 0
          const materialCost = record.materialCostComponents?.reduce((sum, comp) => sum + (comp.amount || 0), 0) || 0
          const vatPercent = record.tax_percent ?? record.vat ?? 0
          const vatAmount = unitCost * (vatPercent / 100)
          const totalCost = Math.round((unitCost + materialCost + vatAmount) * 100) / 100
          const hasMaterialCost = record.materialCostComponents && record.materialCostComponents.length > 0
          return (
            <span 
              className={cn(
                "text-foreground font-medium",
                hasMaterialCost && "cursor-pointer hover:text-blue-400 hover:underline transition-colors"
              )}
              onClick={() => {
                if (hasMaterialCost) {
                  setSelectedItem(record)
                  setMaterialCostModalVisible(true)
                }
              }}
              title={hasMaterialCost ? "Click to view material cost breakdown" : undefined}
            >
              AED {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Avg Purchase Price</span>
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'average_purchase_price',
        key: 'average_purchase_price',
        sorter: (a, b) => (a.average_purchase_price || 0) - (b.average_purchase_price || 0),
        width: 160,
        render: (_: any, record: InventoryItem) => {
          const avgPrice = record.average_purchase_price
          const purchaseCount = record.purchase_count || 0
          const hasPriceHistory = purchaseCount > 0 && avgPrice !== undefined && avgPrice > 0
          
          if (!hasPriceHistory) {
            return <span className="text-muted-foreground">-</span>
          }
          
          return (
            <span 
              className="text-green-400 font-medium cursor-pointer hover:text-green-300 hover:underline transition-colors flex items-center gap-1"
              onClick={async () => {
                setSelectedItem(record)
                setLoadingPriceHistory(true)
                setPriceHistoryModalVisible(true)
                try {
                  const res = await InventoryAPI.getPriceHistory(record._id)
                  setPriceHistory(res.data.data)
                } catch (error) {
                  console.error('Error fetching price history:', error)
                  message.error('Failed to load price history')
                } finally {
                  setLoadingPriceHistory(false)
                }
              }}
              title="Click to view price history"
            >
              AED {avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <History className="h-3 w-3 text-green-500" />
            </span>
          )
        },
      },
      {
        title: <span className="text-foreground font-semibold">Tax %</span>,
        dataIndex: 'tax_percent',
        key: 'tax_percent',
        width: 100,
        render: (_: any, record: InventoryItem) => {
          const tax = record.tax_percent ?? record.vat
          return <span className="text-muted-foreground">{tax ? `${tax}%` : '-'}</span>
        },
      },
      {
        title: <span className="text-foreground font-semibold">Production Date</span>,
        dataIndex: 'productionDate',
        key: 'productionDate',
        width: 130,
        render: (date) => (
          <span className="text-muted-foreground">
            {date ? dayjs(date).format('YYYY-MM-DD') : '-'}
          </span>
        ),
      },
      {
        title: <span className="text-foreground font-semibold">Expiry Date</span>,
        dataIndex: 'expiryDate',
        key: 'expiryDate',
        width: 130,
        render: (date) => (
          <span className="text-muted-foreground">
            {date ? dayjs(date).format('YYYY-MM-DD') : '-'}
          </span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Status</span>
            <Filter className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        key: 'status',
        width: 150,
        render: (_, r) => {
          const status = r.status || 'normal'
          const qty = r.quantity_on_hand ?? r.qty ?? 0
          const isActive = r.is_active !== false
          const statusConfig: Record<string, { label: string; className: string }> = {
            normal: {
              label: qty > 0 ? 'In Stock' : 'Out of Stock',
              className: qty > 0
                ? 'bg-green-500/15 text-green-300 border-green-500/30 hover:bg-green-500/15'
                : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/15',
            },
            pending_purchase: {
              label: 'Pending Purchase',
              className: 'bg-orange-500/15 text-orange-300 border-orange-500/30 hover:bg-orange-500/15',
            },
            pending_delivery: {
              label: 'Pending Delivery',
              className: 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/15',
            },
          }
          const config = statusConfig[status] || statusConfig.normal
          return (
            <div className="flex items-center gap-2">
              <Badge className={cn('px-3 py-1 text-xs font-medium rounded-full border', config.className)}>
                {config.label}
              </Badge>
              {!isActive && (
                <Badge className="px-2 py-1 text-xs font-medium rounded-full border bg-muted text-foreground">
                  Inactive
                </Badge>
              )}
            </div>
          )
        },
        filters: [
          { text: 'In Stock', value: 'normal_in' },
          { text: 'Out of Stock', value: 'normal_out' },
          { text: 'Pending Purchase', value: 'pending_purchase' },
          { text: 'Pending Delivery', value: 'pending_delivery' },
          { text: 'Active', value: 'active' },
          { text: 'Inactive', value: 'inactive' },
        ],
        onFilter: (value, record) => {
          const status = record.status || 'normal'
          const qty = record.quantity_on_hand ?? record.qty ?? 0
          const isActive = record.is_active !== false
          if (value === 'normal_in') return status === 'normal' && qty > 0
          if (value === 'normal_out') return status === 'normal' && qty <= 0
          if (value === 'pending_purchase') return status === 'pending_purchase'
          if (value === 'pending_delivery') return status === 'pending_delivery'
          if (value === 'active') return isActive
          if (value === 'inactive') return !isActive
          return true
        },
      },
      {
        title: <span className="text-foreground font-semibold">Actions</span>,
        key: 'actions',
        width: 150,
        fixed: 'right' as const,
        render: (_, record) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleView(record)}
              className="border-blue-500/30 hover:bg-blue-500/10"
              title="View"
            >
              <Eye className="h-3 w-3 text-blue-400" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(record)}
              className="border-green-500/30 hover:bg-green-500/10"
              title="Edit"
            >
              <Edit className="h-3 w-3 text-green-400" />
            </Button>
            <Popconfirm
              title="Delete inventory item"
              description="Are you sure you want to delete this item?"
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/30 hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 className="h-3 w-3 text-red-400" />
              </Button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [supplierMap, brandMap, unitMap]
  )

  const visibleColumnsList = useMemo(() => {
    return columns.filter((col) => col.key === 'actions' || visibleColumns[col.key as string] !== false)
  }, [columns, visibleColumns])

  const onSearch = () => fetchData()

  const onReset = () => {
    setQ('')
  }


  // Export to Excel (exports filtered results when search is active)
  const exportToExcel = () => {
    const worksheetData = [
      ['SKU', 'Product Name', 'Description', 'Supplier', 'Brand', 'Current QTY in Hand', 'QTY Sold', 'Total QTY', 'Unit', 'Unit Price', 'Material Cost', 'VAT Amount', 'Total Cost', 'Tax %', 'Status'],
      ...filteredData.map((item) => {
        // Handle supplier (can be string ID or object)
        const supplierId = typeof item.supplier === 'string' ? item.supplier : item.supplier?._id
        const supplierName = typeof item.supplier === 'object' && item.supplier?.name 
          ? item.supplier.name 
          : supplierMap.get(supplierId || '') || supplierId || '-'
        
        // Handle brand (can be string ID or object)
        const brandId = typeof item.brand === 'string' ? item.brand : item.brand?._id
        const brandName = item.brand 
          ? (typeof item.brand === 'object' && item.brand?.name 
              ? item.brand.name 
              : brandMap.get(brandId || '') || brandId || '-')
          : '-'
        
        // Handle unit (can be string ID or object)
        const unitId = typeof item.unit === 'string' ? item.unit : item.unit?._id
        const unitName = item.unit 
          ? (typeof item.unit === 'object' && item.unit?.name 
              ? item.unit.name 
              : unitMap.get(unitId || '') || unitId || '-')
          : '-'
        
        const status = item.status || 'normal'
        const qty = item.quantity_on_hand ?? item.qty ?? 0
        const isActive = item.is_active !== false
        let statusLabel = qty > 0 ? 'In Stock' : 'Out of Stock'
        if (status === 'pending_purchase') statusLabel = 'Pending Purchase'
        else if (status === 'pending_delivery') statusLabel = 'Pending Delivery'
        if (!isActive) statusLabel += ' (Inactive)'
        
        const unitCost = item.unit_cost ?? item.costPrice ?? 0
        const materialCost = item.materialCostComponents?.reduce((sum, comp) => sum + (comp.amount || 0), 0) || 0
        const vatPercent = item.tax_percent ?? item.vat ?? 0
        const vatAmount = Math.round(unitCost * (vatPercent / 100) * 100) / 100
        const totalCost = Math.round((unitCost + materialCost + vatAmount) * 100) / 100
        
        return [
          item.sku || item.serialNumber || '-',
          item.product_name || item.name || '-',
          item.description || '-',
          supplierName,
          brandName,
          qty,
          (item as any).qty_sold || 0,
          (item as any).total_qty || 0,
          unitName,
          `AED ${unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          materialCost > 0 ? `AED ${materialCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
          vatAmount > 0 ? `AED ${vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
          `AED ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          vatPercent > 0 ? `${vatPercent}%` : '-',
          statusLabel,
        ]
      }),
    ]

    const ws = XLSX.utils.aoa_to_sheet(worksheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')

    // Set column widths
    const colWidths = [
      { wch: 15 }, // SKU
      { wch: 30 }, // Product Name
      { wch: 40 }, // Description
      { wch: 20 }, // Supplier
      { wch: 15 }, // Brand
      { wch: 18 }, // Current QTY in Hand
      { wch: 12 }, // QTY Sold
      { wch: 12 }, // Total QTY
      { wch: 10 }, // Unit
      { wch: 12 }, // Unit Price
      { wch: 15 }, // Material Cost
      { wch: 12 }, // VAT Amount
      { wch: 15 }, // Total Cost
      { wch: 10 }, // Tax %
      { wch: 15 }, // Status
    ]
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `Inventory_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape')
    
    // Add title
    doc.setFontSize(18)
    doc.text('Inventory Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)
    doc.text(`Total Items: ${filteredData.length}`, 14, 27)

    // Prepare table data
    const tableData = filteredData.map((item) => {
      // Handle supplier (can be string ID or object)
      const supplierId = typeof item.supplier === 'string' ? item.supplier : item.supplier?._id
      const supplierName = typeof item.supplier === 'object' && item.supplier?.name 
        ? item.supplier.name 
        : supplierMap.get(supplierId || '') || supplierId || '-'
      
      // Handle brand (can be string ID or object)
      const brandId = typeof item.brand === 'string' ? item.brand : item.brand?._id
      const brandName = item.brand 
        ? (typeof item.brand === 'object' && item.brand?.name 
            ? item.brand.name 
            : brandMap.get(brandId || '') || brandId || '-')
        : '-'
      
      // Handle unit (can be string ID or object)
      const unitId = typeof item.unit === 'string' ? item.unit : item.unit?._id
      const unitName = item.unit 
        ? (typeof item.unit === 'object' && item.unit?.name 
            ? item.unit.name 
            : unitMap.get(unitId || '') || unitId || '-')
        : '-'
      
      const status = item.status || 'normal'
      const qty = item.quantity_on_hand ?? item.qty ?? 0
      let statusLabel = qty > 0 ? 'In Stock' : 'Out of Stock'
      if (status === 'pending_purchase') statusLabel = 'Pending Purchase'
      else if (status === 'pending_delivery') statusLabel = 'Pending Delivery'
      
      const unitCost = item.unit_cost ?? item.costPrice ?? 0
      const materialCost = item.materialCostComponents?.reduce((sum, comp) => sum + (comp.amount || 0), 0) || 0
      const vatPercent = item.tax_percent ?? item.vat ?? 0
      const vatAmount = Math.round(unitCost * (vatPercent / 100) * 100) / 100
      const totalCost = Math.round((unitCost + materialCost + vatAmount) * 100) / 100
      
      return [
        item.sku || item.serialNumber || '-',
        item.product_name || item.name || '-',
        item.description || '-',
        supplierName,
        brandName,
        qty.toString(),
        (item as any).qty_sold || 0,
        (item as any).total_qty || 0,
        unitName,
        `AED ${unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        materialCost > 0 ? `AED ${materialCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
        vatAmount > 0 ? `AED ${vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
        `AED ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        vatPercent > 0 ? `${vatPercent}%` : '-',
        statusLabel,
      ]
    })

    // Add table
    autoTable(doc, {
      head: [['SKU', 'Product Name', 'Description', 'Supplier', 'Brand', 'Current QTY in Hand', 'QTY Sold', 'Total QTY', 'Unit', 'Unit Price', 'Material Cost', 'VAT Amount', 'Total Cost', 'VAT %', 'Status']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 32 },
    })

    doc.save(`Inventory_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Print table with pagination support (prints filtered results when search is active)
  const printTable = () => {
    const printData = filteredData.map((item, index) => {
      // Handle supplier (can be string ID or object)
      const supplierId = typeof item.supplier === 'string' ? item.supplier : item.supplier?._id
      const supplierName = typeof item.supplier === 'object' && item.supplier?.name 
        ? item.supplier.name 
        : supplierMap.get(supplierId || '') || supplierId || '-'
      
      // Handle brand (can be string ID or object)
      const brandId = typeof item.brand === 'string' ? item.brand : item.brand?._id
      const brandName = item.brand 
        ? (typeof item.brand === 'object' && item.brand?.name 
            ? item.brand.name 
            : brandMap.get(brandId || '') || brandId || '-')
        : '-'
      
      // Handle unit (can be string ID or object)
      const unitId = typeof item.unit === 'string' ? item.unit : item.unit?._id
      const unitName = item.unit 
        ? (typeof item.unit === 'object' && item.unit?.name 
            ? item.unit.name 
            : unitMap.get(unitId || '') || unitId || '-')
        : '-'
      
      const status = item.status || 'normal'
      let statusLabel = item.qty > 0 ? 'In Stock' : 'Out of Stock'
      if (status === 'pending_purchase') statusLabel = 'Pending Purchase'
      else if (status === 'pending_delivery') statusLabel = 'Pending Delivery'
      
      return {
        'SL No': item.serialNumber,
        Name: item.name,
        Description: item.description || '-',
        Supplier: supplierName,
        Brand: brandName,
        Qty: item.qty,
        Unit: unitName,
        'Unit Price': (() => {
          const unitCost = item.unit_cost ?? item.costPrice ?? 0
          return `AED ${unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        })(),
        'Material Cost': (() => {
          const materialCost = item.materialCostComponents?.reduce((sum, comp) => sum + (comp.amount || 0), 0) || 0
          return materialCost > 0 ? `AED ${materialCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
        })(),
        'VAT Amount': (() => {
          const unitCost = item.unit_cost ?? item.costPrice ?? 0
          const materialCost = item.materialCostComponents?.reduce((sum, comp) => sum + (comp.amount || 0), 0) || 0
          const vatPercent = item.tax_percent ?? item.vat ?? 0
          const vatAmount = Math.round((unitCost + materialCost) * (vatPercent / 100) * 100) / 100
          return vatAmount > 0 ? `AED ${vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
        })(),
        'Total Cost': (() => {
          const unitCost = item.unit_cost ?? item.costPrice ?? 0
          const materialCost = item.materialCostComponents?.reduce((sum, comp) => sum + (comp.amount || 0), 0) || 0
          const vatPercent = item.tax_percent ?? item.vat ?? 0
          const vatAmount = Math.round((unitCost + materialCost) * (vatPercent / 100) * 100) / 100
          const totalCost = Math.round((unitCost + materialCost + vatAmount) * 100) / 100
          return `AED ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        })(),
        'VAT %': (item.tax_percent ?? item.vat) ? `${item.tax_percent ?? item.vat}%` : '-',
        'Production Date': item.productionDate ? dayjs(item.productionDate).format('YYYY-MM-DD') : '-',
        'Expiry Date': item.expiryDate ? dayjs(item.expiryDate).format('YYYY-MM-DD') : '-',
        Status: statusLabel,
      }
    })

    // Create HTML table
    const tableRows = printData
      .map(
        (row, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${row['SL No']}</td>
        <td>${row.Name}</td>
        <td>${row.Description}</td>
        <td>${row.Supplier}</td>
        <td>${row.Brand}</td>
        <td>${row.Qty}</td>
        <td>${row.Unit}</td>
        <td>${row['Unit Price']}</td>
        <td>${row['Material Cost']}</td>
        <td>${row['VAT Amount']}</td>
        <td>${row['Total Cost']}</td>
        <td>${row['VAT %']}</td>
        <td>${row['Production Date']}</td>
        <td>${row['Expiry Date']}</td>
        <td>${row.Status}</td>
      </tr>
    `
      )
      .join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              size: landscape;
              margin: 0;
            }
            @media print {
              @page {
                size: landscape;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 15px;
              }
              table {
                page-break-after: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              thead {
                display: table-header-group;
              }
              tfoot {
                display: table-footer-group;
              }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 15px;
            }
            h1 {
              font-size: 24px;
              font-weight: bold;
              color: #10b981;
              margin: 0 0 15px 0;
              padding: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th {
              background-color: #22c55e;
              color: white;
              padding: 10px 8px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #ddd;
            }
            td {
              padding: 8px;
              border: 1px solid #ddd;
            }
            tr:nth-child(even) {
              background-color: #f5f5f5;
            }
          </style>
        </head>
        <body>
          <h1>Inventory</h1>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>SL No</th>
                <th>Name</th>
                <th>Description</th>
                <th>Supplier</th>
                <th>Brand</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Material Cost</th>
                <th>VAT Amount</th>
                <th>Total Cost</th>
                <th>VAT %</th>
                <th>Production Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `

    // Create blob URL to avoid "about:blank"
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    
    if (!printWindow) {
      URL.revokeObjectURL(url)
      return
    }

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        // Clean up and close after printing
        setTimeout(() => {
          URL.revokeObjectURL(url)
          printWindow.close()
        }, 100)
      }, 250)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage your inventory items •{' '}
            <span className="font-semibold text-foreground">
              {q.trim() ? `${filteredData.length} of ${data.length}` : data.length} item{data.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/inventory/transactions')}
            variant="outline"
            className="shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto"
            size="lg"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Stock Movements</span>
            <span className="sm:hidden">Movements</span>
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button
              onClick={handleBulkDeleteClick}
              variant="outline"
              className="shadow-sm hover:shadow-md transition-shadow border-red-500/30 hover:bg-red-500/10 hover:border-red-500/30 text-red-400 w-full sm:w-auto"
              size="lg"
              disabled={bulkDeleteLoading}
            >
              <Trash className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Delete ({selectedRowKeys.length})</span>
              <span className="sm:hidden">Delete</span>
            </Button>
          )}
          <Button
            onClick={() => navigate('/inventory/create')}
            className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Item</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </motion.div>

      {/* Search Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory by name, serial number, or description..."
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="border-border hover:bg-muted/50 flex-shrink-0"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="h-4 w-4 hidden sm:inline ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-400" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2 text-red-400" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={printTable}
            variant="outline"
            size="lg"
            className="border-border hover:bg-muted/50 flex-shrink-0"
          >
            <Printer className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <ColumnsDropdown
            columnKeys={invColumnKeys}
            columnLabels={invColumnLabels}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
          />
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
          rowKey="_id"
          loading={loading}
          columns={visibleColumnsList}
          dataSource={filteredData}
          rowSelection={rowSelection}
          scroll={{ x: 1800 }}
          onChange={(pagination, filters, sorter) => {
            console.log('InventoryManage - Pagination changed:', {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
            })
          }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number, range: [number, number]) => (
              <span className="text-muted-foreground text-sm">
                Showing {range[0]}-{range[1]} of {total} {total === 1 ? 'item' : 'items'}
              </span>
            ),
            pageSizeOptions: ['10', '20', '50', '100'],
            className: 'px-6 py-4',
          }}
          locale={{
            emptyText: (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-muted rounded-full blur-xl opacity-50" />
                    <Package className="h-16 w-16 text-muted-foreground relative z-10" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No inventory items found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q
                    ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                    : 'Get started by creating your first inventory item.'}
                </p>
                {!q && (
                  <Button
                    onClick={() => navigate('/inventory/create')}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Plus className="h-4 w-4" />
                    Create Item
                  </Button>
                )}
              </div>
            ),
          }}
          className="[&_.ant-table-thead>tr>th]:bg-muted/50 [&_.ant-table-thead>tr>th]:border-b-2 [&_.ant-table-thead>tr>th]:border-border [&_.ant-table-thead>tr>th]:text-foreground [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:py-4 [&_.ant-table-tbody>tr>td]:py-4 [&_.ant-table-tbody>tr:hover]:bg-muted/50 [&_.ant-table-tbody>tr]:transition-colors [&_.ant-table]:rounded-lg"
        />
      </motion.div>

      {/* Material Cost Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-400" />
            <span>Material Cost Breakdown</span>
          </div>
        }
        open={materialCostModalVisible}
        onCancel={() => {
          setMaterialCostModalVisible(false)
          setSelectedItem(null)
        }}
        footer={null}
        width={600}
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Product:</span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedItem.product_name || selectedItem.name || selectedItem.sku || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">SKU:</span>
                <span className="text-sm text-foreground">
                  {selectedItem.sku || selectedItem.serialNumber || '-'}
                </span>
              </div>
            </div>

            {selectedItem.materialCostComponents && selectedItem.materialCostComponents.length > 0 ? (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Material Cost Components:</h4>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground border-b border-border">
                            Account
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground border-b border-border">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-foreground border-b border-border">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItem.materialCostComponents.map((component, index) => (
                          <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground">
                              {component.account_name || component.account_id || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {component.description || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground text-right">
                              AED {component.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-blue-500/10">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-foreground">
                            Total Material Cost:
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-400 text-right">
                            AED {selectedItem.materialCostComponents
                              .reduce((sum, comp) => sum + (comp.amount || 0), 0)
                              .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Unit Cost:</span>
                    <span className="text-sm font-semibold text-foreground">
                      AED {(selectedItem.unit_cost ?? selectedItem.costPrice ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-500/30 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Price Inclusive:</span>
                    <span className="text-sm font-semibold text-foreground">
                      {selectedItem.priceInclusiveMaterialCost === false ? 'No' : 'Yes'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No material cost components available for this item.</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Price History Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-green-400" />
            <span>Purchase Price History</span>
          </div>
        }
        open={priceHistoryModalVisible}
        onCancel={() => {
          setPriceHistoryModalVisible(false)
          setSelectedItem(null)
          setPriceHistory(null)
        }}
        footer={null}
        width={700}
      >
        {loadingPriceHistory ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading price history...</div>
          </div>
        ) : selectedItem && priceHistory ? (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Product:</span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedItem.product_name || selectedItem.name || selectedItem.sku || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">SKU:</span>
                <span className="text-sm text-foreground">
                  {selectedItem.sku || selectedItem.serialNumber || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Average Purchase Price:</span>
                <span className="text-sm font-bold text-green-400">
                  AED {priceHistory.averagePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {priceHistory.priceHistory && priceHistory.priceHistory.length > 0 ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Purchase History:</h4>
                    <span className="text-xs text-muted-foreground">
                      {priceHistory.purchaseCount} purchase(s) • Total Qty: {priceHistory.totalQuantity}
                    </span>
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground border-b border-border">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-foreground border-b border-border">
                            Reference
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-foreground border-b border-border">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-foreground border-b border-border">
                            Unit Price
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-foreground border-b border-border">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.priceHistory.map((entry, index) => (
                          <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground">
                              {dayjs(entry.date).format('YYYY-MM-DD')}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {entry.reference || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground text-right">
                              {entry.quantity.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground text-right">
                              AED {entry.unit_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground text-right">
                              AED {(entry.unit_cost * entry.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-green-500/10">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-foreground">
                            Weighted Average:
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-green-400 text-right">
                            AED {priceHistory.averagePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-green-400 text-right">
                            AED {(priceHistory.averagePrice * priceHistory.totalQuantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No purchase history available for this item.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No price history data available.</p>
          </div>
        )}
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        title="Delete Selected Items"
        open={bulkDeleteModalVisible}
        onOk={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteModalVisible(false)}
        okText="Yes, Delete"
        okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
        cancelText="Cancel"
        confirmLoading={bulkDeleteLoading}
      >
        <p>
          Are you sure you want to delete <strong>{selectedRowKeys.length}</strong> item(s)? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
