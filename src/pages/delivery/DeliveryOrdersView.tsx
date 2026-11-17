import { ArrowLeft, Truck, Edit, Download, File, Eye, Printer } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeliveryOrderAPI, SalesInvoiceAPI, CustomerAPI, InventoryAPI, DeliveryOrderTemplateAPI, type DeliveryOrderItem, type SalesInvoice, type Customer, type InventoryItem } from '@/services/api'
import { App, Spin, message as antdMessage, Modal } from 'antd'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { printSimpleInvoiceTemplate, printInvoiceWithTemplate } from '@/utils/templateRenderer'
import { DEFAULT_TEMPLATE } from './TemplatesManage'

export default function DeliveryOrdersView() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<DeliveryOrderItem | null>(null)
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)

  const customerMap = new Map<string, string>()
  customers.forEach(c => customerMap.set(c._id, c.name))

  const inventoryMap = new Map<string, string>()
  inventoryItems.forEach(item => inventoryMap.set(item._id, item.name || ''))

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      setLoading(true)
      try {
        const [orderRes, invoicesRes, customersRes, inventoryRes] = await Promise.all([
          DeliveryOrderAPI.get(id),
          SalesInvoiceAPI.list(),
          CustomerAPI.list(),
          InventoryAPI.list(),
        ])
        
        setOrder(orderRes.data.data)
        setSalesInvoices(invoicesRes.data.data)
        setCustomers(customersRes.data.data)
        setInventoryItems(inventoryRes.data.data)
      } catch (error) {
        console.error('Error fetching delivery order:', error)
        message.error('Failed to load delivery order')
        navigate('/delivery-orders/manage')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate, message])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (attachmentUrl && attachmentUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(attachmentUrl)
      }
    }
  }, [attachmentUrl])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Delivery order not found</p>
        <Button onClick={() => navigate('/delivery-orders/manage')}>Back to Delivery Orders</Button>
      </div>
    )
  }

  const getCustomerName = () => {
    const customerId = typeof order.customer === 'string' ? order.customer : order.customer?._id
    return typeof order.customer === 'object' && order.customer?.name 
      ? order.customer.name 
      : customerMap.get(customerId || '') || customerId || '-'
  }

  const getProductName = (product: string | any) => {
    // Handle both string ID and populated product object
    if (typeof product === 'object' && product !== null) {
      // Populated product object
      return product.name || product.serialNumber || product._id || '-'
    } else if (typeof product === 'string') {
      // String ID, use inventoryMap
      return inventoryMap.get(product) || product || '-'
    }
    return '-'
  }

  const getInvoiceNumber = () => {
    if (typeof order.invoiceNumber === 'object' && order.invoiceNumber !== null) {
      // Populated invoice object - backend populates with 'invoice_number invoiceNumber serialNumber date'
      // SalesInvoice model uses invoice_number (snake_case) as primary field
      return (order.invoiceNumber as any)?.invoice_number || 
             (order.invoiceNumber as any)?.invoiceNumber || 
             (order.invoiceNumber as any)?.serialNumber || 
             '-'
    } else if (typeof order.invoiceNumber === 'string') {
      // ObjectId string, find the invoice
      const invoice = salesInvoices.find(inv => inv._id === order.invoiceNumber)
      return invoice?.invoice_number || (invoice as any)?.invoiceNumber || '-'
    }
    return '-'
  }

  const handleViewAttachment = async (index: number = 0) => {
    if (!order) return
    
    const attachments = order.attachments || (order.attachment ? [order.attachment] : [])
    if (attachments.length === 0) return
    
    try {
      // Fetch attachment as blob to handle authentication
      const response = await DeliveryOrderAPI.downloadAttachment(order._id, index)
      const attachmentPath = attachments[index] || ''
      
      // Determine MIME type based on file extension for proper rendering
      let mimeType = 'application/octet-stream'
      if (isPdfFile(attachmentPath)) {
        mimeType = 'application/pdf'
      } else if (isImageFile(attachmentPath)) {
        const ext = getFileExtension(attachmentPath)
        const mimeTypes: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp',
          svg: 'image/svg+xml',
          bmp: 'image/bmp',
        }
        mimeType = mimeTypes[ext] || 'image/jpeg'
      }
      
      const blob = new Blob([response.data], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      setAttachmentUrl(url)
      setViewModalOpen(true)
    } catch (error) {
      console.error('Error loading attachment:', error)
      message.error('Failed to load attachment. Please try downloading instead.')
    }
  }

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const isImageFile = (filename: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
    return imageExtensions.includes(getFileExtension(filename))
  }

  const isPdfFile = (filename: string) => {
    return getFileExtension(filename) === 'pdf'
  }

  const getAttachments = () => {
    return order?.attachments || (order?.attachment ? [order.attachment] : [])
  }

  const handlePrint = async () => {
    if (!order) return

    setPrinting(true)
    try {
      // Resolve template design — fall back to the built-in default so
      // printing works even before any template has been seeded.
      let design: any = null
      try {
        const templateRes = await DeliveryOrderTemplateAPI.getDefault()
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
        console.warn('No saved delivery template — printing with the built-in default design.')
      }
      const finalDesign = design

      // Transform line items for Delivery Order template
      const transformedLineItems = (order.lineItems || []).map((item: any, index: number) => ({
        slNo: index + 1,
        product: item.product,
        description: getProductName(item.product) || '',
        quantity: item.qty || 0,
        qty: item.qty || 0,
        delivered: item.delivered ? 'Yes' : 'No',
        unit: 'pcs',
      }))

      const orderData = {
        invoice: {
          ...order,
          invoice_number: order.serialNumber,
          invoiceNumber: order.serialNumber,
          date: order.date,
          invoice_date: order.date,
          customer_id: order.customer,
          customer: order.customer,
          delivery_address: order.deliveryAddress,
          deliveryAddress: order.deliveryAddress,
        },
        customer: typeof order.customer === 'object' ? order.customer : customers.find(c => c._id === order.customer),
        supplier: undefined, // Delivery orders don't use suppliers
        lineItems: transformedLineItems,
      }

      // Use new structured template renderer (it will detect Delivery Order and use correct title)
      if (Array.isArray(finalDesign?.elements)) {
        printInvoiceWithTemplate(finalDesign as any, orderData, inventoryMap)
      } else {
        printSimpleInvoiceTemplate(finalDesign as any, orderData, inventoryMap)
      }
    } catch (error: any) {
      console.error('Error printing delivery order:', error)
      if (error.response?.status === 404) {
        message.warning('No default template found. Please set a default template first.')
      } else {
        message.error('Failed to print delivery order. Please try again.')
      }
    } finally {
      setPrinting(false)
    }
  }

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
            onClick={() => navigate('/delivery-orders/manage')}
            className="border-border hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{order.serialNumber}</h1>
              <p className="text-sm text-muted-foreground mt-1">View delivery order details</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            disabled={printing}
            variant="outline"
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            <Printer className="h-4 w-4 mr-2" />
            {printing ? 'Printing...' : 'Print'}
          </Button>
          <Button
            onClick={() => navigate(`/delivery-orders/edit/${order._id}`)}
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Order
          </Button>
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
                  <label className="text-sm font-semibold text-foreground">Serial Number</label>
                  <p className="text-foreground mt-1">{order.serialNumber}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Invoice Number</label>
                  <p className="text-foreground mt-1">{getInvoiceNumber()}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Customer</label>
                  <p className="text-foreground mt-1">{getCustomerName()}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Date</label>
                  <p className="text-foreground mt-1">
                    {order.date ? dayjs(order.date).format('YYYY-MM-DD') : '-'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Delivery Address</label>
                  <p className="text-muted-foreground mt-1">{order.deliveryAddress || '-'}</p>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-4 md:col-span-2">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Line Items
                </h2>
                {order.lineItems && order.lineItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Product</th>
                          <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Quantity</th>
                          <th className="text-center py-2 px-3 text-sm font-semibold text-foreground">Delivered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.lineItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-border">
                            <td className="py-2 px-3 text-foreground">{getProductName(item.product)}</td>
                            <td className="py-2 px-3 text-right text-foreground">{item.qty}</td>
                            <td className="py-2 px-3 text-center">
                              <Badge
                                className={cn(
                                  'px-3 py-1 text-xs font-medium rounded-full border',
                                  item.delivered
                                    ? 'bg-green-500/15 text-green-300 border-green-500/30'
                                    : 'bg-muted text-foreground border-border'
                                )}
                              >
                                {item.delivered ? 'Yes' : 'No'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4">No line items found</p>
                )}
              </div>

              {/* Attachments */}
              {((order.attachments && order.attachments.length > 0) || order.attachment) && (
                <div className="space-y-4 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      Attachments ({order.attachments?.length || (order.attachment ? 1 : 0)})
                    </h2>
                    {(order.attachments && order.attachments.length > 1) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await DeliveryOrderAPI.generateZipLink(order._id)
                            if (response.data.success) {
                              // Download zip file
                              const zipResponse = await DeliveryOrderAPI.downloadZip(response.data.data.token!)
                              const blob = new Blob([zipResponse.data])
                              const url = window.URL.createObjectURL(blob)
                              const link = document.createElement('a')
                              link.href = url
                              link.download = `delivery-order-${order.serialNumber}-attachments.zip`
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                              window.URL.revokeObjectURL(url)
                              
                              if (expiresAt) {
                                message.success(`Download started. Link expires: ${new Date(expiresAt).toLocaleString()}`)
                              } else {
                                message.success('Download started')
                              }
                            }
                          } catch (error: any) {
                            console.error('Error downloading zip:', error)
                            message.error(error.response?.data?.message || 'Failed to download attachments')
                          }
                        }}
                        className="border-border hover:bg-muted/50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All as ZIP
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3 pt-4">
                    {(order.attachments || (order.attachment ? [order.attachment] : [])).map((attachmentPath: string, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="p-2 rounded-lg bg-card border border-border">
                          <File className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {attachmentPath.split('/').pop() || `Attachment ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">File {index + 1} of {(order.attachments?.length || (order.attachment ? 1 : 0))}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewAttachment(index)}
                            className="border-border hover:bg-muted/50"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await DeliveryOrderAPI.downloadAttachment(order._id, index)
                                const blob = new Blob([response.data])
                                const url = window.URL.createObjectURL(blob)
                                const link = document.createElement('a')
                                link.href = url
                                link.download = attachmentPath.split('/').pop() || 'attachment'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                window.URL.revokeObjectURL(url)
                              } catch (error) {
                                console.error('Error downloading attachment:', error)
                                message.error('Failed to download attachment')
                              }
                            }}
                            className="border-border hover:bg-muted/50"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="space-y-4 md:col-span-2">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Additional Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Created At</label>
                    <p className="text-muted-foreground mt-1">
                      {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Updated At</label>
                    <p className="text-muted-foreground mt-1">
                      {dayjs(order.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Attachment View Modal */}
      <Modal
        open={viewModalOpen}
        onCancel={() => {
          setViewModalOpen(false)
          // Clean up blob URL to prevent memory leaks
          if (attachmentUrl && attachmentUrl.startsWith('blob:')) {
            window.URL.revokeObjectURL(attachmentUrl)
          }
          setAttachmentUrl(null)
        }}
        footer={null}
        width={900}
        style={{ maxWidth: '95vw' }}
        styles={{
          body: { maxHeight: 'calc(100vh - 200px)', overflow: 'hidden' }
        }}
        title={
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <span>View Attachment</span>
          </div>
        }
        centered
      >
        {attachmentUrl && order && (
          <div className="mt-4">
            {(() => {
              const attachments = getAttachments()
              const currentAttachment = attachments[0] || ''
              
              // Check file type and render accordingly
              if (isPdfFile(currentAttachment)) {
                return (
                  <div className="w-full overflow-hidden" style={{ height: '70vh', maxHeight: 'calc(100vh - 200px)' }}>
                    <iframe
                      src={`${attachmentUrl}#toolbar=1`}
                      className="w-full h-full border border-border rounded-lg"
                      title="PDF Viewer"
                      style={{ 
                        minHeight: '600px',
                        maxHeight: 'calc(100vh - 200px)',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  </div>
                )
              } else if (isImageFile(currentAttachment)) {
                return (
                  <div className="flex justify-center">
                    <img
                      src={attachmentUrl}
                      alt="Attachment"
                      className="max-w-full max-h-[70vh] object-contain rounded-lg"
                      onError={(e) => {
                        console.error('Error loading image:', e)
                        message.error('Failed to load image. Please try downloading instead.')
                      }}
                    />
                  </div>
                )
              } else {
                return (
                  <div className="text-center py-12">
                    <File className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      This file type cannot be previewed. Please download to view.
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          const attachments = getAttachments()
                          const response = await DeliveryOrderAPI.downloadAttachment(order!._id, 0)
                          const blob = new Blob([response.data])
                          const url = window.URL.createObjectURL(blob)
                          const link = document.createElement('a')
                          link.href = url
                          link.download = attachments[0]?.split('/').pop() || 'attachment'
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                          window.URL.revokeObjectURL(url)
                        } catch (error) {
                          console.error('Error downloading attachment:', error)
                          message.error('Failed to download attachment')
                        }
                      }}
                      className="mt-4"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )
              }
            })()}
          </div>
        )}
      </Modal>
    </div>
  )
}

