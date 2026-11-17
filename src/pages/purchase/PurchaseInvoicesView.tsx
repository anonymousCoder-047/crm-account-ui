import { ArrowLeft, FileSpreadsheet, Edit, Printer, Share2, Check, DollarSign } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PurchaseInvoiceAPI, SupplierAPI, InventoryAPI, PurchaseInvoiceTemplateAPI, PaymentMethodAPI, type PurchaseInvoice, type Supplier, type InventoryItem, type PaymentMethod, type ApplyPaymentInput } from '@/services/api'
import { App, Spin, message as antdMessage, Form, Input as AntInput, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { printSimpleInvoiceTemplate, printInvoiceWithTemplate } from '@/utils/templateRenderer'
import { DEFAULT_TEMPLATE } from './TemplatesManage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'

export default function PurchaseInvoicesView() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [printing, setPrinting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [applyingPayment, setApplyingPayment] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  const [paymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false)
  const [creatingPaymentMethod, setCreatingPaymentMethod] = useState(false)
  const [paymentForm] = Form.useForm()
  const [paymentMethodForm] = Form.useForm()
  const paymentMethodValue = Form.useWatch('payment_method', paymentForm)

  const supplierMap = new Map<string, string>()
  suppliers.forEach(s => supplierMap.set(s._id, s.name))

  const inventoryMap = new Map<string, string>()
  inventoryItems.forEach(item => inventoryMap.set(item._id, item.name || ''))

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      setLoading(true)
      try {
        const [invoiceRes, suppliersRes, inventoryRes] = await Promise.all([
          PurchaseInvoiceAPI.get(id),
          SupplierAPI.list(),
          InventoryAPI.list(),
        ])
        
        const invoiceData = invoiceRes.data.data
        setInvoice(invoiceData)
        setSuppliers(suppliersRes.data.data)
        setInventoryItems(inventoryRes.data.data)
        
        // Fetch payment methods separately
        setLoadingPaymentMethods(true)
        try {
          const paymentMethodsRes = await PaymentMethodAPI.list({ activeOnly: true })
          setPaymentMethods(paymentMethodsRes.data.data)
        } catch (error) {
          console.error('Error fetching payment methods:', error)
        } finally {
          setLoadingPaymentMethods(false)
        }
      } catch (error) {
        console.error('Error fetching purchase invoice:', error)
        message.error('Failed to load purchase invoice')
        navigate('/purchase-invoices/manage')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate, message])

  const getSupplierName = () => {
    if (!invoice?.vendor_id) return '-'
    if (typeof invoice.vendor_id === 'object' && invoice.vendor_id?.name) {
      return invoice.vendor_id.name
    }
    const vendorId = typeof invoice.vendor_id === 'string' ? invoice.vendor_id : invoice.vendor_id?._id
    return supplierMap.get(vendorId || '') || vendorId || '-'
  }

  const getProductName = (product: string | any) => {
    if (!product) return '-'
    if (typeof product === 'object' && product !== null) {
      if (product.name) return product.name
      if (product._id) {
        const found = inventoryMap.get(product._id.toString())
        if (found) return found
        return product._id.toString()
      }
      return '-'
    }
    if (typeof product === 'string') {
      const found = inventoryMap.get(product)
      if (found) return found
      if (/^[0-9a-fA-F]{24}$/.test(product)) {
        return 'Product (ID: ' + product.substring(0, 8) + '...)'
      }
      return product || '-'
    }
    return '-'
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || ''
    if (statusLower === 'paid') {
      return <Badge className="bg-green-500/15 text-green-300 border-green-500/30 px-3 py-1">Paid</Badge>
    } else if (statusLower === 'partial') {
      return <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 px-3 py-1">Partial</Badge>
    } else if (statusLower === 'overdue') {
      return <Badge className="bg-red-500/15 text-red-300 border-red-500/30 px-3 py-1">Overdue</Badge>
    }
    return <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/30 px-3 py-1">Unpaid</Badge>
  }

  const isCreditPurchase = invoice?.payable_id && invoice.payment_status !== 'paid'

  const handlePrint = async () => {
    if (!invoice) return
    
    setPrinting(true)
    try {
      // Resolve template design — fall back to the built-in default so
      // printing works even before any template has been seeded.
      let design: any = null
      try {
        const templateRes = await PurchaseInvoiceTemplateAPI.getDefault()
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
        console.warn('No saved purchase template — printing with the built-in default design.')
      }
      const finalDesign = design

      // Transform line items for Tax Invoice template
      const transformedLineItems = (invoice.line_items || []).map((item: any, index: number) => ({
        slNo: index + 1,
        product: item.product,
        description: item.description || '',
        quantity: item.quantity || item.qty || 0,
        qty: item.quantity || item.qty || 0,
        unit_cost: item.unit_cost || item.unitPrice || 0,
        unitPrice: item.unit_cost || item.unitPrice || 0,
        unit: item.unit || 'pcs',
        total: item.total || ((item.quantity || item.qty || 0) * (item.unit_cost || item.unitPrice || 0)),
        discount: item.discount || 0,
        vat: item.vat || 0,
      }))

      const invoiceData = {
        invoice,
        supplier: typeof invoice.vendor_id === 'object' ? invoice.vendor_id : suppliers.find(s => s._id === invoice.vendor_id),
        customer: undefined, // Purchase invoices use supplier instead
        lineItems: transformedLineItems,
      }

      // Dispatch by design format: element (canvas) designs → element renderer,
      // field-based designs → tax invoice renderer.
      if (Array.isArray(finalDesign?.elements)) {
        printInvoiceWithTemplate(finalDesign as any, invoiceData, inventoryMap)
      } else {
        printSimpleInvoiceTemplate(finalDesign, invoiceData, inventoryMap)
      }
    } catch (error: any) {
      console.error('Error printing invoice:', error)
      if (error.response?.status === 404) {
        message.warning('No default template found. Please set a default template first.')
      } else {
        message.error('Failed to print invoice. Please try again.')
      }
    } finally {
      setPrinting(false)
    }
  }

  const handleShare = async () => {
    if (!invoice) return
    
    setSharing(true)
    try {
      const res = await PurchaseInvoiceAPI.generateShareLink(invoice._id)
      const url = res.data.data.shareUrl
      await navigator.clipboard.writeText(url)
      setCopied(true)
      message.success('Share link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error: any) {
      console.error('Error generating share link:', error)
      message.error('Failed to generate share link. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  const handleApplyPayment = async (values: any) => {
    if (!invoice?._id) return

    setApplyingPayment(true)
    try {
      const paymentData: ApplyPaymentInput = {
        date: values.date ? dayjs(values.date).toISOString() : dayjs().toISOString(),
        amount: Number(values.amount) || 0,
        payment_method: values.payment_method || undefined,
        reference_number: values.reference_number || undefined,
        notes: values.notes || undefined,
      }

      const res = await PurchaseInvoiceAPI.applyPayment(invoice._id, paymentData)
      setInvoice(res.data.data.invoice)
      setPaymentModalOpen(false)
      paymentForm.resetFields()
      message.success(res.data.data.message || 'Payment applied successfully')
      
      // Refresh invoice data
      const invoiceRes = await PurchaseInvoiceAPI.get(invoice._id)
      setInvoice(invoiceRes.data.data)
    } catch (error: any) {
      console.error('Error applying payment:', error)
      message.error(error.response?.data?.message || 'Failed to apply payment')
    } finally {
      setApplyingPayment(false)
    }
  }

  const onCreatePaymentMethod = async (values: any) => {
    setCreatingPaymentMethod(true)
    try {
      const res = await PaymentMethodAPI.create(values)
      const updatedMethods = [...paymentMethods, res.data.data]
      setPaymentMethods(updatedMethods)
      paymentForm.setFieldsValue({ payment_method: res.data.data.name })
      setPaymentMethodModalOpen(false)
      paymentMethodForm.resetFields()
      message.success('Payment method created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create payment method')
    } finally {
      setCreatingPaymentMethod(false)
    }
  }

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
        <p className="text-muted-foreground mb-4">Purchase invoice not found</p>
        <Button onClick={() => navigate('/purchase-invoices/manage')}>Back to Purchase Invoices</Button>
      </div>
    )
  }

  // Handle both line_items and lineItems for backward compatibility
  const lineItems = invoice.line_items || []
  const subtotal = invoice.subtotal || 0
  const discount = invoice.discount || 0
  const taxAmount = invoice.tax_amount || 0
  const totalAmount = invoice.total_amount || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/purchase-invoices/manage')}
            className="border-border hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{invoice.invoice_number}</h1>
              <p className="text-sm text-muted-foreground mt-1">View purchase invoice details</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(invoice.payment_status)}
          <Button
            onClick={handlePrint}
            disabled={printing}
            variant="outline"
            className="border-border hover:bg-muted/50"
          >
            <Printer className="h-4 w-4 mr-2" />
            {printing ? 'Printing...' : 'Print Invoice'}
          </Button>
          <Button
            onClick={handleShare}
            disabled={sharing}
            variant="outline"
            className="border-border hover:bg-muted/50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                {sharing ? 'Generating...' : 'Share Link'}
              </>
            )}
          </Button>
          <Button
            onClick={() => navigate(`/purchase-invoices/edit/${invoice._id}`)}
            variant="outline"
            className="border-border hover:bg-muted/50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Invoice
          </Button>
          {isCreditPurchase && (
            <Button
              onClick={() => setPaymentModalOpen(true)}
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Apply Payment
            </Button>
          )}
        </div>
      </motion.div>

      {/* Details Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Basic Information
                </h2>
                
                <div>
                  <label className="text-sm font-semibold text-foreground">Invoice Number</label>
                  <p className="text-foreground mt-1">{invoice.invoice_number || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Vendor/Supplier</label>
                  <p className="text-foreground mt-1">{getSupplierName()}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Invoice Date</label>
                  <p className="text-foreground mt-1">
                    {invoice.invoice_date && dayjs(invoice.invoice_date).isValid()
                      ? dayjs(invoice.invoice_date).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Due Date</label>
                  <p className="text-foreground mt-1">
                    {invoice.due_date && dayjs(invoice.due_date).isValid()
                      ? dayjs(invoice.due_date).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Payment Status</label>
                  <div className="mt-1">{getStatusBadge(invoice.payment_status)}</div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Balance Due</label>
                  <p className="text-foreground mt-1 font-semibold">
                    {invoice.currency || 'AED'} {(invoice.balance_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Payment & Additional Info */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Payment & Additional Info
                </h2>

                {invoice.payment_method && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">Payment Method</label>
                    <p className="text-foreground mt-1 capitalize">{invoice.payment_method || '-'}</p>
                  </div>
                )}

                {invoice.reference_number && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">Reference Number</label>
                    <p className="text-foreground mt-1">{invoice.reference_number}</p>
                  </div>
                )}

                {invoice.payment_terms && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">Payment Terms</label>
                    <p className="text-muted-foreground mt-1">{invoice.payment_terms}</p>
                  </div>
                )}

                {invoice.notes && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">Notes</label>
                    <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}

                {invoice.trn && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">TRN</label>
                    <p className="text-foreground mt-1">{invoice.trn}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold text-foreground">Currency</label>
                  <p className="text-foreground mt-1">{invoice.currency || 'AED'}</p>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-4 md:col-span-2">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Line Items
                </h2>
                {lineItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No line items found for this invoice.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Product</th>
                          <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Description</th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Quantity</th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Unit Cost</th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item: any, idx: number) => {
                          const product = item.product || item.product_id
                          const description = item.description || ''
                          const quantity = item.quantity || item.qty || 0
                          const unitCost = item.unit_cost || item.unitPrice || 0
                          const total = item.total || (quantity * unitCost) || 0
                          
                          return (
                            <tr key={idx} className="border-b border-border">
                              <td className="py-2 px-3 text-foreground">{getProductName(product)}</td>
                              <td className="py-2 px-3 text-muted-foreground">{description || '-'}</td>
                              <td className="py-2 px-3 text-right text-foreground">{quantity}</td>
                              <td className="py-2 px-3 text-right text-foreground">
                                {invoice.currency || 'AED'} {unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right text-foreground font-semibold">
                                {invoice.currency || 'AED'} {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-4 md:col-span-2">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Totals
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Subtotal:</span>
                    <span className="font-semibold text-foreground">
                      {invoice.currency || 'AED'} {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-red-400">
                      <span>Discount:</span>
                      <span className="font-semibold">
                        - {invoice.currency || 'AED'} {discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between items-center text-green-400">
                      <span>Tax (VAT):</span>
                      <span className="font-semibold">
                        + {invoice.currency || 'AED'} {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-lg font-bold text-foreground">Total Amount:</span>
                    <span className="text-2xl font-bold text-primary">
                      {invoice.currency || 'AED'} {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4 md:col-span-2">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Additional Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Created At</label>
                    <p className="text-muted-foreground mt-1">
                      {invoice.createdAt && dayjs(invoice.createdAt).isValid()
                        ? dayjs(invoice.createdAt).format('YYYY-MM-DD HH:mm:ss')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Updated At</label>
                    <p className="text-muted-foreground mt-1">
                      {invoice.updatedAt && dayjs(invoice.updatedAt).isValid()
                        ? dayjs(invoice.updatedAt).format('YYYY-MM-DD HH:mm:ss')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Apply Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Apply Payment</DialogTitle>
            <DialogDescription>
              Record a payment for this invoice. Balance Due: {invoice.currency || 'AED'} {invoice.balance_due?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </DialogDescription>
          </DialogHeader>
          <Form
            form={paymentForm}
            layout="vertical"
            onFinish={handleApplyPayment}
            className="space-y-4"
            initialValues={{
              date: dayjs(),
              amount: invoice.balance_due || 0,
            }}
          >
            <Form.Item
              name="date"
              label={<span className="text-sm font-semibold text-foreground">Payment Date *</span>}
              rules={[{ required: true, message: 'Payment date is required' }]}
            >
              <DatePicker
                className="w-full h-11"
                format="YYYY-MM-DD"
                placeholder="Select payment date"
              />
            </Form.Item>
            <Form.Item
              name="amount"
              label={<span className="text-sm font-semibold text-foreground">Amount *</span>}
              rules={[
                { required: true, message: 'Amount is required' },
                {
                  validator: (_: any, value: any) => {
                    if (!value || value <= 0) {
                      return Promise.reject(new Error('Amount must be greater than 0'))
                    }
                    if (value > (invoice.balance_due || 0)) {
                      return Promise.reject(new Error(`Amount cannot exceed balance due of ${invoice.currency || 'AED'} ${invoice.balance_due?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">
                  {invoice.currency || 'AED'}
                </span>
                <AntInput
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.balance_due || 0}
                  placeholder="0.00"
                  className="w-full h-11 pl-12 border-border focus:border-primary focus:ring-primary"
                />
              </div>
            </Form.Item>
            <Form.Item
              name="payment_method"
              label={<span className="text-sm font-semibold text-foreground">Payment Method</span>}
            >
              <div className="flex gap-2">
                <Select
                  value={paymentMethodValue || undefined}
                  onValueChange={(value: string) => {
                    if (value === 'CREATE_NEW') {
                      setPaymentMethodModalOpen(true)
                    } else {
                      paymentForm.setFieldsValue({ payment_method: value })
                    }
                  }}
                  disabled={loadingPaymentMethods}
                >
                  <SelectTrigger className="h-11 flex-1 border-border bg-muted/50">
                    <SelectValue placeholder={loadingPaymentMethods ? "Loading..." : "Select payment method"} />
                  </SelectTrigger>
                  <SelectContent className="!z-[9999]" sideOffset={4}>
                    {loadingPaymentMethods ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        Loading payment methods...
                      </div>
                    ) : (
                      <>
                        {paymentMethods.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            No payment methods available
                          </div>
                        ) : (
                          paymentMethods.map((method) => (
                            <SelectItem key={method._id} value={method.name}>
                              {method.name}
                            </SelectItem>
                          ))
                        )}
                        <div className="border-t border-border p-1 mt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setPaymentMethodModalOpen(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Payment Method
                          </Button>
                        </div>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </Form.Item>
            <Form.Item
              name="reference_number"
              label={<span className="text-sm font-semibold text-foreground">Reference Number</span>}
            >
              <AntInput
                placeholder="Enter reference number (optional)"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <Form.Item
              name="notes"
              label={<span className="text-sm font-semibold text-foreground">Notes</span>}
            >
              <AntInput.TextArea
                rows={3}
                placeholder="Enter payment notes (optional)"
                className="border-border focus:border-primary focus:ring-primary resize-none"
              />
            </Form.Item>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPaymentModalOpen(false)
                  paymentForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={applyingPayment}>
                Apply Payment
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Payment Method Modal - Higher z-index to appear above Ant Design Modal */}
      <Dialog open={paymentMethodModalOpen} onOpenChange={setPaymentMethodModalOpen}>
        <DialogContent 
          className="sm:max-w-[500px]" 
          customZIndex={10001}
        >
          <DialogHeader>
            <DialogTitle>Create New Payment Method</DialogTitle>
            <DialogDescription>Add a new payment method to the system</DialogDescription>
          </DialogHeader>
          <Form
            form={paymentMethodForm}
            layout="vertical"
            onFinish={onCreatePaymentMethod}
            className="space-y-4"
          >
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Name *</span>}
              rules={[{ required: true, message: 'Payment method name is required' }]}
            >
              <AntInput
                placeholder="Enter payment method name"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <Form.Item
              name="description"
              label={<span className="text-sm font-semibold text-foreground">Description</span>}
            >
              <AntInput.TextArea
                rows={3}
                placeholder="Enter payment method description (optional)"
                className="border-border focus:border-primary focus:ring-primary resize-none"
              />
            </Form.Item>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPaymentMethodModalOpen(false)
                  paymentMethodForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creatingPaymentMethod}>
                Create Payment Method
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
