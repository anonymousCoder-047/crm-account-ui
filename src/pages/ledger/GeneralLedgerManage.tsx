import { useEffect, useMemo, useState } from 'react'
import { Table, message, DatePicker, Select, Tag, Popconfirm } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, BookOpen, Download, FileSpreadsheet, FileText, ChevronDown, Eye, Filter, Users, Trash, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { GeneralLedgerAPI, CustomerAPI, ReceivableAPI, FinancialStatementsAPI, type GeneralLedgerEntry, type Account, type AccountType, type Customer, type ReceivableItem } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select as SelectUI, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

export default function GeneralLedgerManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<GeneralLedgerEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [receivables, setReceivables] = useState<ReceivableItem[]>([])
  // Default to yesterday to tomorrow
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(1, 'day'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().add(1, 'day'))
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | undefined>(undefined)
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all')
  const [showCustomerLedger, setShowCustomerLedger] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [totalCOGS, setTotalCOGS] = useState<number>(0)
  const navigate = useNavigate()

  // Create customer lookup map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>()
    customers.forEach(c => map.set(c._id, c))
    return map
  }, [customers])

  // Create receivable lookup map for invoice numbers
  const receivableMap = useMemo(() => {
    const map = new Map<string, ReceivableItem>()
    receivables.forEach(r => {
      if (r.invoice_number) {
        map.set(r.invoice_number, r)
      }
    })
    return map
  }, [receivables])

  useEffect(() => {
    fetchAccounts()
    fetchCustomers()
    fetchReceivables()
  }, [])

  useEffect(() => {
    fetchData()
    fetchCOGS()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedAccount, selectedAccountType, selectedCustomer, showCustomerLedger])

  const fetchAccounts = async () => {
    try {
      const res = await GeneralLedgerAPI.getAccounts()
      setAccounts(res.data.data)
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch accounts')
    }
  }

  const fetchCustomers = async () => {
    try {
      const res = await CustomerAPI.list()
      setCustomers(res.data.data)
    } catch (error: any) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchReceivables = async () => {
    try {
      const res = await ReceivableAPI.list()
      setReceivables(res.data.data)
    } catch (error: any) {
      console.error('Error fetching receivables:', error)
    }
  }

  const fetchCOGS = async () => {
    // Use default dates (yesterday to tomorrow) if not provided
    const effectiveStartDate = startDate || dayjs().subtract(1, 'day')
    const effectiveEndDate = endDate || dayjs().add(1, 'day')

    try {
      const res = await FinancialStatementsAPI.getIncomeStatement(
        effectiveStartDate.format('YYYY-MM-DD'),
        effectiveEndDate.format('YYYY-MM-DD')
      )
      console.log('COGS from Income Statement:', res.data.data)
      // Get COGS total from Income Statement response
      const cogsTotal = res.data.data?.cogs?.total || 0
      setTotalCOGS(cogsTotal)
    } catch (error: any) {
      console.error('Error fetching COGS from Income Statement:', error)
      setTotalCOGS(0)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      // Use default dates (yesterday to tomorrow) if not provided
      const effectiveStartDate = startDate || dayjs().subtract(1, 'day')
      const effectiveEndDate = endDate || dayjs().add(1, 'day')
      
      // Format dates as YYYY-MM-DD for API
      // End date should include the full day, so we keep it as is (backend will handle end of day)
      filters.startDate = effectiveStartDate.format('YYYY-MM-DD')
      filters.endDate = effectiveEndDate.format('YYYY-MM-DD')
      
      console.log('Fetching ledger entries with filters:', filters)
      
      if (showCustomerLedger && selectedCustomer && selectedCustomer !== 'all') {
        // Filter by Accounts Receivable account and customer
        filters.account_id = 'ACCOUNTS_RECEIVABLE'
      } else {
        if (selectedAccount && selectedAccount !== 'all') filters.account_id = selectedAccount
      }
      
      if (selectedAccountType && selectedAccountType !== 'all') filters.account_type = selectedAccountType

      const res = await GeneralLedgerAPI.list(filters)
      let filteredData = res.data.data || []

      console.log('Fetched ledger entries:', filteredData.length, 'entries')
      console.log('Date range:', filters.startDate, 'to', filters.endDate)
      // If customer filter is active, filter by customer's receivables
      if (showCustomerLedger && selectedCustomer && selectedCustomer !== 'all') {
        const customerReceivables = receivables.filter(r => 
          (typeof r.customer_id === 'string' ? r.customer_id : (r.customer_id as any)?._id) === selectedCustomer
        )
        const customerInvoiceNumbers = new Set(customerReceivables.map(r => r.invoice_number))
        
        filteredData = filteredData.filter(entry => {
          // Check if the entry's reference matches any of the customer's invoice numbers
          return entry.reference && customerInvoiceNumbers.has(entry.reference)
        })
      }

      setData(filteredData)
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch ledger entries')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      data.map(entry => ({
        Date: dayjs(entry.date).format('YYYY-MM-DD'),
        'Account ID': entry.account_id,
        'Account Name': entry.account_name,
        'Account Type': entry.account_type || '-',
        Debit: entry.debit,
        Credit: entry.credit,
        'Journal ID': entry.journal_id || '-',
        Description: entry.description || '-',
        Reference: entry.reference || '-',
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'General Ledger')
    XLSX.writeFile(workbook, `general-ledger-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    message.success('Excel file exported successfully')
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Date', 'Account', 'Debit', 'Credit']],
      body: data.map(entry => [
        dayjs(entry.date).format('YYYY-MM-DD'),
        entry.account_name,
        entry.debit.toFixed(2),
        entry.credit.toFixed(2),
      ]),
    })
    doc.save(`general-ledger-${dayjs().format('YYYY-MM-DD')}.pdf`)
    message.success('PDF file exported successfully')
  }

  const handleViewAccount = (accountId: string) => {
    navigate(`/general-ledger/account/${accountId}`)
  }

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one entry to delete')
      return
    }

    try {
      const result = await GeneralLedgerAPI.bulkDelete(selectedRowKeys as string[])
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
      message.error(error.message || 'Failed to delete ledger entries')
    }
  }

  const columns: ColumnsType<GeneralLedgerEntry> = useMemo(
    () => [
      {
        title: <span className="text-foreground font-semibold">Date</span>,
        dataIndex: 'date',
        key: 'date',
        sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
        render: (date: string) => (
          <span className="text-foreground font-medium">{dayjs(date).format('YYYY-MM-DD')}</span>
        ),
      },
      {
        title: <span className="text-foreground font-semibold">Account</span>,
        key: 'account',
        render: (_, record) => (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="link"
              size="sm"
              onClick={() => handleViewAccount(record.account_id)}
              className="h-auto p-0 text-blue-400 hover:text-blue-300"
            >
              {record.account_name}
            </Button>
            {record.account_type && (
              <Tag color={
                record.account_type === 'Asset' ? 'blue' :
                record.account_type === 'Liability' ? 'red' :
                record.account_type === 'Equity' ? 'green' :
                record.account_type === 'Revenue' ? 'cyan' : 'orange'
              }>
                {record.account_type}
              </Tag>
            )}
            {record.account_sub_type && (
              <Tag color="default" className="text-xs">
                {record.account_sub_type}
              </Tag>
            )}
          </div>
        ),
      },
      {
        title: <span className="text-foreground font-semibold" style={{ display: 'block', textAlign: 'right' }}>Debit</span>,
        dataIndex: 'debit',
        key: 'debit',
        align: 'right' as const,
        render: (debit: number) => (
          <span className="text-foreground font-medium">
            {debit > 0 ? `AED ${debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          </span>
        ),
      },
      {
        title: <span className="text-foreground font-semibold" style={{ display: 'block', textAlign: 'right' }}>Credit</span>,
        dataIndex: 'credit',
        key: 'credit',
        align: 'right' as const,
        render: (credit: number) => (
          <span className="text-foreground font-medium">
            {credit > 0 ? `AED ${credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          </span>
        ),
      },
      {
        title: <span className="text-foreground font-semibold">Journal ID</span>,
        dataIndex: 'journal_id',
        key: 'journal_id',
        render: (journalId: string) => (
          <span className="text-muted-foreground">{journalId || '-'}</span>
        ),
      },
      {
        title: <span className="text-foreground font-semibold">Description</span>,
        dataIndex: 'description',
        key: 'description',
        render: (text: string, record) => {
          // Try to extract customer info from receivables
          if (record.account_id === 'ACCOUNTS_RECEIVABLE' && record.reference) {
            const receivable = receivableMap.get(record.reference)
            if (receivable) {
              const customerId = typeof receivable.customer_id === 'string' 
                ? receivable.customer_id 
                : (receivable.customer_id as any)?._id
              const customer = customerId ? customerMap.get(customerId) : null
              
              return (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{text || '-'}</span>
                  {customer && (
                    <span className="text-xs text-blue-400 font-medium">
                      Customer: {customer.name}
                    </span>
                  )}
                </div>
              )
            }
          }
          return <span className="text-muted-foreground">{text || '-'}</span>
        },
      },
    ],
    [navigate, customerMap, receivableMap]
  )

  const clearFilters = () => {
    // Reset to default: yesterday to tomorrow
    setStartDate(dayjs().subtract(1, 'day'))
    setEndDate(dayjs().add(1, 'day'))
    setSelectedAccount('all')
    setSelectedAccountType(undefined)
    setSelectedCustomer('all')
    setShowCustomerLedger(false)
  }

  // Calculate KPIs from the filtered data
  const kpis = useMemo(() => {
    if (data.length === 0) {
      return {
        totalDebits: 0,
        totalCredits: 0,
        closingBalance: 0,
        currentBalance: 0,
        totalCOGS: 0,
      }
    }

    // Sort data by date to get closing balance
    const sortedData = [...data].sort((a, b) => 
      dayjs(a.date).unix() - dayjs(b.date).unix()
    )

    const totalDebits = data.reduce((sum, entry) => sum + (entry.debit || 0), 0)
    const totalCredits = data.reduce((sum, entry) => sum + (entry.credit || 0), 0)

    // Total COGS is fetched from Income Statement API (same source as Income Statement)
    // This ensures consistency between General Ledger and Income Statement

    // Current balance (latest running balance) - this is the running balance
    const lastEntry = sortedData[sortedData.length - 1]
    const currentBalance = lastEntry.running_balance || 0

    // Closing balance = current balance - total COGS
    const closingBalance = totalCOGS - Math.abs(currentBalance)

    return {
      totalDebits,
      totalCredits,
      closingBalance,
      currentBalance,
      totalCOGS,
    }
  }, [data, totalCOGS])

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
            <h1 className="text-2xl font-bold text-foreground">General Ledger</h1>
            <p className="text-sm text-muted-foreground">View account-wise ledger entries with running balances</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="Delete selected entries"
              description={`Are you sure you want to delete ${selectedRowKeys.length} selected ledger entry/entries?`}
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

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {/* Running Balance */}
        <div className="bg-gradient-to-br from-blue-500/100 to-blue-600 rounded-lg border border-blue-500/30 shadow-sm p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-card/20 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium opacity-90">Running Balance</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            AED {kpis.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs opacity-75">Latest running balance</div>
        </div>

        {/* Total COGS */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500/15 rounded-lg">
              <TrendingDown className="h-5 w-5 text-orange-400" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Total COGS</span>
          </div>
          <div className="text-2xl font-bold text-orange-400 mb-1">
            AED {kpis.totalCOGS.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground">Cost of Goods Sold</div>
        </div>

        {/* Closing Balance */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-muted rounded-lg">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Closing Balance</span>
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">
            AED {kpis.closingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground">Balance - COGS</div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-card rounded-lg border border-border shadow-sm p-4"
      >
        <div className="space-y-4">
          {/* Customer Ledger Toggle */}
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <Button
              variant={showCustomerLedger ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowCustomerLedger(!showCustomerLedger)
                if (!showCustomerLedger) {
                  setSelectedAccount('')
                  setSelectedAccountType(undefined)
                } else {
                  setSelectedCustomer('')
                }
              }}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              {showCustomerLedger ? 'Customer Ledger' : 'View Customer Ledger'}
            </Button>
            {showCustomerLedger && (
              <div className="flex-1 max-w-xs">
                <SelectUI
                  value={selectedCustomer}
                  onValueChange={setSelectedCustomer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectUI>
              </div>
            )}
          </div>

          {/* Regular Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Date Range</label>
              <RangePicker
                className="w-full"
                value={[startDate, endDate]}
                onChange={(dates: [Dayjs | null, Dayjs | null] | null) => {
                  if (dates) {
                    setStartDate(dates[0])
                    setEndDate(dates[1])
                  } else {
                    // Reset to default (yesterday to tomorrow) if cleared
                    setStartDate(dayjs().subtract(1, 'day'))
                    setEndDate(dayjs().add(1, 'day'))
                  }
                }}
              />
            </div>
            {!showCustomerLedger && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Account</label>
                  <SelectUI
                    value={selectedAccount}
                    onValueChange={setSelectedAccount}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map(acc => (
                        <SelectItem key={acc.account_id} value={acc.account_id}>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectUI>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Account Type</label>
            <SelectUI
              value={selectedAccountType || 'all'}
              onValueChange={(value) => setSelectedAccountType(value === 'all' ? undefined : value as AccountType)}
            >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Asset">Asset</SelectItem>
                      <SelectItem value="Liability">Liability</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="Revenue">Revenue</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                    </SelectContent>
                  </SelectUI>
                </div>
              </>
            )}
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
              name: 'ledger-entry-checkbox',
            }),
          }}
          summary={() => {
            const totalDebits = data.reduce((sum, entry) => sum + (entry.debit || 0), 0)
            const totalCredits = data.reduce((sum, entry) => sum + (entry.credit || 0), 0)
            
            return (
              <Table.Summary fixed>
                <Table.Summary.Row className="bg-muted/50">
                  {/* Date column - empty */}
                  <Table.Summary.Cell index={0} />
                  {/* Account column - "Total" label */}
                  <Table.Summary.Cell index={1}>
                    <span className="font-bold text-foreground">Total</span>
                  </Table.Summary.Cell>
                  {/* Debit column - empty (moved totals one column right) */}
                  <Table.Summary.Cell index={2} />
                  {/* Credit column - Debit total (moved one column right) */}
                  <Table.Summary.Cell index={3} align="right">
                    <span className="font-bold text-green-400">
                      AED {totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </Table.Summary.Cell>
                  {/* Journal ID column - Credit total (moved one column right) */}
                  <Table.Summary.Cell index={4} align="right">
                    <span className="font-bold text-red-400">
                      AED {totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </Table.Summary.Cell>
                  {/* Description column - Balance status */}
                  <Table.Summary.Cell index={5}>
                    {totalDebits === totalCredits ? (
                      <span className="text-green-400 font-semibold">✓ Balanced</span>
                    ) : (
                      <span className="text-red-400 font-semibold">
                        Difference: AED {Math.abs(totalDebits - totalCredits).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total: number) => (
              <span className="text-muted-foreground text-sm">
                Showing {total} {total === 1 ? 'entry' : 'entries'}
              </span>
            ),
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
                <h3 className="text-lg font-semibold text-foreground mb-2">No ledger entries found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {startDate || endDate || selectedAccount || selectedAccountType
                    ? 'Try adjusting your filters to find what you\'re looking for.'
                    : 'Ledger entries will appear here when journal entries are created.'}
                </p>
              </div>
            ),
          }}
        />
      </motion.div>
    </div>
  )
}

