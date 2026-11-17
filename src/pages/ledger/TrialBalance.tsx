import { useEffect, useState } from 'react'
import { Table, message, DatePicker, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { motion } from 'framer-motion'
import { Download, FileSpreadsheet, FileText, ChevronDown, Scale } from 'lucide-react'
import { GeneralLedgerAPI, type TrialBalance, type TrialBalanceItem } from '@/services/api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs, { Dayjs } from 'dayjs'

export default function TrialBalancePage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<TrialBalance | null>(null)
  const [asOfDate, setAsOfDate] = useState<Dayjs | null>(dayjs())

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOfDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await GeneralLedgerAPI.getTrialBalance(
        asOfDate ? asOfDate.format('YYYY-MM-DD') : undefined
      )
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch trial balance')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    if (!data) return

    const worksheet = XLSX.utils.json_to_sheet(
      data.accounts.map(item => ({
        'Account Name': item.account_name,
        'Account Type': item.account_type || '-',
        'Sub-Type': item.account_sub_type || '-',
        'Debit Balance': item.debit_balance,
        'Credit Balance': item.credit_balance,
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trial Balance')
    
    // Add summary row
    const summaryData = [
      ['', '', '', ''],
      ['TOTAL', '', data.total_debit, data.total_credit],
      ['BALANCED', '', data.is_balanced ? 'Yes' : 'No', ''],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
    
    XLSX.writeFile(workbook, `trial-balance-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    message.success('Excel file exported successfully')
  }

  const handleExportPDF = () => {
    if (!data) return

    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(16)
    doc.text('Trial Balance', 14, 20)
    doc.setFontSize(10)
    doc.text(`As of: ${dayjs(data.as_of_date).format('YYYY-MM-DD')}`, 14, 28)

    // Table
    autoTable(doc, {
      startY: 35,
      head: [['Account Name', 'Account Type', 'Sub-Type', 'Debit', 'Credit']],
      body: data.accounts.map(item => [
        item.account_name,
        item.account_type || '-',
        item.account_sub_type || '-',
        item.debit_balance.toFixed(2),
        item.credit_balance.toFixed(2),
      ]),
      foot: [
        ['TOTAL', '', data.total_debit.toFixed(2), data.total_credit.toFixed(2)],
        ['BALANCED', '', data.is_balanced ? 'Yes' : 'No', ''],
      ],
    })
    
    doc.save(`trial-balance-${dayjs().format('YYYY-MM-DD')}.pdf`)
    message.success('PDF file exported successfully')
  }

  const columns: ColumnsType<TrialBalanceItem> = [
    {
      title: <span className="text-foreground font-semibold">Account Name</span>,
      dataIndex: 'account_name',
      key: 'account_name',
      render: (text: string) => <span className="text-foreground font-medium">{text}</span>,
    },
    {
      title: <span className="text-foreground font-semibold">Account Type</span>,
      dataIndex: 'account_type',
      key: 'account_type',
      render: (type: string) => (
        type ? (
          <Tag color={
            type === 'Asset' ? 'blue' :
            type === 'Liability' ? 'red' :
            type === 'Equity' ? 'green' :
            type === 'Revenue' ? 'cyan' : 'orange'
          }>
            {type}
          </Tag>
        ) : <span className="text-muted-foreground">-</span>
      ),
    },
    {
      title: <span className="text-foreground font-semibold">Sub-Type</span>,
      dataIndex: 'account_sub_type',
      key: 'account_sub_type',
      render: (subType: string) => (
        subType ? (
          <span className="text-xs px-2 py-1 rounded bg-muted text-foreground">
            {subType}
          </span>
        ) : <span className="text-muted-foreground text-xs">-</span>
      ),
    },
    {
      title: <span className="text-foreground font-semibold">Debit Balance</span>,
      dataIndex: 'debit_balance',
      key: 'debit_balance',
      align: 'right' as const,
      render: (balance: number) => (
        <span className="text-foreground font-medium">
          {balance > 0 ? `AED ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
        </span>
      ),
    },
    {
      title: <span className="text-foreground font-semibold">Credit Balance</span>,
      dataIndex: 'credit_balance',
      key: 'credit_balance',
      align: 'right' as const,
      render: (balance: number) => (
        <span className="text-foreground font-medium">
          {balance > 0 ? `AED ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
        </span>
      ),
    },
  ]

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
          <div className="p-2 bg-green-500/15 rounded-lg">
            <Scale className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trial Balance</h1>
            <p className="text-sm text-muted-foreground">View account balances as of a specific date</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker
            value={asOfDate}
            onChange={(date) => setAsOfDate(date)}
            format="YYYY-MM-DD"
            placeholder="Select date"
            className="w-40"
          />
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
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-card rounded-lg border border-border shadow-sm p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Debit</p>
              <p className="text-2xl font-bold text-foreground">
                AED {data.total_debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Credit</p>
              <p className="text-2xl font-bold text-foreground">
                AED {data.total_credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Difference</p>
              <p className={`text-2xl font-bold ${Math.abs(data.total_debit - data.total_credit) < 0.01 ? 'text-green-400' : 'text-red-400'}`}>
                AED {Math.abs(data.total_debit - data.total_credit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Tag color={data.is_balanced ? 'green' : 'red'} className="text-base px-3 py-1">
                {data.is_balanced ? 'Balanced' : 'Unbalanced'}
              </Tag>
            </div>
          </div>
        </motion.div>
      )}

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-card rounded-lg border border-border shadow-sm overflow-hidden"
      >
        <Table
          rowKey="account_id"
          loading={loading}
          columns={columns}
          dataSource={data?.accounts || []}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total: number) => (
              <span className="text-muted-foreground text-sm">
                Showing {total} {total === 1 ? 'account' : 'accounts'}
              </span>
            ),
            className: 'px-6 py-4',
          }}
          summary={() => data && (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <span className="font-semibold text-foreground">TOTAL</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="font-semibold text-foreground">
                    AED {data.total_debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="font-semibold text-foreground">
                    AED {data.total_credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
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
                    <Scale className="h-16 w-16 text-muted-foreground relative z-10" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No trial balance data</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  Trial balance will appear here once journal entries are created.
                </p>
              </div>
            ),
          }}
        />
      </motion.div>
    </div>
  )
}

