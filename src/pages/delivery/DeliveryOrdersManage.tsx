import { useEffect, useMemo, useState } from 'react'
import { Table, Popconfirm, message, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, X, Plus, Truck, ArrowUpDown, Download, FileSpreadsheet, FileText, Printer, ChevronDown, Eye, Edit, Trash2, Trash } from 'lucide-react'
import { DeliveryOrderAPI, CustomerAPI, SalesInvoiceAPI, type DeliveryOrderItem, type Customer, type SalesInvoice } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { ColumnsDropdown } from '@/components/ColumnsDropdown'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function DeliveryOrdersManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DeliveryOrderItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [q, setQ] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false)

  const DELIVERY_COLUMN_KEYS = ['serialNumber', 'invoiceNumber', 'customer', 'date', 'items'] as const
  const DELIVERY_COLUMN_LABELS: Record<string, string> = {
    serialNumber: 'Serial',
    invoiceNumber: 'Invoice',
    customer: 'Customer',
    date: 'Date',
    items: 'Items',
  }
  const { visibleColumns, toggleColumn, columnKeys: deliveryColumnKeys, columnLabels: deliveryColumnLabels } = useColumnVisibility(
    'delivery-orders-visible-columns',
    DELIVERY_COLUMN_KEYS,
    DELIVERY_COLUMN_LABELS
  )

  const navigate = useNavigate()

  // Create customer lookup map
  const customerMap = useMemo(() => {
    const map = new Map<string, string>()
    customers.forEach(c => map.set(c._id, c.name))
    return map
  }, [customers])

  // Create invoice lookup map
  const invoiceMap = useMemo(() => {
    const map = new Map<string, string>()
    salesInvoices.forEach(inv => {
      // SalesInvoice uses invoice_number (snake_case) as the primary field
      // Support both invoice_number (snake_case) and invoiceNumber (camelCase) for compatibility
      const invoiceNum = inv.invoice_number || (inv as any).invoiceNumber || (inv as any).serialNumber || inv._id
      map.set(inv._id, invoiceNum)
    })
    return map
  }, [salesInvoices])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await DeliveryOrderAPI.list()
      setData(res.data.data)
    } finally {
      setLoading(false)
    }
  }

  // Don't fetch delivery orders here - fetch after invoices are loaded
  // useEffect(() => {
  //   fetchData()
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [])

  // Fetch customers and invoices for lookup - fetch BEFORE delivery orders
  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const [customersRes, invoicesRes] = await Promise.all([
          CustomerAPI.list(),
          SalesInvoiceAPI.list(),
        ])
        setCustomers(customersRes.data.data)
        setSalesInvoices(invoicesRes.data.data)
      } catch (error) {
        console.error('Error fetching lookup data:', error)
      }
    }
    fetchLookupData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch delivery orders on mount
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getCustomerNameFromRecord = (record: DeliveryOrderItem) => {
    const customer = record.customer
    if (!customer) return ''
    if (typeof customer === 'object' && customer !== null && customer.name) return customer.name
    if (typeof customer === 'string') return customerMap.get(customer) || customer
    return ''
  }

  const getInvoiceNumberFromRecord = (record: DeliveryOrderItem) => {
    const inv = record.invoiceNumber
    if (!inv) return ''
    if (typeof inv === 'object' && inv !== null) return (inv as any).invoice_number || (inv as any).invoiceNumber || (inv as any).serialNumber || ''
    if (typeof inv === 'string') return invoiceMap.get(inv) || inv
    return ''
  }

  const filteredData = useMemo(() => {
    if (!q.trim()) return data
    const searchLower = q.trim().toLowerCase()
    return data.filter((item) => {
      const values: string[] = [
        item.serialNumber || '',
        getInvoiceNumberFromRecord(item),
        getCustomerNameFromRecord(item),
        item.date ? new Date(item.date).toLocaleDateString() : '',
        String(item.lineItems?.length ?? 0),
      ]
      return values.some((v) => v.toLowerCase().includes(searchLower))
    })
  }, [data, q, customerMap, invoiceMap])

  const columns: ColumnsType<DeliveryOrderItem> = useMemo(
    () => [
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Serial</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'serialNumber',
        key: 'serialNumber',
        render: (text: string) => <span className="text-foreground font-medium">{text}</span>,
      },
      {
        title: <span className="text-foreground font-semibold">Invoice</span>,
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        render: (_: any, record: DeliveryOrderItem) => {
          // Handle both string ID and populated invoice object
          const invoiceNumber = record.invoiceNumber
          let invoiceNumberDisplay = '-'
          
          if (typeof invoiceNumber === 'object' && invoiceNumber !== null) {
            // Populated invoice object - backend populates with 'invoice_number invoiceNumber serialNumber date'
            // SalesInvoice model uses invoice_number (snake_case) as primary field
            invoiceNumberDisplay = (invoiceNumber as any).invoice_number || 
                                   (invoiceNumber as any).invoiceNumber || 
                                   (invoiceNumber as any).serialNumber || 
                                   (invoiceNumber as any)._id || 
                                   '-'
          } else if (typeof invoiceNumber === 'string') {
            // String ID - look up in invoiceMap
            invoiceNumberDisplay = invoiceMap.get(invoiceNumber) || '-'
            
            // If still not found, try direct lookup in salesInvoices array
            if (invoiceNumberDisplay === '-') {
              const foundInvoice = salesInvoices.find(inv => inv._id === invoiceNumber)
              if (foundInvoice) {
                invoiceNumberDisplay = foundInvoice.invoice_number || (foundInvoice as any).invoiceNumber || '-'
              }
            }
          }
          
          return <span className="text-foreground">{invoiceNumberDisplay !== '-' ? invoiceNumberDisplay : '-'}</span>
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Customer</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'customer',
        key: 'customer',
        sorter: (a: DeliveryOrderItem, b: DeliveryOrderItem) => {
          const getCustomerName = (record: DeliveryOrderItem) => {
            const customer = record.customer
            if (typeof customer === 'object' && customer !== null && customer.name) {
              return customer.name
            } else if (typeof customer === 'string') {
              return customerMap.get(customer) || customer
            }
            return ''
          }
          return getCustomerName(a).localeCompare(getCustomerName(b))
        },
        render: (customer: string | Customer) => {
          // Handle both string ID and populated customer object
          let customerName = '-'
          if (typeof customer === 'object' && customer !== null && customer.name) {
            customerName = customer.name
          } else if (typeof customer === 'string') {
            customerName = customerMap.get(customer) || customer
          }
          return <span className="text-foreground">{customerName}</span>
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Date</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'date',
        key: 'date',
        sorter: (a: DeliveryOrderItem, b: DeliveryOrderItem) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        render: (date: string) => (
          <span className="text-muted-foreground">{new Date(date).toLocaleDateString()}</span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Items</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        key: 'items',
        sorter: (a: DeliveryOrderItem, b: DeliveryOrderItem) => (a.lineItems?.length ?? 0) - (b.lineItems?.length ?? 0),
        render: (_: any, r: DeliveryOrderItem) => (
          <span className="text-muted-foreground">{r.lineItems?.length ?? 0}</span>
        ),
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
              title="Delete delivery order"
              description="Are you sure you want to delete this order?"
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
    [customerMap, invoiceMap, navigate]
  )

  const visibleColumnsList = useMemo(() => {
    return columns.filter((col) => col.key === 'actions' || visibleColumns[col.key as string] !== false)
  }, [columns, visibleColumns])

  const onSearch = () => fetchData()

  const onReset = () => setQ('')

  const handleView = (item: DeliveryOrderItem) => {
    navigate(`/delivery-orders/view/${item._id}`)
  }

  const handleEdit = (item: DeliveryOrderItem) => {
    navigate(`/delivery-orders/edit/${item._id}`)
  }

  const handleDelete = async (id: string) => {
    try {
      await DeliveryOrderAPI.remove(id)
      message.success('Delivery order deleted successfully')
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete delivery order')
      console.error('Error deleting delivery order:', error)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select delivery orders to delete')
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
      const deletePromises = selectedRowKeys.map((key) => DeliveryOrderAPI.remove(key as string))
      await Promise.all(deletePromises)
      message.success(`Successfully deleted ${selectedRowKeys.length} delivery order(s)`)
      setSelectedRowKeys([])
      setBulkDeleteModalVisible(false)
      fetchData()
    } catch (error) {
      message.error('Failed to delete some delivery orders')
      console.error('Error deleting delivery orders:', error)
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
    getCheckboxProps: (record: DeliveryOrderItem) => ({
      name: record._id,
    }),
  }

  // Helper function to get customer name
  const getCustomerName = (customer: string | Customer | undefined): string => {
    if (!customer) return '-'
    if (typeof customer === 'object' && customer !== null && customer.name) {
      return customer.name
    }
    if (typeof customer === 'string') {
      return customerMap.get(customer) || customer
    }
    return '-'
  }

  // Helper function to get invoice number
  const getInvoiceNumber = (invoiceNumber: string | any): string => {
    if (!invoiceNumber) return '-'
    if (typeof invoiceNumber === 'object' && invoiceNumber !== null) {
      return (invoiceNumber as any).invoiceNumber || 
             (invoiceNumber as any).invoice_number || 
             (invoiceNumber as any).serialNumber || 
             '-'
    }
    if (typeof invoiceNumber === 'string') {
      return invoiceMap.get(invoiceNumber) || '-'
    }
    return '-'
  }

  // Export to Excel (exports filtered results when search is active)
  const exportToExcel = () => {
    const worksheetData = [
      ['Serial', 'Invoice', 'Customer', 'Date', 'Items'],
      ...filteredData.map((item) => [
        item.serialNumber,
        getInvoiceNumber(item.invoiceNumber),
        getCustomerName(item.customer),
        new Date(item.date).toLocaleDateString(),
        item.lineItems?.length ?? 0,
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(worksheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Delivery Orders')

    const colWidths = [{ wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 10 }]
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `Delivery_Orders_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape')
    
    doc.setFontSize(18)
    doc.text('Delivery Orders Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)
    doc.text(`Total Items: ${filteredData.length}`, 14, 27)

    const tableData = filteredData.map((item) => [
      item.serialNumber,
      getInvoiceNumber(item.invoiceNumber),
      getCustomerName(item.customer),
      new Date(item.date).toLocaleDateString(),
      (item.lineItems?.length ?? 0).toString(),
    ])

    autoTable(doc, {
      head: [['Serial', 'Invoice', 'Customer', 'Date', 'Items']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 32 },
    })

    doc.save(`Delivery_Orders_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Print table (prints filtered results when search is active)
  const printTable = () => {
    const printData = filteredData.map((item) => ({
      Serial: item.serialNumber,
      Invoice: getInvoiceNumber(item.invoiceNumber),
      Customer: getCustomerName(item.customer),
      Date: new Date(item.date).toLocaleDateString(),
      Items: (item.lineItems?.length ?? 0).toString(),
    }))

    const tableRows = printData
      .map(
        (row) => `
      <tr>
        <td>${row.Serial}</td>
        <td>${row.Invoice}</td>
        <td>${row.Customer}</td>
        <td>${row.Date}</td>
        <td>${row.Items}</td>
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
          <h1>Delivery Orders</h1>
          <table>
            <thead>
              <tr>
                <th>Serial</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Delivery Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage your delivery orders •{' '}
            <span className="font-semibold text-foreground">
              {q.trim() ? `${filteredData.length} of ${data.length}` : data.length} order{data.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => navigate('/delivery-orders/create')}
            className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Delivery Order</span>
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
            placeholder="Search delivery orders by serial, invoice, customer..."
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
            columnKeys={deliveryColumnKeys}
            columnLabels={deliveryColumnLabels}
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
            console.log('DeliveryOrdersManage - Pagination changed:', {
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
                Showing {range[0]}-{range[1]} of {total} {total === 1 ? 'order' : 'orders'}
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
                    <Truck className="h-16 w-16 text-muted-foreground relative z-10" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No delivery orders found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q
                    ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                    : 'Get started by creating your first delivery order.'}
                </p>
                {!q && (
                  <Button
                    onClick={() => navigate('/delivery-orders/create')}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Plus className="h-4 w-4" />
                    Create Delivery Order
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
        title="Delete Selected Delivery Orders"
        open={bulkDeleteModalVisible}
        onOk={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteModalVisible(false)}
        okText="Yes, Delete"
        okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
        cancelText="Cancel"
        confirmLoading={bulkDeleteLoading}
      >
        <p>
          Are you sure you want to delete <strong>{selectedRowKeys.length}</strong> delivery order(s)? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
