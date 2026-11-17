import { useEffect, useState } from 'react'
import { message, DatePicker, Tag } from 'antd'
import { motion } from 'framer-motion'
import { Download, FileSpreadsheet, FileText, ChevronDown, DollarSign, Calendar, ExternalLink } from 'lucide-react'
import { FinancialStatementsAPI, type CashFlowStatement, type CashFlowItem } from '@/services/api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

export default function CashFlowStatementPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CashFlowStatement | null>(null)
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('month'))
  const [detailModal, setDetailModal] = useState<{ section: string; items: CashFlowItem[]; total: number } | null>(null)

  useEffect(() => {
    if (startDate && endDate) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  const fetchData = async () => {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      const res = await FinancialStatementsAPI.getCashFlowStatement(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      )
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch cash flow statement')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    if (!data) return

    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Cash Flow Statement'],
      [`Period: ${dayjs(data.period.start_date).format('YYYY-MM-DD')} to ${dayjs(data.period.end_date).format('YYYY-MM-DD')}`],
      [''],
      ['Operating Activities'],
      ...data.operating_activities.items.map(item => [item.account_name, item.amount, item.description || '']),
      ['Total Operating Activities', data.operating_activities.total],
      [''],
      ['Investing Activities'],
      ...data.investing_activities.items.map(item => [item.account_name, item.amount, item.description || '']),
      ['Total Investing Activities', data.investing_activities.total],
      [''],
      ['Financing Activities'],
      ...data.financing_activities.items.map(item => [item.account_name, item.amount, item.description || '']),
      ['Total Financing Activities', data.financing_activities.total],
      [''],
      ['Opening Cash', data.opening_cash],
      ['Net Cash Movement', data.net_cash_movement],
      ['Closing Cash', data.closing_cash],
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cash Flow')
    XLSX.writeFile(workbook, `cash-flow-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    message.success('Excel file exported successfully')
  }

  const handleExportPDF = () => {
    if (!data) return

    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.text('Cash Flow Statement', 14, 20)
    doc.setFontSize(10)
    doc.text(
      `Period: ${dayjs(data.period.start_date).format('YYYY-MM-DD')} to ${dayjs(data.period.end_date).format('YYYY-MM-DD')}`,
      14,
      28
    )

    // Operating Activities
    doc.setFontSize(12)
    doc.text('Operating Activities', 14, 40)
    autoTable(doc, {
      startY: 45,
      head: [['Account', 'Amount', 'Description']],
      body: data.operating_activities.items.map(item => [
        item.account_name,
        item.amount.toFixed(2),
        item.description || '',
      ]),
      foot: [['Total Operating Activities', data.operating_activities.total.toFixed(2), '']],
    })

    // Investing Activities
    const operatingEndY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Investing Activities', 14, operatingEndY)
    autoTable(doc, {
      startY: operatingEndY + 5,
      head: [['Account', 'Amount', 'Description']],
      body: data.investing_activities.items.map(item => [
        item.account_name,
        item.amount.toFixed(2),
        item.description || '',
      ]),
      foot: [['Total Investing Activities', data.investing_activities.total.toFixed(2), '']],
    })

    // Financing Activities
    const investingEndY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Financing Activities', 14, investingEndY)
    autoTable(doc, {
      startY: investingEndY + 5,
      head: [['Account', 'Amount', 'Description']],
      body: data.financing_activities.items.map(item => [
        item.account_name,
        item.amount.toFixed(2),
        item.description || '',
      ]),
      foot: [['Total Financing Activities', data.financing_activities.total.toFixed(2), '']],
    })

    // Summary
    const financingEndY = (doc as any).lastAutoTable.finalY + 10
    autoTable(doc, {
      startY: financingEndY,
      body: [
        ['Opening Cash', data.opening_cash.toFixed(2)],
        ['Net Cash Movement', data.net_cash_movement.toFixed(2)],
        ['Closing Cash', data.closing_cash.toFixed(2)],
      ],
      theme: 'grid',
      styles: { fontStyle: 'bold' },
    })

    doc.save(`cash-flow-${dayjs().format('YYYY-MM-DD')}.pdf`)
    message.success('PDF file exported successfully')
  }

  const formatAmount = (value: number) => {
    const abs = Math.abs(value)
    const formatted = `AED ${abs.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
    return value < 0 ? `(${formatted})` : formatted
  }

  const CashFlowSectionTable = ({ items, total, sectionName, onViewDetails }: { items: CashFlowItem[]; total: number; sectionName: string; onViewDetails?: () => void }) => {
    if (!items || items.length === 0) {
      return (
        <div className="py-3 text-sm text-muted-foreground italic">
          No cash movements in this section.
        </div>
      )
    }

    return (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-left text-foreground font-semibold">Account</th>
                <th className="py-2 px-3 text-right text-foreground font-semibold">Amount</th>
                <th className="py-2 px-3 text-left text-foreground font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const isOutflow = item.amount < 0
                return (
                  <tr key={`${item.account_id}-${idx}`} className="border-b border-border">
                    <td className="py-1.5 px-3 text-foreground">{item.account_name}</td>
                    <td
                      className={`py-1.5 px-3 text-right font-medium ${
                        isOutflow ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      {formatAmount(item.amount)}
                    </td>
                    <td className="py-1.5 px-3 text-muted-foreground">
                      {item.description || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {onViewDetails && (
          <Button
            variant="link"
            size="sm"
            className="mt-3 px-0 text-primary hover:text-primary/80"
            onClick={(e) => { e.stopPropagation(); onViewDetails() }}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5 inline" />
            View item details
          </Button>
        )}
      </>
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
          <div className="p-2 bg-green-500/15 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cash Flow Statement</h1>
            <p className="text-sm text-muted-foreground">Statement of Cash Flows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker
            value={startDate && endDate ? [startDate, endDate] : null}
            onChange={(dates: [Dayjs | null, Dayjs | null] | null) => {
              if (dates) {
                setStartDate(dates[0])
                setEndDate(dates[1])
              }
            }}
            format="YYYY-MM-DD"
            className="w-64"
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

      {data && (
        <>
          {/* Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full"
          >
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-3 w-full">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Net Cash from Operating</p>
                  <p
                    className={`text-2xl font-bold ${
                      data.operating_activities.total >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatAmount(data.operating_activities.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Net Cash from Investing</p>
                  <p
                    className={`text-2xl font-bold ${
                      data.investing_activities.total >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatAmount(data.investing_activities.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Net Cash from Financing</p>
                  <p
                    className={`text-2xl font-bold ${
                      data.financing_activities.total >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatAmount(data.financing_activities.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Ending Cash Balance</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatAmount(data.closing_cash)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Opening Cash</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatAmount(data.opening_cash)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Net Increase / (Decrease) in Cash</p>
                  <p
                    className={`text-lg font-semibold ${
                      data.net_cash_movement >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatAmount(data.net_cash_movement)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reconciliation</p>
                  <Tag
                    color={
                      Math.abs(data.opening_cash + data.net_cash_movement - data.closing_cash) <
                      0.01
                        ? 'green'
                        : 'red'
                    }
                    className="text-base px-3 py-1"
                  >
                    {Math.abs(data.opening_cash + data.net_cash_movement - data.closing_cash) <
                    0.01
                      ? 'Balanced'
                      : 'Unbalanced'}
                  </Tag>
                </div>
              </div>

              {/* Cash Reconciliation Proof */}
              <div className="mt-3 pt-3 border-t border-border bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Cash Reconciliation</p>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-1 text-muted-foreground">Opening Cash & Bank</td>
                      <td className="py-1 text-right font-medium text-foreground">{formatAmount(data.opening_cash)}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-1 text-muted-foreground pl-4">+ Net Operating Cash</td>
                      <td className={`py-1 text-right font-medium ${data.operating_activities.total >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatAmount(data.operating_activities.total)}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-1 text-muted-foreground pl-4">+ Net Investing Cash</td>
                      <td className={`py-1 text-right font-medium ${data.investing_activities.total >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatAmount(data.investing_activities.total)}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-1 text-muted-foreground pl-4">+ Net Financing Cash</td>
                      <td className={`py-1 text-right font-medium ${data.financing_activities.total >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatAmount(data.financing_activities.total)}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="py-1.5 text-foreground">= Closing Cash & Bank</td>
                      <td className="py-1.5 text-right text-blue-300">{formatAmount(data.opening_cash + data.net_cash_movement)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium text-muted-foreground">Note on payment methods:</span>
                  {' '}Only cash and bank receipts appear here. Credit sales (Accounts Receivable) are NOT cash until collected — they appear in Operating Activities only when the customer pays.
                  Owner capital injected via journal entry (Dr Cash/Bank, Cr Owner Capital) will appear under Financing Activities.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Detail Sections in Accordions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-card rounded-lg border border-border shadow-sm p-4"
          >
            <Accordion className="space-y-3">
              <AccordionItem value="operating" open>
                <AccordionTrigger>
                  <span>Operating Activities (Indirect Method)</span>
                  <span className="text-sm font-semibold">
                    {formatAmount(data.operating_activities.total)}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <CashFlowSectionTable
                    items={data.operating_activities.items}
                    total={data.operating_activities.total}
                    sectionName="Operating Activities"
                    onViewDetails={() => setDetailModal({ section: 'Operating Activities', items: data.operating_activities.items, total: data.operating_activities.total })}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="investing">
                <AccordionTrigger>
                  <span>Investing Activities</span>
                  <span className="text-sm font-semibold">
                    {formatAmount(data.investing_activities.total)}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <CashFlowSectionTable
                    items={data.investing_activities.items}
                    total={data.investing_activities.total}
                    sectionName="Investing Activities"
                    onViewDetails={() => setDetailModal({ section: 'Investing Activities', items: data.investing_activities.items, total: data.investing_activities.total })}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="financing">
                <AccordionTrigger>
                  <span>Financing Activities</span>
                  <span className="text-sm font-semibold">
                    {formatAmount(data.financing_activities.total)}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <CashFlowSectionTable
                    items={data.financing_activities.items}
                    total={data.financing_activities.total}
                    sectionName="Financing Activities"
                    onViewDetails={() => setDetailModal({ section: 'Financing Activities', items: data.financing_activities.items, total: data.financing_activities.total })}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>

          {/* Detail Modal */}
          <Dialog open={!!detailModal} onOpenChange={(open) => !open && setDetailModal(null)}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{detailModal?.section} - Item Details</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto flex-1 -mx-6 px-6">
                {detailModal && (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Account</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Amount</th>
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.items.map((item, idx) => {
                        const isOutflow = item.amount < 0
                        return (
                          <tr key={`${item.account_id}-${idx}`} className="border-b border-border">
                            <td className="py-2 px-3 text-foreground">{item.account_name}</td>
                            <td className={`py-2 px-3 text-right font-medium ${isOutflow ? 'text-red-400' : 'text-green-400'}`}>
                              {formatAmount(item.amount)}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{item.description || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                        <td className="py-2 px-3 text-foreground">Grand Total</td>
                        <td className={`py-2 px-3 text-right ${detailModal.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatAmount(detailModal.total)}
                        </td>
                        <td className="py-2 px-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

