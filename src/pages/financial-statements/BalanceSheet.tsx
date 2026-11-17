import { useEffect, useState } from 'react'
import { message, DatePicker, Tag } from 'antd'
import { motion } from 'framer-motion'
import { Download, FileSpreadsheet, FileText, ChevronDown, Scale, Calendar, ExternalLink } from 'lucide-react'
import { FinancialStatementsAPI, type BalanceSheet, type BalanceSheetItem } from '@/services/api'
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

export default function BalanceSheetPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<BalanceSheet | null>(null)
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(30, 'day'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())
  const [detailModal, setDetailModal] = useState<{ section: string; items: BalanceSheetItem[]; total: number } | null>(null)

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
      const res = await FinancialStatementsAPI.getBalanceSheet(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      )
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch balance sheet')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    if (!data) return

    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Balance Sheet'],
      [`As of: ${endDate?.format('YYYY-MM-DD') || 'N/A'}`],
      [''],
      ['ASSETS'],
      ['Current Assets'],
      ...data.assets.current_assets.map(item => [item.account_name, item.balance]),
      ['Total Current Assets', data.assets.total_current],
      [''],
      ['Non-Current Assets'],
      ...data.assets.non_current_assets.map(item => [item.account_name, item.balance]),
      ['Total Non-Current Assets', data.assets.total_non_current],
      [''],
      ['Contra Assets'],
      ...data.assets.contra_assets.map(item => [item.account_name, item.balance]),
      ['Total Contra Assets', data.assets.total_contra],
      ['Total Assets', data.assets.total],
      [''],
      ['LIABILITIES'],
      ['Current Liabilities'],
      ...data.liabilities.current_liabilities.map(item => [item.account_name, item.balance]),
      ['Total Current Liabilities', data.liabilities.total_current],
      [''],
      ['Non-Current Liabilities'],
      ...data.liabilities.non_current_liabilities.map(item => [item.account_name, item.balance]),
      ['Total Non-Current Liabilities', data.liabilities.total_non_current],
      ['Total Liabilities', data.liabilities.total],
      [''],
      ['EQUITY'],
      ['Owner Capital'],
      ...data.equity.owner_capital.map(item => [item.account_name, item.balance]),
      ['Total Owner Capital', data.equity.total_owner_capital],
      [''],
      ['Retained Earnings'],
      ...data.equity.retained_earnings.map(item => [item.account_name, item.balance]),
      ['Total Retained Earnings', data.equity.total_retained_earnings],
      [''],
      ['Reserves'],
      ...data.equity.reserves.map(item => [item.account_name, item.balance]),
      ['Total Reserves', data.equity.total_reserves],
      ['Total Equity', data.equity.total],
      [''],
      ['Total Liabilities + Equity', data.liabilities.total + data.equity.total],
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Sheet')
    XLSX.writeFile(workbook, `balance-sheet-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    message.success('Excel file exported successfully')
  }

  const handleExportPDF = () => {
    if (!data) return

    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.text('Balance Sheet', 14, 20)
    doc.setFontSize(10)
    doc.text(`As of: ${endDate?.format('YYYY-MM-DD') || 'N/A'}`, 14, 28)

    // Assets
    doc.setFontSize(12)
    doc.text('ASSETS', 14, 40)
    doc.setFontSize(10)
    doc.text('Current Assets', 14, 48)
    autoTable(doc, {
      startY: 52,
      head: [['Account', 'Balance']],
      body: data.assets.current_assets.map(item => [item.account_name, item.balance.toFixed(2)]),
      foot: [['Total Current Assets', data.assets.total_current.toFixed(2)]],
    })

    const currentAssetsEndY = (doc as any).lastAutoTable.finalY + 5
    doc.text('Non-Current Assets', 14, currentAssetsEndY)
    autoTable(doc, {
      startY: currentAssetsEndY + 4,
      head: [['Account', 'Balance']],
      body: data.assets.non_current_assets.map(item => [item.account_name, item.balance.toFixed(2)]),
      foot: [['Total Non-Current Assets', data.assets.total_non_current.toFixed(2)]],
    })

    const nonCurrentAssetsEndY = (doc as any).lastAutoTable.finalY + 5
    if (data.assets.contra_assets.length > 0) {
      doc.text('Contra Assets', 14, nonCurrentAssetsEndY)
      autoTable(doc, {
        startY: nonCurrentAssetsEndY + 4,
        head: [['Account', 'Balance']],
        body: data.assets.contra_assets.map(item => [item.account_name, item.balance.toFixed(2)]),
        foot: [['Total Contra Assets', data.assets.total_contra.toFixed(2)]],
      })
      const contraAssetsEndY = (doc as any).lastAutoTable.finalY + 5
      autoTable(doc, {
        startY: contraAssetsEndY,
        body: [['Total Assets', data.assets.total.toFixed(2)]],
        theme: 'grid',
        styles: { fontStyle: 'bold' },
      })
    } else {
      autoTable(doc, {
        startY: nonCurrentAssetsEndY,
        body: [['Total Assets', data.assets.total.toFixed(2)]],
        theme: 'grid',
        styles: { fontStyle: 'bold' },
      })
    }

    // Liabilities & Equity
    const assetsEndY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('LIABILITIES & EQUITY', 14, assetsEndY)
    doc.setFontSize(10)
    doc.text('Current Liabilities', 14, assetsEndY + 8)
    autoTable(doc, {
      startY: assetsEndY + 12,
      head: [['Account', 'Balance']],
      body: data.liabilities.current_liabilities.map(item => [item.account_name, item.balance.toFixed(2)]),
      foot: [['Total Current Liabilities', data.liabilities.total_current.toFixed(2)]],
    })

    const currentLiabEndY = (doc as any).lastAutoTable.finalY + 5
    doc.text('Non-Current Liabilities', 14, currentLiabEndY)
    autoTable(doc, {
      startY: currentLiabEndY + 4,
      head: [['Account', 'Balance']],
      body: data.liabilities.non_current_liabilities.map(item => [item.account_name, item.balance.toFixed(2)]),
      foot: [['Total Non-Current Liabilities', data.liabilities.total_non_current.toFixed(2)]],
    })

    const nonCurrentLiabEndY = (doc as any).lastAutoTable.finalY + 5
    doc.text('Equity', 14, nonCurrentLiabEndY)
    
    // Owner Capital
    doc.setFontSize(9)
    doc.text('Owner Capital', 16, nonCurrentLiabEndY + 8)
    autoTable(doc, {
      startY: nonCurrentLiabEndY + 12,
      head: [['Account', 'Balance']],
      body: data.equity.owner_capital.map(item => [item.account_name, item.balance.toFixed(2)]),
      foot: [['Total Owner Capital', data.equity.total_owner_capital.toFixed(2)]],
    })

    const ownerCapitalEndY = (doc as any).lastAutoTable.finalY + 5
    doc.text('Retained Earnings', 16, ownerCapitalEndY)
    autoTable(doc, {
      startY: ownerCapitalEndY + 4,
      head: [['Account', 'Balance']],
      body: data.equity.retained_earnings.map(item => [item.account_name, item.balance.toFixed(2)]),
      foot: [['Total Retained Earnings', data.equity.total_retained_earnings.toFixed(2)]],
    })

    const retainedEarningsEndY = (doc as any).lastAutoTable.finalY + 5
    if (data.equity.reserves.length > 0) {
      doc.text('Reserves', 16, retainedEarningsEndY)
      autoTable(doc, {
        startY: retainedEarningsEndY + 4,
        head: [['Account', 'Balance']],
        body: data.equity.reserves.map(item => [item.account_name, item.balance.toFixed(2)]),
        foot: [['Total Reserves', data.equity.total_reserves.toFixed(2)]],
      })
      const reservesEndY = (doc as any).lastAutoTable.finalY + 5
      autoTable(doc, {
        startY: reservesEndY,
        body: [['Total Equity', data.equity.total.toFixed(2)]],
        theme: 'grid',
        styles: { fontStyle: 'bold' },
      })
    } else {
      autoTable(doc, {
        startY: retainedEarningsEndY,
        body: [['Total Equity', data.equity.total.toFixed(2)]],
        theme: 'grid',
        styles: { fontStyle: 'bold' },
      })
    }

    const equityEndY = (doc as any).lastAutoTable.finalY + 5
    autoTable(doc, {
      startY: equityEndY,
      body: [
        ['Total Liabilities', data.liabilities.total.toFixed(2)],
        ['Total Equity', data.equity.total.toFixed(2)],
        ['Total Liabilities + Equity', (data.liabilities.total + data.equity.total).toFixed(2)],
      ],
      theme: 'grid',
      styles: { fontStyle: 'bold' },
    })

    doc.save(`balance-sheet-${dayjs().format('YYYY-MM-DD')}.pdf`)
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

  const renderAccountTable = (
    items: BalanceSheetItem[],
    total: number,
    sectionName: string,
    showViewDetails = true
  ) => {
    if (!items || items.length === 0) {
      return (
        <div className="py-3 text-sm text-muted-foreground italic">
          No accounts in this category.
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
                <th className="py-2 px-3 text-right text-foreground font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.account_id} className="border-b border-border">
                  <td className="py-1.5 px-3 text-foreground">{item.account_name}</td>
                  <td className="py-1.5 px-3 text-right text-foreground">
                    {formatAmount(item.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showViewDetails && (
          <Button
            variant="link"
            size="sm"
            className="mt-3 px-0 text-primary hover:text-primary/80"
            onClick={(e) => { e.stopPropagation(); setDetailModal({ section: sectionName, items, total }) }}
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
          <div className="p-2 bg-blue-500/15 rounded-lg">
            <Scale className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Balance Sheet</h1>
            <p className="text-sm text-muted-foreground">Statement of Financial Position</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker
            className="w-80"
            value={[startDate, endDate]}
            onChange={(dates: [Dayjs | null, Dayjs | null] | null) => {
              if (dates) {
                setStartDate(dates[0])
                setEndDate(dates[1])
              } else {
                setStartDate(null)
                setEndDate(null)
              }
            }}
            format="YYYY-MM-DD"
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
            className="bg-card rounded-lg border border-border shadow-sm p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Assets</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatAmount(data.assets.total)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Liabilities</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatAmount(data.liabilities.total)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Equity</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatAmount(data.equity.total)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Balance Status</p>
                <Tag
                  color={data.is_balanced ? 'green' : 'red'}
                  className="text-base px-3 py-1 flex items-center gap-1"
                >
                  <span>{data.is_balanced ? '✔ Balanced' : '⚠ Unbalanced'}</span>
                  {!data.is_balanced && (
                    <span className="text-xs">
                      ({formatAmount(data.difference)})
                    </span>
                  )}
                </Tag>
              </div>
            </div>
            {/* Accounting Equation */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Accounting Equation: Assets = Liabilities + Equity</p>
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="font-semibold text-blue-300">{formatAmount(data.assets.total)}</span>
                <span className="text-muted-foreground">=</span>
                <span className="font-semibold text-red-300">{formatAmount(data.liabilities.total)}</span>
                <span className="text-muted-foreground">+</span>
                <span className="font-semibold text-green-300">{formatAmount(data.equity.total)}</span>
                <span className="text-muted-foreground">=</span>
                <span className={`font-bold ${data.is_balanced ? 'text-green-400' : 'text-red-400'}`}>
                  {formatAmount(data.liabilities.total + data.equity.total)}
                </span>
                {!data.is_balanced && (
                  <span className="text-red-500 text-xs">
                    (off by {formatAmount(Math.abs(data.difference))})
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Liquidity & Payment Position */}
          {data.payment_breakdown && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="bg-card rounded-lg border border-border shadow-sm p-6"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Liquidity &amp; Payment Position
                <span className="text-xs text-muted-foreground font-normal ml-1">(How sales payments are categorised in the Balance Sheet)</span>
              </h3>

              {/* Payment split: explains cash/bank/credit categorisation */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-green-500/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Cash on Hand</p>
                  <p className="text-lg font-bold text-green-300">{formatAmount(data.payment_breakdown.cash_balance)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cash sales received</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Bank Balance</p>
                  <p className="text-lg font-bold text-blue-300">{formatAmount(data.payment_breakdown.bank_balance)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Bank / digital transfers</p>
                </div>
                <div className="bg-orange-500/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Accounts Receivable</p>
                  <p className="text-lg font-bold text-orange-300">{formatAmount(data.payment_breakdown.accounts_receivable)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Credit sales not yet collected</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Accounts Payable</p>
                  <p className="text-lg font-bold text-red-300">{formatAmount(data.payment_breakdown.accounts_payable)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Owed to suppliers</p>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">VAT Payable (FTA)</p>
                  <p className="text-lg font-bold text-yellow-300">{formatAmount(data.payment_breakdown.vat_payable)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Net VAT due to FTA</p>
                </div>
                <div className={`rounded-lg p-3 ${data.payment_breakdown.net_working_capital >= 0 ? 'bg-teal-500/10' : 'bg-red-500/10'}`}>
                  <p className="text-xs text-muted-foreground mb-0.5">Net Working Capital</p>
                  <p className={`text-lg font-bold ${data.payment_breakdown.net_working_capital >= 0 ? 'text-teal-300' : 'text-red-300'}`}>
                    {formatAmount(data.payment_breakdown.net_working_capital)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Current Assets − Current Liabilities</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                <span className="font-medium text-muted-foreground">How payments are recorded:</span>
                {' '}Cash sales → Cash account | Bank/transfer → Bank account | Credit/invoice → Accounts Receivable (asset until collected).
                All three increase your Total Assets and Revenue equally — the difference is only in the payment method column.
                Owner capital contributions made via journal entries are reflected in the Equity section above.
              </p>
            </motion.div>
          )}

          {/* Detail Sections (Accordions) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-card rounded-lg border border-border shadow-sm p-4"
          >
            <Accordion className="space-y-3">
              <AccordionItem value="current-assets" open>
                <AccordionTrigger>
                  <span>Current Assets</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {formatAmount(data.assets.total_current)}
                  </span>
                </AccordionTrigger>
                <AccordionContent>{renderAccountTable(data.assets.current_assets, data.assets.total_current, 'Current Assets')}</AccordionContent>
              </AccordionItem>

              <AccordionItem value="noncurrent-assets">
                <AccordionTrigger>
                  <span>Non-Current Assets</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {formatAmount(data.assets.total_non_current)}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {renderAccountTable(data.assets.non_current_assets, data.assets.total_non_current, 'Non-Current Assets')}
                </AccordionContent>
              </AccordionItem>

              {data.assets.contra_assets.length > 0 && (
                <AccordionItem value="contra-assets">
                  <AccordionTrigger>
                    <span>Contra Assets</span>
                    <span className="text-sm font-semibold text-orange-400">
                      {formatAmount(data.assets.total_contra)}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderAccountTable(data.assets.contra_assets, data.assets.total_contra, 'Contra Assets')}
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="current-liabilities">
                <AccordionTrigger>
                  <span>Current Liabilities</span>
                  <span className="text-sm font-semibold text-red-400">
                    {formatAmount(data.liabilities.total_current)}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {renderAccountTable(data.liabilities.current_liabilities, data.liabilities.total_current, 'Current Liabilities')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="noncurrent-liabilities">
                <AccordionTrigger>
                  <span>Non-Current Liabilities</span>
                  <span className="text-sm font-semibold text-red-400">
                    {formatAmount(data.liabilities.total_non_current)}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {renderAccountTable(data.liabilities.non_current_liabilities, data.liabilities.total_non_current, 'Non-Current Liabilities')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="equity">
                <AccordionTrigger>
                  <span>Equity</span>
                  <span className="text-sm font-semibold text-green-400">
                    {formatAmount(data.equity.total)}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Owner Capital</h4>
                    {renderAccountTable(data.equity.owner_capital, data.equity.total_owner_capital, 'Owner Capital')}
                    <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Total Owner Capital</span>
                      <span className="font-semibold text-foreground">
                        {formatAmount(data.equity.total_owner_capital)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Retained Earnings</h4>
                    {renderAccountTable(data.equity.retained_earnings, data.equity.total_retained_earnings, 'Retained Earnings')}
                    <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Total Retained Earnings</span>
                      <span className="font-semibold text-foreground">
                        {formatAmount(data.equity.total_retained_earnings)}
                      </span>
                    </div>
                  </div>
                  {data.equity.reserves.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Reserves</h4>
                      {renderAccountTable(data.equity.reserves, data.equity.total_reserves, 'Reserves')}
                      <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm">
                        <span className="text-muted-foreground font-medium">Total Reserves</span>
                        <span className="font-semibold text-foreground">
                          {formatAmount(data.equity.total_reserves)}
                        </span>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>

          {/* Detail Modal */}
          <Dialog open={!!detailModal} onOpenChange={(open) => !open && setDetailModal(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{detailModal?.section} - Item Details</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto flex-1 -mx-6 px-6">
                {detailModal && (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Account</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.items.map(item => (
                        <tr key={item.account_id} className="border-b border-border">
                          <td className="py-2 px-3 text-foreground">{item.account_name}</td>
                          <td className="py-2 px-3 text-right text-foreground">{formatAmount(item.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                        <td className="py-2 px-3 text-foreground">Grand Total</td>
                        <td className="py-2 px-3 text-right text-foreground">{formatAmount(detailModal.total)}</td>
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

