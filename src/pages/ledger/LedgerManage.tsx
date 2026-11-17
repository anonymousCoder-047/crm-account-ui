import { useEffect, useMemo, useState } from 'react'
import { Table, Popconfirm, message, Tag, DatePicker, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, BookOpen, Download, FileSpreadsheet, FileText, ChevronDown, Eye, Trash2, ExternalLink, Trash, Plus, Edit, ArrowUpDown } from 'lucide-react'
import { LedgerAPI, type JournalEntry } from '@/services/api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

export default function LedgerManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<JournalEntry[]>([])
  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [endDate, setEndDate] = useState<Dayjs | null>(null)
  const [referenceType, setReferenceType] = useState<'Sales' | 'Purchase' | 'Expense' | 'Inventory' | undefined>(undefined)
  const [account, setAccount] = useState<string>('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const navigate = useNavigate()

  // Get unique accounts from entries (support both new `entries` and legacy `lines` formats)
  const uniqueAccounts = useMemo(() => {
    const accounts = new Set<string>()
    data.forEach(entry => {
      const lines = (entry as any).entries || (entry as any).lines || []
      lines.forEach((line: any) => {
        // Support both old and new formats
        const accountName = line.account_name || line.account || ''
        if (accountName) accounts.add(accountName)
      })
    })
    return Array.from(accounts).sort()
  }, [data])

  const fetchData = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (startDate) filters.startDate = startDate.format('YYYY-MM-DD')
      if (endDate) filters.endDate = endDate.format('YYYY-MM-DD')
      if (referenceType) filters.referenceType = referenceType
      if (account) filters.account = account

      const res = await LedgerAPI.list(filters)
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch journal entries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, referenceType, account])

  const handleViewReference = async (entry: JournalEntry) => {
    try {
      const refType = entry.referenceType || entry.source_module
      const refId = entry.referenceId || entry.reference
      
      if (!refType || !refId) return
      
      switch (refType) {
        case 'Sales':
        case 'sales_invoice':
          navigate(`/sales-invoices/view/${refId}`)
          break
        case 'Purchase':
        case 'purchase_invoice':
          navigate(`/purchase-invoices/view/${refId}`)
          break
        case 'Expense':
        case 'expense':
          navigate(`/expenses/view/${refId}`)
          break
        case 'Inventory':
        case 'inventory':
          navigate(`/inventory/view/${refId}`)
          break
        case 'Receivable':
        case 'receivable':
          navigate(`/receivables/view/${refId}`)
          break
        case 'Payable':
        case 'payable':
          navigate(`/payables/view/${refId}`)
          break
      }
    } catch (error) {
      message.error('Failed to navigate to reference')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await LedgerAPI.remove(id)
      message.success('Journal entry deleted successfully')
      fetchData()
      setSelectedRowKeys([])
    } catch (error: any) {
      message.error(error.message || 'Failed to delete journal entry')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one entry to delete')
      return
    }

    try {
      const result = await LedgerAPI.bulkDelete(selectedRowKeys as string[])
      if (result.data.data.errors.length > 0) {
        message.warning(
          `Deleted ${result.data.data.deletedCount} entry/entries. ${result.data.data.errors.length} error(s) occurred.`
        )
      } else {
        message.success(`Successfully deleted ${result.data.data.deletedCount} entry/entries`)
      }
      setSelectedRowKeys([])
      fetchData()
    } catch (error: any) {
      message.error(error.message || 'Failed to delete journal entries')
    }
  }

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      data.map(entry => ({
        Date: dayjs(entry.date).format('YYYY-MM-DD'),
        'Reference Type': entry.referenceType,
        Description: entry.description,
        'Total Amount': ((entry as any).entries || (entry as any).lines || []).reduce(
          (sum: number, e: any) => sum + (e.type === 'debit' ? e.amount : 0),
          0
        ),
        'Created By': entry.createdBy?.name || entry.createdBy?.email || '-',
        'Created At': dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Journal Entries')
    XLSX.writeFile(workbook, `journal-entries-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    message.success('Excel file exported successfully')
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Date', 'Reference Type', 'Description', 'Total Amount', 'Created By']],
      body: data.map(entry => [
        dayjs(entry.date).format('YYYY-MM-DD'),
        entry.referenceType,
        entry.description,
        ((entry as any).entries || (entry as any).lines || [])
          .reduce((sum: number, e: any) => sum + (e.type === 'debit' ? e.amount : 0), 0)
          .toFixed(2),
        entry.createdBy?.name || entry.createdBy?.email || '-',
      ]),
    })
    doc.save(`journal-entries-${dayjs().format('YYYY-MM-DD')}.pdf`)
    message.success('PDF file exported successfully')
  }

  const columns: ColumnsType<JournalEntry> = useMemo(
    () => [
      {
        title: <span className="text-foreground font-semibold">Date</span>,
        dataIndex: 'date',
        key: 'date',
        sorter: (a: JournalEntry, b: JournalEntry) => dayjs(a.date).unix() - dayjs(b.date).unix(),
        render: (date: string) => (
          <span className="text-foreground font-medium">{dayjs(date).format('YYYY-MM-DD')}</span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Reference</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        key: 'reference',
        sorter: (a: JournalEntry, b: JournalEntry) => {
          const aType = a.referenceType || a.source_module || 'Manual'
          const bType = b.referenceType || b.source_module || 'Manual'
          return aType.localeCompare(bType)
        },
        render: (_, record) => {
          const refType = record.referenceType || record.source_module || 'Manual'
          const refTypeDisplay = refType === 'sales_invoice' ? 'Sales' :
                                 refType === 'purchase_invoice' ? 'Purchase' :
                                 refType === 'expense' ? 'Expense' :
                                 refType === 'inventory' ? 'Inventory' :
                                 refType === 'receivable' ? 'Receivable' :
                                 refType === 'payable' ? 'Payable' : refType
          
          return (
            <div className="flex items-center gap-2">
              <Tag color={
                refType === 'Sales' || refType === 'sales_invoice' ? 'blue' :
                refType === 'Purchase' || refType === 'purchase_invoice' ? 'green' :
                refType === 'Expense' || refType === 'expense' ? 'orange' : 'purple'
              }>
                {refTypeDisplay}
              </Tag>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewReference(record)}
                className="h-6 px-2 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )
        },
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
        sorter: (a: JournalEntry, b: JournalEntry) => (a.description || '').localeCompare(b.description || ''),
        render: (text: string) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Debit</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        key: 'debit',
        align: 'right' as const,
        sorter: (a: JournalEntry, b: JournalEntry) => {
          const getDebit = (record: JournalEntry) => {
            const lines = (record as any).entries || (record as any).lines || []
            return lines.reduce((sum: number, e: any) => {
              if (e.debit !== undefined) {
                return sum + (e.debit || 0)
              } else if (e.type === 'debit' && e.amount) {
                return sum + e.amount
              }
              return sum
            }, 0)
          }
          return getDebit(a) - getDebit(b)
        },
        render: (_, record) => {
          // Support both new (`entries`) and legacy (`lines`) formats
          const lines = (record as any).entries || (record as any).lines || []
          const debitTotal = lines.reduce((sum: number, e: any) => {
            if (e.debit !== undefined) {
              return sum + (e.debit || 0)
            } else if (e.type === 'debit' && e.amount) {
              return sum + e.amount
            }
            return sum
          }, 0)
          return (
            <span className="text-foreground font-medium">
              {debitTotal > 0 ? `AED ${debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Credit</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        key: 'credit',
        align: 'right' as const,
        sorter: (a: JournalEntry, b: JournalEntry) => {
          const getCredit = (record: JournalEntry) => {
            const lines = (record as any).entries || (record as any).lines || []
            return lines.reduce((sum: number, e: any) => {
              if (e.credit !== undefined) {
                return sum + (e.credit || 0)
              } else if (e.type === 'credit' && e.amount) {
                return sum + e.amount
              }
              return sum
            }, 0)
          }
          return getCredit(a) - getCredit(b)
        },
        render: (_, record) => {
          // Support both new (`entries`) and legacy (`lines`) formats
          const lines = (record as any).entries || (record as any).lines || []
          const creditTotal = lines.reduce((sum: number, e: any) => {
            if (e.credit !== undefined) {
              return sum + (e.credit || 0)
            } else if (e.type === 'credit' && e.amount) {
              return sum + e.amount
            }
            return sum
          }, 0)
          return (
            <span className="text-foreground font-medium">
              {creditTotal > 0 ? `AED ${creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Created By</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        key: 'createdBy',
        sorter: (a: JournalEntry, b: JournalEntry) => {
          const aName = a.createdBy?.name || a.createdBy?.email || ''
          const bName = b.createdBy?.name || b.createdBy?.email || ''
          return aName.localeCompare(bName)
        },
        render: (_, record) => (
          <span className="text-muted-foreground">
            {record.createdBy?.name || record.createdBy?.email || '-'}
          </span>
        ),
      },
      {
        title: <span className="text-foreground font-semibold">Actions</span>,
        key: 'actions',
        width: 100,
        fixed: 'right' as const,
        render: (_, record) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newExpanded = new Set(expandedRows)
                if (newExpanded.has(record._id)) {
                  newExpanded.delete(record._id)
                } else {
                  newExpanded.add(record._id)
                }
                setExpandedRows(newExpanded)
              }}
              className="border-blue-500/30 hover:bg-blue-500/10"
              title="View Details"
            >
              <Eye className="h-3 w-3 text-blue-400" />
            </Button>
            {record.source_module === 'manual' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/ledger/edit/${record._id}`)}
                className="border-green-500/30 hover:bg-green-500/10"
                title="Edit"
              >
                <Edit className="h-3 w-3 text-green-400" />
              </Button>
            )}
            <Popconfirm
              title="Delete journal entry"
              description="Are you sure you want to delete this journal entry?"
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
    [expandedRows, navigate]
  )

  const expandedRowRender = (record: JournalEntry) => {
    const lines = (record as any).entries || (record as any).lines || []

    return (
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Journal Entry Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Reference ID:</span>
                <span className="ml-2 text-foreground font-medium">{record.referenceId}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Created At:</span>
                <span className="ml-2 text-foreground font-medium">
                  {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Entries</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-foreground font-semibold">Account</th>
                    <th className="text-right py-2 px-3 text-foreground font-semibold">Debit</th>
                    <th className="text-right py-2 px-3 text-foreground font-semibold">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((entry: any, idx: number) => {
                    // Support both old and new formats
                    const accountName = entry.account_name || entry.account || '-'
                    const debit =
                      entry.debit !== undefined
                        ? entry.debit
                        : entry.type === 'debit'
                        ? entry.amount || 0
                        : 0
                    const credit =
                      entry.credit !== undefined
                        ? entry.credit
                        : entry.type === 'credit'
                        ? entry.amount || 0
                        : 0
                    
                    return (
                      <tr key={idx} className="border-b border-border">
                        <td className="py-2 px-3 text-foreground">{accountName}</td>
                        <td className="py-2 px-3 text-right text-foreground">
                          {debit > 0 ? `AED ${debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-foreground">
                          {credit > 0 ? `AED ${credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-muted font-semibold">
                    <td className="py-2 px-3 text-foreground">Total</td>
                    <td className="py-2 px-3 text-right text-foreground">
                      AED{' '}
                      {lines
                        .reduce((sum: number, e: any) => {
                          const debit =
                            e.debit !== undefined
                              ? e.debit
                              : e.type === 'debit'
                              ? e.amount || 0
                              : 0
                          return sum + debit
                        }, 0)
                        .toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">
                      AED{' '}
                      {lines
                        .reduce((sum: number, e: any) => {
                          const credit =
                            e.credit !== undefined
                              ? e.credit
                              : e.type === 'credit'
                              ? e.amount || 0
                              : 0
                          return sum + credit
                        }, 0)
                        .toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }


  const clearFilters = () => {
    setStartDate(null)
    setEndDate(null)
    setReferenceType(undefined)
    setAccount('')
  }

  return (
    <div className="p-6 space-y-6 bg-muted/50 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/15 rounded-lg">
            <BookOpen className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ledger</h1>
            <p className="text-sm text-muted-foreground">View and manage journal entries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            onClick={() => navigate('/ledger/create')}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Entry
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="Delete selected entries"
              description={`Are you sure you want to delete ${selectedRowKeys.length} selected journal entry/entries?`}
              onConfirm={handleBulkDelete}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button variant="destructive" className="gap-2">
                <Trash className="h-4 w-4" />
                Delete Selected ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-card rounded-lg border border-border shadow-sm p-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Date Range</label>
            <RangePicker
              className="w-full"
              value={startDate && endDate ? [startDate, endDate] : null}
              onChange={(dates: [Dayjs | null, Dayjs | null] | null) => {
                if (dates) {
                  setStartDate(dates[0])
                  setEndDate(dates[1])
                } else {
                  setStartDate(null)
                  setEndDate(null)
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Reference Type</label>
            <Select
              className="w-full"
              placeholder="All Types"
              value={referenceType}
              onChange={setReferenceType}
              allowClear
              options={[
                { label: 'Sales', value: 'Sales' },
                { label: 'Purchase', value: 'Purchase' },
                { label: 'Expense', value: 'Expense' },
                { label: 'Inventory', value: 'Inventory' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Account</label>
            <Select
              className="w-full"
              placeholder="All Accounts"
              value={account}
              onChange={setAccount}
              allowClear
              showSearch
              filterOption={(input: string, option: any) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={uniqueAccounts.map(acc => ({ label: acc, value: acc }))}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
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
          columns={columns}
          dataSource={data}
          scroll={{ x: 'max-content' }}
          rowSelection={{
            selectedRowKeys,
            onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
            getCheckboxProps: () => ({
              name: 'journal-entry-checkbox',
            }),
          }}
          expandable={{
            expandedRowRender,
            expandedRowKeys: Array.from(expandedRows),
            onExpand: (expanded: boolean, record: JournalEntry) => {
              const newExpanded = new Set(expandedRows)
              if (expanded) {
                newExpanded.add(record._id)
              } else {
                newExpanded.delete(record._id)
              }
              setExpandedRows(newExpanded)
            },
          }}
          onChange={(pagination, filters, sorter) => {
            console.log('LedgerManage - Pagination changed:', {
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
                Showing {range[0]}-{range[1]} of {total} {total === 1 ? 'entry' : 'entries'}
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
                    <BookOpen className="h-16 w-16 text-muted-foreground relative z-10" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No journal entries found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {startDate || endDate || referenceType || account
                    ? 'Try adjusting your filters to find what you\'re looking for.'
                    : 'Journal entries will appear here when transactions are created.'}
                </p>
              </div>
            ),
          }}
        />
      </motion.div>
    </div>
  )
}

