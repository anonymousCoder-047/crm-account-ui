import { useEffect, useMemo, useState, useCallback } from 'react'
import { Table, Popconfirm, message, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, X, Plus, FileSpreadsheet, ArrowUpDown, Download, FileText, Printer, ChevronDown, Eye, Edit, Trash2, Trash, DollarSign, Receipt, Percent } from 'lucide-react'
import { PurchaseInvoiceAPI, SupplierAPI, type PurchaseInvoice, type Supplier } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { ColumnsDropdown } from '@/components/ColumnsDropdown'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import StatCard from '@/components/dashboard/StatCard'

export default function PurchaseInvoicesManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PurchaseInvoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [q, setQ] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false)
  const [monthFilter, setMonthFilter] = useState<string>('all')

  const PURCHASE_COLUMN_KEYS = ['invoice_number', 'vendor_id', 'invoice_date', 'quantity', 'total_amount', 'tax_amount', 'payment_status'] as const
  const PURCHASE_COLUMN_LABELS: Record<string, string> = {
    invoice_number: 'Invoice #',
    vendor_id: 'Vendor',
    invoice_date: 'Date',
    quantity: 'Quantity',
    total_amount: 'Total Amount',
    tax_amount: 'Tax Amount',
    payment_status: 'Payment Status',
  }
  const { visibleColumns, toggleColumn, columnKeys: purchaseColumnKeys, columnLabels: purchaseColumnLabels } = useColumnVisibility(
    'purchase-invoices-visible-columns',
    PURCHASE_COLUMN_KEYS,
    PURCHASE_COLUMN_LABELS
  )

  const navigate = useNavigate()

  // Create supplier lookup map
  const supplierMap = useMemo(() => {
    const map = new Map<string, string>()
    suppliers.forEach(s => map.set(s._id, s.name))
    return map
  }, [suppliers])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await PurchaseInvoiceAPI.list()
      setData(res.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch suppliers for lookup
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await SupplierAPI.list()
        setSuppliers(res.data.data)
      } catch (error) {
        console.error('Error fetching suppliers:', error)
      }
    }
    fetchSuppliers()
  }, [])

  // Handler functions - must be defined before columns
  const handleView = useCallback((item: PurchaseInvoice) => {
    navigate(`/purchase-invoices/view/${item._id}`)
  }, [navigate])

  const handleEdit = useCallback((item: PurchaseInvoice) => {
    navigate(`/purchase-invoices/edit/${item._id}`)
  }, [navigate])

  const handlePaymentStatusUpdate = useCallback(async (id: string, status: 'unpaid' | 'partial' | 'paid' | 'overdue') => {
    try {
      await PurchaseInvoiceAPI.updatePaymentStatus(id, status)
      message.success(`Payment status updated to ${status}`)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to update payment status')
      console.error('Error updating payment status:', error)
    }
  }, [fetchData])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await PurchaseInvoiceAPI.remove(id)
      message.success('Purchase invoice deleted successfully')
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete purchase invoice')
      console.error('Error deleting purchase invoice:', error)
    }
  }, [fetchData])

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select invoices to delete')
      return
    }
    setBulkDeleteModalVisible(true)
  }, [selectedRowKeys])

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      return
    }

    setBulkDeleteLoading(true)
    try {
      const deletePromises = selectedRowKeys.map((key) => PurchaseInvoiceAPI.remove(key as string))
      await Promise.all(deletePromises)
      message.success(`Successfully deleted ${selectedRowKeys.length} invoice(s)`)
      setSelectedRowKeys([])
      setBulkDeleteModalVisible(false)
      fetchData()
    } catch (error) {
      message.error('Failed to delete some invoices')
      console.error('Error deleting invoices:', error)
      fetchData() // Refresh to show current state
    } finally {
      setBulkDeleteLoading(false)
    }
  }, [selectedRowKeys, fetchData])

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys)
    },
    getCheckboxProps: (record: PurchaseInvoice) => ({
      disabled: false,
    }),
  }

  const columns: ColumnsType<PurchaseInvoice> = useMemo(
    () => [
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Invoice #</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'invoice_number',
        key: 'invoice_number',
        render: (text: string) => <span className="text-foreground font-medium">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Vendor/Supplier</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'vendor_id',
        key: 'vendor_id',
        sorter: (a: PurchaseInvoice, b: PurchaseInvoice) => {
          const getVendorName = (record: PurchaseInvoice) => {
            const vendor = record.vendor_id
            if (typeof vendor === 'object' && vendor !== null && vendor.name) {
              return vendor.name
            } else if (typeof vendor === 'string') {
              return supplierMap.get(vendor) || vendor
            }
            return ''
          }
          return getVendorName(a).localeCompare(getVendorName(b))
        },
        render: (vendor: string | Supplier | { _id: string; name: string }) => {
          // Handle both string ID and populated vendor object
          let vendorName = '-'
          if (typeof vendor === 'object' && vendor !== null && vendor.name) {
            vendorName = vendor.name
          } else if (typeof vendor === 'string') {
            vendorName = supplierMap.get(vendor) || vendor
          }
          return <span className="text-foreground">{vendorName}</span>
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Invoice Date</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'invoice_date',
        key: 'invoice_date',
        sorter: (a: PurchaseInvoice, b: PurchaseInvoice) => {
          const dateA = a.invoice_date ? new Date(a.invoice_date).getTime() : 0
          const dateB = b.invoice_date ? new Date(b.invoice_date).getTime() : 0
          return dateA - dateB
        },
        render: (date: string) => {
          if (!date) return <span className="text-muted-foreground">-</span>
          try {
            const dateObj = new Date(date)
            if (isNaN(dateObj.getTime())) return <span className="text-muted-foreground">Invalid Date</span>
            return <span className="text-muted-foreground">{dateObj.toLocaleDateString()}</span>
          } catch {
            return <span className="text-muted-foreground">Invalid Date</span>
          }
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Quantity</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'line_items',
        key: 'quantity',
        sorter: (a: PurchaseInvoice, b: PurchaseInvoice) => {
          const getQty = (record: PurchaseInvoice) => {
            return record.line_items?.reduce((sum, item) => sum + (item.quantity || item.qty || 0), 0) || 0
          }
          return getQty(a) - getQty(b)
        },
        render: (lineItems: PurchaseInvoice['line_items']) => {
          const totalQty = lineItems?.reduce((sum, item) => sum + (item.quantity || item.qty || 0), 0) || 0
          return <span className="text-foreground font-medium">{totalQty}</span>
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Total Amount</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'total_amount',
        key: 'total_amount',
        sorter: (a: PurchaseInvoice, b: PurchaseInvoice) => {
          const getTotal = (record: PurchaseInvoice) => {
            if (record.total_amount !== undefined && record.total_amount !== null) {
              return record.total_amount
            }
            const lineItems = record.line_items || (record as any).lineItems || []
            const grandTotal = lineItems.reduce((sum: number, item: any) => {
              const qty = item.quantity || item.qty || 0
              const unitCost = item.unit_cost || item.unitPrice || 0
              return sum + (qty * unitCost)
            }, 0)
            const discount = record.discount || 0
            const taxAmount = record.tax_amount || record.vat || 0
            return grandTotal - discount + taxAmount
          }
          return getTotal(a) - getTotal(b)
        },
        render: (_: any, record: PurchaseInvoice) => {
          // Use total_amount from record if available, otherwise calculate
          if (record.total_amount !== undefined && record.total_amount !== null) {
            return (
              <span className="text-foreground font-semibold">
                {record.currency || 'AED'} {record.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )
          }

          // Fallback: Calculate from line items (for backward compatibility)
          const lineItems = record.line_items || (record as any).lineItems || []
          const grandTotal = lineItems.reduce((sum: number, item: any) => {
            const qty = item.quantity || item.qty || 0
            const unitCost = item.unit_cost || item.unitPrice || 0
            return sum + (qty * unitCost)
          }, 0)

          const discount = record.discount || 0
          const taxAmount = record.tax_amount || record.vat || 0
          const finalTotal = grandTotal - discount + taxAmount

          return (
            <span className="text-foreground font-semibold">
              {record.currency || 'AED'} {finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>VAT</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'tax_amount',
        key: 'tax_amount',
        sorter: (a: PurchaseInvoice, b: PurchaseInvoice) => {
          const aTax = a.tax_amount || (a as any).vat || 0
          const bTax = b.tax_amount || (b as any).vat || 0
          return aTax - bTax
        },
        render: (_: any, record: PurchaseInvoice) => {
          const taxAmount = record.tax_amount || (record as any).vat || 0
          return (
            <span className="text-muted-foreground">
              {taxAmount > 0 ? `${record.currency || 'AED'} ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Payment Status</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'payment_status',
        key: 'payment_status',
        sorter: (a: PurchaseInvoice, b: PurchaseInvoice) => {
          const aStatus = a.payment_status || (a as any).status || 'unpaid'
          const bStatus = b.payment_status || (b as any).status || 'unpaid'
          return aStatus.localeCompare(bStatus)
        },
        render: (status: string, record: PurchaseInvoice) => {
          const paymentStatus = record.payment_status || (record as any).status || 'unpaid'
          const statusLower = paymentStatus.toLowerCase()
          
          return (
            <Select
              value={paymentStatus}
              onValueChange={(newStatus: 'unpaid' | 'partial' | 'paid' | 'overdue') => handlePaymentStatusUpdate(record._id, newStatus)}
              disabled={loading}
            >
              <SelectTrigger className={cn(
                "w-28 h-7 border-0 shadow-none",
                statusLower === 'paid'
                  ? 'bg-green-500/15 text-green-300 hover:bg-green-200'
                  : statusLower === 'partial'
                  ? 'bg-yellow-500/15 text-yellow-300 hover:bg-yellow-200'
                  : statusLower === 'overdue'
                  ? 'bg-red-500/15 text-red-300 hover:bg-red-200'
                  : 'bg-orange-500/15 text-orange-300 hover:bg-orange-200'
              )}>
                <SelectValue>
                  <span className="text-xs font-medium capitalize">{paymentStatus}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">
                  <span className="text-orange-300">Unpaid</span>
                </SelectItem>
                <SelectItem value="partial">
                  <span className="text-yellow-300">Partial</span>
                </SelectItem>
                <SelectItem value="paid">
                  <span className="text-green-300">Paid</span>
                </SelectItem>
                <SelectItem value="overdue">
                  <span className="text-red-300">Overdue</span>
                </SelectItem>
              </SelectContent>
            </Select>
          )
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
              title="Delete purchase invoice"
              description="Are you sure you want to delete this invoice?"
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
    [supplierMap, loading, handlePaymentStatusUpdate, handleView, handleEdit, handleDelete]
  )

  const getSupplierNameFromRecord = (record: PurchaseInvoice) => {
    const vendor = record.vendor_id || (record as any).supplier
    if (!vendor) return ''
    if (typeof vendor === 'object' && vendor !== null && vendor.name) return vendor.name
    if (typeof vendor === 'string') return supplierMap.get(vendor) || vendor
    return ''
  }

  const getTotalAmountForRecord = (record: PurchaseInvoice): number => {
    if (record.total_amount !== undefined && record.total_amount !== null) return record.total_amount
    const lineItems = record.line_items || (record as any).lineItems || []
    const grandTotal = lineItems.reduce((sum: number, item: any) => sum + ((item.quantity || item.qty || 0) * (item.unit_cost || item.unitPrice || 0)), 0)
    return grandTotal - (record.discount || 0) + (record.tax_amount || (record as any).vat || 0)
  }

  // Filter by month first (for KPIs and table)
  const monthFilteredData = useMemo(() => {
    if (monthFilter === 'all') return data
    const [year, month] = monthFilter.split('-').map(Number)
    return data.filter((item) => {
      const invDate = item.invoice_date || (item as any).date
      if (!invDate) return false
      const d = dayjs(invDate)
      return d.year() === year && d.month() === month - 1
    })
  }, [data, monthFilter])

  const filteredData = useMemo(() => {
    if (!q.trim()) return monthFilteredData
    const searchLower = q.trim().toLowerCase()
    return monthFilteredData.filter((item) => {
      const lineItems = item.line_items || (item as any).lineItems || []
      const totalQty = lineItems.reduce((sum: number, li: any) => sum + (li.quantity || li.qty || 0), 0)
      const values: string[] = [
        item.invoice_number || (item as any).supplierNumber || '',
        getSupplierNameFromRecord(item),
        item.invoice_date ? new Date(item.invoice_date).toLocaleDateString() : '',
        String(totalQty),
        String(item.total_amount ?? getTotalAmountForRecord(item)),
        String(item.tax_amount ?? 0),
        item.payment_status || (item as any).status || '',
      ]
      return values.some((v) => v.toLowerCase().includes(searchLower))
    })
  }, [monthFilteredData, q, supplierMap])

  // KPI values from month-filtered data
  const kpis = useMemo(() => {
    let totalPurchase = 0
    let purchaseWithoutVat = 0
    let totalVat = 0
    monthFilteredData.forEach((item) => {
      const total = getTotalAmountForRecord(item)
      const tax = item.tax_amount ?? (item as any).vat ?? 0
      totalPurchase += total
      totalVat += tax
      purchaseWithoutVat += total - tax
    })
    return { totalPurchase, purchaseWithoutVat, totalVat }
  }, [monthFilteredData])

  // Month filter options: All time + last 12 months
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: 'all', label: 'All time' }]
    const now = dayjs()
    for (let i = 0; i < 12; i++) {
      const d = now.subtract(i, 'month')
      options.push({
        value: d.format('YYYY-MM'),
        label: d.format('MMM YYYY'),
      })
    }
    return options
  }, [])

  const visibleColumnsList = useMemo(() => {
    return columns.filter((col) => col.key === 'actions' || visibleColumns[col.key as string] !== false)
  }, [columns, visibleColumns])

  const onSearch = () => fetchData()

  const onReset = () => setQ('')

  // Helper function to get supplier/vendor name
  const getSupplierName = (vendor: string | Supplier | { _id: string; name: string } | undefined): string => {
    if (!vendor) return '-'
    if (typeof vendor === 'object' && vendor !== null && vendor.name) {
      return vendor.name
    }
    if (typeof vendor === 'string') {
      return supplierMap.get(vendor) || vendor
    }
    return '-'
  }

  // Helper function to calculate total quantity
  const getTotalQuantity = (lineItems: PurchaseInvoice['line_items'] | undefined): number => {
    if (!lineItems) return 0
    return lineItems.reduce((sum, item) => sum + (item.quantity || (item as any).qty || 0), 0)
  }

  // Helper function to calculate total amount
  const getTotalAmount = (record: PurchaseInvoice): number => {
    // Use total_amount from record if available
    if (record.total_amount !== undefined && record.total_amount !== null) {
      return record.total_amount
    }

    // Fallback: Calculate from line items (for backward compatibility)
    const lineItems = record.line_items || (record as any).lineItems || []
    const grandTotal = lineItems.reduce((sum: number, item: any) => {
      const qty = item.quantity || item.qty || 0
      const unitCost = item.unit_cost || item.unitPrice || 0
      return sum + (qty * unitCost)
    }, 0)

    const discount = record.discount || 0
    const taxAmount = record.tax_amount || (record as any).vat || 0

    return grandTotal - discount + taxAmount
  }

  // Export to Excel (exports filtered results when search is active)
  const exportToExcel = () => {
    const worksheetData = [
      ['Invoice #', 'Vendor/Supplier', 'Invoice Date', 'Quantity', 'Total Amount', 'VAT', 'Payment Status'],
      ...filteredData.map((item) => {
        const invoiceDate = item.invoice_date || (item as any).date
        const taxAmount = item.tax_amount || (item as any).vat || 0
        const paymentStatus = item.payment_status || (item as any).status || 'unpaid'
        const vendor = item.vendor_id || (item as any).supplier
        
        return [
          item.invoice_number || (item as any).supplierNumber || '-',
          getSupplierName(vendor),
          invoiceDate ? new Date(invoiceDate).toLocaleDateString() : '-',
          getTotalQuantity(item.line_items || (item as any).lineItems),
          `${item.currency || 'AED'} ${getTotalAmount(item).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          taxAmount > 0 ? `${item.currency || 'AED'} ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
          paymentStatus,
        ]
      }),
    ]

    const ws = XLSX.utils.aoa_to_sheet(worksheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Invoices')

    const colWidths = [{ wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 12 }]
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `Purchase_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape')
    
    doc.setFontSize(18)
    doc.text('Purchase Invoices Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)
    doc.text(`Total Items: ${filteredData.length}`, 14, 27)

    const tableData = filteredData.map((item) => {
      const invoiceDate = item.invoice_date || (item as any).date
      const taxAmount = item.tax_amount || (item as any).vat || 0
      const paymentStatus = item.payment_status || (item as any).status || 'unpaid'
      const vendor = item.vendor_id || (item as any).supplier
      
      return [
        item.invoice_number || (item as any).supplierNumber || '-',
        getSupplierName(vendor),
        invoiceDate ? new Date(invoiceDate).toLocaleDateString() : '-',
        getTotalQuantity(item.line_items || (item as any).lineItems).toString(),
        `${item.currency || 'AED'} ${getTotalAmount(item).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        taxAmount > 0 ? `${item.currency || 'AED'} ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
        paymentStatus,
      ]
    })

    autoTable(doc, {
      head: [['Invoice #', 'Vendor/Supplier', 'Invoice Date', 'Quantity', 'Total Amount', 'VAT', 'Payment Status']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 32 },
    })

    doc.save(`Purchase_Invoices_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Print table (prints filtered results when search is active)
  const printTable = () => {
    const printData = filteredData.map((item) => {
      const invoiceDate = item.invoice_date || (item as any).date
      const taxAmount = item.tax_amount || (item as any).vat || 0
      const paymentStatus = item.payment_status || (item as any).status || 'unpaid'
      const vendor = item.vendor_id || (item as any).supplier
      
      return {
        'Invoice #': item.invoice_number || (item as any).supplierNumber || '-',
        'Vendor/Supplier': getSupplierName(vendor),
        'Invoice Date': invoiceDate ? new Date(invoiceDate).toLocaleDateString() : '-',
        Quantity: getTotalQuantity(item.line_items || (item as any).lineItems),
        'Total Amount': `${item.currency || 'AED'} ${getTotalAmount(item).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        VAT: taxAmount > 0 ? `${item.currency || 'AED'} ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
        'Payment Status': paymentStatus,
      }
    })

    const tableRows = printData
      .map(
        (row) => `
      <tr>
        <td>${row['Supplier #']}</td>
        <td>${row.Supplier}</td>
        <td>${row.Date}</td>
        <td>${row.Quantity}</td>
        <td>${row['Total Amount']}</td>
        <td>${row.VAT}</td>
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
          <h1>Purchase Invoices</h1>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Vendor/Supplier</th>
                <th>Invoice Date</th>
                <th>Quantity</th>
                <th>Total Amount</th>
                <th>VAT</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    
    if (!printWindow) {
      URL.revokeObjectURL(url)
      return
    }

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Purchase Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage your purchase invoices •{' '}
            <span className="font-semibold text-foreground">
              {q.trim() ? `${filteredData.length} of ${monthFilteredData.length}` : monthFilteredData.length} invoice{monthFilteredData.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
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
            onClick={() => navigate('/purchase-invoices/create')}
            className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Purchase Invoice</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </motion.div>

      {/* KPIs and Month Filter */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            icon={DollarSign}
            label="Total Purchase"
            value={`AED ${kpis.totalPurchase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            iconColor="text-green-400"
            bgColor="bg-green-500/10"
          />
          <StatCard
            icon={Receipt}
            label="Purchase without VAT"
            value={`AED ${kpis.purchaseWithoutVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            iconColor="text-blue-400"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            icon={Percent}
            label="Total VAT"
            value={`AED ${kpis.totalVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            iconColor="text-purple-400"
            bgColor="bg-purple-500/10"
          />
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
            placeholder="Search purchase invoices by number, supplier..."
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
            columnKeys={purchaseColumnKeys}
            columnLabels={purchaseColumnLabels}
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
          scroll={{ x: 'max-content' }}
          onChange={(pagination, filters, sorter) => {
            console.log('PurchaseInvoicesManage - Pagination changed:', {
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
                Showing {range[0]}-{range[1]} of {total} {total === 1 ? 'invoice' : 'invoices'}
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
                    <FileSpreadsheet className="h-16 w-16 text-muted-foreground relative z-10" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No purchase invoices found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q
                    ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                    : 'Get started by creating your first purchase invoice.'}
                </p>
                {!q && (
                  <Button
                    onClick={() => navigate('/purchase-invoices/create')}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Plus className="h-4 w-4" />
                    Create Purchase Invoice
                  </Button>
                )}
              </div>
            ),
          }}
          className="[&_.ant-table-thead>tr>th]:bg-muted/50 [&_.ant-table-thead>tr>th]:border-b-2 [&_.ant-table-thead>tr>th]:border-border [&_.ant-table-thead>tr>th]:text-foreground [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:py-4 [&_.ant-table-tbody>tr>td]:py-4 [&_.ant-table-tbody>tr:hover]:bg-muted/50 [&_.ant-table-tbody>tr]:transition-colors [&_.ant-table]:rounded-lg"
        />
      </motion.div>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        title="Delete Selected Invoices"
        open={bulkDeleteModalVisible}
        onOk={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteModalVisible(false)}
        okText="Yes, Delete"
        okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
        cancelText="Cancel"
        confirmLoading={bulkDeleteLoading}
      >
        <p>
          Are you sure you want to delete <strong>{selectedRowKeys.length}</strong> invoice(s)? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
