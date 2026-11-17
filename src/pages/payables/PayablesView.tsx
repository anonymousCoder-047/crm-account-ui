import { ArrowLeft, CreditCard, Edit, Plus, DollarSign, Calendar, FileText, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PayableAPI, SupplierAPI, PaymentMethodAPI, type PayableItem, type Supplier, type PaymentInput, type PaymentMethod } from '@/services/api'
import { App, Spin, message as antdMessage, Modal, Form, DatePicker, Input as AntInput } from 'antd'
import dayjs from 'dayjs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function PayablesView() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [payable, setPayable] = useState<PayableItem | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [paymentForm] = Form.useForm()
  const [paymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false)
  const [creatingPaymentMethod, setCreatingPaymentMethod] = useState(false)
  const [paymentMethodForm] = Form.useForm()
  const paymentMethodValue = Form.useWatch('paymentMethod', paymentForm)

  const supplierMap = new Map<string, string>()
  suppliers.forEach(s => supplierMap.set(s._id, s.name))

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      setLoading(true)
      try {
        const [payableRes, suppliersRes] = await Promise.all([
          PayableAPI.get(id),
          SupplierAPI.list(),
        ])
        
        setPayable(payableRes.data.data)
        setSuppliers(suppliersRes.data.data)
      } catch (error) {
        console.error('Error fetching payable:', error)
        message.error('Failed to load payable')
        navigate('/payables/manage')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate, message])

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setLoadingPaymentMethods(true)
      try {
        const res = await PaymentMethodAPI.list({ activeOnly: true })
        if (res.data && res.data.success && res.data.data) {
          setPaymentMethods(res.data.data)
        } else {
          console.error('Unexpected response structure:', res.data)
          setPaymentMethods([])
        }
      } catch (error: any) {
        console.error('Error fetching payment methods:', error)
        message.error(error.response?.data?.message || 'Failed to load payment methods')
        setPaymentMethods([])
      } finally {
        setLoadingPaymentMethods(false)
      }
    }
    fetchPaymentMethods()
  }, [message])

  const getSupplierName = () => {
    if (!payable?.vendor_id) return 'N/A'
    const vendorId = typeof payable.vendor_id === 'string' ? payable.vendor_id : payable.vendor_id?._id
    return typeof payable.vendor_id === 'object' && payable.vendor_id?.name 
      ? payable.vendor_id.name 
      : supplierMap.get(vendorId || '') || vendorId || 'N/A'
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      unpaid: { label: 'Unpaid', color: 'bg-red-500/15 text-red-300 border-red-500/30', icon: XCircle },
      partial: { label: 'Partial', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', icon: Clock },
      paid: { label: 'Paid', color: 'bg-green-500/15 text-green-300 border-green-500/30', icon: CheckCircle2 },
      overdue: { label: 'Overdue', color: 'bg-red-500/15 text-red-300 border-red-500/30', icon: AlertCircle },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid
    const Icon = config.icon
    return (
      <Badge className={`${config.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const handleRecordPayment = async (values: any) => {
    if (!id) return
    
    setRecordingPayment(true)
    try {
      const paymentData: PaymentInput = {
        date: values.date.toISOString(),
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
        referenceNumber: values.referenceNumber,
        notes: values.notes,
      }
      
      const res = await PayableAPI.recordPayment(id, paymentData)
      setPayable(res.data.data)
      setPaymentModalOpen(false)
      paymentForm.resetFields()
      message.success('Payment recorded successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to record payment')
    } finally {
      setRecordingPayment(false)
    }
  }

  const onCreatePaymentMethod = async (values: any) => {
    setCreatingPaymentMethod(true)
    try {
      const res = await PaymentMethodAPI.create(values)
      const updatedMethods = [...paymentMethods, res.data.data]
      setPaymentMethods(updatedMethods)
      paymentForm.setFieldsValue({ paymentMethod: res.data.data.name })
      setPaymentMethodModalOpen(false)
      paymentMethodForm.resetFields()
      message.success('Payment method created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create payment method')
    } finally {
      setCreatingPaymentMethod(false)
    }
  }

  const handleClosePayable = async () => {
    if (!id) return
    
    Modal.confirm({
      title: 'Close Payable',
      content: 'Are you sure you want to close this payable? This will mark it as fully paid.',
      onOk: async () => {
        try {
          const res = await PayableAPI.close(id)
          setPayable(res.data.data)
          message.success('Payable closed successfully')
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to close payable')
        }
      },
    })
  }

  const totalPaid = payable?.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!payable) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Payable not found</p>
        <Button onClick={() => navigate('/payables/manage')}>Back to Payables</Button>
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
            onClick={() => navigate('/payables/manage')}
            className="border-border hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Accounts Payable Details</h1>
              <p className="text-sm text-muted-foreground mt-1">Bill Number: {payable.bill_number}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(payable.status)}
          <Button
            onClick={() => navigate(`/payables/edit/${payable._id}`)}
            variant="outline"
            className="border-border hover:bg-muted/50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {payable.status !== 'paid' && (
            <>
              <Button
                onClick={() => setPaymentModalOpen(true)}
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
              {payable.balance_due === 0 && (
                <Button
                  onClick={handleClosePayable}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Close
                </Button>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {payable.currency || 'AED'} {(payable.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tax Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {payable.currency || 'AED'} {(payable.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {payable.currency || 'AED'} {(totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {payable.currency || 'AED'} {(payable.balance_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground">Vendor/Supplier</label>
              <p className="text-foreground mt-1">{getSupplierName()}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Bill Number</label>
              <p className="text-foreground mt-1">{payable.bill_number}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Status</label>
              <div className="mt-1">{getStatusBadge(payable.status)}</div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Currency</label>
              <p className="text-foreground mt-1">{payable.currency}</p>
            </div>
          </CardContent>
        </Card>

        {/* Dates & Terms */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Dates & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground">Bill Date</label>
              <p className="text-foreground mt-1">
                {dayjs(payable.bill_date).format('YYYY-MM-DD')}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Due Date</label>
              <p className={`mt-1 ${dayjs(payable.due_date).isBefore(dayjs()) && payable.status !== 'paid' ? 'text-red-400 font-semibold' : 'text-foreground'}`}>
                {dayjs(payable.due_date).format('YYYY-MM-DD')}
                {dayjs(payable.due_date).isBefore(dayjs()) && payable.status !== 'paid' && (
                  <span className="ml-2 text-xs">(Overdue)</span>
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Payment Terms</label>
              <p className="text-muted-foreground mt-1">{payable.payment_terms || '-'}</p>
            </div>
            {payable.notes && (
              <div>
                <label className="text-sm font-semibold text-foreground">Notes</label>
                <p className="text-muted-foreground mt-1">{payable.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payable.payments && payable.payments.length > 0 ? (
            <div className="space-y-3">
              {payable.payments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-400" />
                      <span className="font-semibold text-foreground">
                        {payable.currency || 'AED'} {(payment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      <span>{dayjs(payment.date).format('YYYY-MM-DD')}</span>
                      {payment.paymentMethod && <span className="ml-2">• {payment.paymentMethod}</span>}
                      {payment.referenceNumber && <span className="ml-2">• Ref: {payment.referenceNumber}</span>}
                    </div>
                    {payment.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">{payment.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p>No payments recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Modal
        title="Record Payment"
        open={paymentModalOpen}
        onCancel={() => {
          setPaymentModalOpen(false)
          paymentForm.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handleRecordPayment}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="date"
              label="Payment Date"
              rules={[{ required: true, message: 'Please select payment date' }]}
              initialValue={dayjs()}
            >
              <DatePicker
                className="w-full"
                format="YYYY-MM-DD"
              />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Payment Amount"
              rules={[
                { required: true, message: 'Please enter payment amount' },
                {
                  validator: (_, value) => {
                    if (!value || value === '') {
                      return Promise.reject(new Error('Please enter payment amount'))
                    }
                    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : Number(value)
                    if (isNaN(numValue) || numValue <= 0) {
                      return Promise.reject(new Error('Amount must be greater than 0'))
                    }
                    const balanceDue = payable?.balance_due || 0
                    // Round both values to 2 decimal places to avoid floating-point precision issues
                    const roundedAmount = Math.round(numValue * 100) / 100
                    const roundedBalance = Math.round(balanceDue * 100) / 100
                    // Use a small epsilon (0.005) to account for floating-point precision issues
                    // This allows payments that are equal to or slightly less than balance due
                    if (roundedAmount > roundedBalance + 0.005) {
                      return Promise.reject(new Error(`Payment amount cannot exceed balance due (${(balanceDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${payable?.currency || 'AED'})`))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <AntInput
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                prefix={payable?.currency || 'AED' + ' '}
              />
            </Form.Item>
          </div>
          <Form.Item
            name="paymentMethod"
            label="Payment Method"
          >
            <div className="flex gap-2">
              <Select
                value={paymentMethodValue || undefined}
                onValueChange={(value: string) => {
                  if (value === 'CREATE_NEW') {
                    setPaymentMethodModalOpen(true)
                  } else {
                    paymentForm.setFieldsValue({ paymentMethod: value })
                  }
                }}
                modal={false}
                disabled={loadingPaymentMethods}
                className="flex-1"
              >
                <SelectTrigger className="h-11 border-border bg-muted/50">
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
            name="referenceNumber"
            label="Reference Number"
          >
            <AntInput placeholder="Enter reference number (optional)" />
          </Form.Item>
          <Form.Item
            name="notes"
            label="Notes"
          >
            <AntInput.TextArea rows={3} placeholder="Enter any additional notes (optional)" />
          </Form.Item>
          <div className="flex justify-end gap-2 pt-4">
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
            <Button type="submit" loading={recordingPayment}>
              Record Payment
            </Button>
          </div>
        </Form>
      </Modal>

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
