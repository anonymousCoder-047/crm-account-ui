import { ArrowLeft, Wallet, Edit, Download, FileText, Package } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ExpenseAPI, SupplierAPI, PaymentMethodAPI, type ExpenseItem, type Supplier, type PaymentMethod } from '@/services/api'
import { App, Spin, message as antdMessage, Badge } from 'antd'
import dayjs from 'dayjs'

export default function ExpensesView() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [expense, setExpense] = useState<ExpenseItem | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      setLoading(true)
      try {
        const [expenseRes, suppliersRes, paymentMethodsRes] = await Promise.all([
          ExpenseAPI.get(id),
          SupplierAPI.list(),
          PaymentMethodAPI.list(),
        ])
        
        setExpense(expenseRes.data.data)
        setSuppliers(suppliersRes.data.data)
        setPaymentMethods(paymentMethodsRes.data.data)
      } catch (error) {
        console.error('Error fetching expense:', error)
        message.error('Failed to load expense')
        navigate('/expenses/manage')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate, message])

  const getVendorName = () => {
    if (!expense?.vendor_id) return '-'
    if (typeof expense.vendor_id === 'object' && expense.vendor_id?.name) {
      return expense.vendor_id.name
    }
    const vendorId = typeof expense.vendor_id === 'string' ? expense.vendor_id : expense.vendor_id?._id
    const vendor = suppliers.find(s => s._id === vendorId)
    return vendor?.name || vendorId || '-'
  }

  const getPaymentMethodName = () => {
    if (!expense?.payment_method) return '-'
    // If it's already a name (string that's not an ObjectId), return it
    const paymentMethodValue = expense.payment_method
    // Check if it looks like an ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(paymentMethodValue)
    if (!isObjectId) {
      // It's already a name, return it
      return paymentMethodValue
    }
    // It's an ObjectId, try to find the payment method
    const paymentMethod = paymentMethods.find(pm => pm._id === paymentMethodValue)
    return paymentMethod?.name || paymentMethodValue
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || ''
    if (statusLower === 'paid') {
      return <Badge status="success" text="Paid" />
    } else if (statusLower === 'unpaid') {
      return <Badge status="error" text="Unpaid" />
    } else if (statusLower === 'partial') {
      return <Badge status="warning" text="Partial" />
    }
    return <Badge text={status || '-'} />
  }

  const handleDownloadAttachment = async (index: number) => {
    if (!expense?._id) return
    
    try {
      const response = await ExpenseAPI.downloadAttachment(expense._id, index)
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const attachmentPath = expense.attachments?.[index] || ''
      const fileName = attachmentPath.split('/').pop() || `attachment-${index + 1}`
      link.download = fileName
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      message.success('Attachment downloaded successfully')
    } catch (error: any) {
      console.error('Error downloading attachment:', error)
      message.error(error.response?.data?.message || 'Failed to download attachment')
    }
  }

  const handleDownloadAll = async () => {
    if (!expense?._id || !expense.attachments || expense.attachments.length === 0) return
    
    try {
      const response = await ExpenseAPI.generateZipLink(expense._id)
      if (response.data.success) {
        const { downloadUrl, expiresAt } = response.data.data
        
        if (expense.attachments.length === 1) {
          // Single file - direct download
          window.open(downloadUrl, '_blank')
        } else {
          // Multiple files - download zip
          const zipResponse = await ExpenseAPI.downloadZip(response.data.data.token!)
          const blob = new Blob([zipResponse.data], { type: 'application/zip' })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `expense-${expense.expense_id}-attachments.zip`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          
          message.success('All attachments downloaded successfully')
        }
      }
    } catch (error: any) {
      console.error('Error downloading attachments:', error)
      message.error(error.response?.data?.message || 'Failed to download attachments')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!expense) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Expense not found</p>
        <Button onClick={() => navigate('/expenses/manage')}>Back to Expenses</Button>
      </div>
    )
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
            onClick={() => navigate('/expenses/manage')}
            className="border-border hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{expense.expense_id}</h1>
              <p className="text-sm text-muted-foreground mt-1">View expense details</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => navigate(`/expenses/edit/${expense._id}`)}
          className="shadow-md hover:shadow-lg transition-shadow"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Expense
        </Button>
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
                  <label className="text-sm font-semibold text-foreground">Expense ID</label>
                  <p className="text-foreground mt-1">{expense.expense_id || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Category</label>
                  <p className="text-foreground mt-1">{expense.category || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Vendor</label>
                  <p className="text-foreground mt-1">{getVendorName()}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(expense.status)}</div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Details
                </h2>

                <div>
                  <label className="text-sm font-semibold text-foreground">Amount</label>
                  <p className="text-foreground mt-1">
                    {expense.currency || 'AED'} {expense.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Tax Amount (VAT)</label>
                  <p className="text-foreground mt-1">
                    {expense.currency || 'AED'} {expense.tax_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Total Amount</label>
                  <p className="text-foreground mt-1 font-semibold">
                    {expense.currency || 'AED'} {((expense.amount || 0) + (expense.tax_amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Date</label>
                  <p className="text-foreground mt-1">
                    {expense.expense_date && dayjs(expense.expense_date).isValid() 
                      ? dayjs(expense.expense_date).format('YYYY-MM-DD HH:mm:ss') 
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Payment Method</label>
                  <p className="text-foreground mt-1">{getPaymentMethodName()}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Reference Number</label>
                  <p className="text-foreground mt-1">{expense.reference_number || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Associated Account</label>
                  <p className="text-foreground mt-1">{expense.associated_account || '-'}</p>
                </div>

                {expense.payment_terms && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">Payment Terms</label>
                    <p className="text-muted-foreground mt-1">{expense.payment_terms}</p>
                  </div>
                )}

                {expense.notes && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">Notes</label>
                    <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{expense.notes}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {expense.description && (
                <div className="space-y-4 md:col-span-2">
                  <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                    Description
                  </h2>
                  <div 
                    className="text-muted-foreground mt-1 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: expense.description }}
                  />
                </div>
              )}

              {/* Attachments */}
              {expense.attachments && expense.attachments.length > 0 && (
                <div className="space-y-4 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      Attachments ({expense.attachments.length})
                    </h2>
                    {expense.attachments.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadAll}
                        className="flex items-center gap-2"
                      >
                        <Package className="h-4 w-4" />
                        Download All
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expense.attachments.map((attachment, index) => {
                      const fileName = attachment.split('/').pop() || `attachment-${index + 1}`
                      const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)
                      const isPdf = fileExt === 'pdf'
                      
                      return (
                        <div
                          key={index}
                          className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded bg-muted">
                              {isImage ? (
                                <FileText className="h-5 w-5 text-blue-400" />
                              ) : isPdf ? (
                                <FileText className="h-5 w-5 text-red-400" />
                              ) : (
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate" title={fileName}>
                                {fileName}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadAttachment(index)}
                                className="mt-2 p-0 h-auto text-primary hover:text-primary/80"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
                      {expense.createdAt && dayjs(expense.createdAt).isValid()
                        ? dayjs(expense.createdAt).format('YYYY-MM-DD HH:mm:ss')
                        : '-'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Updated At</label>
                    <p className="text-muted-foreground mt-1">
                      {expense.updatedAt && dayjs(expense.updatedAt).isValid()
                        ? dayjs(expense.updatedAt).format('YYYY-MM-DD HH:mm:ss')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
