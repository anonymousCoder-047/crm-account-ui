import { Form, DatePicker, Input as AntInput, App, message as antdMessage, Spin, Switch, Upload, Select as AntSelect } from 'antd'
import { ArrowLeft, Wallet, Plus, Upload as UploadIcon } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import { ExpenseAPI, SupplierAPI, CurrencyAPI, PaymentMethodAPI, PaymentStatusAPI, type ExpenseInput, type Supplier, type Currency, type CurrencyInput, type PaymentMethod, type PaymentStatus, type PaymentStatusInput } from '@/services/api'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { cn } from '@/lib/utils'

// Expense categories
const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Travel',
  'Supplies',
  'Salaries',
  'Marketing',
  'Insurance',
  'Maintenance',
  'Professional Services',
  'Office Supplies',
  'Telecommunications',
  'Other',
]

// Expense accounts
const EXPENSE_ACCOUNTS = [
  'Rent Expense',
  'Utilities Expense',
  'Travel Expense',
  'Office Supplies Expense',
  'Salaries Expense',
  'Marketing Expense',
  'Insurance Expense',
  'Maintenance Expense',
  'Professional Services Expense',
  'Telecommunications Expense',
  'Other Expense',
]

// Store restoration state outside component to persist across renders without causing re-renders
const restorationState = { isRestoring: false, lastRestoredTab: '' }

export default function ExpensesCreate() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const [loading, setLoading] = useState(false)
  const [loadingItem, setLoadingItem] = useState(isEditMode)
  const [form] = Form.useForm<ExpenseInput>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('basic')
  const [selectKey, setSelectKey] = useState<number>(0)

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [creatingSupplier, setCreatingSupplier] = useState(false)
  const [supplierForm] = Form.useForm()

  // Currencies state
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loadingCurrencies, setLoadingCurrencies] = useState(false)
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false)
  const [creatingCurrency, setCreatingCurrency] = useState(false)
  const [currencyForm] = Form.useForm()

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  const [paymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false)
  const [creatingPaymentMethod, setCreatingPaymentMethod] = useState(false)
  const [paymentMethodForm] = Form.useForm()

  // Payment statuses state
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([])
  const [loadingPaymentStatuses, setLoadingPaymentStatuses] = useState(false)
  const [paymentStatusModalOpen, setPaymentStatusModalOpen] = useState(false)
  const [creatingPaymentStatus, setCreatingPaymentStatus] = useState(false)
  const [paymentStatusForm] = Form.useForm()

  // Track if tax amount was manually edited
  const [taxManuallyEdited, setTaxManuallyEdited] = useState(false)

  // Store actual file objects for upload
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])

  // Watch form values
  const categoryValue = Form.useWatch('category', form)
  const vendorIdValue = Form.useWatch('vendor_id', form)
  const amountValue = Form.useWatch('amount', form)
  const taxAmountValue = Form.useWatch('tax_amount', form)
  const currencyValue = Form.useWatch('currency', form)
  const paymentMethodValue = Form.useWatch('payment_method', form)
  const statusValue = Form.useWatch('status', form)
  const associatedAccountValue = Form.useWatch('associated_account', form)
  const descriptionValue = Form.useWatch('description', form)

  // Helper to check if status requires payment method fields (paid, partial, etc.)
  const isPaidStatus = useMemo(() => {
    if (!statusValue) return false
    const statusLower = String(statusValue).toLowerCase()
    // Show payment fields for: paid, partial, or any status that contains "paid" or "partial"
    return statusLower === 'paid' || 
           statusLower === 'partial' || 
           statusLower.includes('paid') || 
           statusLower.includes('partial')
  }, [statusValue])

  // Helper to check if status is unpaid (case-insensitive)
  const isUnpaidStatus = useMemo(() => {
    if (!statusValue) return false
    const statusLower = String(statusValue).toLowerCase()
    // Only show unpaid message if it's explicitly unpaid and not paid/partial
    return (statusLower === 'unpaid' || statusLower.includes('unpaid')) && 
           !statusLower.includes('paid') && 
           !statusLower.includes('partial')
  }, [statusValue])

  // Centralized form state that persists across tab switches
  const [formData, setFormData] = useState<Partial<ExpenseInput>>({
    expense_id: '',
    category: undefined,
    vendor_id: undefined,
    amount: undefined,
    currency: 'AED',
    expense_date: undefined,
    payment_method: undefined,
    reference_number: '',
    tax_amount: undefined,
    description: '',
    attachments: [],
    associated_account: undefined,
    status: 'paid',
  })

  const [loadedItemData, setLoadedItemData] = useState<Partial<ExpenseInput> | null>(null)

  // Auto-generate Expense ID
  const generateExpenseId = async () => {
    try {
      const res = await ExpenseAPI.list()
      const count = res.data.data.length
      const nextNumber = (count + 1).toString().padStart(4, '0')
      return `EXP-${nextNumber}`
    } catch (error) {
      // Fallback to timestamp-based if API fails
      const timestamp = Date.now().toString(36).toUpperCase()
      return `EXP-${timestamp}`
    }
  }

  // Fetch existing item data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchItem = async () => {
        setLoadingItem(true)
        try {
          const res = await ExpenseAPI.get(id)
          const item = res.data.data
          
          const vendorId = typeof item.vendor_id === 'string' 
            ? item.vendor_id 
            : (item.vendor_id as any)?._id || (item.vendor_id as any)?.id
          
          const initialData: Partial<ExpenseInput> = {
            expense_id: item.expense_id,
            category: item.category,
            vendor_id: vendorId,
            amount: item.amount,
            currency: item.currency,
            expense_date: item.expense_date,
            payment_method: item.payment_method,
            reference_number: item.reference_number || '',
            tax_amount: item.tax_amount || 0,
            description: item.description || '',
            attachments: item.attachments || [],
            associated_account: item.associated_account,
            status: item.status || 'paid',
            payment_terms: item.payment_terms || '',
            notes: item.notes || '',
          }
          setLoadedItemData(initialData)
          setFormData(initialData)
        } catch (error) {
          console.error('Error fetching expense:', error)
          message.error('Failed to load expense')
          navigate('/expenses/manage')
        } finally {
          setLoadingItem(false)
        }
      }
      fetchItem()
    } else {
      generateExpenseId().then((expenseId) => {
        const initialData: Partial<ExpenseInput> = {
          expense_id: expenseId,
          category: undefined,
          vendor_id: undefined,
          amount: undefined,
          currency: 'AED',
          expense_date: dayjs(),
          payment_method: undefined,
          reference_number: '',
          tax_amount: 0,
          description: '',
          attachments: [],
          associated_account: undefined,
          status: 'paid',
          payment_terms: '',
          notes: '',
        }
        setFormData(initialData)
        form.setFieldsValue(initialData)
      })
    }
  }, [id, isEditMode, form, navigate, message])

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true)
      try {
        const res = await SupplierAPI.list()
        setSuppliers(res.data.data)
      } catch (error) {
        console.error('Error fetching suppliers:', error)
      } finally {
        setLoadingSuppliers(false)
      }
    }
    fetchSuppliers()
  }, [])

  // Fetch currencies
  useEffect(() => {
    const fetchCurrencies = async () => {
      setLoadingCurrencies(true)
      try {
        const res = await CurrencyAPI.list()
        setCurrencies(res.data.data)
      } catch (error) {
        console.error('Error fetching currencies:', error)
      } finally {
        setLoadingCurrencies(false)
      }
    }
    fetchCurrencies()
  }, [])

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setLoadingPaymentMethods(true)
      try {
        const res = await PaymentMethodAPI.list()
        setPaymentMethods(res.data.data)
      } catch (error) {
        console.error('Error fetching payment methods:', error)
      } finally {
        setLoadingPaymentMethods(false)
      }
    }
    fetchPaymentMethods()
  }, [])

  // Fetch payment statuses
  useEffect(() => {
    const fetchPaymentStatuses = async () => {
      setLoadingPaymentStatuses(true)
      try {
        const res = await PaymentStatusAPI.list({ activeOnly: true })
        setPaymentStatuses(res.data.data)
      } catch (error) {
        console.error('Error fetching payment statuses:', error)
      } finally {
        setLoadingPaymentStatuses(false)
      }
    }
    fetchPaymentStatuses()
  }, [])

  // Helper function to convert formData to form values format
  const prepareFormValues = (data: Partial<ExpenseInput>) => {
    const valuesToRestore: any = { ...data }
    
    if (valuesToRestore.expense_date && typeof valuesToRestore.expense_date === 'string') {
      valuesToRestore.expense_date = dayjs(valuesToRestore.expense_date)
    }
    
    if (valuesToRestore.amount !== undefined && valuesToRestore.amount !== null) {
      valuesToRestore.amount = Number(valuesToRestore.amount)
    }
    
    if (valuesToRestore.tax_amount !== undefined && valuesToRestore.tax_amount !== null) {
      valuesToRestore.tax_amount = Number(valuesToRestore.tax_amount)
    }
    
    return valuesToRestore
  }

  // Helper function to restore form values from central state
  const restoreFormValues = (data: Partial<ExpenseInput>, tab?: string) => {
    if (!data.expense_id || restorationState.isRestoring) return
    
    if (tab && restorationState.lastRestoredTab === tab) return
    
    restorationState.isRestoring = true
    if (tab) restorationState.lastRestoredTab = tab
    
    const valuesToRestore = prepareFormValues(data)
    form.setFieldsValue(valuesToRestore)
    
    setTimeout(() => {
      setSelectKey(selectKey + 1)
    }, 50)
    
    setTimeout(() => {
      restorationState.isRestoring = false
    }, 50)
  }

  // Sync form values to central state whenever form changes
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    if (restorationState.isRestoring) return
    
    setFormData((prev: Partial<ExpenseInput>) => {
      const updated: any = { ...prev, ...allValues }
      
      if (updated.expense_date && dayjs.isDayjs(updated.expense_date)) {
        updated.expense_date = updated.expense_date.toISOString()
      }
      
      if (updated.amount !== undefined && updated.amount !== null) {
        updated.amount = Number(updated.amount)
      }
      
      if (updated.tax_amount !== undefined && updated.tax_amount !== null) {
        updated.tax_amount = Number(updated.tax_amount)
      }
      
      return updated as Partial<ExpenseInput>
    })
  }

  // Restore form values from central state when tab changes
  useEffect(() => {
    if (formData.expense_id && !restorationState.isRestoring) {
      restoreFormValues(formData, activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Calculate total amount
  const totalAmount = useMemo(() => {
    const amount = Number(amountValue || 0)
    const tax = Number(taxAmountValue || 0)
    return amount + tax
  }, [amountValue, taxAmountValue])

  // Auto-calculate 5% VAT when amount changes (if tax wasn't manually edited)
  useEffect(() => {
    // Don't auto-calculate if in edit mode and tax already has a value (preserve existing tax)
    if (isEditMode && taxAmountValue && taxAmountValue > 0) {
      setTaxManuallyEdited(true)
      return
    }
    
    if (!taxManuallyEdited && amountValue) {
      const amount = Number(amountValue)
      if (amount > 0) {
        const calculatedTax = amount * 0.05 // 5% VAT
        const roundedTax = Number(calculatedTax.toFixed(2))
        // Update both form and formData to ensure the value is displayed
        form.setFieldsValue({ tax_amount: roundedTax })
        setFormData((prev) => ({ ...prev, tax_amount: roundedTax }))
      } else {
        form.setFieldsValue({ tax_amount: 0 })
        setFormData((prev) => ({ ...prev, tax_amount: 0 }))
      }
    }
    // Reset manual edit flag when amount becomes 0 or empty
    if (!amountValue || Number(amountValue) === 0) {
      setTaxManuallyEdited(false)
    }
  }, [amountValue, taxManuallyEdited, form, isEditMode, taxAmountValue])

  // Create supplier
  const onCreateSupplier = async (values: any) => {
    setCreatingSupplier(true)
    try {
      const res = await SupplierAPI.create(values)
      setSuppliers([...suppliers, res.data.data])
      form.setFieldsValue({ vendor_id: res.data.data._id })
      setFormData((prev) => ({ ...prev, vendor_id: res.data.data._id }))
      setSupplierModalOpen(false)
      supplierForm.resetFields()
      message.success('Supplier created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create supplier')
    } finally {
      setCreatingSupplier(false)
    }
  }

  // Create currency
  const onCreateCurrency = async (values: CurrencyInput) => {
    setCreatingCurrency(true)
    try {
      const res = await CurrencyAPI.create(values)
      setCurrencies([...currencies, res.data.data])
      form.setFieldsValue({ currency: res.data.data.code })
      setFormData((prev) => ({ ...prev, currency: res.data.data.code }))
      setCurrencyModalOpen(false)
      currencyForm.resetFields()
      message.success('Currency created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create currency')
    } finally {
      setCreatingCurrency(false)
    }
  }

  // Create payment method
  const onCreatePaymentMethod = async (values: any) => {
    setCreatingPaymentMethod(true)
    try {
      const res = await PaymentMethodAPI.create(values)
      setPaymentMethods([...paymentMethods, res.data.data])
      form.setFieldsValue({ payment_method: res.data.data._id })
      setFormData((prev) => ({ ...prev, payment_method: res.data.data._id }))
      setPaymentMethodModalOpen(false)
      paymentMethodForm.resetFields()
      message.success('Payment method created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create payment method')
    } finally {
      setCreatingPaymentMethod(false)
    }
  }

  // Create payment status
  const onCreatePaymentStatus = async (values: PaymentStatusInput) => {
    setCreatingPaymentStatus(true)
    try {
      const res = await PaymentStatusAPI.create(values)
      setPaymentStatuses([...paymentStatuses, res.data.data])
      form.setFieldsValue({ status: res.data.data.name.toLowerCase() })
      setFormData((prev) => ({ ...prev, status: res.data.data.name.toLowerCase() as 'paid' | 'unpaid' }))
      setPaymentStatusModalOpen(false)
      paymentStatusForm.resetFields()
      message.success('Payment status created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create payment status')
    } finally {
      setCreatingPaymentStatus(false)
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const formValues = form.getFieldsValue(true)
      const allFormValues = { ...formData, ...formValues, ...values }
      
      setFormData((prev: any) => ({ ...prev, ...allFormValues }))
      
      // Create FormData for file upload
      const formDataPayload = new FormData()
      formDataPayload.append('expense_id', allFormValues.expense_id || formData.expense_id || '')
      formDataPayload.append('category', allFormValues.category || formData.category || '')
      if (allFormValues.vendor_id || formData.vendor_id) {
        formDataPayload.append('vendor_id', allFormValues.vendor_id || formData.vendor_id)
      }
      formDataPayload.append('amount', String(Number(allFormValues.amount || formData.amount || 0)))
      formDataPayload.append('currency', allFormValues.currency || formData.currency || 'AED')
      formDataPayload.append('expense_date', (allFormValues.expense_date || formData.expense_date)?.toISOString?.() || (allFormValues.expense_date || formData.expense_date) || new Date().toISOString())
      if (allFormValues.payment_method || formData.payment_method) {
        formDataPayload.append('payment_method', allFormValues.payment_method || formData.payment_method)
      }
      if (allFormValues.reference_number || formData.reference_number) {
        formDataPayload.append('reference_number', allFormValues.reference_number || formData.reference_number || '')
      }
      formDataPayload.append('tax_amount', String(Number(allFormValues.tax_amount || formData.tax_amount || 0)))
      if (allFormValues.description || formData.description) {
        formDataPayload.append('description', allFormValues.description || formData.description || '')
      }
      formDataPayload.append('associated_account', allFormValues.associated_account || formData.associated_account || '')
      formDataPayload.append('status', allFormValues.status || formData.status || 'paid')
      if (allFormValues.payment_terms || formData.payment_terms) {
        formDataPayload.append('payment_terms', allFormValues.payment_terms || formData.payment_terms || '')
      }
      if (allFormValues.notes || formData.notes) {
        formDataPayload.append('notes', allFormValues.notes || formData.notes || '')
      }
      
      // Append multiple files
      attachmentFiles.forEach((file) => {
        formDataPayload.append('attachments', file)
      })
      
      if (isEditMode && id) {
        await ExpenseAPI.update(id, formDataPayload)
        message.success('Expense updated successfully')
      } else {
        await ExpenseAPI.create(formDataPayload)
        message.success('Expense created successfully')
      }
      navigate('/expenses/manage')
    } catch (error: any) {
      message.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} expense`)
    } finally {
      setLoading(false)
    }
  }

  if (loadingItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-4"
      >
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
            <h1 className="text-3xl font-bold text-foreground">{isEditMode ? 'Edit Expense' : 'Create Expense'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isEditMode ? 'Update expense record' : 'Add a new expense record'}</p>
          </div>
        </div>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              onValuesChange={handleFormValuesChange}
              initialValues={isEditMode && loadedItemData ? prepareFormValues(loadedItemData) : formData}
              className="space-y-6"
              preserve={true}
              key={isEditMode && loadedItemData ? `edit-${loadedItemData.expense_id}` : 'create'}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="payment">Payment & Accounting</TabsTrigger>
                  <TabsTrigger value="details">Additional Details</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="expense_id"
                      label={<span className="text-sm font-semibold text-foreground">Expense ID</span>}
                      rules={[{ required: true, message: 'Expense ID is required' }]}
                    >
                      <Input
                        placeholder="Auto-generated"
                        className="h-11 border-border focus:border-primary focus:ring-primary bg-muted/50"
                        readOnly
                      />
                    </Form.Item>

                    <Form.Item
                      name="expense_date"
                      label={<span className="text-sm font-semibold text-foreground">Expense Date *</span>}
                      rules={[{ required: true, message: 'Please select expense date' }]}
                    >
                      <DatePicker
                        className="w-full h-11 border-border focus-within:border-primary focus-within:ring-primary [&_.ant-picker-input>input]:h-11"
                        placeholder="Select date and time"
                        format="YYYY-MM-DD HH:mm:ss"
                        showTime={{ format: 'HH:mm:ss' }}
                      />
                    </Form.Item>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="category"
                      label={<span className="text-sm font-semibold text-foreground">Category *</span>}
                      rules={[{ required: true, message: 'Please select a category' }]}
                    >
                      <AntSelect
                        key={`category-${selectKey}-${categoryValue || 'empty'}`}
                        showSearch
                        placeholder="Select category"
                        filterOption={(input: string, option: any) =>
                          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        optionFilterProp="label"
                        value={categoryValue || undefined}
                        onChange={(value: string) => {
                          form.setFieldsValue({ category: value })
                          setFormData((prev) => ({ ...prev, category: value }))
                        }}
                        options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
                        style={{ height: 44, minHeight: 44 }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="associated_account"
                      label={<span className="text-sm font-semibold text-foreground">Expense Account *</span>}
                      rules={[{ required: true, message: 'Please select an expense account' }]}
                    >
                      <AntSelect
                        key={`account-${selectKey}-${associatedAccountValue || 'empty'}`}
                        showSearch
                        placeholder="Select expense account"
                        filterOption={(input: string, option: any) =>
                          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        optionFilterProp="label"
                        value={associatedAccountValue || undefined}
                        onChange={(value: string) => {
                          form.setFieldsValue({ associated_account: value })
                          setFormData((prev) => ({ ...prev, associated_account: value }))
                        }}
                        options={EXPENSE_ACCOUNTS.map((a) => ({ value: a, label: a }))}
                        style={{ height: 44, minHeight: 44 }}
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="vendor_id"
                    label={<span className="text-sm font-semibold text-foreground">Vendor (Optional)</span>}
                  >
                    <div className="flex gap-2">
                      <AntSelect
                        showSearch
                        placeholder={loadingSuppliers ? "Loading..." : "Select vendor (optional)"}
                        filterOption={(input: string, option: any) =>
                          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        optionFilterProp="label"
                        value={vendorIdValue || undefined}
                        onChange={(value: string) => {
                          form.setFieldsValue({ vendor_id: value })
                          setFormData((prev) => ({ ...prev, vendor_id: value }))
                        }}
                        disabled={loadingSuppliers}
                        loading={loadingSuppliers}
                        notFoundContent="No suppliers found"
                        options={suppliers.map((s) => ({ value: s._id, label: s.name }))}
                        style={{ flex: 1, height: 44, minHeight: 44 }}
                        getPopupContainer={(node) => node.parentElement || document.body}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSupplierModalOpen(true)}
                        className="border-border hover:bg-muted/50"
                        title="Create new supplier"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Form.Item>
                </TabsContent>

                {/* Payment & Accounting Tab */}
                <TabsContent value="payment" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="amount"
                      label={<span className="text-sm font-semibold text-foreground">Amount *</span>}
                      rules={[
                        { required: true, message: 'Amount is required' },
                        {
                          validator: (_: any, value: any) => {
                            if (!value && value !== 0) {
                              return Promise.reject(new Error('Amount is required'))
                            }
                            const numValue = Number(value)
                            if (isNaN(numValue) || numValue <= 0) {
                              return Promise.reject(new Error('Amount must be greater than 0'))
                            }
                            return Promise.resolve()
                          },
                        },
                      ]}
                      getValueFromEvent={(e: any) => {
                        const value = e.target.value
                        if (!value || value === '') return undefined
                        const numValue = Number(value.replace(/,/g, ''))
                        return isNaN(numValue) ? undefined : numValue
                      }}
                      getValueProps={(value) => ({
                        value: value !== undefined && value !== null ? String(value) : '',
                      })}
                      normalize={(value) => {
                        if (!value) return undefined
                        const numValue = Number(value)
                        return isNaN(numValue) ? undefined : numValue
                      }}
                    >
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">
                          {currencyValue || 'AED'}
                        </span>
                        <AntInput
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full h-11 pl-12 border-border focus:border-primary focus:ring-primary"
                          placeholder="0.00"
                          onChange={(e) => {
                            // Reset manual edit flag when amount changes
                            setTaxManuallyEdited(false)
                          }}
                        />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name="tax_amount"
                      label={<span className="text-sm font-semibold text-foreground">Tax Amount (5% VAT auto-calculated)</span>}
                      getValueFromEvent={(e: any) => {
                        const value = e.target.value
                        if (!value || value === '') return 0
                        const numValue = Number(value.replace(/,/g, ''))
                        return isNaN(numValue) ? 0 : numValue
                      }}
                      getValueProps={(value: any) => {
                        // Use the watched taxAmountValue to ensure real-time updates
                        const displayValue = taxAmountValue !== undefined && taxAmountValue !== null 
                          ? Number(taxAmountValue).toFixed(2)
                          : (value !== undefined && value !== null ? Number(value).toFixed(2) : '0.00')
                        return { value: displayValue }
                      }}
                      normalize={(value) => {
                        if (!value && value !== 0) return 0
                        const numValue = Number(value)
                        return isNaN(numValue) ? 0 : numValue
                      }}
                    >
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">
                          {currencyValue || 'AED'}
                        </span>
                        <AntInput
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full h-11 pl-12 border-border focus:border-primary focus:ring-primary"
                          placeholder="0.00"
                          onChange={(e: any) => {
                            // Mark as manually edited when user types
                            setTaxManuallyEdited(true)
                            const value = e.target.value
                            if (value) {
                              const numValue = Number(value.replace(/,/g, ''))
                              if (!isNaN(numValue)) {
                                form.setFieldsValue({ tax_amount: numValue })
                                setFormData((prev: any) => ({ ...prev, tax_amount: numValue }))
                              }
                            } else {
                              form.setFieldsValue({ tax_amount: 0 })
                              setFormData((prev: any) => ({ ...prev, tax_amount: 0 }))
                            }
                          }}
                        />
                      </div>
                    </Form.Item>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg border border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-foreground">Total Amount:</span>
                      <span className="text-lg font-bold text-foreground">
                        {currencyValue || 'AED'} {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="currency"
                      label={<span className="text-sm font-semibold text-foreground">Currency *</span>}
                      rules={[{ required: true, message: 'Please select a currency' }]}
                    >
                      <div className="flex gap-2">
                        <AntSelect
                          key={`currency-${selectKey}-${currencyValue || 'empty'}`}
                          showSearch
                          placeholder={loadingCurrencies ? "Loading..." : "Select currency"}
                          filterOption={(input: string, option: any) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                          value={currencyValue || undefined}
                          onChange={(value: string) => {
                            form.setFieldsValue({ currency: value })
                            setFormData((prev) => ({ ...prev, currency: value }))
                          }}
                          disabled={loadingCurrencies}
                          loading={loadingCurrencies}
                          notFoundContent="No currencies found"
                          options={currencies.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }))}
                          style={{ flex: 1, height: 44, minHeight: 44 }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrencyModalOpen(true)}
                          className="border-border hover:bg-muted/50"
                          title="Create new currency"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </Form.Item>

                    <Form.Item
                      name="status"
                      label={<span className="text-sm font-semibold text-foreground">Payment Status *</span>}
                      rules={[{ required: true, message: 'Please select payment status' }]}
                    >
                      <div className="flex gap-2">
                        <AntSelect
                          key={`paymentStatus-${selectKey}-${statusValue || 'empty'}`}
                          showSearch
                          placeholder={loadingPaymentStatuses ? "Loading..." : "Select payment status"}
                          filterOption={(input: string, option: any) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                          value={statusValue || undefined}
                          onChange={(value: string) => {
                            if (value === 'CREATE_NEW') {
                              setPaymentStatusModalOpen(true)
                            } else {
                              form.setFieldsValue({ status: value })
                              setFormData((prev) => ({ ...prev, status: value as 'paid' | 'unpaid' }))
                            }
                          }}
                          disabled={loadingPaymentStatuses}
                          loading={loadingPaymentStatuses}
                          notFoundContent="No payment statuses available"
                          popupRender={(menu) => (
                            <>
                              {menu}
                              <div className="p-2 border-t border-border">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setPaymentStatusModalOpen(true)
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Create New Payment Status
                                </Button>
                              </div>
                            </>
                          )}
                          options={paymentStatuses.map((s) => ({ value: s.name.toLowerCase(), label: s.name }))}
                          style={{ flex: 1, height: 44, minHeight: 44 }}
                        />
                      </div>
                    </Form.Item>
                  </div>

                  {isPaidStatus && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item
                        name="payment_method"
                        label={<span className="text-sm font-semibold text-foreground">Payment Method</span>}
                      >
                        <div className="flex gap-2">
                          <AntSelect
                            key={`paymentMethod-${selectKey}-${paymentMethodValue || 'empty'}`}
                            showSearch
                            placeholder={loadingPaymentMethods ? "Loading..." : "Select payment method"}
                            filterOption={(input: string, option: any) =>
                              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                            optionFilterProp="label"
                            value={paymentMethodValue || undefined}
                            onChange={(value: string) => {
                              if (value === 'CREATE_NEW') {
                                setPaymentMethodModalOpen(true)
                              } else {
                                form.setFieldsValue({ payment_method: value })
                                setFormData((prev) => ({ ...prev, payment_method: value }))
                              }
                            }}
                            disabled={loadingPaymentMethods}
                            loading={loadingPaymentMethods}
                            notFoundContent="No payment methods available"
                            popupRender={(menu) => (
                              <>
                                {menu}
                                <div className="p-2 border-t border-border">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setPaymentMethodModalOpen(true)
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Create New Payment Method
                                  </Button>
                                </div>
                              </>
                            )}
                            options={paymentMethods.map((pm) => ({ value: pm.name, label: pm.name }))}
                            style={{ flex: 1, height: 44, minHeight: 44 }}
                          />
                        </div>
                      </Form.Item>

                      <Form.Item
                        name="reference_number"
                        label={<span className="text-sm font-semibold text-foreground">Reference Number</span>}
                      >
                        <AntInput
                          placeholder="Payment reference number"
                          className="h-11 border-border focus:border-primary focus:ring-primary"
                        />
                      </Form.Item>
                    </div>
                  )}

                  {isUnpaidStatus && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-sm text-blue-300">
                        <strong>Note:</strong> This expense will be sent to Accounts Payable and a payable entry will be created automatically.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Form.Item
                      name="payment_terms"
                      label={<span className="text-sm font-semibold text-foreground">Payment Terms</span>}
                    >
                      <AntInput
                        placeholder="e.g., Net 30, Due on receipt, etc."
                        className="h-11 border-border focus:border-primary focus:ring-primary"
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="notes"
                    label={<span className="text-sm font-semibold text-foreground">Notes</span>}
                  >
                    <AntInput.TextArea
                      rows={4}
                      placeholder="Enter any additional notes or comments"
                      className="border-border focus:border-primary focus:ring-primary resize-none"
                    />
                  </Form.Item>
                </TabsContent>

                {/* Additional Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-6">
                  <Form.Item
                    name="description"
                    label={<span className="text-sm font-semibold text-foreground">Description</span>}
                  >
                    <RichTextEditor
                      value={descriptionValue || ''}
                      onChange={(value) => {
                        form.setFieldsValue({ description: value })
                        setFormData((prev) => ({ ...prev, description: value }))
                      }}
                      placeholder="Enter expense description..."
                    />
                  </Form.Item>

                  <Form.Item
                    name="attachments"
                    label={<span className="text-sm font-semibold text-foreground">Attachments (Receipts/Bills)</span>}
                  >
                    <Upload
                      multiple
                      beforeUpload={() => false}
                      fileList={formData.attachments?.map((attachment: string, index: number) => {
                        // If it's a file path (from existing expense), create a file list item
                        if (typeof attachment === 'string' && attachment.includes('/')) {
                          const fileName = attachment.split('/').pop() || attachment
                          return {
                            uid: `existing-${index}`,
                            name: fileName,
                            status: 'done' as const,
                            url: attachment, // Store the path for reference
                          }
                        }
                        // If it's just a filename (new upload)
                        return {
                          uid: `file-${index}`,
                          name: attachment,
                          status: 'done' as const,
                        }
                      }) || []}
                      onChange={(info) => {
                        // Store actual file objects for upload
                        const files: File[] = []
                        const fileNames: string[] = []
                        info.fileList.forEach((file) => {
                          if (file.originFileObj) {
                            // New file being uploaded
                            files.push(file.originFileObj)
                            fileNames.push(file.name)
                          } else if (file.name) {
                            // Existing file (from edit mode) - preserve the path if it exists
                            if (file.url && typeof file.url === 'string' && file.url.includes('/')) {
                              fileNames.push(file.url) // Keep the full path for existing files
                            } else {
                              fileNames.push(file.name)
                            }
                          }
                        })
                        setAttachmentFiles(files)
                        form.setFieldsValue({ attachments: fileNames })
                        setFormData((prev) => ({ ...prev, attachments: fileNames }))
                      }}
                    >
                      <Button type="button" variant="outline" className="border-border hover:bg-muted/50">
                        <UploadIcon className="h-4 w-4 mr-2" />
                        Upload Files
                      </Button>
                    </Upload>
                  </Form.Item>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/expenses/manage')}
                  className="border-border hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  className="shadow-md hover:shadow-lg transition-shadow min-w-[140px]"
                >
                  {isEditMode ? 'Update Expense' : 'Create Expense'}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Supplier Create Modal */}
      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Supplier</DialogTitle>
            <DialogDescription>Add a new supplier to the system</DialogDescription>
          </DialogHeader>
          <Form
            form={supplierForm}
            layout="vertical"
            onFinish={onCreateSupplier}
            className="space-y-4"
          >
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Name *</span>}
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <AntInput placeholder="Supplier name" className="h-11" />
            </Form.Item>
            <Form.Item
              name="email"
              label={<span className="text-sm font-semibold text-foreground">Email</span>}
            >
              <AntInput type="email" placeholder="supplier@example.com" className="h-11" />
            </Form.Item>
            <Form.Item
              name="phone"
              label={<span className="text-sm font-semibold text-foreground">Phone</span>}
            >
              <AntInput placeholder="+1234567890" className="h-11" />
            </Form.Item>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSupplierModalOpen(false)
                  supplierForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creatingSupplier}>
                Create Supplier
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Currency Create Modal */}
      <Dialog open={currencyModalOpen} onOpenChange={setCurrencyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Currency</DialogTitle>
            <DialogDescription>Add a new currency to the system</DialogDescription>
          </DialogHeader>
          <Form
            form={currencyForm}
            layout="vertical"
            onFinish={onCreateCurrency}
            className="space-y-4"
          >
            <Form.Item
              name="code"
              label={<span className="text-sm font-semibold text-foreground">Code *</span>}
              rules={[{ required: true, message: 'Currency code is required' }]}
            >
              <AntInput placeholder="USD" className="h-11" maxLength={3} />
            </Form.Item>
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Name *</span>}
              rules={[{ required: true, message: 'Currency name is required' }]}
            >
              <AntInput placeholder="US Dollar" className="h-11" />
            </Form.Item>
            <Form.Item
              name="symbol"
              label={<span className="text-sm font-semibold text-foreground">Symbol</span>}
            >
              <AntInput placeholder="$" className="h-11" />
            </Form.Item>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrencyModalOpen(false)
                  currencyForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creatingCurrency}>
                Create Currency
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Method Create Modal */}
      <Dialog open={paymentMethodModalOpen} onOpenChange={setPaymentMethodModalOpen}>
        <DialogContent className="sm:max-w-[500px]" customZIndex={10001}>
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
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <AntInput placeholder="Payment method name" className="h-11" />
            </Form.Item>
            <Form.Item
              name="description"
              label={<span className="text-sm font-semibold text-foreground">Description</span>}
            >
              <AntInput.TextArea
                rows={3}
                placeholder="Enter description (optional)"
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

      {/* Payment Status Create Modal */}
      <Dialog open={paymentStatusModalOpen} onOpenChange={setPaymentStatusModalOpen}>
        <DialogContent className="sm:max-w-[500px]" customZIndex={10001}>
          <DialogHeader>
            <DialogTitle>Create New Payment Status</DialogTitle>
            <DialogDescription>Add a new payment status to the system</DialogDescription>
          </DialogHeader>
          <Form
            form={paymentStatusForm}
            layout="vertical"
            onFinish={onCreatePaymentStatus}
            className="space-y-4"
          >
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Name *</span>}
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <AntInput placeholder="Payment status name" className="h-11" />
            </Form.Item>
            <Form.Item
              name="description"
              label={<span className="text-sm font-semibold text-foreground">Description</span>}
            >
              <AntInput.TextArea
                rows={3}
                placeholder="Enter description (optional)"
                className="border-border focus:border-primary focus:ring-primary resize-none"
              />
            </Form.Item>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPaymentStatusModalOpen(false)
                  paymentStatusForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creatingPaymentStatus}>
                Create Payment Status
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
