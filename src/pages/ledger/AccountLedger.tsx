import { useEffect, useState } from 'react'
import { Table, message, DatePicker, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, FileSpreadsheet, FileText, ChevronDown, BookOpen } from 'lucide-react'
import { GeneralLedgerAPI, type AccountLedgerSummary } from '@/services/api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

export default function AccountLedgerPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AccountLedgerSummary | null>(null)
  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [endDate, setEndDate] = useState<Dayjs | null>(null)

  useEffect(() => {
    if (accountId) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, startDate, endDate])

  const fetchData = async () => {
    if (!accountId) return

    setLoading(true)
    try {
      const params: any = {}
      if (startDate) params.startDate = startDate.format('YYYY-MM-DD')
      if (endDate) params.endDate = endDate.format('YYYY-MM-DD')

      const res = await GeneralLedgerAPI.getByAccount(accountId, params)
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch account ledger')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    if (!data) return

    const worksheet = XLSX.utils.json_to_sheet(
      data.entries.map(entry => ({
        Date: dayjs(entry.date).format('YYYY-MM-DD'),
        Debit: entry.debit,
        Credit: entry.credit,
        'Running Balance': entry.running_balance,
        'Journal ID': entry.journal_id || '-',
        Description: entry.description || '-',
        Reference: entry.reference || '-',
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Ledger')
    XLSX.writeFile(workbook, `account-ledger-${data.account_name}-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    message.success('Excel file exported successfully')
  }

  const handleExportPDF = () => {
    if (!data) return

    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(16)
    doc.text(`Account Ledger: ${data.account_name}`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Account ID: ${data.account_id}`, 14, 28)
    let yPos = 34
    if (data.account_type) {
      doc.text(`Account Type: ${data.account_type}`, 14, yPos)
      yPos += 6
    }
    if (data.account_sub_type) {
      doc.text(`Sub-Type: ${data.account_sub_type}`, 14, yPos)
      yPos += 6
    }

    // Summary
    doc.setFontSize(12)
    doc.text(`Opening Balance: AED ${data.opening_balance.toFixed(2)}`, 14, 44)
    doc.text(`Total Debit: AED ${data.total_debit.toFixed(2)}`, 14, 50)
    doc.text(`Total Credit: AED ${data.total_credit.toFixed(2)}`, 14, 56)
    doc.text(`Closing Balance: AED ${data.closing_balance.toFixed(2)}`, 14, 62)

    // Table
    autoTable(doc, {
      startY: 70,
      head: [['Date', 'Debit', 'Credit', 'Balance']],
      body: data.entries.map(entry => [
        dayjs(entry.date).format('YYYY-MM-DD'),
        entry.debit.toFixed(2),
        entry.credit.toFixed(2),
        entry.running_balance.toFixed(2),
      ]),
    })
    
    doc.save(`account-ledger-${data.account_name}-${dayjs().format('YYYY-MM-DD')}.pdf`)
    message.success('PDF file exported successfully')
  }

  const columns: ColumnsType<any> = [
    {
      title: <span className="text-foreground font-semibold">Date</span>,
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => (
        <span className="text-foreground font-medium">{dayjs(date).format('YYYY-MM-DD')}</span>
      ),
    },
    {
      title: <span className="text-foreground font-semibold">Debit</span>,
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
      title: <span className="text-foreground font-semibold">Credit</span>,
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
      title: <span className="text-foreground font-semibold">Running Balance</span>,
      dataIndex: 'running_balance',
      key: 'running_balance',
      align: 'right' as const,
      render: (balance: number) => (
        <span className="text-foreground font-semibold">
          AED {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      render: (text: string) => <span className="text-muted-foreground">{text || '-'}</span>,
    },
  ]

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <p className="text-muted-foreground">Loading account ledger...</p>
        </div>
      </div>
    )
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/general-ledger/manage')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-2 bg-blue-500/15 rounded-lg">
            <BookOpen className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{data.account_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">Account Ledger</p>
              {data.account_type && (
                <Tag color={
                  data.account_type === 'Asset' ? 'blue' :
                  data.account_type === 'Liability' ? 'red' :
                  data.account_type === 'Equity' ? 'green' :
                  data.account_type === 'Revenue' ? 'cyan' : 'orange'
                }>
                  {data.account_type}
                </Tag>
              )}
              {data.account_sub_type && (
                <Tag color="default" className="text-xs">
                  {data.account_sub_type}
                </Tag>
              )}
            </div>
          </div>
          {data.account_type && (
            <Tag color={
              data.account_type === 'Asset' ? 'blue' :
              data.account_type === 'Liability' ? 'red' :
              data.account_type === 'Equity' ? 'green' :
              data.account_type === 'Revenue' ? 'cyan' : 'orange'
            }>
              {data.account_type}
            </Tag>
          )}
        </div>
        <div className="flex items-center gap-2">
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

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-card rounded-lg border border-border shadow-sm p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Opening Balance</p>
            <p className="text-2xl font-bold text-foreground">
              AED {data.opening_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Debit</p>
            <p className="text-2xl font-bold text-blue-400">
              AED {data.total_debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Credit</p>
            <p className="text-2xl font-bold text-red-400">
              AED {data.total_credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Closing Balance</p>
            <p className="text-2xl font-bold text-green-400">
              AED {data.closing_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-card rounded-lg border border-border shadow-sm p-4"
      >
        <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
        <RangePicker
          className="w-full max-w-md"
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
          dataSource={data.entries}
          scroll={{ x: 'max-content' }}
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
        />
      </motion.div>
    </div>
  )
}

