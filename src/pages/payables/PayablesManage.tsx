import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Table, Popconfirm, message, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, X, Plus, CreditCard, ArrowUpDown, Download, FileSpreadsheet, FileText, Printer, ChevronDown, Eye, Edit, Trash2, CheckCircle2, Clock, XCircle, AlertCircle, Trash } from 'lucide-react'
import { PayableAPI, SupplierAPI, type PayableItem, type Supplier } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { ColumnsDropdown } from '@/components/ColumnsDropdown'
import { Badge } from '@/components/ui/badge'
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

export default function PayablesManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PayableItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [q, setQ] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false)

  const PAYABLES_COLUMN_KEYS = ['bill_number', 'vendor_id', 'total_amount', 'balance_due', 'status', 'due_date'] as const
  const PAYABLES_COLUMN_LABELS: Record<string, string> = {
    bill_number: 'Bill Number',
    vendor_id: 'Vendor',
    total_amount: 'Total Amount',
    balance_due: 'Balance Due',
    status: 'Status',
    due_date: 'Due Date',
  }
  const { visibleColumns, toggleColumn, columnKeys: payColumnKeys, columnLabels: payColumnLabels } = useColumnVisibility(
    'payables-visible-columns',
    PAYABLES_COLUMN_KEYS,
    PAYABLES_COLUMN_LABELS
  )

  const navigate = useNavigate()

  // Create supplier lookup map
  const supplierMap = useMemo(() => {
    const map = new Map<string, string>()
    suppliers.forEach(s => map.set(s._id, s.name))
    return map
  }, [suppliers])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await PayableAPI.list()
      setData(res.data.data)
    } finally {
      setLoading(false)
    }
  }

  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData

  const handleStatusUpdate = useCallback(async (id: string, status: 'unpaid' | 'partial' | 'paid' | 'overdue') => {
    try {
      await PayableAPI.updateStatus(id, status)
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      unpaid: { label: 'Unpaid', color: 'bg-red-500/15 text-red-300 border-red-500/30', icon: XCircle },
      partial: { label: 'Partial', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', icon: Clock },
      paid: { label: 'Paid', color: 'bg-green-500/15 text-green-300 border-green-500/30', icon: CheckCircle2 },
      overdue: { label: 'Overdue', color: 'bg-red-500/15 text-red-300 border-red-500/30', icon: AlertCircle },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid
    const Icon = config.icon
    return (
      <Badge className={`${config.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getVendorName = (vendorId: string | Supplier | undefined): string => {
    if (!vendorId) return 'N/A'
    if (typeof vendorId === 'object' && vendorId !== null && vendorId.name) {
      return vendorId.name
    }
    if (typeof vendorId === 'string') {
      return supplierMap.get(vendorId) || vendorId
    }
    return 'N/A'
  }

  const filteredData = useMemo(() => {
    if (!q.trim()) return data
    const searchLower = q.trim().toLowerCase()
    return data.filter((item) => {
      const values: string[] = [
        item.bill_number || '',
        getVendorName(item.vendor_id),
        String(item.total_amount ?? 0),
        String(item.balance_due ?? 0),
        item.status || '',
        item.due_date ? dayjs(item.due_date).format('YYYY-MM-DD') : '',
        item.bill_date ? dayjs(item.bill_date).format('YYYY-MM-DD') : '',
        item.currency || '',
      ]
      return values.some((v) => v.toLowerCase().includes(searchLower))
    })
  }, [data, q, supplierMap])

  const columns: ColumnsType<PayableItem> = useMemo(
    () => [
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Bill Number</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'bill_number',
        key: 'bill_number',
        sorter: (a: PayableItem, b: PayableItem) => (a.bill_number || '').localeCompare(b.bill_number || ''),
        render: (text: string) => <span className="text-foreground font-medium">{text}</span>,
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
        sorter: (a: PayableItem, b: PayableItem) => {
          const nameA = getVendorName(a.vendor_id)
          const nameB = getVendorName(b.vendor_id)
          return nameA.localeCompare(nameB)
        },
        render: (vendorId: string | Supplier | undefined) => {
          const vendorName = getVendorName(vendorId)
          return <span className="text-foreground font-medium">{vendorName}</span>
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
        sorter: (a: PayableItem, b: PayableItem) => a.total_amount - b.total_amount,
        render: (amount: number, record: PayableItem) => (
          <span className="text-foreground font-medium">
            {record.currency || 'AED'} {(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Balance Due</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'balance_due',
        key: 'balance_due',
        sorter: (a: PayableItem, b: PayableItem) => (a.balance_due || 0) - (b.balance_due || 0),
        render: (balance: number, record: PayableItem) => (
          <span className={`font-medium ${balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {record.currency || 'AED'} {(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
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
        sorter: (a: PayableItem, b: PayableItem) => (a.status || '').localeCompare(b.status || ''),
        render: (_status: string, record: PayableItem) => {
          const paymentStatus = (record.status || 'unpaid').toLowerCase() as 'unpaid' | 'partial' | 'paid' | 'overdue'
          return (
            <Select
              value={paymentStatus}
              onValueChange={(newStatus: 'unpaid' | 'partial' | 'paid' | 'overdue') => handleStatusUpdate(record._id, newStatus)}
              disabled={loading}
            >
              <SelectTrigger className={cn(
                'w-28 h-7 border-0 shadow-none',
                paymentStatus === 'paid'
                  ? 'bg-green-500/15 text-green-300 hover:bg-green-200'
                  : paymentStatus === 'partial'
                  ? 'bg-yellow-500/15 text-yellow-300 hover:bg-yellow-200'
                  : paymentStatus === 'overdue'
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
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Due Date</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'due_date',
        key: 'due_date',
        sorter: (a: PayableItem, b: PayableItem) => dayjs(a.due_date).unix() - dayjs(b.due_date).unix(),
        render: (date: string, record: PayableItem) => {
          const isOverdue = dayjs(date).isBefore(dayjs()) && record.status !== 'paid'
          return (
            <span className={isOverdue ? 'text-red-400 font-semibold' : 'text-muted-foreground'}>
              {dayjs(date).format('YYYY-MM-DD')}
            </span>
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
              title="Delete payable"
              description="Are you sure you want to delete this payable?"
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
    [supplierMap, navigate, loading, handleStatusUpdate]
  )

  const visibleColumnsList = useMemo(() => {
    return columns.filter((col) => col.key === 'actions' || visibleColumns[col.key as string] !== false)
  }, [columns, visibleColumns])

  const onSearch = () => fetchData()

  const onReset = () => setQ('')


  const handleView = (item: PayableItem) => {
    navigate(`/payables/view/${item._id}`)
  }

  const handleEdit = (item: PayableItem) => {
    navigate(`/payables/edit/${item._id}`)
  }

  const handleDelete = async (id: string) => {
    try {
      await PayableAPI.remove(id)
      message.success('Payable deleted successfully')
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete payable')
      console.error('Error deleting payable:', error)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select payables to delete')
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
      const deletePromises = selectedRowKeys.map((key) => PayableAPI.remove(key as string))
      await Promise.all(deletePromises)
      message.success(`Successfully deleted ${selectedRowKeys.length} payable(s)`)
      setSelectedRowKeys([])
      setBulkDeleteModalVisible(false)
      fetchData()
    } catch (error) {
      message.error('Failed to delete some payables')
      console.error('Error deleting payables:', error)
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
    getCheckboxProps: (record: PayableItem) => ({
      disabled: false,
    }),
  }

  // Export to Excel (exports filtered results when search is active)
  const exportToExcel = () => {
    const worksheetData = [
      ['Bill Number', 'Vendor', 'Total Amount', 'Tax Amount', 'Balance Due', 'Status', 'Bill Date', 'Due Date', 'Currency'],
      ...filteredData.map((item) => [
        item.bill_number,
        getVendorName(item.vendor_id),
        `${item.currency || 'AED'} ${(item.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${item.currency || 'AED'} ${(item.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${item.currency || 'AED'} ${(item.balance_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        item.status,
        dayjs(item.bill_date).format('YYYY-MM-DD'),
        dayjs(item.due_date).format('YYYY-MM-DD'),
        item.currency || 'AED',
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(worksheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Payables')

    const colWidths = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }]
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `Payables_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape')
    
    doc.setFontSize(18)
    doc.text('Payables Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)
    doc.text(`Total Items: ${filteredData.length}`, 14, 27)

    const tableData = filteredData.map((item) => [
      item.bill_number,
      getVendorName(item.vendor_id),
      `${item.currency || 'AED'} ${(item.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${item.currency || 'AED'} ${(item.balance_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      item.status,
      dayjs(item.due_date).format('YYYY-MM-DD'),
    ])

    autoTable(doc, {
      head: [['Bill Number', 'Vendor', 'Total Amount', 'Balance Due', 'Status', 'Due Date']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 32 },
    })

    doc.save(`Payables_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Print table (prints filtered results when search is active)
  const printTable = () => {
    const printData = filteredData.map((item) => ({
      'Bill Number': item.bill_number,
      Vendor: getVendorName(item.vendor_id),
      'Total Amount': `${item.currency || 'AED'} ${(item.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      'Balance Due': `${item.currency || 'AED'} ${(item.balance_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      Status: item.status,
      'Due Date': dayjs(item.due_date).format('YYYY-MM-DD'),
    }))

    const tableRows = printData
      .map(
        (row) => `
      <tr>
        <td>${row['Bill Number']}</td>
        <td>${row.Vendor}</td>
        <td>${row['Total Amount']}</td>
        <td>${row['Balance Due']}</td>
        <td>${row.Status}</td>
        <td>${row['Due Date']}</td>
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
          <h1>Payables</h1>
          <table>
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Vendor</th>
                <th>Total Amount</th>
                <th>Balance Due</th>
                <th>Status</th>
                <th>Due Date</th>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Payment Out</h1>
          <p className="text-sm text-muted-foreground">
            Manage your payables •{' '}
            <span className="font-semibold text-foreground">
              {q.trim() ? `${filteredData.length} of ${data.length}` : data.length} payable{data.length !== 1 ? 's' : ''}
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
            onClick={() => navigate('/payables/create')}
            className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Payable</span>
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
            placeholder="Search payables by supplier, description..."
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
        <div className="flex items-center gap-2">
          <Button
            onClick={onSearch}
            className="shadow-sm hover:shadow-md transition-shadow"
            size="lg"
          >
            <Search className="h-4 w-4" />
            Search
          </Button>
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
            columnKeys={payColumnKeys}
            columnLabels={payColumnLabels}
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
            console.log('PayablesManage - Pagination changed:', {
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
                Showing {range[0]}-{range[1]} of {total} {total === 1 ? 'payable' : 'payables'}
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
                    <CreditCard className="h-16 w-16 text-muted-foreground relative z-10" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No payables found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q
                    ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                    : 'Get started by creating your first payable.'}
                </p>
                {!q && (
                  <Button
                    onClick={() => navigate('/payables/create')}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Plus className="h-4 w-4" />
                    Create Payable
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
        title="Delete Selected Payables"
        open={bulkDeleteModalVisible}
        onOk={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteModalVisible(false)}
        okText="Yes, Delete"
        okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
        cancelText="Cancel"
        confirmLoading={bulkDeleteLoading}
      >
        <p>
          Are you sure you want to delete <strong>{selectedRowKeys.length}</strong> payable(s)? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

