import { Form, DatePicker, Input as AntInput, App, message as antdMessage, Spin, Checkbox, Select as AntSelect } from 'antd'
import { ArrowLeft, HandCoins, Plus, X } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import { ReceivableAPI, CustomerAPI, SalesInvoiceAPI, CurrencyAPI, InventoryAPI, UnitAPI, BrandAPI, type ReceivableInput, type Customer, type ReceivableItem, type SalesInvoice, type Currency, type CurrencyInput, type InventoryItem, type SalesInvoiceLineItem, type Unit, type Brand, type InventoryInput } from '@/services/api'
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

// Predefined payment terms
const PAYMENT_TERMS = [
  'Due on Receipt',
  'Net 7',
  'Net 10',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
  '2/10 Net 30',
  '1/15 Net 30',
  'End of Month',
  'End of Next Month',
]

// Store restoration state outside component to persist across renders without causing re-renders
const restorationState = { isRestoring: false, lastRestoredTab: '' }

export default function ReceivablesCreate() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const [loading, setLoading] = useState(false)
  const [loadingItem, setLoadingItem] = useState(isEditMode)
  const [form] = Form.useForm<ReceivableInput>()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [customerForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('basic')
  const [selectKey, setSelectKey] = useState<number>(0)
  
  // Sales invoices state
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [invoiceForm] = Form.useForm()
  
  // Track if custom invoice number is selected
  const [isCustomInvoiceNumber, setIsCustomInvoiceNumber] = useState(false)
  const [isCustomPaymentTerms, setIsCustomPaymentTerms] = useState(false)
  
  // Currencies state
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loadingCurrencies, setLoadingCurrencies] = useState(false)
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false)
  const [creatingCurrency, setCreatingCurrency] = useState(false)
  const [currencyForm] = Form.useForm()
  
  // Inventory state for invoice modal
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [units, setUnits] = useState<Unit[]>([])
  const [loadingUnits, setLoadingUnits] = useState(false)

  // Watch form values
  const customerIdValue = Form.useWatch('customer_id', form)
  const totalAmountValue = Form.useWatch('total_amount', form)
  const taxAmountValue = Form.useWatch('tax_amount', form)
  const currencyValue = Form.useWatch('currency', form)
  const creditLimitValue = Form.useWatch('credit_limit', form)
  const invoiceNumberValue = Form.useWatch('invoice_number', form)
  const paymentTermsValue = Form.useWatch('payment_terms', form)
  const notesValue = Form.useWatch('notes', form)

  // Centralized form state that persists across tab switches
  const [formData, setFormData] = useState<Partial<ReceivableInput>>({
    customer_id: undefined,
    invoice_number: '',
    invoice_date: undefined,
    due_date: undefined,
    total_amount: undefined,
    tax_amount: undefined,
    currency: 'AED',
    credit_limit: undefined,
    payment_terms: '',
    notes: '',
  })

  const [loadedItemData, setLoadedItemData] = useState<Partial<ReceivableInput> | null>(null)

  // Fetch existing item data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchItem = async () => {
        setLoadingItem(true)
        try {
          const res = await ReceivableAPI.get(id)
          const item = res.data.data as ReceivableItem
          
          const initialData = {
            customer_id: typeof item.customer_id === 'string' ? item.customer_id : (item.customer_id as any)?._id,
            invoice_number: item.invoice_number || '',
            invoice_date: item.invoice_date,
            due_date: item.due_date,
            total_amount: item.total_amount,
            tax_amount: item.tax_amount,
            currency: item.currency || 'AED',
            credit_limit: item.credit_limit,
            payment_terms: item.payment_terms || '',
            notes: item.notes || '',
          }
          setLoadedItemData(initialData)
          setFormData(initialData)
          
          // Check if invoice_number is in predefined list
          const invoiceExists = salesInvoices.some((inv: SalesInvoice) => inv.invoiceNumber === item.invoice_number)
          setIsCustomInvoiceNumber(!invoiceExists && !!item.invoice_number)
          
          // Check if payment_terms is in predefined list
          const termExists = PAYMENT_TERMS.includes(item.payment_terms || '')
          setIsCustomPaymentTerms(!termExists && !!item.payment_terms)
        } catch (error) {
          console.error('Error fetching receivable:', error)
          message.error('Failed to load receivable')
          navigate('/receivables/manage')
        } finally {
          setLoadingItem(false)
        }
      }
      fetchItem()
    } else {
      const initialData = {
        customer_id: undefined,
        invoice_number: '',
        invoice_date: undefined,
        due_date: undefined,
        total_amount: undefined,
        tax_amount: undefined,
        currency: 'AED',
        credit_limit: undefined,
        payment_terms: '',
        notes: '',
      }
      setFormData(initialData)
      form.setFieldsValue(initialData)
    }
  }, [id, isEditMode, form, navigate, message, salesInvoices])

  // Helper function to convert formData to form values format
  const prepareFormValues = (data: Partial<ReceivableInput>) => {
    const valuesToRestore: any = { ...data }
    
    if (valuesToRestore.invoice_date && typeof valuesToRestore.invoice_date === 'string') {
      valuesToRestore.invoice_date = dayjs(valuesToRestore.invoice_date)
    }
    
    if (valuesToRestore.due_date && typeof valuesToRestore.due_date === 'string') {
      valuesToRestore.due_date = dayjs(valuesToRestore.due_date)
    }
    
    if (valuesToRestore.total_amount !== undefined && valuesToRestore.total_amount !== null) {
      valuesToRestore.total_amount = Number(valuesToRestore.total_amount)
    }
    
    if (valuesToRestore.tax_amount !== undefined && valuesToRestore.tax_amount !== null) {
      valuesToRestore.tax_amount = Number(valuesToRestore.tax_amount)
    }
    
    if (valuesToRestore.credit_limit !== undefined && valuesToRestore.credit_limit !== null) {
      valuesToRestore.credit_limit = Number(valuesToRestore.credit_limit)
    }
    
    return valuesToRestore
  }

  // Helper function to restore form values from central state
  const restoreFormValues = (data: Partial<ReceivableInput>, tab?: string) => {
    if (!data.customer_id && !data.invoice_number && restorationState.isRestoring) return
    
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
    
    setFormData((prev: Partial<ReceivableInput>) => {
      const updated: any = { ...prev, ...allValues }
      
      if (updated.invoice_date && dayjs.isDayjs(updated.invoice_date)) {
        updated.invoice_date = updated.invoice_date.toISOString()
      }
      
      if (updated.due_date && dayjs.isDayjs(updated.due_date)) {
        updated.due_date = updated.due_date.toISOString()
      }
      
      if (updated.total_amount !== undefined && updated.total_amount !== null) {
        updated.total_amount = Number(updated.total_amount)
      }
      
      if (updated.tax_amount !== undefined && updated.tax_amount !== null) {
        updated.tax_amount = Number(updated.tax_amount)
      }
      
      if (updated.credit_limit !== undefined && updated.credit_limit !== null) {
        updated.credit_limit = Number(updated.credit_limit)
      }
      
      return updated as Partial<ReceivableInput>
    })
  }

  // Restore form values from central state when tab changes
  useEffect(() => {
    if ((formData.customer_id || formData.invoice_number) && !restorationState.isRestoring) {
      restoreFormValues(formData, activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Force Select components to re-render when form values change
  useEffect(() => {
    if (customerIdValue) {
      const timer = setTimeout(() => {
        setSelectKey(selectKey + 1)
      }, 50)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerIdValue])

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true)
      try {
        const res = await CustomerAPI.list()
        setCustomers(res.data.data)
      } catch (error) {
        console.error('Error fetching customers:', error)
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])

  // Fetch sales invoices
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoadingInvoices(true)
      try {
        const res = await SalesInvoiceAPI.list()
        setSalesInvoices(res.data.data)
      } catch (error) {
        console.error('Error fetching sales invoices:', error)
      } finally {
        setLoadingInvoices(false)
      }
    }
    fetchInvoices()
  }, [])

  // Check if invoice_number is custom after both invoices and loaded data are available
  useEffect(() => {
    if (isEditMode && loadedItemData?.invoice_number && salesInvoices.length > 0) {
      const invoiceExists = salesInvoices.some((inv: SalesInvoice) => inv.invoiceNumber === loadedItemData.invoice_number)
      setIsCustomInvoiceNumber(!invoiceExists)
    }
  }, [isEditMode, loadedItemData, salesInvoices])

  // Watch invoice_number and auto-detect if it's custom (not in sales invoices)
  useEffect(() => {
    if (invoiceNumberValue && salesInvoices.length > 0 && !isCustomInvoiceNumber) {
      const invoiceExists = salesInvoices.some((inv: SalesInvoice) => inv.invoiceNumber === invoiceNumberValue)
      if (!invoiceExists && invoiceNumberValue.trim() !== '') {
        setIsCustomInvoiceNumber(true)
      }
    }
  }, [invoiceNumberValue, salesInvoices, isCustomInvoiceNumber])

  // Fetch currencies
  useEffect(() => {
    const fetchCurrencies = async () => {
      setLoadingCurrencies(true)
      try {
        const res = await CurrencyAPI.list({ activeOnly: true })
        setCurrencies(res.data.data)
      } catch (error) {
        console.error('Error fetching currencies:', error)
      } finally {
        setLoadingCurrencies(false)
      }
    }
    fetchCurrencies()
  }, [])

  // Fetch inventory and units when invoice modal opens
  useEffect(() => {
    if (invoiceModalOpen) {
      const fetchData = async () => {
        setLoadingInventory(true)
        setLoadingUnits(true)
        try {
          const [inventoryRes, unitsRes] = await Promise.all([
            InventoryAPI.list(),
            UnitAPI.list(),
          ])
          setInventoryItems(inventoryRes.data.data)
          setUnits(unitsRes.data.data)
        } catch (error) {
          console.error('Error fetching inventory/units:', error)
        } finally {
          setLoadingInventory(false)
          setLoadingUnits(false)
        }
      }
      fetchData()
    }
  }, [invoiceModalOpen])

  const onCreateCustomer = async (values: any) => {
    setCreatingCustomer(true)
    try {
      const res = await CustomerAPI.create(values)
      setCustomers([...customers, res.data.data])
      form.setFieldsValue({ customer_id: res.data.data._id })
      setFormData((prev) => ({ ...prev, customer_id: res.data.data._id }))
      setCustomerModalOpen(false)
      customerForm.resetFields()
      message.success('Customer created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create customer')
    } finally {
      setCreatingCustomer(false)
    }
  }

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

  const handleCreateInvoice = () => {
    setInvoiceModalOpen(true)
  }

  const onCreateInvoice = async (values: any) => {
    setCreatingInvoice(true)
    try {
      // Generate invoice number
      const res = await SalesInvoiceAPI.list()
      const count = res.data.data.length
      const nextNumber = (count + 1).toString().padStart(4, '0')
      const invoiceNumber = `SI-${nextNumber}`
      
      // Build line items
      const lineItems: SalesInvoiceLineItem[] = values.lineItems?.map((item: any) => ({
        product: item.product,
        qty: Number(item.qty) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        discount: item.discount ? Number(item.discount) : undefined,
        vat: item.vat ? Number(item.vat) : undefined,
      })) || []
      
      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0)
      const isExportInvoice = values.isExportInvoice || false
      const vatAmount = isExportInvoice ? 0 : subtotal * 0.05 // 5% VAT for local invoices, 0 for export
      const totalAfterVat = subtotal + vatAmount
      
      const invoiceData = {
        serialNumber: `SI-${Date.now()}`,
        customer: values.customer,
        invoiceNumber,
        date: values.date?.toISOString?.() || values.date || new Date().toISOString(),
        lineItems,
        discount: values.discount || 0,
        discountType: values.discountType || 'amount',
        discountValue: values.discountValue || 0,
        vat: isExportInvoice ? 0 : (values.vat || vatAmount),
        vatType: values.vatType || 'percentage',
        vatValue: isExportInvoice ? 0 : (values.vatValue || 5),
        status: 'unpaid' as const,
        paymentMethod: 'bank_transfer' as const,
        deliveryAddress: values.deliveryAddress || undefined,
      }
      
      const invoiceRes = await SalesInvoiceAPI.create(invoiceData)
      setSalesInvoices([...salesInvoices, invoiceRes.data.data])
      form.setFieldsValue({ invoice_number: invoiceRes.data.data.invoiceNumber })
      setFormData((prev) => ({ ...prev, invoice_number: invoiceRes.data.data.invoiceNumber }))
      setIsCustomInvoiceNumber(false)
      setInvoiceModalOpen(false)
      invoiceForm.resetFields()
      message.success('Sales invoice created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create sales invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      // Sync form values to formData before submission to ensure we have all data
      const formValues = form.getFieldsValue(true)
      const allFormValues = { ...formData, ...formValues, ...values }
      
      // Update formData with latest form values
      setFormData((prev: any) => ({ ...prev, ...allFormValues }))
      
      const payload: ReceivableInput = {
        customer_id: allFormValues.customer_id || formData.customer_id || '',
        invoice_number: allFormValues.invoice_number || formData.invoice_number || '',
        invoice_date: (allFormValues.invoice_date || formData.invoice_date)?.toISOString?.() || (allFormValues.invoice_date || formData.invoice_date) || new Date().toISOString(),
        due_date: (allFormValues.due_date || formData.due_date)?.toISOString?.() || (allFormValues.due_date || formData.due_date) || new Date().toISOString(),
        total_amount: Number(allFormValues.total_amount || formData.total_amount || 0),
        tax_amount: Number(allFormValues.tax_amount || formData.tax_amount || 0),
        currency: allFormValues.currency || formData.currency || 'AED',
        credit_limit: allFormValues.credit_limit ? Number(allFormValues.credit_limit) : undefined,
        payment_terms: allFormValues.payment_terms || formData.payment_terms || undefined,
        notes: allFormValues.notes || formData.notes || undefined,
      }
      
      if (isEditMode && id) {
        await ReceivableAPI.update(id, payload)
        message.success('Receivable updated successfully')
      } else {
        await ReceivableAPI.create(payload)
        message.success('Receivable created successfully')
      }
      navigate('/receivables/manage')
    } catch (error: any) {
      message.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} receivable`)
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
          onClick={() => navigate('/receivables/manage')}
          className="border-border hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <HandCoins className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{isEditMode ? 'Edit Accounts Receivable' : 'Create Accounts Receivable'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isEditMode ? 'Update receivable invoice' : 'Enter a new invoice from customer'}</p>
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
              key={isEditMode && loadedItemData ? `edit-${loadedItemData.customer_id}` : 'create'}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="details">Invoice Details</TabsTrigger>
                  <TabsTrigger value="additional">Additional Info</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 mt-6">
                  <Form.Item
                    name="customer_id"
                    label={<span className="text-sm font-semibold text-foreground">Customer</span>}
                    rules={[{ required: true, message: 'Please select a customer' }]}
                  >
                    <div className="flex gap-2">
                      <AntSelect
                        showSearch
                        placeholder={customers.length === 0 ? "No customers available" : "Select customer"}
                        getPopupContainer={(node) => node.parentElement || document.body}
                        filterOption={(input: string, option: any) =>
                          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        optionFilterProp="label"
                        value={customerIdValue || undefined}
                        onChange={(value: string) => {
                          form.setFieldsValue({ customer_id: value })
                          setFormData((prev) => ({ ...prev, customer_id: value }))
                        }}
                        disabled={loadingCustomers || customers.length === 0}
                        loading={loadingCustomers}
                        notFoundContent="No customers found"
                        options={customers.map((c) => ({ value: c._id, label: c.name }))}
                        style={{ flex: 1, height: 44, minHeight: 44 }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCustomerModalOpen(true)}
                        className="border-border hover:bg-muted/50"
                        title="Create customer"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Form.Item>

                  <Form.Item
                    name="invoice_number"
                    label={<span className="text-sm font-semibold text-foreground">Invoice Number</span>}
                    rules={[{ required: true, message: 'Please select or enter invoice number' }]}
                  >
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <AntSelect
                          showSearch
                          placeholder="Select sales invoice"
                          filterOption={(input: string, option: any) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                          value={
                            isCustomInvoiceNumber 
                              ? 'CUSTOM' 
                              : (() => {
                                  if (!invoiceNumberValue) return undefined
                                  const exists = salesInvoices.some(inv => inv.invoiceNumber === invoiceNumberValue)
                                  return exists ? invoiceNumberValue : undefined
                                })()
                          }
                          onChange={(value: string) => {
                            if (value === 'CUSTOM') {
                              setIsCustomInvoiceNumber(true)
                              form.setFieldsValue({ invoice_number: '' })
                              setFormData((prev) => ({ ...prev, invoice_number: '' }))
                            } else {
                              setIsCustomInvoiceNumber(false)
                              form.setFieldsValue({ invoice_number: value })
                              setFormData((prev) => ({ ...prev, invoice_number: value }))
                            }
                          }}
                          disabled={loadingInvoices}
                          loading={loadingInvoices}
                          notFoundContent="No sales invoices found"
                          options={[
                            ...salesInvoices.map((inv) => ({ value: inv.invoiceNumber, label: inv.invoiceNumber })),
                            { value: 'CUSTOM', label: 'Custom Invoice' },
                          ]}
                          style={{ flex: 1, height: 44, minHeight: 44 }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCreateInvoice}
                          className="border-border hover:bg-muted/50"
                          title="Create new sales invoice"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {isCustomInvoiceNumber && (
                        <AntInput
                          placeholder="Enter custom invoice number"
                          value={invoiceNumberValue || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            form.setFieldsValue({ invoice_number: value })
                            setFormData((prev) => ({ ...prev, invoice_number: value }))
                            // If value is not in sales invoices, keep it as custom
                            if (value && !salesInvoices.some(inv => inv.invoiceNumber === value)) {
                              setIsCustomInvoiceNumber(true)
                            }
                          }}
                          className="h-11 border-border focus:border-primary focus:ring-primary"
                        />
                      )}
                    </div>
                  </Form.Item>
                </TabsContent>

                {/* Invoice Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="invoice_date"
                      label={<span className="text-sm font-semibold text-foreground">Invoice Date</span>}
                      rules={[{ required: true, message: 'Please select invoice date' }]}
                    >
                      <DatePicker
                        className="w-full h-11 border-border focus-within:border-primary focus-within:ring-primary [&_.ant-picker-input>input]:h-11"
                        placeholder="Select invoice date and time"
                        format="YYYY-MM-DD HH:mm:ss"
                        showTime={{ format: 'HH:mm:ss' }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="due_date"
                      label={<span className="text-sm font-semibold text-foreground">Due Date</span>}
                      rules={[{ required: true, message: 'Please select due date' }]}
                    >
                      <DatePicker
                        className="w-full h-11 border-border focus-within:border-primary focus-within:ring-primary [&_.ant-picker-input>input]:h-11"
                        placeholder="Select due date and time"
                        format="YYYY-MM-DD HH:mm:ss"
                        showTime={{ format: 'HH:mm:ss' }}
                      />
                    </Form.Item>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Form.Item
                      name="total_amount"
                      label={<span className="text-sm font-semibold text-foreground">Total Amount</span>}
                      rules={[{ required: true, message: 'Please enter total amount' }]}
                    >
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">
                          {currencyValue || 'AED'}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={totalAmountValue !== undefined && totalAmountValue !== null ? String(totalAmountValue) : ''}
                          onChange={(e: any) => {
                            const value = e.target.value
                            form.setFieldsValue({ total_amount: value || undefined })
                            setFormData((prev) => ({ ...prev, total_amount: value || undefined }))
                          }}
                          onBlur={(e: any) => {
                            const value = e.target.value
                            if (value && !isNaN(Number(value))) {
                              const numValue = Number(value)
                              const formatted = numValue.toFixed(2)
                              form.setFieldsValue({ total_amount: formatted })
                              setFormData((prev) => ({ ...prev, total_amount: formatted }))
                            }
                          }}
                          className="w-full h-11 pl-12 border-border focus:border-primary focus:ring-primary bg-muted/50"
                          placeholder="0.00"
                        />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name="tax_amount"
                      label={<span className="text-sm font-semibold text-foreground">Tax Amount</span>}
                    >
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">
                          {currencyValue || 'AED'}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={taxAmountValue !== undefined && taxAmountValue !== null ? String(taxAmountValue) : ''}
                          onChange={(e: any) => {
                            const value = e.target.value
                            form.setFieldsValue({ tax_amount: value || undefined })
                            setFormData((prev) => ({ ...prev, tax_amount: value || undefined }))
                          }}
                          onBlur={(e: any) => {
                            const value = e.target.value
                            if (value && !isNaN(Number(value))) {
                              const numValue = Number(value)
                              const formatted = numValue.toFixed(2)
                              form.setFieldsValue({ tax_amount: formatted })
                              setFormData((prev) => ({ ...prev, tax_amount: formatted }))
                            }
                          }}
                          className="w-full h-11 pl-12 border-border focus:border-primary focus:ring-primary bg-muted/50"
                          placeholder="0.00"
                        />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name="currency"
                      label={<span className="text-sm font-semibold text-foreground">Currency</span>}
                    >
                      <div className="flex gap-2">
                        <AntSelect
                          showSearch
                          placeholder="Select currency"
                          filterOption={(input: string, option: any) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                          value={currencyValue || 'AED'}
                          onChange={(value: string) => {
                            form.setFieldsValue({ currency: value })
                            setFormData((prev) => ({ ...prev, currency: value }))
                          }}
                          disabled={loadingCurrencies}
                          loading={loadingCurrencies}
                          notFoundContent="No currencies found"
                          options={currencies.map((c) => ({
                            value: c.code,
                            label: `${c.code} ${c.symbol ? `(${c.symbol})` : ''} - ${c.name}`,
                          }))}
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
                  </div>

                  <Form.Item
                    name="credit_limit"
                    label={<span className="text-sm font-semibold text-foreground">Credit Limit</span>}
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">
                        {currencyValue || 'AED'}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={creditLimitValue !== undefined && creditLimitValue !== null ? String(creditLimitValue) : ''}
                        onChange={(e: any) => {
                          const value = e.target.value
                          form.setFieldsValue({ credit_limit: value || undefined })
                          setFormData((prev) => ({ ...prev, credit_limit: value || undefined }))
                        }}
                        onBlur={(e: any) => {
                          const value = e.target.value
                          if (value && !isNaN(Number(value))) {
                            const numValue = Number(value)
                            const formatted = numValue.toFixed(2)
                            form.setFieldsValue({ credit_limit: formatted })
                            setFormData((prev) => ({ ...prev, credit_limit: formatted }))
                          }
                        }}
                        className="w-full h-11 pl-12 border-border focus:border-primary focus:ring-primary bg-muted/50"
                        placeholder="0.00"
                      />
                    </div>
                  </Form.Item>
                </TabsContent>

                {/* Additional Info Tab */}
                <TabsContent value="additional" className="space-y-4 mt-6">
                  <Form.Item
                    name="payment_terms"
                    label={<span className="text-sm font-semibold text-foreground">Payment Terms</span>}
                  >
                    <div className="space-y-2">
                      <AntSelect
                        showSearch
                        placeholder="Select payment terms"
                        filterOption={(input: string, option: any) =>
                          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        optionFilterProp="label"
                        value={isCustomPaymentTerms ? 'CUSTOM' : (paymentTermsValue || undefined)}
                        onChange={(value: string) => {
                          if (value === 'CUSTOM') {
                            setIsCustomPaymentTerms(true)
                            form.setFieldsValue({ payment_terms: '' })
                            setFormData((prev) => ({ ...prev, payment_terms: '' }))
                          } else {
                            setIsCustomPaymentTerms(false)
                            form.setFieldsValue({ payment_terms: value })
                            setFormData((prev) => ({ ...prev, payment_terms: value }))
                          }
                        }}
                        options={[
                          ...PAYMENT_TERMS.map((term) => ({ value: term, label: term })),
                          { value: 'CUSTOM', label: 'Custom' },
                        ]}
                        style={{ height: 44, minHeight: 44 }}
                      />
                        {isCustomPaymentTerms && (
                          <AntInput
                            placeholder="Enter custom payment terms"
                            value={paymentTermsValue || ''}
                            onChange={(e) => {
                              form.setFieldsValue({ payment_terms: e.target.value })
                              setFormData((prev) => ({ ...prev, payment_terms: e.target.value }))
                            }}
                            className="h-11 border-border focus:border-primary focus:ring-primary"
                          />
                        )}
                    </div>
                  </Form.Item>

                  <Form.Item
                    name="notes"
                    label={<span className="text-sm font-semibold text-foreground">Notes</span>}
                  >
                    <RichTextEditor
                      value={notesValue || ''}
                      onChange={(value) => {
                        form.setFieldsValue({ notes: value })
                        setFormData((prev) => ({ ...prev, notes: value }))
                      }}
                      placeholder="Enter any additional notes or comments..."
                      className="min-h-[200px]"
                    />
                  </Form.Item>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/receivables/manage')}
                  className="border-border hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  className="shadow-md hover:shadow-lg transition-shadow min-w-[140px]"
                >
                  {isEditMode ? 'Update Receivable' : 'Create Receivable'}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Customer Create Modal */}
      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>Add a new customer to the system</DialogDescription>
          </DialogHeader>
          <Form
            form={customerForm}
            layout="vertical"
            onFinish={onCreateCustomer}
            className="space-y-4"
          >
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Customer Name</span>}
              rules={[{ required: true, message: 'Please enter customer name' }]}
            >
              <AntInput
                placeholder="Enter customer name"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={<span className="text-sm font-semibold text-foreground">Email</span>}
            >
              <AntInput
                type="email"
                placeholder="Enter email address"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label={<span className="text-sm font-semibold text-foreground">Phone</span>}
            >
              <AntInput
                placeholder="Enter phone number"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>

            <Form.Item
              name="address"
              label={<span className="text-sm font-semibold text-foreground">Address</span>}
            >
              <AntInput.TextArea
                rows={3}
                placeholder="Enter address"
                className="border-border focus:border-primary focus:ring-primary resize-none"
              />
            </Form.Item>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCustomerModalOpen(false)
                  customerForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creatingCustomer}>
                Create Customer
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
              label={<span className="text-sm font-semibold text-foreground">Code</span>}
              rules={[{ required: true, message: 'Please enter currency code' }]}
            >
              <AntInput
                placeholder="Enter currency code (e.g., USD, EUR)"
                className="h-11 border-border focus:border-primary focus:ring-primary"
                maxLength={3}
              />
            </Form.Item>

            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Name</span>}
              rules={[{ required: true, message: 'Please enter currency name' }]}
            >
              <AntInput
                placeholder="Enter currency name (e.g., US Dollar)"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>

            <Form.Item
              name="symbol"
              label={<span className="text-sm font-semibold text-foreground">Symbol</span>}
            >
              <AntInput
                placeholder="Enter currency symbol (e.g., $, €)"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
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

      {/* Sales Invoice Create Modal */}
      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Sales Invoice</DialogTitle>
            <DialogDescription>Create a new sales invoice to link with this receivable</DialogDescription>
          </DialogHeader>
          <InvoiceFormContent 
            form={invoiceForm}
            onCreateInvoice={onCreateInvoice}
            customers={customers}
            loadingCustomers={loadingCustomers}
            inventoryItems={inventoryItems}
            loadingInventory={loadingInventory}
            units={units}
            loadingUnits={loadingUnits}
            creatingInvoice={creatingInvoice}
            onCancel={() => setInvoiceModalOpen(false)}
            onInventoryUpdate={setInventoryItems}
            onUnitsUpdate={setUnits}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Separate component for invoice form to handle Form.useWatch properly
function InvoiceFormContent({
  form,
  onCreateInvoice,
  customers,
  loadingCustomers,
  inventoryItems,
  loadingInventory,
  units,
  loadingUnits,
  creatingInvoice,
  onCancel,
  onInventoryUpdate,
  onUnitsUpdate,
}: {
  form: any
  onCreateInvoice: (values: any) => Promise<void>
  customers: Customer[]
  loadingCustomers: boolean
  inventoryItems: InventoryItem[]
  loadingInventory: boolean
  units: Unit[]
  loadingUnits: boolean
  creatingInvoice: boolean
  onCancel: () => void
  onInventoryUpdate: (items: InventoryItem[]) => void
  onUnitsUpdate: (units: Unit[]) => void
}) {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  
  // Product and Unit creation state
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [productForm] = Form.useForm()
  const [unitForm] = Form.useForm()
  const [currentProductLineIndex, setCurrentProductLineIndex] = useState<number | null>(null)
  const [currentUnitLineIndex, setCurrentUnitLineIndex] = useState<number | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingBrands, setLoadingBrands] = useState(false)

  // Fetch brands when product modal opens
  useEffect(() => {
    if (productModalOpen) {
      const fetchBrands = async () => {
        setLoadingBrands(true)
        try {
          const res = await BrandAPI.list()
          setBrands(res.data.data)
        } catch (error) {
          console.error('Error fetching brands:', error)
        } finally {
          setLoadingBrands(false)
        }
      }
      fetchBrands()
    }
  }, [productModalOpen])

  // Generate product serial number
  const generateProductSerialNumber = async () => {
    try {
      const res = await InventoryAPI.list()
      const count = res.data.data.length
      const nextNumber = (count + 1).toString().padStart(4, '0')
      return `INV-${nextNumber}`
    } catch (error) {
      const timestamp = Date.now().toString(36).toUpperCase()
      return `INV-${timestamp}`
    }
  }

  // Create product
  const onCreateProduct = async (values: any) => {
    setCreatingProduct(true)
    try {
      if (!values.supplier && customers.length > 0) {
        // If no supplier selected, use the customer from the invoice form
        const invoiceCustomer = form.getFieldValue('customer')
        if (invoiceCustomer) {
          values.supplier = invoiceCustomer
        } else if (customers.length > 0) {
          values.supplier = customers[0]._id
        }
      }
      
      const serialNumber = await generateProductSerialNumber()
      const payload: InventoryInput = {
        serialNumber,
        name: values.name,
        description: values.description || undefined,
        supplier: values.supplier || '',
        qty: Number(values.qty) || 0,
        costPrice: Number(values.costPrice) || 0,
        brand: values.brand || undefined,
        unit: values.unit || undefined,
        vat: values.vat ? Number(values.vat) : undefined,
        productionDate: values.productionDate?.toISOString?.() || undefined,
        expiryDate: values.expiryDate?.toISOString?.() || undefined,
      }
      const res = await InventoryAPI.create(payload)
      const updatedItems = [...inventoryItems, res.data.data]
      onInventoryUpdate(updatedItems)
      
      // Select the newly created product in the current line item
      if (currentProductLineIndex !== null) {
        form.setFieldValue(['lineItems', currentProductLineIndex, 'product'], res.data.data._id)
      }
      setProductModalOpen(false)
      productForm.resetFields()
      setCurrentProductLineIndex(null)
      message.success('Product created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create product')
    } finally {
      setCreatingProduct(false)
    }
  }

  // Create unit
  const onCreateUnit = async (values: any) => {
    setCreatingUnit(true)
    try {
      const res = await UnitAPI.create(values)
      const updatedUnits = [...units, res.data.data]
      onUnitsUpdate(updatedUnits)
      
      // Select the newly created unit in the current line item
      if (currentUnitLineIndex !== null) {
        form.setFieldValue(['lineItems', currentUnitLineIndex, 'unit'], res.data.data._id)
      }
      setUnitModalOpen(false)
      unitForm.resetFields()
      setCurrentUnitLineIndex(null)
      message.success('Unit created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create unit')
    } finally {
      setCreatingUnit(false)
    }
  }

  // Watch line items and export invoice checkbox for totals calculation
  const watchedLineItems = Form.useWatch('lineItems', form) || []
  const isExportInvoice = Form.useWatch('isExportInvoice', form) || false
  const subtotal = useMemo(() => {
    return watchedLineItems.reduce((sum: number, item: any) => {
      const qty = Number(item?.qty) || 0
      const price = Number(item?.unitPrice) || 0
      return sum + (qty * price)
    }, 0)
  }, [watchedLineItems])
  const vatAmount = isExportInvoice ? 0 : subtotal * 0.05 // 5% VAT for local invoices, 0 for export
  const totalAfterVat = subtotal + vatAmount

  return (
    <>
    <Form
      id="invoice-form"
      form={form}
      layout="vertical"
      onFinish={onCreateInvoice}
      className="space-y-4"
      initialValues={{
        date: dayjs(),
        lineItems: [{ product: '', qty: 1, unit: '', unitPrice: 0 }],
        isExportInvoice: false,
      }}
    >
      <Form.Item
        name="customer"
        label={<span className="text-sm font-semibold text-foreground">Customer</span>}
        rules={[{ required: true, message: 'Please select a customer' }]}
      >
        <AntSelect
          showSearch
          placeholder="Select customer"
          filterOption={(input: string, option: any) =>
            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
          }
          optionFilterProp="label"
          disabled={loadingCustomers}
          loading={loadingCustomers}
          notFoundContent="No customers found"
          options={customers.map((c) => ({ value: c._id, label: c.name }))}
          style={{ height: 44, minHeight: 44 }}
          getPopupContainer={(node) => node.parentElement || document.body}
        />
      </Form.Item>

      <Form.Item
        name="date"
        label={<span className="text-sm font-semibold text-foreground">Date</span>}
        rules={[{ required: true, message: 'Please select date' }]}
      >
        <DatePicker
          className="w-full h-11 border-border focus-within:border-primary focus-within:ring-primary [&_.ant-picker-input>input]:h-11"
          format="YYYY-MM-DD HH:mm:ss"
          showTime={{ format: 'HH:mm:ss' }}
          placeholder="Select payment date and time"
        />
      </Form.Item>

      <Form.Item
        name="isExportInvoice"
        valuePropName="checked"
        className="mb-0"
      >
        <Checkbox>
          <span className="text-sm font-semibold text-foreground">Export Invoice / Local Invoice</span>
          <span className="text-xs text-muted-foreground ml-2">(Check for Export Invoice - No VAT, Uncheck for Local Invoice - With VAT)</span>
        </Checkbox>
      </Form.Item>

      <Form.List name="lineItems">
              {(fields, { add, remove }) => (
                <>
                  <div className="space-y-3">
                    {fields.map((field, index) => {
                      const { key, ...fieldProps } = field
                      return (
                        <div key={key} className="grid grid-cols-12 gap-3 items-end p-4 border border-border rounded-lg bg-card">
                          <Form.Item
                            {...fieldProps}
                            name={[field.name, 'product']}
                            label={index === 0 ? <span className="text-xs font-semibold text-foreground">Product</span> : null}
                            rules={[{ required: true, message: 'Required' }]}
                            className="col-span-3 mb-0"
                            getValueFromEvent={(value) => value}
                            getValueProps={(value) => ({ value: value || undefined })}
                          >
                            <div className="flex gap-2 items-stretch">
                              <AntSelect
                                showSearch
                                placeholder={loadingInventory ? "Loading..." : inventoryItems.length === 0 ? "No products available" : "Select product"}
                                filterOption={(input: string, option: any) =>
                                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                                optionFilterProp="label"
                                disabled={loadingInventory || inventoryItems.length === 0}
                                loading={loadingInventory}
                                notFoundContent="No products available"
                                options={inventoryItems.map((item) => ({
                                  value: item._id,
                                  label: item.name || item.serialNumber || item._id,
                                }))}
                                style={{ flex: 1, minHeight: 40 }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentProductLineIndex(field.name)
                                  // Pre-fill customer from invoice form
                                  const invoiceCustomer = form.getFieldValue('customer')
                                  if (invoiceCustomer) {
                                    productForm.setFieldsValue({ supplier: invoiceCustomer })
                                  }
                                  setProductModalOpen(true)
                                }}
                                className="h-10 w-10 p-0 flex-shrink-0 border-border hover:bg-muted/50 hover:border-border transition-colors"
                                title="Create new product"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </Form.Item>
                          <Form.Item
                            {...fieldProps}
                            name={[field.name, 'qty']}
                            label={index === 0 ? <span className="text-xs font-semibold text-foreground">Qty</span> : null}
                            rules={[{ required: true, message: 'Required' }]}
                            className="col-span-2 mb-0"
                          >
                            <AntInput
                              type="number"
                              min="0"
                              step="0.01"
                              className="h-10 border-border bg-muted/50 focus:border-primary focus:ring-primary hover:border-border transition-colors"
                              placeholder="0"
                            />
                          </Form.Item>
                          <Form.Item
                            {...fieldProps}
                            name={[field.name, 'unit']}
                            label={index === 0 ? <span className="text-xs font-semibold text-foreground">Unit</span> : null}
                            rules={[{ required: true, message: 'Required' }]}
                            className="col-span-3 mb-0"
                            getValueFromEvent={(value) => value}
                            getValueProps={(value) => ({ value: value || undefined })}
                          >
                            <div className="flex gap-2 items-stretch">
                              <AntSelect
                                showSearch
                                placeholder={loadingUnits ? "Loading..." : units.length === 0 ? "No units available" : "Select unit"}
                                filterOption={(input: string, option: any) =>
                                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                                optionFilterProp="label"
                                disabled={loadingUnits || units.length === 0}
                                loading={loadingUnits}
                                notFoundContent="No units available"
                                options={units.map((u) => ({ value: u._id, label: u.name }))}
                                style={{ flex: 1, minHeight: 40 }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentUnitLineIndex(field.name)
                                  setUnitModalOpen(true)
                                }}
                                className="h-10 w-10 p-0 flex-shrink-0 border-border hover:bg-muted/50 hover:border-border transition-colors"
                                title="Create new unit"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </Form.Item>
                          <Form.Item
                            {...fieldProps}
                            name={[field.name, 'unitPrice']}
                            label={index === 0 ? <span className="text-xs font-semibold text-foreground">Price</span> : null}
                            rules={[{ required: true, message: 'Required' }]}
                            className="col-span-2 mb-0"
                          >
                            <AntInput
                              type="number"
                              min="0"
                              step="0.01"
                              className="h-10 border-border bg-muted/50 focus:border-primary focus:ring-primary hover:border-border transition-colors"
                              placeholder="0.00"
                            />
                          </Form.Item>
                          {fields.length > 1 && (
                            <div className="col-span-2 flex items-end justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(field.name)}
                                className="h-10 w-10 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/30 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => add({ product: '', qty: 1, unit: '', unitPrice: 0 })}
                    className="w-full mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                  
                  {/* Totals Section */}
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Subtotal:</span>
                      <span className="text-foreground">{subtotal.toFixed(2)}</span>
                    </div>
                    {!isExportInvoice && (
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">VAT (5%):</span>
                        <span className="text-foreground">{vatAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
                      <span className="text-foreground">Total Amount:</span>
                      <span className="text-primary">{totalAfterVat.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
      </Form.List>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" loading={creatingInvoice}>
          Create Invoice
        </Button>
      </DialogFooter>
    </Form>

    {/* Create Product Modal */}
    <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your inventory. Name, Supplier, Quantity, and Cost Price are required.
          </DialogDescription>
        </DialogHeader>
        <Form
          form={productForm}
          layout="vertical"
          onFinish={onCreateProduct}
          className="space-y-4"
        >
          <Form.Item
            name="name"
            label={<span className="text-sm font-semibold text-foreground">Name *</span>}
            rules={[{ required: true, message: 'Product name is required' }]}
          >
            <Input
              placeholder="Enter product name"
              className="h-11 border-border focus:border-primary focus:ring-primary"
            />
          </Form.Item>
          <Form.Item
            name="description"
            label={<span className="text-sm font-semibold text-foreground">Description</span>}
          >
            <AntInput.TextArea
              rows={3}
              placeholder="Enter product description"
              className="border-border focus:border-primary focus:ring-primary resize-none"
            />
          </Form.Item>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="supplier"
              label={<span className="text-sm font-semibold text-foreground">Supplier *</span>}
              rules={[{ required: true, message: 'Supplier is required' }]}
            >
              <AntSelect
                showSearch
                placeholder="Select supplier"
                filterOption={(input: string, option: any) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                optionFilterProp="label"
                value={productForm.getFieldValue('supplier') || undefined}
                onChange={(value: string) => productForm.setFieldsValue({ supplier: value })}
                disabled={loadingCustomers || customers.length === 0}
                loading={loadingCustomers}
                notFoundContent="No suppliers found"
                options={customers.map((c) => ({ value: c._id, label: c.name }))}
                style={{ height: 44, minHeight: 44 }}
              />
            </Form.Item>
            <Form.Item
              name="brand"
              label={<span className="text-sm font-semibold text-foreground">Brand</span>}
            >
              <AntSelect
                showSearch
                placeholder="Select brand"
                filterOption={(input: string, option: any) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                optionFilterProp="label"
                value={productForm.getFieldValue('brand') || undefined}
                onChange={(value: string) => productForm.setFieldsValue({ brand: value })}
                disabled={loadingBrands || brands.length === 0}
                loading={loadingBrands}
                notFoundContent="No brands found"
                options={brands.map((b) => ({ value: b._id, label: b.name }))}
                style={{ height: 44, minHeight: 44 }}
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item
              name="qty"
              label={<span className="text-sm font-semibold text-foreground">Quantity *</span>}
              rules={[{ required: true, message: 'Quantity is required' }]}
            >
              <AntInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <Form.Item
              name="unit"
              label={<span className="text-sm font-semibold text-foreground">Unit</span>}
            >
              <AntSelect
                showSearch
                placeholder="Select unit"
                filterOption={(input: string, option: any) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                optionFilterProp="label"
                value={productForm.getFieldValue('unit') || undefined}
                onChange={(value: string) => productForm.setFieldsValue({ unit: value })}
                disabled={loadingUnits || units.length === 0}
                loading={loadingUnits}
                notFoundContent="No units found"
                options={units.map((u) => ({ value: u._id, label: u.name }))}
                style={{ height: 44, minHeight: 44 }}
              />
            </Form.Item>
            <Form.Item
              name="costPrice"
              label={<span className="text-sm font-semibold text-foreground">Cost Price *</span>}
              rules={[{ required: true, message: 'Cost price is required' }]}
            >
              <AntInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
          </div>
          <Form.Item
            name="vat"
            label={<span className="text-sm font-semibold text-foreground">VAT (%)</span>}
          >
            <AntInput
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              className="h-11 border-border focus:border-primary focus:ring-primary"
            />
          </Form.Item>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProductModalOpen(false)
                productForm.resetFields()
                setCurrentProductLineIndex(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creatingProduct}>
              Create Product
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Create Unit Modal */}
    <Dialog open={unitModalOpen} onOpenChange={setUnitModalOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Unit</DialogTitle>
          <DialogDescription>
            Add a new unit to your system. Name is required.
          </DialogDescription>
        </DialogHeader>
        <Form
          form={unitForm}
          layout="vertical"
          onFinish={onCreateUnit}
          className="space-y-4"
        >
          <Form.Item
            name="name"
            label={<span className="text-sm font-semibold text-foreground">Name *</span>}
            rules={[{ required: true, message: 'Unit name is required' }]}
          >
            <Input
              placeholder="Enter unit name (e.g., kg, pcs, box)"
              className="h-11 border-border focus:border-primary focus:ring-primary"
            />
          </Form.Item>
          <Form.Item
            name="symbol"
            label={<span className="text-sm font-semibold text-foreground">Symbol</span>}
          >
            <Input
              placeholder="Enter unit symbol (e.g., kg, pcs)"
              className="h-11 border-border focus:border-primary focus:ring-primary"
            />
          </Form.Item>
          <Form.Item
            name="description"
            label={<span className="text-sm font-semibold text-foreground">Description</span>}
          >
            <AntInput.TextArea
              rows={3}
              placeholder="Enter unit description"
              className="border-border focus:border-primary focus:ring-primary resize-none"
            />
          </Form.Item>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUnitModalOpen(false)
                unitForm.resetFields()
                setCurrentUnitLineIndex(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creatingUnit}>
              Create Unit
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  )
}
