import { useEffect, useState, useMemo } from 'react'
import { message, DatePicker, InputNumber, Alert } from 'antd'
import { motion } from 'framer-motion'
import {
  Download,
  FileText,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  QrCode,
  FileSignature,
  ExternalLink,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SalesInvoiceAPI, PurchaseInvoiceAPI, SettingsAPI, type SalesInvoice, type PurchaseInvoice } from '@/services/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNavigate } from 'react-router-dom'
import { calculateSalesInvoiceTotal } from '@/utils/invoiceCalculations'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

// UAE 7 Emirates
const UAE_EMIRATES = [
  'Abu Dhabi',
  'Dubai',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
] as const

type EmirateKey = (typeof UAE_EMIRATES)[number]

interface VAT201Data {
  standardRatedByEmirate: Record<EmirateKey, number>
  zeroRatedSupplies: number
  exemptSupplies: number
  rcmImports: number
  outputVat: number
  inputVat: number
  netVat: number
}

const REFUND_CLAIM_YEARS_LIMIT = 5
const FILING_DEADLINE_DAY = 28

export default function VAT201ReturnDashboard() {
  const [loading, setLoading] = useState(false)
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([])
  const [settings, setSettings] = useState<{ taxInformation?: { trn?: string } }>({})
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('month'))
  const [manualExempt, setManualExempt] = useState(0)
  const [manualRcm, setManualRcm] = useState(0)
  const [manualEmirateBreakdown, setManualEmirateBreakdown] = useState<Partial<Record<EmirateKey, number>>>({})
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [digitalSignature, setDigitalSignature] = useState('')
  const [detailModal, setDetailModal] = useState<'outputVat' | 'inputVat' | 'netVat' | 'zeroRated' | null>(null)
  const [qrModal, setQrModal] = useState<{ invoiceId: string; type: 'sales' | 'purchase'; invoiceNumber: string } | null>(null)
  const [qrResult, setQrResult] = useState<{ qrData: string; qrImage: string } | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (startDate && endDate) fetchData()
  }, [startDate, endDate])

  const fetchSettings = async () => {
    try {
      const res = await SettingsAPI.get()
      setSettings(res.data?.data || {})
    } catch {
      // ignore
    }
  }

  const fetchData = async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const [salesRes, purchaseRes] = await Promise.all([
        SalesInvoiceAPI.list(),
        PurchaseInvoiceAPI.list(),
      ])
      const sales = salesRes.data?.data || []
      const purchases = purchaseRes.data?.data || []
      const s = startDate.toDate()
      const e = endDate.toDate()
      setSalesInvoices(
        sales.filter((inv: SalesInvoice) => {
          const d = new Date(inv.invoice_date)
          return d >= s && d <= e
        })
      )
      setPurchaseInvoices(
        purchases.filter((inv: PurchaseInvoice) => {
          const d = new Date(inv.invoice_date)
          return d >= s && d <= e
        })
      )
    } catch (err: any) {
      message.error(err?.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const vatData = useMemo((): VAT201Data => {
    let outputVat = 0
    let inputVat = 0
    let zeroRatedAmount = 0
    let autoStandardRatedTotal = 0

    salesInvoices.forEach((inv) => {
      const total = calculateSalesInvoiceTotal(inv)
      const tax = inv.tax_amount ?? (inv as any).vat ?? 0
      if (inv.isExportInvoice) {
        zeroRatedAmount += total
      } else {
        outputVat += tax
        autoStandardRatedTotal += total - tax
      }
    })

    purchaseInvoices.forEach((inv) => {
      const tax = inv.tax_amount ?? (inv as any).vat ?? 0
      inputVat += tax
    })

    const hasAnyManual = Object.keys(manualEmirateBreakdown).length > 0

    const standardRatedByEmirate: Record<EmirateKey, number> = {} as any
    UAE_EMIRATES.forEach((em) => {
      if (em in manualEmirateBreakdown) {
        standardRatedByEmirate[em] = manualEmirateBreakdown[em] ?? 0
      } else if (!hasAnyManual && em === 'Dubai' && autoStandardRatedTotal > 0) {
        standardRatedByEmirate[em] = autoStandardRatedTotal
      } else {
        standardRatedByEmirate[em] = 0
      }
    })

    const netVat = outputVat - inputVat
    return {
      standardRatedByEmirate,
      zeroRatedSupplies: zeroRatedAmount,
      exemptSupplies: manualExempt,
      rcmImports: manualRcm,
      outputVat,
      inputVat,
      netVat,
    }
  }, [salesInvoices, purchaseInvoices, manualExempt, manualRcm, manualEmirateBreakdown])

  const outputVatItems = useMemo(() => {
    return salesInvoices
      .filter((inv) => !inv.isExportInvoice)
      .map((inv) => {
        const total = calculateSalesInvoiceTotal(inv)
        const tax = inv.tax_amount ?? (inv as any).vat ?? 0
        return {
          _id: inv._id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          customer: typeof inv.customer_id === 'object' && inv.customer_id?.name ? inv.customer_id.name : '-',
          total,
          vat: tax,
        }
      })
  }, [salesInvoices])

  const inputVatItems = useMemo(() => {
    return purchaseInvoices.map((inv) => {
      const total = inv.total_amount ?? 0
      const tax = inv.tax_amount ?? (inv as any).vat ?? 0
      const vendor = typeof inv.vendor_id === 'object' && inv.vendor_id?.name ? inv.vendor_id.name : '-'
      return {
        _id: inv._id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        vendor,
        total,
        vat: tax,
      }
    })
  }, [purchaseInvoices])

  const zeroRatedItems = useMemo(() => {
    return salesInvoices
      .filter((inv) => inv.isExportInvoice)
      .map((inv) => {
        const total = calculateSalesInvoiceTotal(inv)
        return {
          _id: inv._id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          customer: typeof inv.customer_id === 'object' && inv.customer_id?.name ? inv.customer_id.name : '-',
          total,
        }
      })
  }, [salesInvoices])

  const isRefundClaimOlderThan5Years = useMemo(() => {
    if (!startDate) return false
    const periodStart = startDate.year()
    const currentYear = dayjs().year()
    return currentYear - periodStart >= REFUND_CLAIM_YEARS_LIMIT && vatData.netVat < 0
  }, [startDate, vatData.netVat])

  const nextFilingDeadline = useMemo(() => {
    const now = dayjs()
    let next = now.add(1, 'month').date(FILING_DEADLINE_DAY)
    if (now.date() <= FILING_DEADLINE_DAY) {
      next = now.date(FILING_DEADLINE_DAY)
    }
    return next
  }, [])

  const [countdownTick, setCountdownTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCountdownTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const countdown = useMemo(() => {
    const now = dayjs()
    const deadline = nextFilingDeadline
    const diff = deadline.diff(now, 'second')
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, overdue: true }
    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    return { days, hours, minutes, overdue: false }
  }, [nextFilingDeadline, countdownTick])

  const formatCurrency = (n: number) =>
    `AED ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const handleExportJSON = () => {
    const payload = {
      schema: 'PINT-AE-VAT201',
      version: '1.0',
      generatedAt: dayjs().toISOString(),
      period: { start: startDate?.format('YYYY-MM-DD'), end: endDate?.format('YYYY-MM-DD') },
      taxpayer: { trn: settings.taxInformation?.trn || '' },
      vatReturn: {
        standardRatedSuppliesByEmirate: vatData.standardRatedByEmirate,
        zeroRatedSupplies: vatData.zeroRatedSupplies,
        exemptSupplies: vatData.exemptSupplies,
        rcmImports: vatData.rcmImports,
        outputVat: vatData.outputVat,
        inputVat: vatData.inputVat,
        netVat: vatData.netVat,
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `VAT201-${startDate?.format('YYYY-MM') || 'return'}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('JSON exported')
  }

  const handleGenerateQr = async (invoiceId: string, type: 'sales' | 'purchase', invoiceNumber: string) => {
    setQrModal({ invoiceId, type, invoiceNumber })
    setQrLoading(true)
    setQrResult(null)
    try {
      const api = type === 'sales' ? SalesInvoiceAPI : PurchaseInvoiceAPI
      const res = await api.getQrCode(invoiceId)
      const data = res.data?.data
      if (data?.qrData && data?.qrImage) {
        setQrResult({ qrData: data.qrData, qrImage: data.qrImage })
        setQrCodeUrl(data.qrData)
      } else {
        message.error('Failed to generate QR code')
        setQrModal(null)
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to generate QR code')
      setQrModal(null)
    } finally {
      setQrLoading(false)
    }
  }

  const handleExportXML = () => {
    const trn = settings.taxInformation?.trn || ''
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<VAT201Return xmlns="urn:ae:gov:fta:vat:201:v1">
  <Header>
    <SchemaVersion>PINT-AE-VAT201-1.0</SchemaVersion>
    <GeneratedAt>${dayjs().toISOString()}</GeneratedAt>
    <TaxpayerTRN>${trn}</TaxpayerTRN>
    <Period>
      <StartDate>${startDate?.format('YYYY-MM-DD') || ''}</StartDate>
      <EndDate>${endDate?.format('YYYY-MM-DD') || ''}</EndDate>
    </Period>
  </Header>
  <Supplies>
    <StandardRatedSupplies>
      ${UAE_EMIRATES.map((em) => `<${em.replace(/\s/g, '')}>${vatData.standardRatedByEmirate[em] ?? 0}</${em.replace(/\s/g, '')}>`).join('\n      ')}
    </StandardRatedSupplies>
    <ZeroRatedSupplies>${vatData.zeroRatedSupplies}</ZeroRatedSupplies>
    <ExemptSupplies>${vatData.exemptSupplies}</ExemptSupplies>
    <RCMImports>${vatData.rcmImports}</RCMImports>
  </Supplies>
  <VAT>
    <OutputVAT>${vatData.outputVat}</OutputVAT>
    <InputVAT>${vatData.inputVat}</InputVAT>
    <NetVAT>${vatData.netVat}</NetVAT>
  </VAT>
</VAT201Return>`
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `VAT201-${startDate?.format('YYYY-MM') || 'return'}.xml`
    a.click()
    URL.revokeObjectURL(url)
    message.success('XML exported (PINT-AE compatible)')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">VAT 201 Return Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            UAE VAT return preparation for FTA EmaraTax submission •{' '}
            <a
              href="https://tax.gov.ae/en/emaratax.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              EmaraTax <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker
            value={[startDate, endDate]}
            onChange={(dates) => {
              if (dates?.[0]) setStartDate(dates[0])
              if (dates?.[1]) setEndDate(dates[1])
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportJSON}>
                <FileText className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportXML}>
                <FileText className="h-4 w-4 mr-2" />
                Export as XML (PINT-AE)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filing Deadline Countdown */}
      <Card className="border-amber-500/30 bg-amber-500/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            VAT Filing Deadline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Returns must be filed by the 28th of the month following the tax period.{' '}
            <a
              href="https://tax.gov.ae/en/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              FTA Guidelines
            </a>
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-amber-300">
                {countdown.overdue ? 'Overdue' : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`}
              </span>
              <span className="text-sm text-muted-foreground">until {nextFilingDeadline.format('MMM DD, YYYY')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refund Validation Alert */}
      {isRefundClaimOlderThan5Years && (
        <Alert
          type="warning"
          showIcon
          icon={<AlertTriangle className="h-5 w-5" />}
          message="Refund Claim Period Exceeds 5 Years"
          description="Per 2026 FTA regulations, refund claims for periods older than 5 years may not be eligible. Please verify with your tax advisor or the Federal Tax Authority."
          className="border-amber-500/30"
        />
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setDetailModal('outputVat')}
        >
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Output VAT</p>
            <p className="text-2xl font-bold text-green-300">{formatCurrency(vatData.outputVat)}</p>
            <p className="text-xs text-primary mt-1 hover:underline">View details →</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setDetailModal('inputVat')}
        >
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Input VAT</p>
            <p className="text-2xl font-bold text-blue-300">{formatCurrency(vatData.inputVat)}</p>
            <p className="text-xs text-primary mt-1 hover:underline">View details →</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setDetailModal('netVat')}
        >
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Net VAT</p>
            <p className={`text-2xl font-bold ${vatData.netVat >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {formatCurrency(vatData.netVat)}
            </p>
            <p className="text-xs text-primary mt-1 hover:underline">View details →</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-lg font-semibold flex items-center gap-2">
              {vatData.netVat >= 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-400" /> Payable to FTA
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-400" /> Refund Claim
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* VAT Balance Sheet Position */}
      <Card className={`border-2 ${vatData.netVat >= 0 ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-green-500/30 bg-green-500/10'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            VAT Balance Sheet Position
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            How VAT affects your Balance Sheet — required for double-entry accounting compliance
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Output VAT (Liability)</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(vatData.outputVat)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Collected from customers on sales. Recorded as <em>VAT Payable</em> (Current Liability) in Balance Sheet until remitted to FTA.
              </p>
            </div>
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Input VAT (Asset)</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(vatData.inputVat)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Paid on purchases. Recorded as <em>VAT Recoverable</em> (Current Asset) until offset against Output VAT.
              </p>
            </div>
            <div className={`rounded-lg p-3 border ${vatData.netVat >= 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Net VAT Position</p>
              <p className={`text-lg font-bold ${vatData.netVat >= 0 ? 'text-yellow-300' : 'text-green-300'}`}>{formatCurrency(Math.abs(vatData.netVat))}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {vatData.netVat >= 0
                  ? 'Net payable to FTA — record as VAT Payable liability. Pay by filing deadline to avoid penalties.'
                  : 'Net refund due from FTA — record as VAT Recoverable asset. Submit refund claim within 5-year window.'}
              </p>
              {vatData.netVat >= 0 && (
                <p className="text-xs text-orange-400 font-medium mt-1">
                  Due by {nextFilingDeadline.format('DD MMM YYYY')}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Payment Method Impact on VAT:</span>
              {' '}VAT is triggered at point of invoice (tax point), regardless of whether payment was cash, bank transfer, or credit.
              A sale of AED 100 (50 cash + 25 bank + 25 credit) generates the same VAT liability as a full-cash sale.
              The payment split only affects your Cash / Bank / Accounts Receivable balances — not VAT.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Supplies Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Standard Rated Supplies by Emirate</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Supplies subject to 5% VAT, broken down by place of supply
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                {UAE_EMIRATES.map((em) => (
                  <div key={em} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-foreground">{em}</span>
                    <div className="flex items-center gap-2">
                      <InputNumber
                        size="small"
                        min={0}
                        step={100}
                        value={vatData.standardRatedByEmirate[em] ?? 0}
                        onChange={(v) => setManualEmirateBreakdown((prev) => ({ ...prev, [em]: v ?? 0 }))}
                        formatter={(v) => `AED ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(v) => parseFloat(String(v).replace(/AED\s?|,/g, '')) || 0}
                        className="w-36"
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">
                  Auto-filled from local sales invoices. Override to split by place of supply.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Other Supply Categories</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Zero-rated, exempt, and RCM imports
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className="cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                onClick={() => setDetailModal('zeroRated')}
              >
                <label className="text-sm font-medium text-foreground">Zero-Rated Supplies (AED)</label>
                <p className="text-xl font-semibold text-foreground mt-1">
                  {formatCurrency(vatData.zeroRatedSupplies)}
                </p>
                <p className="text-xs text-primary hover:underline">View details →</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Exempt Supplies (AED)</label>
                <InputNumber
                  className="w-full mt-1"
                  min={0}
                  step={100}
                  value={manualExempt}
                  onChange={(v) => setManualExempt(v ?? 0)}
                  formatter={(v) => `AED ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => parseFloat(String(v).replace(/AED\s?|,/g, '')) || 0}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">RCM Imports (AED)</label>
                <InputNumber
                  className="w-full mt-1"
                  min={0}
                  step={100}
                  value={manualRcm}
                  onChange={(v) => setManualRcm(v ?? 0)}
                  formatter={(v) => `AED ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => parseFloat(String(v).replace(/AED\s?|,/g, '')) || 0}
                />
                <p className="text-xs text-muted-foreground mt-1">Reverse Charge Mechanism imports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Compliance – QR Code & Digital Signature
          </CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Mandatory for e-invoicing per FTA requirements. Store QR code and digital signature for each generated
            invoice.{' '}
            <a
              href="https://tax.gov.ae/en/tax.support/tax.accounting.software.vendors/accredited.tax.accounting.software.vendors.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Accredited Software Vendors
            </a>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Generate QR for invoice */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Generate QR Code for Invoice</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Select an invoice from the period and generate a UAE FTA-compliant QR code. The QR data will be filled below.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-semibold">Type</th>
                    <th className="text-left py-2 font-semibold">Invoice #</th>
                    <th className="text-left py-2 font-semibold">Date</th>
                    <th className="text-left py-2 font-semibold">Party</th>
                    <th className="text-right py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {outputVatItems.map((item) => (
                    <tr key={`s-${item._id}`} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2">Sales</td>
                      <td className="py-2">{item.invoice_number}</td>
                      <td className="py-2">{dayjs(item.invoice_date).format('MMM DD, YYYY')}</td>
                      <td className="py-2">{item.customer}</td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={qrLoading}
                          onClick={() => handleGenerateQr(item._id, 'sales', item.invoice_number)}
                        >
                          <QrCode className="h-3.5 w-3.5 mr-1" />
                          Generate QR
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {zeroRatedItems.map((item) => (
                    <tr key={`z-${item._id}`} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2">Sales (Zero-rated)</td>
                      <td className="py-2">{item.invoice_number}</td>
                      <td className="py-2">{dayjs(item.invoice_date).format('MMM DD, YYYY')}</td>
                      <td className="py-2">{item.customer}</td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={qrLoading}
                          onClick={() => handleGenerateQr(item._id, 'sales', item.invoice_number)}
                        >
                          <QrCode className="h-3.5 w-3.5 mr-1" />
                          Generate QR
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {inputVatItems.map((item) => (
                    <tr key={`p-${item._id}`} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2">Purchase</td>
                      <td className="py-2">{item.invoice_number}</td>
                      <td className="py-2">{dayjs(item.invoice_date).format('MMM DD, YYYY')}</td>
                      <td className="py-2">{item.vendor}</td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={qrLoading}
                          onClick={() => handleGenerateQr(item._id, 'purchase', item.invoice_number)}
                        >
                          <QrCode className="h-3.5 w-3.5 mr-1" />
                          Generate QR
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {outputVatItems.length === 0 && zeroRatedItems.length === 0 && inputVatItems.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground py-4">No invoices in the selected period.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <QrCode className="h-4 w-4" /> QR Code URL / Data
              </label>
              <input
                type="text"
                placeholder="Paste QR code data or URL"
                value={qrCodeUrl}
                onChange={(e) => setQrCodeUrl(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-border rounded-lg text-sm"
              />
              {qrCodeUrl && (
                <div className="mt-2 p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">Stored for compliance records</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileSignature className="h-4 w-4" /> Digital Signature
              </label>
              <input
                type="text"
                placeholder="Digital signature reference"
                value={digitalSignature}
                onChange={(e) => setDigitalSignature(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-border rounded-lg text-sm"
              />
              {digitalSignature && (
                <div className="mt-2 p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">Stored for compliance records</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Preview Modal */}
      <Dialog open={!!qrModal || !!qrResult} onOpenChange={(open) => !open && (setQrModal(null), setQrResult(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Generated
              {qrModal && (
                <span className="text-sm font-normal text-muted-foreground">
                  – {qrModal.invoiceNumber}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {qrLoading ? (
            <div className="py-12 text-center text-muted-foreground">Generating QR code...</div>
          ) : qrResult ? (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-card rounded-lg border border-border">
                <img src={qrResult.qrImage} alt="Invoice QR Code" className="w-48 h-48 object-contain" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">QR Data (FTA format)</label>
                <p className="mt-1 text-xs text-muted-foreground break-all font-mono bg-muted/50 p-2 rounded">
                  {qrResult.qrData}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                The QR data has been copied to the compliance field above. You can download the image by right-clicking.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Detail Modals */}
      <Dialog open={!!detailModal} onOpenChange={(open) => !open && setDetailModal(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {detailModal === 'outputVat' && 'Output VAT - Sales Invoices'}
              {detailModal === 'inputVat' && 'Input VAT - Purchase Invoices'}
              {detailModal === 'netVat' && 'Net VAT - Breakdown'}
              {detailModal === 'zeroRated' && 'Zero-Rated Supplies - Export Invoices'}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 -mx-6 px-6">
            {detailModal === 'outputVat' && (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Sales invoices with VAT (local/standard rated). Total: {formatCurrency(vatData.outputVat)}
                </p>
                {outputVatItems.length === 0 ? (
                  <p className="text-muted-foreground py-4">No items</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-semibold">Invoice #</th>
                        <th className="text-left py-2 font-semibold">Date</th>
                        <th className="text-left py-2 font-semibold">Customer</th>
                        <th className="text-right py-2 font-semibold">Total</th>
                        <th className="text-right py-2 font-semibold">VAT</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {outputVatItems.map((item) => (
                        <tr key={item._id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-2">{item.invoice_number}</td>
                          <td className="py-2">{dayjs(item.invoice_date).format('MMM DD, YYYY')}</td>
                          <td className="py-2">{item.customer}</td>
                          <td className="py-2 text-right">{formatCurrency(item.total)}</td>
                          <td className="py-2 text-right text-green-400">{formatCurrency(item.vat)}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/sales-invoices/view/${item._id}`)}
                              className="text-primary hover:underline text-xs"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-semibold">
                        <td colSpan={3} className="py-2">Total</td>
                        <td className="py-2 text-right">{formatCurrency(outputVatItems.reduce((s, i) => s + i.total, 0))}</td>
                        <td className="py-2 text-right text-green-400">{formatCurrency(vatData.outputVat)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </>
            )}
            {detailModal === 'inputVat' && (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Purchase invoices with VAT. Total: {formatCurrency(vatData.inputVat)}
                </p>
                {inputVatItems.length === 0 ? (
                  <p className="text-muted-foreground py-4">No items</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-semibold">Invoice #</th>
                        <th className="text-left py-2 font-semibold">Date</th>
                        <th className="text-left py-2 font-semibold">Vendor</th>
                        <th className="text-right py-2 font-semibold">Total</th>
                        <th className="text-right py-2 font-semibold">VAT</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {inputVatItems.map((item) => (
                        <tr key={item._id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-2">{item.invoice_number}</td>
                          <td className="py-2">{dayjs(item.invoice_date).format('MMM DD, YYYY')}</td>
                          <td className="py-2">{item.vendor}</td>
                          <td className="py-2 text-right">{formatCurrency(item.total)}</td>
                          <td className="py-2 text-right text-blue-400">{formatCurrency(item.vat)}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/purchase-invoices/view/${item._id}`)}
                              className="text-primary hover:underline text-xs"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-semibold">
                        <td colSpan={3} className="py-2">Total</td>
                        <td className="py-2 text-right">{formatCurrency(inputVatItems.reduce((s, i) => s + i.total, 0))}</td>
                        <td className="py-2 text-right text-blue-400">{formatCurrency(vatData.inputVat)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </>
            )}
            {detailModal === 'netVat' && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Net VAT = Output VAT − Input VAT = {formatCurrency(vatData.netVat)}
                </p>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-300 mb-2">Output VAT ({formatCurrency(vatData.outputVat)})</h4>
                    <p className="text-xs text-muted-foreground mb-2">From {outputVatItems.length} sales invoice(s)</p>
                    {outputVatItems.length > 0 && (
                      <ul className="text-sm space-y-1 max-h-32 overflow-auto">
                        {outputVatItems.map((i) => (
                          <li key={i._id} className="flex justify-between">
                            <span>{i.invoice_number} - {dayjs(i.invoice_date).format('MMM DD')}</span>
                            <span className="text-green-400">{formatCurrency(i.vat)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-2">Input VAT ({formatCurrency(vatData.inputVat)})</h4>
                    <p className="text-xs text-muted-foreground mb-2">From {inputVatItems.length} purchase invoice(s)</p>
                    {inputVatItems.length > 0 && (
                      <ul className="text-sm space-y-1 max-h-32 overflow-auto">
                        {inputVatItems.map((i) => (
                          <li key={i._id} className="flex justify-between">
                            <span>{i.invoice_number} - {dayjs(i.invoice_date).format('MMM DD')}</span>
                            <span className="text-blue-400">{formatCurrency(i.vat)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
            {detailModal === 'zeroRated' && (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Export sales (zero-rated). Total: {formatCurrency(vatData.zeroRatedSupplies)}
                </p>
                {zeroRatedItems.length === 0 ? (
                  <p className="text-muted-foreground py-4">No items</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-semibold">Invoice #</th>
                        <th className="text-left py-2 font-semibold">Date</th>
                        <th className="text-left py-2 font-semibold">Customer</th>
                        <th className="text-right py-2 font-semibold">Amount</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {zeroRatedItems.map((item) => (
                        <tr key={item._id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-2">{item.invoice_number}</td>
                          <td className="py-2">{dayjs(item.invoice_date).format('MMM DD, YYYY')}</td>
                          <td className="py-2">{item.customer}</td>
                          <td className="py-2 text-right">{formatCurrency(item.total)}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/sales-invoices/view/${item._id}`)}
                              className="text-primary hover:underline text-xs"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-semibold">
                        <td colSpan={3} className="py-2">Total</td>
                        <td className="py-2 text-right">{formatCurrency(vatData.zeroRatedSupplies)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
