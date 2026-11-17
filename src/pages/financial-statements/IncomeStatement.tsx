import { useEffect, useState } from 'react'
import { message, DatePicker } from 'antd'
import { motion } from 'framer-motion'
import { Download, FileSpreadsheet, FileText, ChevronDown, TrendingUp, Calendar, ExternalLink } from 'lucide-react'
import {
  FinancialStatementsAPI,
  type IncomeStatement,
  type IncomeStatementItem,
  type IncomeStatementSection,
  type RevenueDetailItem,
  type CogsDetailItem,
  type OperatingExpenseDetailItem,
} from '@/services/api'
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

export default function IncomeStatementPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<IncomeStatement | null>(null)
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('month'))
  const [detailModal, setDetailModal] = useState<'revenue' | 'cogs' | 'operating_expenses' | null>(null)

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
      const res = await FinancialStatementsAPI.getIncomeStatement(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      )
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch income statement')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    if (!data) return

    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Income Statement'],
      [`Period: ${dayjs(data.period.start_date).format('YYYY-MM-DD')} to ${dayjs(data.period.end_date).format('YYYY-MM-DD')}`],
      [''],
      ['Revenue'],
      ...data.revenue.items.map(item => [item.account_name, item.amount]),
      ['Total Revenue', data.revenue.total],
      [''],
      ['Cost of Goods Sold (COGS)'],
      ...data.cogs.items.map(item => [item.account_name, item.amount]),
      ['Total COGS', data.cogs.total],
      ...(data.cogs_vat !== undefined ? [['VAT on Goods', data.cogs_vat ?? 0]] : []),
      [''],
      ['Operating Expenses'],
      ...data.operating_expenses.items.map(item => [item.account_name, item.amount]),
      ['Total Operating Expenses', data.operating_expenses.total],
      [''],
      ['Other Income'],
      ...data.other_income.items.map(item => [item.account_name, item.amount]),
      ['Total Other Income', data.other_income.total],
      [''],
      ['Other Expenses'],
      ...data.other_expenses.items.map(item => [item.account_name, item.amount]),
      ['Total Other Expenses', data.other_expenses.total],
      [''],
      ['Corporate Tax'],
      ...data.corporate_tax.items.map(item => [item.account_name, item.amount]),
      ['Total Corporate Tax', data.corporate_tax.total],
      [''],
      ['Gross Profit', data.gross_profit],
      ['Operating Income', data.operating_income],
      ['Net Income Before Tax', data.net_income_before_tax],
      ['Net Income', data.net_income],
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Income Statement')
    XLSX.writeFile(workbook, `income-statement-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    message.success('Excel file exported successfully')
  }

  const handleExportPDF = () => {
    if (!data) return

    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(16)
    doc.text('Income Statement', 14, 20)
    doc.setFontSize(10)
    doc.text(
      `Period: ${dayjs(data.period.start_date).format('YYYY-MM-DD')} to ${dayjs(data.period.end_date).format('YYYY-MM-DD')}`,
      14,
      28
    )

    // Revenue
    doc.setFontSize(12)
    doc.text('Revenue', 14, 40)
    autoTable(doc, {
      startY: 45,
      head: [['Account', 'Amount']],
      body: data.revenue.items.map(item => [item.account_name, item.amount.toFixed(2)]),
      foot: [['Total Revenue', data.revenue.total.toFixed(2)]],
    })

    // COGS
    const revenueEndY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Cost of Goods Sold (COGS)', 14, revenueEndY)
    const cogsFoot = data.cogs_vat !== undefined
      ? [['Total COGS', data.cogs.total.toFixed(2)], ['VAT on Goods', (data.cogs_vat ?? 0).toFixed(2)]]
      : [['Total COGS', data.cogs.total.toFixed(2)]]
    autoTable(doc, {
      startY: revenueEndY + 5,
      head: [['Account', 'Amount']],
      body: data.cogs.items.map(item => [item.account_name, item.amount.toFixed(2)]),
      foot: cogsFoot,
    })

    // Operating Expenses
    let lastY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Operating Expenses', 14, lastY)
    autoTable(doc, {
      startY: lastY + 5,
      head: [['Account', 'Amount']],
      body: data.operating_expenses.items.map(item => [item.account_name, item.amount.toFixed(2)]),
      foot: [['Total Operating Expenses', data.operating_expenses.total.toFixed(2)]],
    })

    // Other Income
    lastY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Other Income', 14, lastY)
    autoTable(doc, {
      startY: lastY + 5,
      head: [['Account', 'Amount']],
      body: data.other_income.items.map(item => [item.account_name, item.amount.toFixed(2)]),
      foot: [['Total Other Income', data.other_income.total.toFixed(2)]],
    })

    // Other Expenses
    lastY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Other Expenses', 14, lastY)
    autoTable(doc, {
      startY: lastY + 5,
      head: [['Account', 'Amount']],
      body: data.other_expenses.items.map(item => [item.account_name, item.amount.toFixed(2)]),
      foot: [['Total Other Expenses', data.other_expenses.total.toFixed(2)]],
    })

    // Corporate Tax
    lastY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Corporate Tax', 14, lastY)
    autoTable(doc, {
      startY: lastY + 5,
      head: [['Account', 'Amount']],
      body: data.corporate_tax.items.map(item => [item.account_name, item.amount.toFixed(2)]),
      foot: [['Total Corporate Tax', data.corporate_tax.total.toFixed(2)]],
    })

    // Summary
    const summaryStartY = (doc as any).lastAutoTable.finalY + 10
    autoTable(doc, {
      startY: summaryStartY,
      body: [
        ['Gross Profit', data.gross_profit.toFixed(2)],
        ['Operating Income', data.operating_income.toFixed(2)],
        ['Net Income Before Tax', data.net_income_before_tax.toFixed(2)],
        ['Net Income', data.net_income.toFixed(2)],
      ],
      theme: 'grid',
      styles: { fontStyle: 'bold' },
    })

    doc.save(`income-statement-${dayjs().format('YYYY-MM-DD')}.pdf`)
    message.success('PDF file exported successfully')
  }

  const formatCurrency = (amount: number) =>
    `AED ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const kpiDescriptions: Record<string, string> = {
    'Total Revenue': 'Σ (all revenue account credits − debits) within the selected period.',
    'Total COGS':
      'Σ (all cost of goods sold account debits − credits); direct costs of sales. Excludes VAT.',
    'VAT on Goods': 'Σ (VAT on all goods sold in the period). Displayed separately from COGS.',
    'Gross Profit': 'Total Revenue − Total COGS.',
    'Operating Expenses':
      'Σ (all operating expense debits − credits), excluding COGS and tax.',
    'Operating Income': 'Gross Profit − Operating Expenses.',
    'Net Income Before Tax': 'Operating Income + Other Income − Other Expenses.',
    'Corporate Tax': 'Σ (corporate/income tax expense debits − credits).',
    'Net Income': 'Net Income Before Tax − Corporate Tax.',
  }

  const renderSection = (
    title: string,
    section: IncomeStatementSection,
    defaultOpen = false,
    extraFooter?: { label: string; amount: number },
    detailType?: 'revenue' | 'cogs' | 'operating_expenses'
  ) => {
    if (!section || section.items.length === 0) return null

    const hasDetails = detailType && data && (
      (detailType === 'revenue' && data.revenue_detail && data.revenue_detail.length > 0) ||
      (detailType === 'cogs' && data.cogs_detail && data.cogs_detail.length > 0) ||
      (detailType === 'operating_expenses' && data.operating_expenses_detail && data.operating_expenses_detail.length > 0)
    )

    return (
      <AccordionItem value={title} open={defaultOpen}>
        <AccordionTrigger>
          <span>{title}</span>
          <span className="text-sm font-semibold text-foreground">{formatCurrency(section.total)}</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 text-left text-foreground font-semibold">Account</th>
                  <th className="py-2 px-3 text-right text-foreground font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map((item: IncomeStatementItem) => (
                  <tr key={item.account_id} className="border-b border-border">
                    <td className="py-1.5 px-3 text-foreground">{item.account_name}</td>
                    <td className="py-1.5 px-3 text-right text-foreground">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
                {extraFooter && (
                  <tr className="border-t border-border font-medium">
                    <td className="py-1.5 px-3 text-foreground">{extraFooter.label}</td>
                    <td className="py-1.5 px-3 text-right text-foreground">
                      {formatCurrency(extraFooter.amount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {hasDetails && detailType && (
            <Button
              variant="link"
              size="sm"
              className="mt-3 px-0 text-primary hover:text-primary/80"
              onClick={(e) => { e.stopPropagation(); setDetailModal(detailType) }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 inline" />
              View item details
            </Button>
          )}
        </AccordionContent>
      </AccordionItem>
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
            <TrendingUp className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Income Statement</h1>
            <p className="text-sm text-muted-foreground">Profit & Loss Statement</p>
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
          {/* Summary Panel */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full"
          >
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-3 w-full">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Total Revenue</span>
                  <span className="text-xs text-muted-foreground">
                    {kpiDescriptions['Total Revenue']}
                  </span>
                </div>
                <span className="text-lg font-bold text-green-400">
                  {formatCurrency(data.revenue.total)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Total COGS</span>
                  <span className="text-xs text-muted-foreground">
                    {kpiDescriptions['Total COGS']}
                  </span>
                </div>
                <span className="text-lg font-bold text-red-400">
                  {formatCurrency(data.cogs.total)}
                </span>
              </div>
              {data.cogs_vat !== undefined && (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">VAT on Goods</span>
                    <span className="text-xs text-muted-foreground">
                      {kpiDescriptions['VAT on Goods']}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-red-400">
                    {formatCurrency(data.cogs_vat ?? 0)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Gross Profit</span>
                  <span className="text-xs text-muted-foreground">
                    {kpiDescriptions['Gross Profit']}
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-400">
                  {formatCurrency(data.gross_profit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Operating Expenses</span>
                  <span className="text-xs text-muted-foreground">
                    {kpiDescriptions['Operating Expenses']}
                  </span>
                </div>
                <span className="text-lg font-bold text-red-400">
                  {formatCurrency(data.operating_expenses.total)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Operating Income</span>
                  <span className="text-xs text-muted-foreground">
                    {kpiDescriptions['Operating Income']}
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-400">
                  {formatCurrency(data.operating_income)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    Net Income Before Tax
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {kpiDescriptions['Net Income Before Tax']}
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-400">
                  {formatCurrency(data.net_income_before_tax)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Corporate Tax</span>
                  <span className="text-xs text-muted-foreground">
                    {kpiDescriptions['Corporate Tax']}
                  </span>
                </div>
                <span className="text-lg font-bold text-red-400">
                  {formatCurrency(data.corporate_tax.total)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Net Income</span>
                  <span className="text-xs text-muted-foreground">
                    {kpiDescriptions['Net Income']}
                  </span>
                </div>
                <span
                  className={`text-xl font-bold ${
                    data.net_income >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(data.net_income)}
                </span>
              </div>
            </div>

            {/* Revenue composition & VAT position note */}
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-green-500/10 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin %</p>
                <p className="text-lg font-bold text-green-300">
                  {data.revenue.total > 0
                    ? `${((data.gross_profit / data.revenue.total) * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">Gross Profit / Revenue</p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Net Margin %</p>
                <p className={`text-lg font-bold ${data.net_income >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                  {data.revenue.total > 0
                    ? `${((data.net_income / data.revenue.total) * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">Net Income / Revenue</p>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">VAT Collected (5%)</p>
                <p className="text-lg font-bold text-yellow-300">
                  {formatCurrency(data.cogs_vat ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">Shown in Balance Sheet as VAT Payable</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-2">
              <span className="font-medium text-muted-foreground">UAE VAT note:</span>
              {' '}Revenue figures include the gross invoice amount (inclusive of 5% VAT collected from customers).
              VAT collected is a liability — not income — and will appear as "VAT Payable" in the Balance Sheet until remitted to the FTA.
              When sales are made with mixed payment methods (cash / bank / credit), each portion is recorded to the correct asset account (Cash, Bank, or Accounts Receivable).
            </p>
          </motion.div>

          {/* Detailed Sections */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-card rounded-lg border border-border shadow-sm p-4"
          >
            <Accordion className="space-y-3">
              {renderSection('Revenue', data.revenue, true, undefined, 'revenue')}
              {renderSection('Cost of Goods Sold (COGS)', data.cogs, false, data.cogs_vat !== undefined ? { label: 'VAT on Goods', amount: data.cogs_vat ?? 0 } : undefined, 'cogs')}
              {renderSection('Operating Expenses', data.operating_expenses, false, undefined, 'operating_expenses')}
              {renderSection('Other Income', data.other_income)}
              {renderSection('Other Expenses', data.other_expenses)}
              {renderSection('Corporate Tax', data.corporate_tax)}
            </Accordion>
          </motion.div>

          {/* Detail Modal */}
          <Dialog open={!!detailModal} onOpenChange={(open) => !open && setDetailModal(null)}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {detailModal === 'revenue' && 'Revenue - Item Details'}
                  {detailModal === 'cogs' && 'Cost of Goods Sold - Item Details'}
                  {detailModal === 'operating_expenses' && 'Operating Expenses - Item Details'}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-auto flex-1 -mx-6 px-6">
                {detailModal === 'revenue' && data.revenue_detail && (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Invoice #</th>
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Date</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.revenue_detail.map((item: RevenueDetailItem, idx: number) => (
                        <tr key={idx} className="border-b border-border">
                          <td className="py-2 px-3 text-foreground">{item.invoice_number}</td>
                          <td className="py-2 px-3 text-foreground">{dayjs(item.invoice_date).format('DD-MMM-YY')}</td>
                          <td className="py-2 px-3 text-right text-foreground">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                        <td colSpan={2} className="py-2 px-3 text-foreground">Grand Total</td>
                        <td className="py-2 px-3 text-right text-foreground">
                          {formatCurrency(data.revenue_detail.reduce((sum, i) => sum + i.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
                {detailModal === 'cogs' && data.cogs_detail && (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Invoice #</th>
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Product</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Qty</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Unit Cost</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Total Cost</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">VAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cogs_detail.map((item: CogsDetailItem, idx: number) => (
                        <tr key={idx} className="border-b border-border">
                          <td className="py-2 px-3 text-foreground">{item.invoice_number}</td>
                          <td className="py-2 px-3 text-foreground">{item.product_name}</td>
                          <td className="py-2 px-3 text-right text-foreground">{item.quantity}</td>
                          <td className="py-2 px-3 text-right text-foreground">{formatCurrency(item.unit_cost)}</td>
                          <td className="py-2 px-3 text-right text-foreground">{formatCurrency(item.total_cost)}</td>
                          <td className="py-2 px-3 text-right text-foreground">{formatCurrency(item.vat_amount ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                        <td colSpan={4} className="py-2 px-3 text-foreground">Grand Total</td>
                        <td className="py-2 px-3 text-right text-foreground">
                          {formatCurrency(data.cogs_detail.reduce((sum, i) => sum + i.total_cost, 0))}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">—</td>
                      </tr>
                      <tr className="border-t border-border bg-muted/50 font-semibold">
                        <td colSpan={4} className="py-2 px-3 text-foreground">VAT Total</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">—</td>
                        <td className="py-2 px-3 text-right text-foreground">
                          {formatCurrency(data.cogs_detail.reduce((sum, i) => sum + (i.vat_amount ?? 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
                {detailModal === 'operating_expenses' && data.operating_expenses_detail && (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Expense ID</th>
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Date</th>
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Description</th>
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Category</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.operating_expenses_detail.map((item: OperatingExpenseDetailItem, idx: number) => (
                        <tr key={idx} className="border-b border-border">
                          <td className="py-2 px-3 text-foreground">{item.expense_id || '-'}</td>
                          <td className="py-2 px-3 text-foreground">{dayjs(item.expense_date).format('DD-MMM-YY')}</td>
                          <td className="py-2 px-3 text-foreground">{item.description}</td>
                          <td className="py-2 px-3 text-foreground">{item.category}</td>
                          <td className="py-2 px-3 text-right text-foreground">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                        <td colSpan={4} className="py-2 px-3 text-foreground">Grand Total</td>
                        <td className="py-2 px-3 text-right text-foreground">
                          {formatCurrency(data.operating_expenses_detail.reduce((sum, i) => sum + i.amount, 0))}
                        </td>
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

