import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Table, Popconfirm, message, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, X, Plus, Wallet, ArrowUpDown, Download, FileSpreadsheet, FileText, Printer, ChevronDown, Eye, Edit, Trash2, Trash } from 'lucide-react'
import { ExpenseAPI, SupplierAPI, type ExpenseItem, type Supplier } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { ColumnsDropdown } from '@/components/ColumnsDropdown'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'

const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Travel',
  'Supplies',
  'Salaries',
  'Marketing',
  'Insurance',
  'Maintenance',
  'Professional Services',
  'Office Supplies',
  'Telecommunications',
  'Other',
]

export default function ExpensesManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ExpenseItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [q, setQ] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [vendorFilter, setVendorFilter] = useState<string>('all')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false)

  const EXPENSES_COLUMN_KEYS = ['expense_id', 'category', 'vendor_id', 'amount', 'status', 'associated_account', 'expense_date'] as const
  const EXPENSES_COLUMN_LABELS: Record<string, string> = {
    expense_id: 'Expense ID',
    category: 'Category',
    vendor_id: 'Vendor',
    amount: 'Amount',
    status: 'Status',
    associated_account: 'Account',
    expense_date: 'Date',
  }
  const { visibleColumns, toggleColumn, columnKeys: expColumnKeys, columnLabels: expColumnLabels } = useColumnVisibility(
    'expenses-visible-columns',
    EXPENSES_COLUMN_KEYS,
    EXPENSES_COLUMN_LABELS
  )

  const navigate = useNavigate()

  const fetchData = async (searchQuery?: string, category?: string, status?: string, vendorId?: string) => {
    setLoading(true)
    try {
      const query = searchQuery !== undefined ? searchQuery : q
      const cat = category !== undefined ? category : categoryFilter
      const stat = status !== undefined ? status : statusFilter
      const vendor = vendorId !== undefined ? vendorId : vendorFilter
      
      const params: any = {}
      if (cat && cat !== 'all') params.category = cat
      if (stat && stat !== 'all') params.status = stat
      if (vendor && vendor !== 'all') params.vendor_id = vendor
      
      const res = await ExpenseAPI.list(params)
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }

  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData

  const handleStatusUpdate = useCallback(async (id: string, status: 'paid' | 'unpaid') => {
    try {
      await ExpenseAPI.updateStatus(id, status)
      message.success(`Status updated to ${status}`)
      fetchDataRef.current()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to update status')
      console.error('Error updating status:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, statusFilter, vendorFilter])

  // Fetch suppliers for filter
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

  const supplierMap = useMemo(() => {
    const map = new Map<string, string>()
    suppliers.forEach((s) => map.set(s._id, s.name))
    return map
  }, [suppliers])

  const filteredData = useMemo(() => {
    if (!q.trim()) return data
    const searchLower = q.trim().toLowerCase()
    return data.filter((item) => {
      const total = item.amount + (item.tax_amount || 0)
      const vendorName = typeof item.vendor_id === 'object' && item.vendor_id !== null
        ? (item.vendor_id as any).name
        : typeof item.vendor_id === 'string'
          ? supplierMap.get(item.vendor_id) || ''
          : ''
      const values: string[] = [
        item.expense_id || '',
        item.category || '',
        vendorName,
        String(item.amount ?? 0),
        String(item.tax_amount ?? 0),
        String(total),
        item.status || '',
        item.associated_account || '',
        item.expense_date && dayjs(item.expense_date).isValid() ? dayjs(item.expense_date).format('YYYY-MM-DD') : '',
      ]
      return values.some((v) => v.toLowerCase().includes(searchLower))
    })
  }, [data, q, supplierMap])

  const columns: ColumnsType<ExpenseItem> = useMemo(
    () => [
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Expense ID</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'expense_id',
        key: 'expense_id',
        sorter: (a: ExpenseItem, b: ExpenseItem) => a.expense_id.localeCompare(b.expense_id),
        render: (text: string) => <span className="text-foreground font-medium">{text}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Category</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'category',
        key: 'category',
        sorter: (a: ExpenseItem, b: ExpenseItem) => (a.category || '').localeCompare(b.category || ''),
        render: (text: string) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Vendor</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'vendor_id',
        key: 'vendor_id',
        sorter: (a: ExpenseItem, b: ExpenseItem) => {
          const getVendorName = (vendor: any) => {
            if (!vendor) return ''
            if (typeof vendor === 'object' && vendor?.name) return vendor.name
            return ''
          }
          return getVendorName(a.vendor_id).localeCompare(getVendorName(b.vendor_id))
        },
        render: (vendor: string | { _id: string; name: string } | undefined) => {
          if (!vendor) return <span className="text-muted-foreground">-</span>
          if (typeof vendor === 'object' && vendor !== null) {
            return <span className="text-muted-foreground">{vendor.name}</span>
          }
          return <span className="text-muted-foreground">-</span>
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Amount</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'amount',
        key: 'amount',
        sorter: (a: ExpenseItem, b: ExpenseItem) => a.amount - b.amount,
        render: (amount: number, record: ExpenseItem) => {
          const total = amount + (record.tax_amount || 0)
          const currency = record.currency || 'AED'
          return (
            <span className="text-foreground font-medium">
              {currency} {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Status</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'status',
        key: 'status',
        sorter: (a: ExpenseItem, b: ExpenseItem) => (a.status || '').localeCompare(b.status || ''),
        render: (_status: string, record: ExpenseItem) => {
          const currentStatus = (record.status || 'paid').toLowerCase() as 'paid' | 'unpaid'
          const statusLower = currentStatus === 'unpaid' ? 'unpaid' : 'paid'
          return (
            <Select
              value={statusLower}
              onValueChange={(newStatus: 'paid' | 'unpaid') => handleStatusUpdate(record._id, newStatus)}
              disabled={loading}
            >
              <SelectTrigger
                className={cn(
                  'w-24 h-7 border-0 shadow-none',
                  statusLower === 'paid'
                    ? 'bg-green-500/15 text-green-300 hover:bg-green-200'
                    : 'bg-orange-500/15 text-orange-300 hover:bg-orange-200'
                )}
              >
                <SelectValue>
                  <span className="text-xs font-medium capitalize">{statusLower}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">
                  <span className="text-green-300">Paid</span>
                </SelectItem>
                <SelectItem value="unpaid">
                  <span className="text-orange-300">Unpaid</span>
                </SelectItem>
              </SelectContent>
            </Select>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Account</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'associated_account',
        key: 'associated_account',
        sorter: (a: ExpenseItem, b: ExpenseItem) => (a.associated_account || '').localeCompare(b.associated_account || ''),
        render: (text: string) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Date</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'expense_date',
        key: 'expense_date',
        sorter: (a: ExpenseItem, b: ExpenseItem) => {
          const dateA = dayjs(a.expense_date).isValid() ? dayjs(a.expense_date).valueOf() : 0
          const dateB = dayjs(b.expense_date).isValid() ? dayjs(b.expense_date).valueOf() : 0
          return dateA - dateB
        },
        render: (date: string) => {
          if (!date) return <span className="text-muted-foreground">-</span>
          const parsedDate = dayjs(date)
          if (!parsedDate.isValid()) return <span className="text-muted-foreground">-</span>
          return <span className="text-muted-foreground">{parsedDate.format('YYYY-MM-DD HH:mm:ss')}</span>
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
              title="Delete expense"
              description="Are you sure you want to delete this expense?"
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
    [navigate, loading, handleStatusUpdate]
  )

  const visibleColumnsList = useMemo(() => {
    return columns.filter((col) => col.key === 'actions' || visibleColumns[col.key as string] !== false)
  }, [columns, visibleColumns])

  const onSearch = () => fetchData()

  const onReset = () => {
    setQ('')
    setCategoryFilter('all')
    setStatusFilter('all')
    setVendorFilter('all')
    fetchData(undefined, 'all', 'all', 'all')
  }


  const handleView = (item: ExpenseItem) => {
    navigate(`/expenses/view/${item._id}`)
  }

  const handleEdit = (item: ExpenseItem) => {
    navigate(`/expenses/edit/${item._id}`)
  }

  const handleDelete = async (id: string) => {
    try {
      await ExpenseAPI.remove(id)
      message.success('Expense deleted successfully')
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete expense')
      console.error('Error deleting expense:', error)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select expenses to delete')
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
      const deletePromises = selectedRowKeys.map((key) => ExpenseAPI.remove(key as string))
      await Promise.all(deletePromises)
      message.success(`Successfully deleted ${selectedRowKeys.length} expense(s)`)
      setSelectedRowKeys([])
      setBulkDeleteModalVisible(false)
      fetchData()
    } catch (error) {
      message.error('Failed to delete some expenses')
      console.error('Error deleting expenses:', error)
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
    getCheckboxProps: (record: ExpenseItem) => ({
      disabled: false,
    }),
  }

  // Export to Excel (exports filtered results when search is active)
  const exportToExcel = () => {
    const worksheetData = [
      ['Expense ID', 'Category', 'Vendor', 'Amount', 'Tax', 'Total', 'Currency', 'Status', 'Account', 'Date'],
      ...filteredData.map((item) => {
        const total = item.amount + (item.tax_amount || 0)
        const vendorName = typeof item.vendor_id === 'object' && item.vendor_id !== null 
          ? (item.vendor_id as any).name 
          : '-'
        return [
          item.expense_id,
          item.category || '-',
          vendorName,
          item.amount,
          item.tax_amount || 0,
          total,
          item.currency || 'AED',
          item.status === 'paid' ? 'Paid' : 'Unpaid',
          item.associated_account || '-',
          item.expense_date && dayjs(item.expense_date).isValid() ? dayjs(item.expense_date).format('YYYY-MM-DD') : '-',
        ]
      }),
    ]

    const ws = XLSX.utils.aoa_to_sheet(worksheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses')

    const colWidths = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 12 }]
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `Expenses_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape')
    
    doc.setFontSize(18)
    doc.text('Expenses Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)
    doc.text(`Total Items: ${filteredData.length}`, 14, 27)

    const tableData = filteredData.map((item) => {
      const total = item.amount + (item.tax_amount || 0)
      const vendorName = typeof item.vendor_id === 'object' && item.vendor_id !== null 
        ? (item.vendor_id as any).name 
        : '-'
      return [
        item.expense_id,
        item.category || '-',
        vendorName,
        `${item.currency || 'AED'} ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${item.currency || 'AED'} ${(item.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${item.currency || 'AED'} ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        item.status === 'paid' ? 'Paid' : 'Unpaid',
        item.expense_date && dayjs(item.expense_date).isValid() ? dayjs(item.expense_date).format('YYYY-MM-DD') : '-',
      ]
    })

    autoTable(doc, {
      head: [['Expense ID', 'Category', 'Vendor', 'Amount', 'Tax', 'Total', 'Status', 'Date']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 32 },
    })

    doc.save(`Expenses_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Print table (prints filtered results when search is active)
  const printTable = () => {
    const printData = filteredData.map((item) => {
      const total = item.amount + (item.tax_amount || 0)
      const vendorName = typeof item.vendor_id === 'object' && item.vendor_id !== null 
        ? (item.vendor_id as any).name 
        : '-'
      return {
        'Expense ID': item.expense_id,
        Category: item.category || '-',
        Vendor: vendorName,
        Amount: `${item.currency || 'AED'} ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        Tax: `${item.currency || 'AED'} ${(item.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        Total: `${item.currency || 'AED'} ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        Status: item.status === 'paid' ? 'Paid' : 'Unpaid',
        Account: item.associated_account || '-',
        Date: item.expense_date && dayjs(item.expense_date).isValid() ? dayjs(item.expense_date).format('YYYY-MM-DD') : '-',
      }
    })

    const tableRows = printData
      .map(
        (row) => `
      <tr>
        <td>${row['Expense ID']}</td>
        <td>${row.Category}</td>
        <td>${row.Vendor}</td>
        <td>${row.Amount}</td>
        <td>${row.Tax}</td>
        <td>${row.Total}</td>
        <td>${row.Status}</td>
        <td>${row.Date}</td>
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
            @page { size: landscape; margin: 0; }
            @media print {
              @page { size: landscape; margin: 0; }
              body { margin: 0; padding: 15px; }
              table { page-break-after: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
            }
            body { font-family: Arial, sans-serif; margin: 0; padding: 15px; }
            h1 { font-size: 24px; font-weight: bold; color: #10b981; margin: 0 0 15px 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #22c55e; color: white; padding: 10px 8px; text-align: left; font-weight: bold; border: 1px solid #ddd; }
            td { padding: 8px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Expenses</h1>
          <table>
            <thead>
              <tr>
                <th>Expense ID</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Manage your expenses •{' '}
            <span className="font-semibold text-foreground">
              {q.trim() ? `${filteredData.length} of ${data.length}` : data.length} expense{data.length !== 1 ? 's' : ''}
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
            onClick={() => navigate('/expenses/create')}
            className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Expense</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </motion.div>

      {/* Search and Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-4"
      >
        {/* Row 1: Search input + Search button */}
        <div className="flex items-center gap-2 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses by ID, description, reference..."
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
          <Button
            onClick={onSearch}
            className="shadow-sm hover:shadow-md transition-shadow flex-shrink-0"
            size="lg"
          >
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
        {/* Row 2: Filters and actions */}
        <div className="flex flex-wrap items-center gap-2">
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value)
                fetchData(q, value, statusFilter, vendorFilter)
              }}
            >
              <SelectTrigger className="h-11 w-[150px] border-border bg-muted/50">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                fetchData(q, categoryFilter, value, vendorFilter)
              }}
            >
              <SelectTrigger className="h-11 w-[130px] border-border bg-muted/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={vendorFilter}
              onValueChange={(value) => {
                setVendorFilter(value)
                fetchData(q, categoryFilter, statusFilter, value)
              }}
            >
              <SelectTrigger className="h-11 w-[150px] border-border bg-muted/50">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={onReset}
              variant="outline"
              size="lg"
              className="border-border hover:bg-muted/50"
            >
              Reset
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border hover:bg-muted/50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-2" />
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
              className="border-border hover:bg-muted/50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <ColumnsDropdown
              columnKeys={expColumnKeys}
              columnLabels={expColumnLabels}
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
            console.log('ExpensesManage - Pagination changed:', {
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
                Showing {range[0]}-{range[1]} of {total} {total === 1 ? 'expense' : 'expenses'}
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
                    <Wallet className="h-16 w-16 text-muted-foreground relative z-10" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No expenses found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q || (categoryFilter && categoryFilter !== 'all') || (statusFilter && statusFilter !== 'all') || (vendorFilter && vendorFilter !== 'all')
                    ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                    : 'Get started by creating your first expense.'}
                </p>
                {!q && categoryFilter === 'all' && statusFilter === 'all' && vendorFilter === 'all' && (
                  <Button
                    onClick={() => navigate('/expenses/create')}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Plus className="h-4 w-4" />
                    Create Expense
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
        title="Delete Selected Expenses"
        open={bulkDeleteModalVisible}
        onOk={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteModalVisible(false)}
        okText="Yes, Delete"
        okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
        cancelText="Cancel"
        confirmLoading={bulkDeleteLoading}
      >
        <p>
          Are you sure you want to delete <strong>{selectedRowKeys.length}</strong> expense(s)? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
