import { useEffect, useState, useMemo } from 'react'
import { message, DatePicker } from 'antd'
import { motion } from 'framer-motion'
import { Download, FileSpreadsheet, FileText, ChevronDown, Users, Calendar, ExternalLink } from 'lucide-react'
import { FinancialStatementsAPI, type StatementOfEquity, type EquityItem } from '@/services/api'
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

export default function StatementOfEquityPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<StatementOfEquity | null>(null)
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('year'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('month'))
  const [detailModal, setDetailModal] = useState<EquitySection | null>(null)

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
      const res = await FinancialStatementsAPI.getStatementOfEquity(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      )
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch statement of equity')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    if (!data) return

    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Statement of Changes in Equity'],
      [`Period: ${dayjs(data.period.start_date).format('YYYY-MM-DD')} to ${dayjs(data.period.end_date).format('YYYY-MM-DD')}`],
      [''],
      ['Opening Equity', data.opening_equity],
      ['Net Income', data.net_income],
      ['Owner Contributions', data.owner_contributions],
      ['Withdrawals', -data.withdrawals],
      ['Closing Equity', data.closing_equity],
      [''],
      ['Equity Accounts'],
      ['Account', 'Opening Balance', 'Additions', 'Withdrawals', 'Closing Balance'],
      ...data.items.map(item => [
        item.account_name,
        item.opening_balance,
        item.additions,
        item.withdrawals,
        item.closing_balance,
      ]),
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement of Equity')
    XLSX.writeFile(workbook, `statement-of-equity-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    message.success('Excel file exported successfully')
  }

  const handleExportPDF = () => {
    if (!data) return

    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.text('Statement of Changes in Equity', 14, 20)
    doc.setFontSize(10)
    doc.text(
      `Period: ${dayjs(data.period.start_date).format('YYYY-MM-DD')} to ${dayjs(data.period.end_date).format('YYYY-MM-DD')}`,
      14,
      28
    )

    // Summary
    doc.setFontSize(12)
    doc.text('Summary', 14, 40)
    autoTable(doc, {
      startY: 45,
      body: [
        ['Opening Equity', data.opening_equity.toFixed(2)],
        ['Net Income', data.net_income.toFixed(2)],
        ['Owner Contributions', data.owner_contributions.toFixed(2)],
        ['Withdrawals', (-data.withdrawals).toFixed(2)],
        ['Closing Equity', data.closing_equity.toFixed(2)],
      ],
      theme: 'grid',
      styles: { fontStyle: 'bold' },
    })

    // Equity Accounts
    const summaryEndY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Equity Accounts', 14, summaryEndY)
    autoTable(doc, {
      startY: summaryEndY + 5,
      head: [['Account', 'Opening', 'Additions', 'Withdrawals', 'Closing']],
      body: data.items.map(item => [
        item.account_name,
        item.opening_balance.toFixed(2),
        item.additions.toFixed(2),
        item.withdrawals.toFixed(2),
        item.closing_balance.toFixed(2),
      ]),
    })

    doc.save(`statement-of-equity-${dayjs().format('YYYY-MM-DD')}.pdf`)
    message.success('PDF file exported successfully')
  }

  const formatCurrency = (value: number) =>
    `AED ${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  type EquitySectionKey =
    | 'shareCapital'
    | 'sharePremium'
    | 'retainedEarnings'
    | 'ociReserves'
    | 'treasuryShares'
    | 'dividends'

  interface EquitySection {
    key: EquitySectionKey
    label: string
    items: EquityItem[]
    totals: {
      opening: number
      additions: number
      reductions: number
      closing: number
    }
  }

  const classifyEquityItem = (item: EquityItem): EquitySectionKey => {
    const name = item.account_name.toLowerCase()
    if (
      name.includes('share capital') ||
      name.includes('paid-up capital') ||
      name.includes('owner capital') ||
      name.includes('capital')
    ) {
      return 'shareCapital'
    }
    if (
      name.includes('share premium') ||
      name.includes('additional paid in capital') ||
      name.includes('additional paid-in capital') ||
      name.includes('apic') ||
      name.includes('premium')
    ) {
      return 'sharePremium'
    }
    if (name.includes('retained earnings') || name.includes('retained profit')) {
      return 'retainedEarnings'
    }
    if (
      name.includes('reserve') ||
      name.includes('other comprehensive') ||
      name.includes('oci') ||
      name.includes('revaluation') ||
      name.includes('translation')
    ) {
      return 'ociReserves'
    }
    if (name.includes('treasury') || name.includes('buyback') || name.includes('own shares')) {
      return 'treasuryShares'
    }
    if (name.includes('dividend')) {
      return 'dividends'
    }
    // Fallback to retained earnings bucket
    return 'retainedEarnings'
  }

  const sections: EquitySection[] = useMemo(() => {
    if (!data) return []

    const map = new Map<EquitySectionKey, EquitySection>()
    const ensureSection = (key: EquitySectionKey, label: string): EquitySection => {
      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          items: [],
          totals: { opening: 0, additions: 0, reductions: 0, closing: 0 },
        })
      }
      return map.get(key)!
    }

    const labels: Record<EquitySectionKey, string> = {
      shareCapital: 'Share Capital',
      sharePremium: 'Share Premium / Additional Paid-in Capital',
      retainedEarnings: 'Retained Earnings',
      ociReserves: 'Other Comprehensive Income / Reserves',
      treasuryShares: 'Treasury Shares',
      dividends: 'Dividends Declared',
    }

    for (const item of data.items) {
      const key = classifyEquityItem(item)
      const section = ensureSection(key, labels[key])
      section.items.push(item)
      section.totals.opening += item.opening_balance
      section.totals.additions += item.additions
      section.totals.reductions += item.withdrawals
      section.totals.closing += item.closing_balance
    }

    // Ensure all sections exist even if empty (for accordions)
    (Object.keys(labels) as EquitySectionKey[]).forEach(key => {
      ensureSection(key, labels[key])
    })

    return Array.from(map.values())
  }, [data])

  const totalOpening = useMemo(
    () => sections.reduce((sum, s) => sum + s.totals.opening, 0),
    [sections]
  )
  const totalAdditions = useMemo(
    () => sections.reduce((sum, s) => sum + s.totals.additions, 0),
    [sections]
  )
  const totalReductions = useMemo(
    () => sections.reduce((sum, s) => sum + s.totals.reductions, 0),
    [sections]
  )
  const totalClosing = useMemo(
    () => sections.reduce((sum, s) => sum + s.totals.closing, 0),
    [sections]
  )

  const renderSectionTable = (section: EquitySection, showViewDetails = true) => {
    if (!section.items || section.items.length === 0) {
      return (
        <div className="py-3 text-sm text-muted-foreground italic">
          No accounts in this equity component.
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
                <th className="py-2 px-3 text-right text-foreground font-semibold">Opening</th>
                <th className="py-2 px-3 text-right text-foreground font-semibold">Additions</th>
                <th className="py-2 px-3 text-right text-foreground font-semibold">Reductions</th>
                <th className="py-2 px-3 text-right text-foreground font-semibold">Closing</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map(item => (
                <tr key={item.account_id} className="border-b border-border">
                  <td className="py-1.5 px-3 text-foreground">{item.account_name}</td>
                  <td className="py-1.5 px-3 text-right text-foreground">
                    {formatCurrency(item.opening_balance)}
                  </td>
                  <td
                    className={`py-1.5 px-3 text-right font-medium ${
                      item.additions > 0 ? 'text-green-400' : 'text-foreground'
                    }`}
                  >
                    {item.additions !== 0 ? formatCurrency(item.additions) : '-'}
                  </td>
                  <td
                    className={`py-1.5 px-3 text-right font-medium ${
                      item.withdrawals > 0 ? 'text-red-400' : 'text-foreground'
                    }`}
                  >
                    {item.withdrawals !== 0 ? formatCurrency(item.withdrawals) : '-'}
                  </td>
                  <td className="py-1.5 px-3 text-right font-semibold text-foreground">
                    {formatCurrency(item.closing_balance)}
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
            onClick={(e) => { e.stopPropagation(); setDetailModal(section) }}
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
          <div className="p-2 bg-purple-500/15 rounded-lg">
            <Users className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Statement of Changes in Equity</h1>
            <p className="text-sm text-muted-foreground">Equity Movement Statement</p>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Opening Equity</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalOpening)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Additions</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(totalAdditions)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Reductions</p>
                  <p className="text-2xl font-bold text-red-400">
                    {formatCurrency(totalReductions)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Closing Equity</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {formatCurrency(totalClosing)}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-border text-sm text-muted-foreground">
                Beginning equity at {dayjs(data.period.start_date).format('YYYY-MM-DD')}:{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(totalOpening)}
                </span>
                , ending equity at {dayjs(data.period.end_date).format('YYYY-MM-DD')}:{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(totalClosing)}
                </span>
              </div>
              {/* Owner Capital Note */}
              <div className="pt-2 border-t border-border bg-purple-500/10 rounded-lg p-3 mt-2">
                <p className="text-xs font-semibold text-purple-300 mb-1">How Owner Capital is Tracked</p>
                <p className="text-xs text-muted-foreground">
                  Owner capital balances reflect the General Ledger running balance for each equity account.
                  To add owner capital: create a journal entry <strong>Dr Cash / Bank → Cr Owner Capital</strong>.
                  This will increase both Cash (asset) and Equity simultaneously, keeping the accounting equation balanced.
                  Opening balances set in the Chart of Accounts are also included here.
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-card rounded p-2 border border-purple-500/30">
                    <p className="text-muted-foreground">Net Income (this period)</p>
                    <p className={`font-bold ${data.net_income >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(data.net_income)}</p>
                  </div>
                  <div className="bg-card rounded p-2 border border-purple-500/30">
                    <p className="text-muted-foreground">Owner Contributions</p>
                    <p className="font-bold text-green-400">{formatCurrency(data.owner_contributions)}</p>
                  </div>
                  <div className="bg-card rounded p-2 border border-purple-500/30">
                    <p className="text-muted-foreground">Withdrawals / Dividends</p>
                    <p className="font-bold text-red-400">{formatCurrency(data.withdrawals)}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Equity Components in Accordions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-card rounded-lg border border-border shadow-sm p-4"
          >
            <Accordion className="space-y-3">
              {sections.map(section => (
                <AccordionItem key={section.key} value={section.key}>
                  <AccordionTrigger>
                    <span>{section.label}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(section.totals.closing)}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderSectionTable(section, true)}
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Opening:</span>{' '}
                        <span className="font-medium text-foreground">
                          {formatCurrency(section.totals.opening)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Additions:</span>{' '}
                        <span className="font-medium text-green-400">
                          {formatCurrency(section.totals.additions)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reductions:</span>{' '}
                        <span className="font-medium text-red-400">
                          {formatCurrency(section.totals.reductions)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Closing:</span>{' '}
                        <span className="font-semibold text-purple-400">
                          {formatCurrency(section.totals.closing)}
                        </span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* Detail Modal */}
          <Dialog open={!!detailModal} onOpenChange={(open) => !open && setDetailModal(null)}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{detailModal?.label} - Item Details</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto flex-1 -mx-6 px-6">
                {detailModal && detailModal.items.length > 0 && (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left text-foreground font-semibold">Account</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Opening</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Additions</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Reductions</th>
                        <th className="py-2 px-3 text-right text-foreground font-semibold">Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.items.map(item => (
                        <tr key={item.account_id} className="border-b border-border">
                          <td className="py-2 px-3 text-foreground">{item.account_name}</td>
                          <td className="py-2 px-3 text-right text-foreground">{formatCurrency(item.opening_balance)}</td>
                          <td className={`py-2 px-3 text-right font-medium ${item.additions > 0 ? 'text-green-400' : 'text-foreground'}`}>
                            {item.additions !== 0 ? formatCurrency(item.additions) : '-'}
                          </td>
                          <td className={`py-2 px-3 text-right font-medium ${item.withdrawals > 0 ? 'text-red-400' : 'text-foreground'}`}>
                            {item.withdrawals !== 0 ? formatCurrency(item.withdrawals) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-foreground">{formatCurrency(item.closing_balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                        <td className="py-2 px-3 text-foreground">Grand Total</td>
                        <td className="py-2 px-3 text-right text-foreground">{formatCurrency(detailModal.totals.opening)}</td>
                        <td className="py-2 px-3 text-right text-green-400">{formatCurrency(detailModal.totals.additions)}</td>
                        <td className="py-2 px-3 text-right text-red-400">{formatCurrency(detailModal.totals.reductions)}</td>
                        <td className="py-2 px-3 text-right text-foreground">{formatCurrency(detailModal.totals.closing)}</td>
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

