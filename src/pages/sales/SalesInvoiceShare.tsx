import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Spin, App, message as antdMessage } from 'antd'

import { Badge } from '@/components/ui/badge'
import { SalesInvoiceAPI, SalesInvoiceTemplateAPI, type SalesInvoice } from '@/services/api'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { printInvoiceWithTemplate, printSimpleInvoiceTemplate } from '@/utils/templateRenderer'
import { DEFAULT_TEMPLATE } from './TemplatesManage'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SalesInvoiceShare() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return

      setLoading(true)
      try {
        const invoiceRes = await SalesInvoiceAPI.getByShareToken(token)
        setInvoice(invoiceRes.data.data)
      } catch (error: any) {
        console.error('Error fetching shared sales invoice:', error)
        if (error.response?.status === 404 || error.response?.status === 410) {
          message.error('Share link not found or has expired')
        } else {
          message.error('Failed to load invoice')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token, message])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Invoice not found or link has expired</p>
      </div>
    )
  }

  const getCustomerName = () => {
    const customer = (invoice as any).customer || (invoice as any).customer_id
    if (typeof customer === 'object' && customer?.name) {
      return customer.name
    }
    return typeof customer === 'string' ? customer : '-'
  }

  const inventoryMap = new Map<string, string>()

  const getProductName = (product: string | any) => {
    if (!product) return '-'
    if (typeof product === 'object' && product !== null) {
      return product.name || product._id || '-'
    }
    if (typeof product === 'string') {
      return inventoryMap.get(product) || product || '-'
    }
    return '-'
  }

  const lineItems = (invoice as any).line_items || (invoice as any).lineItems || []
  const grandTotal = lineItems.reduce((sum: number, item: any) => {
    const qty = item.qty || item.quantity || 0
    const unitPrice = item.unitPrice || item.unit_price || 0
    return sum + (qty * unitPrice)
  }, 0)
  const discount = (invoice as any).discount || (invoice as any).discount_amount || 0
  const vat = (invoice as any).vat || (invoice as any).tax_amount || (invoice as any).taxAmount || 0
  const finalTotal = grandTotal - discount + vat

  const handlePrint = async () => {
    if (!invoice) return

    setPrinting(true)
    try {
      // Resolve template design — fall back to the built-in default so
      // printing works even before any template has been seeded.
      let design: any = null
      try {
        const templateRes = await SalesInvoiceTemplateAPI.getDefault()
        design = templateRes.data.data?.design
        if (typeof design === 'string') {
          try {
            design = JSON.parse(design)
          } catch {
            design = null
          }
        }
      } catch {
        // API miss (e.g. 404) — fall through to the built-in default
      }

      if (!design || typeof design !== 'object' || Array.isArray(design) || Object.keys(design).length === 0) {
        design = DEFAULT_TEMPLATE
        console.warn('No saved sales template — printing with the built-in default design.')
      }

      // Check for old format (elements array) - legacy support
      const hasOldFormat = design.elements && Array.isArray(design.elements) && design.elements.length > 0

      console.log('✅ Using sales invoice template design (share):', {
        designKeys: Object.keys(design),
        hasOldFormat,
      })

      const invoiceData = {
        invoice,
        customer: typeof invoice.customer_id === 'object' ? invoice.customer_id : null,
        lineItems: lineItems,
      }

      // Use appropriate renderer based on template format
      if (hasOldFormat) {
        printInvoiceWithTemplate(design, invoiceData)
      } else {
        // Use new Tax Invoice renderer - always use saved template
        printSimpleInvoiceTemplate(design, invoiceData)
      }
    } catch (error: any) {
      console.error('Error printing invoice:', error)
      message.error('Failed to print invoice. Please try again.')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{(invoice as any).invoice_number || (invoice as any).invoiceNumber || (invoice as any).serial_number || (invoice as any).serialNumber || '-'}</h1>
              <p className="text-sm text-muted-foreground mt-1">Sales Invoice</p>
            </div>
            <Button
              onClick={handlePrint}
              disabled={printing}
              variant="outline"
              className="border-border hover:bg-muted/50"
            >
              <Printer className="h-4 w-4 mr-2" />
              {printing ? 'Printing...' : 'Print Invoice'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-semibold text-foreground">Customer</label>
              <p className="text-foreground mt-1">{getCustomerName()}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Date</label>
              <p className="text-foreground mt-1">
                {((invoice as any).date || (invoice as any).invoice_date) ? dayjs((invoice as any).date || (invoice as any).invoice_date).format('YYYY-MM-DD') : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Payment Status</label>
              <div className="mt-1">
                <Badge
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-full border',
                    ((invoice as any).status || (invoice as any).payment_status) === 'paid'
                      ? 'bg-green-500/15 text-green-300 border-green-500/30'
                      : 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                  )}
                >
                  {((invoice as any).status || (invoice as any).payment_status) === 'paid' ? 'Paid' : 'Unpaid'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4">
              Line Items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Product</th>
                    <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Quantity</th>
                    <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Unit Price</th>
                    <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item: any, idx: number) => {
                    const qty = item.qty || item.quantity || 0
                    const unitPrice = item.unitPrice || item.unit_price || 0
                    const total = (qty * unitPrice)
                    return (
                      <tr key={idx} className="border-b border-border">
                        <td className="py-2 px-3 text-foreground">{getProductName(item.product)}</td>
                        <td className="py-2 px-3 text-right text-foreground">{qty}</td>
                        <td className="py-2 px-3 text-right text-foreground">
                          AED {unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right text-foreground font-semibold">
                          AED {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="text-foreground font-medium">
                  AED {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center text-sm text-red-400">
                  <span>Discount:</span>
                  <span className="font-medium">
                    - AED {discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {vat > 0 && (
                <div className="flex justify-between items-center text-sm text-green-400">
                  <span>VAT (5%):</span>
                  <span className="font-medium">
                    + AED {vat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                <span className="text-lg font-bold text-foreground">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">
                  AED {finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

