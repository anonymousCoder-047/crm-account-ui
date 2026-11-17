import { Form, DatePicker, Switch, Upload, Input as AntInput, App, message as antdMessage, Spin, Select as AntSelect } from 'antd'
import { ArrowLeft, Truck, Plus, X, Upload as UploadIcon } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import { DeliveryOrderAPI, SalesInvoiceAPI, CustomerAPI, InventoryAPI, SupplierAPI, BrandAPI, UnitAPI, type DeliveryOrderInput, type SalesInvoice, type Customer, type InventoryItem, type Supplier, type Brand, type Unit } from '@/services/api'
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
import { cn } from '@/lib/utils'
import LiveInvoicePreview from '@/components/invoice/LiveInvoicePreview'
import type { InvoiceData } from '@/utils/templateRenderer'

interface LineItemForm {
  product: string
  qty: number
  delivered: boolean
}

// Store restoration state outside component to persist across renders without causing re-renders
const restorationState = { isRestoring: false, lastRestoredTab: '' }

export default function DeliveryOrdersCreate() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const [loading, setLoading] = useState(false)
  const [loadingItem, setLoadingItem] = useState(isEditMode)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ product: '', qty: 1, delivered: false }])
  const [files, setFiles] = useState<File[]>([])
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [customerForm] = Form.useForm()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [selectKey, setSelectKey] = useState<number>(0)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [productForm] = Form.useForm()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [brandModalOpen, setBrandModalOpen] = useState(false)
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [creatingSupplier, setCreatingSupplier] = useState(false)
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [supplierForm] = Form.useForm()
  const [brandForm] = Form.useForm()
  const [unitForm] = Form.useForm()
  const [currentProductLineIndex, setCurrentProductLineIndex] = useState<number | null>(null)

  // Watch form values
  const invoiceNumberValue = Form.useWatch('invoiceNumber', form)
  const customerValue = Form.useWatch('customer', form)

  // Centralized form state that persists across tab switches
  const [formData, setFormData] = useState<Partial<DeliveryOrderInput & { lineItems?: LineItemForm[] }>>({
    serialNumber: '',
    invoiceNumber: undefined,
    date: undefined,
    customer: undefined,
    deliveryAddress: '',
    lineItems: [{ product: '', qty: 1, delivered: false }],
  })

  const [loadedItemData, setLoadedItemData] = useState<Partial<DeliveryOrderInput & { lineItems?: LineItemForm[] }> | null>(null)

  // Auto-generate Serial Number
  const generateSerialNumber = async () => {
    try {
      const res = await DeliveryOrderAPI.list()
      const count = res.data.data.length
      const nextNumber = (count + 1).toString().padStart(4, '0')
      return `DL-ORD-${nextNumber}`
    } catch (error) {
      // Fallback to timestamp-based if API fails
      const timestamp = Date.now().toString(36).toUpperCase()
      return `DL-ORD-${timestamp}`
    }
  }

  // Fetch existing item data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchItem = async () => {
        setLoadingItem(true)
        try {
          const res = await DeliveryOrderAPI.get(id)
          const item = res.data.data
          
          // Get invoice ID from populated invoiceNumber
          // Backend stores invoiceNumber as ObjectId reference, so extract _id if populated
          let invoiceId = ''
          if (typeof item.invoiceNumber === 'object' && item.invoiceNumber !== null) {
            // Populated object, extract _id
            invoiceId = (item.invoiceNumber as any)?._id || ''
          } else if (typeof item.invoiceNumber === 'string') {
            // Should be ObjectId string (24 hex characters)
            // If it's not a valid ObjectId format, it might be an invoice number string (legacy data)
            // In that case, we need to find the invoice ID
            if (/^[0-9a-fA-F]{24}$/.test(item.invoiceNumber)) {
              // Valid ObjectId format, use as-is
              invoiceId = item.invoiceNumber
            } else {
              // Not a valid ObjectId, might be invoice number string - fetch invoices to find ID
              try {
                const invoicesRes = await SalesInvoiceAPI.list()
                const invoices = invoicesRes.data.data
                const invoice = invoices.find((inv: SalesInvoice) => inv.invoice_number === item.invoiceNumber)
                invoiceId = invoice?._id || item.invoiceNumber
              } catch (err) {
                console.error('Error fetching invoices for invoice lookup:', err)
                invoiceId = item.invoiceNumber // Fallback to original value
              }
            }
          } else {
            invoiceId = ''
          }
          
          const initialData = {
            serialNumber: item.serialNumber,
            invoiceNumber: invoiceId, // Store invoice _id, not invoice number string
            date: item.date,
            customer: typeof item.customer === 'string' ? item.customer : (item.customer as any)?._id,
            deliveryAddress: item.deliveryAddress || '',
            lineItems: item.lineItems || [{ product: '', qty: 1, delivered: false }],
          }
          setLoadedItemData(initialData)
          setFormData(initialData)
          setLineItems(initialData.lineItems || [{ product: '', qty: 1, delivered: false }])
        } catch (error) {
          console.error('Error fetching delivery order:', error)
          message.error('Failed to load delivery order')
          navigate('/delivery-orders/manage')
        } finally {
          setLoadingItem(false)
        }
      }
      fetchItem()
    } else {
      generateSerialNumber().then((serialNumber) => {
        const initialData = {
          serialNumber,
          invoiceNumber: undefined,
          date: undefined,
          customer: undefined,
          deliveryAddress: '',
          lineItems: [{ product: '', qty: 1, delivered: false }],
        }
        setFormData(initialData)
        setLineItems(initialData.lineItems)
        setFiles([]) // Reset files
        form.setFieldsValue(initialData)
      })
    }
  }, [id, isEditMode, form, navigate, message])

  // Helper function to convert formData to form values format
  const prepareFormValues = (data: Partial<DeliveryOrderInput & { lineItems?: LineItemForm[] }>) => {
    const valuesToRestore: any = { ...data }
    
    if (valuesToRestore.date && typeof valuesToRestore.date === 'string') {
      valuesToRestore.date = dayjs(valuesToRestore.date)
    }
    
    return valuesToRestore
  }

  // Helper function to restore form values from central state
  const restoreFormValues = (data: Partial<DeliveryOrderInput & { lineItems?: LineItemForm[] }>, tab?: string) => {
    if (!data.serialNumber && restorationState.isRestoring) return
    
    if (tab && restorationState.lastRestoredTab === tab) return
    
    restorationState.isRestoring = true
    if (tab) restorationState.lastRestoredTab = tab
    
    const valuesToRestore = prepareFormValues(data)
    form.setFieldsValue(valuesToRestore)
    
    if (data.lineItems) {
      setLineItems(data.lineItems)
      form.setFieldsValue({ lineItems: data.lineItems })
    }
    
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
    
    setFormData((prev) => {
      const updated: any = { ...prev, ...allValues }
      
      if (updated.date && dayjs.isDayjs(updated.date)) {
        updated.date = updated.date.toISOString()
      }
      
      if (updated.lineItems) {
        setLineItems(updated.lineItems)
      }
      
      return updated
    })
  }

  // Restore form values from central state when tab changes
  useEffect(() => {
    if (formData.serialNumber && !restorationState.isRestoring) {
      restoreFormValues(formData, activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Force Select components to re-render when form values change
  useEffect(() => {
    if (invoiceNumberValue || customerValue) {
      const timer = setTimeout(() => {
        setSelectKey(selectKey + 1)
      }, 50)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceNumberValue, customerValue])

  // Fetch sales invoices, customers, and inventory
  useEffect(() => {
    const fetchData = async () => {
      setLoadingInvoices(true)
      setLoadingCustomers(true)
      setLoadingInventory(true)
      try {
        const [invoicesRes, customersRes, inventoryRes] = await Promise.all([
          SalesInvoiceAPI.list(),
          CustomerAPI.list(),
          InventoryAPI.list(),
        ])
        setSalesInvoices(invoicesRes.data.data)
        setCustomers(customersRes.data.data)
        setInventoryItems(inventoryRes.data.data)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoadingInvoices(false)
        setLoadingCustomers(false)
        setLoadingInventory(false)
      }
    }
    fetchData()
  }, [])

  // Fetch suppliers, brands, and units for product creation
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersRes, brandsRes, unitsRes] = await Promise.all([
          SupplierAPI.list(),
          BrandAPI.list(),
          UnitAPI.list(),
        ])
        setSuppliers(suppliersRes.data.data)
        setBrands(brandsRes.data.data)
        setUnits(unitsRes.data.data)
      } catch (error) {
        console.error('Error fetching suppliers/brands/units:', error)
      }
    }
    fetchData()
  }, [])

  // Generate product serial number
  const generateProductSerialNumber = async () => {
    try {
      const res = await InventoryAPI.list()
      const count = res.data.data.length
      const nextNumber = (count + 1).toString().padStart(4, '0')
      return `INV-${nextNumber}`
    } catch (error) {
      // Fallback to timestamp-based if API fails
      const timestamp = Date.now().toString(36).toUpperCase()
      return `INV-${timestamp}`
    }
  }

  // Create product inline
  const onCreateProduct = async (values: any) => {
    setCreatingProduct(true)
    try {
      const serialNumber = await generateProductSerialNumber()
      const payload = {
        serialNumber,
        name: values.name,
        description: values.description || undefined,
        supplier: values.supplier,
        qty: Number(values.qty) || 0,
        costPrice: Number(values.costPrice) || 0,
        brand: values.brand || undefined,
        unit: values.unit || undefined,
        vat: values.vat ? Number(values.vat) : undefined,
        productionDate: values.productionDate?.toISOString?.() || undefined,
        expiryDate: values.expiryDate?.toISOString?.() || undefined,
      }
      const res = await InventoryAPI.create(payload)
      setInventoryItems([...inventoryItems, res.data.data])
      // Select the newly created product in the current line item
      if (currentProductLineIndex !== null) {
        onChangeLine(currentProductLineIndex, { product: res.data.data._id })
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

  // Create supplier inline
  const onCreateSupplier = async (values: any) => {
    setCreatingSupplier(true)
    try {
      const res = await SupplierAPI.create(values)
      setSuppliers([...suppliers, res.data.data])
      productForm.setFieldsValue({ supplier: res.data.data._id })
      setSupplierModalOpen(false)
      supplierForm.resetFields()
      message.success('Supplier created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create supplier')
    } finally {
      setCreatingSupplier(false)
    }
  }

  // Create brand inline
  const onCreateBrand = async (values: any) => {
    setCreatingBrand(true)
    try {
      const res = await BrandAPI.create(values)
      setBrands([...brands, res.data.data])
      productForm.setFieldsValue({ brand: res.data.data._id })
      setBrandModalOpen(false)
      brandForm.resetFields()
      message.success('Brand created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create brand')
    } finally {
      setCreatingBrand(false)
    }
  }

  // Create unit inline
  const onCreateUnit = async (values: any) => {
    setCreatingUnit(true)
    try {
      const res = await UnitAPI.create(values)
      setUnits([...units, res.data.data])
      productForm.setFieldsValue({ unit: res.data.data._id })
      setUnitModalOpen(false)
      unitForm.resetFields()
      message.success('Unit created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create unit')
    } finally {
      setCreatingUnit(false)
    }
  }

  const onCreateCustomer = async (values: any) => {
    setCreatingCustomer(true)
    try {
      const res = await CustomerAPI.create(values)
      setCustomers([...customers, res.data.data])
      form.setFieldsValue({ customer: res.data.data._id })
      setFormData((prev) => ({ ...prev, customer: res.data.data._id }))
      setCustomerModalOpen(false)
      customerForm.resetFields()
      message.success('Customer created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create customer')
    } finally {
      setCreatingCustomer(false)
    }
  }

  const onAddLine = () => {
    const newItems = [...lineItems, { product: '', qty: 1, delivered: false }]
    setLineItems(newItems)
    form.setFieldsValue({ lineItems: newItems })
    setFormData((prev) => ({ ...prev, lineItems: newItems }))
  }
  
  const onChangeLine = (idx: number, patch: Partial<LineItemForm>) => {
    const newItems = lineItems.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    setLineItems(newItems)
    form.setFieldsValue({ lineItems: newItems })
    setFormData((prev) => ({ ...prev, lineItems: newItems }))
  }
  
  const onRemoveLine = (idx: number) => {
    const newItems = lineItems.filter((_, i) => i !== idx)
    setLineItems(newItems)
    form.setFieldsValue({ lineItems: newItems })
    setFormData((prev) => ({ ...prev, lineItems: newItems }))
  }

  // product-id → product-name map used by the live preview renderer
  const inventoryMap = useMemo(
    () => new Map(inventoryItems.map((item) => [item._id, item.name || ''])),
    [inventoryItems]
  )

  // Live preview data — reconstructed from the form as the user types.
  const previewInvoiceData = useMemo<InvoiceData>(() => {
    const customerObj = customers.find((c) => c._id === customerValue)
    const items = lineItems.map((li, idx) => ({ ...li, slNo: idx + 1 }))
    return {
      invoice: {
        serialNumber: formData.serialNumber || '',
        deliveryAddress: formData.deliveryAddress || '',
        date: formData.date ? dayjs(formData.date).toISOString() : new Date().toISOString(),
        customer: customerObj,
        lineItems: items,
      },
      customer: customerObj,
      lineItems: items,
    } as unknown as InvoiceData
  }, [formData, lineItems, customerValue, customers])

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      // Sync form values to formData before submission to ensure we have all data
      // Use getFieldsValue(true) to get all values including unmounted fields
      const formValues = form.getFieldsValue(true)
      const allFormValues = { ...formData, ...formValues, ...values }
      
      // Update formData with latest form values
      // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
      setFormData((prev: any) => ({ ...prev, ...allFormValues }))
      
      const currentLineItems = allFormValues.lineItems || lineItems

      const formDataPayload = new FormData()
      formDataPayload.append('serialNumber', allFormValues.serialNumber || formData.serialNumber || '')
      formDataPayload.append('invoiceNumber', allFormValues.invoiceNumber || formData.invoiceNumber || '')
      formDataPayload.append('date', (allFormValues.date || formData.date)?.toISOString?.() || (allFormValues.date || formData.date))
      formDataPayload.append('customer', allFormValues.customer || formData.customer || '')
      if (allFormValues.deliveryAddress || formData.deliveryAddress) {
        formDataPayload.append('deliveryAddress', allFormValues.deliveryAddress || formData.deliveryAddress || '')
      }
      formDataPayload.append('lineItems', JSON.stringify(currentLineItems))
      // Append multiple files
      files.forEach((file) => {
        formDataPayload.append('attachments', file)
      })
      
      if (isEditMode && id) {
        await DeliveryOrderAPI.update(id, formDataPayload)
        message.success('Delivery order updated successfully')
      } else {
        await DeliveryOrderAPI.create(formDataPayload)
        message.success('Delivery order created successfully')
      }
      navigate('/delivery-orders/manage')
    } catch (error: any) {
      message.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} delivery order`)
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
            <h1 className="text-3xl font-bold text-foreground">{isEditMode ? 'Edit Delivery Order' : 'Create Delivery Order'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isEditMode ? 'Update delivery order' : 'Create a new delivery order'}</p>
          </div>
        </div>
      </motion.div>

      {/* Form Card + live preview side by side */}
      <div className="flex gap-6 items-start">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex-1 min-w-0"
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
              key={isEditMode && loadedItemData ? `edit-${loadedItemData.serialNumber}` : 'create'}
            >
              {/* Hidden field to store line items in form */}
              <Form.Item name="lineItems" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="items">Line Items</TabsTrigger>
                  <TabsTrigger value="attachment">Attachment</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="serialNumber"
                      label={<span className="text-sm font-semibold text-foreground">Serial Number</span>}
                      normalize={(value) => value || ''}
                    >
                      <Input
                        placeholder="Auto-generated"
                        className="h-11 border-border focus:border-primary focus:ring-primary bg-muted/50"
                      />
                    </Form.Item>

                    <Form.Item
                      name="invoiceNumber"
                      label={<span className="text-sm font-semibold text-foreground">Invoice Number</span>}
                      rules={[{ required: true, message: 'Please select an invoice number' }]}
                    >
                      <AntSelect
                        key={`invoice-${selectKey}-${invoiceNumberValue || 'empty'}`}
                        showSearch
                        placeholder={loadingInvoices ? "Loading..." : salesInvoices.length === 0 ? "No invoices found" : "Select invoice number"}
                        filterOption={(input: string, option: any) =>
                          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        optionFilterProp="label"
                        value={invoiceNumberValue || undefined}
                        onChange={async (value: string) => {
                          form.setFieldsValue({ invoiceNumber: value })
                          // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                          setFormData((prev: any) => ({ ...prev, invoiceNumber: value }))
                          
                          // Fetch invoice details and import line items
                          try {
                            const invoice = salesInvoices.find(inv => inv._id === value)
                            if (invoice) {
                              const invoiceRes = await SalesInvoiceAPI.get(invoice._id)
                              const fullInvoice = invoiceRes.data.data
                              
                              if (fullInvoice.lineItems && fullInvoice.lineItems.length > 0) {
                                const importedLineItems: LineItemForm[] = fullInvoice.lineItems.map((item: any) => {
                                  const productId = typeof item.product === 'string' 
                                    ? item.product 
                                    : (item.product?._id || item.product?.id || '')
                                  return { product: productId, qty: item.qty || 1, delivered: false }
                                })
                                setLineItems(importedLineItems)
                                form.setFieldsValue({ lineItems: importedLineItems })
                                setFormData((prev: any) => ({ ...prev, lineItems: importedLineItems }))
                                message.success(`Imported ${importedLineItems.length} line item(s) from invoice`)
                              }
                              
                              if (!form.getFieldValue('customer')) {
                                const customerId = typeof fullInvoice.customer === 'string' 
                                  ? fullInvoice.customer 
                                  : (fullInvoice.customer as any)?._id
                                if (customerId) {
                                  form.setFieldsValue({ customer: customerId })
                                  setFormData((prev: any) => ({ ...prev, customer: customerId }))
                                }
                              }
                              
                              if (!form.getFieldValue('deliveryAddress') && fullInvoice.deliveryAddress) {
                                form.setFieldsValue({ deliveryAddress: fullInvoice.deliveryAddress })
                                setFormData((prev: any) => ({ ...prev, deliveryAddress: fullInvoice.deliveryAddress }))
                              }
                            }
                          } catch (error: any) {
                            console.error('Error importing invoice line items:', error)
                            message.warning('Failed to import line items from invoice')
                          }
                        }}
                        disabled={loadingInvoices || salesInvoices.length === 0}
                        loading={loadingInvoices}
                        notFoundContent="No invoices found"
                        options={salesInvoices.map((inv) => ({
                          value: inv._id,
                          label: inv.invoice_number || inv._id,
                        }))}
                        style={{ height: 44, minHeight: 44 }}
                      />
                    </Form.Item>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="date"
                      label={<span className="text-sm font-semibold text-foreground">Date</span>}
                      rules={[{ required: true, message: 'Please select a date' }]}
                    >
                      <DatePicker
                        className="w-full h-11 border-border focus-within:border-primary focus-within:ring-primary [&_.ant-picker-input>input]:h-11"
                        placeholder="Select date and time"
                        format="YYYY-MM-DD HH:mm:ss"
                        showTime={{ format: 'HH:mm:ss' }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="customer"
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
                          value={customerValue || undefined}
                          onChange={(value: string) => {
                            form.setFieldsValue({ customer: value })
                            setFormData((prev) => ({ ...prev, customer: value }))
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
                          title="Create customer with details"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="deliveryAddress"
                    label={<span className="text-sm font-semibold text-foreground">Delivery Address</span>}
                    normalize={(value) => value || ''}
                  >
                    <AntInput.TextArea
                      rows={4}
                      placeholder="Enter delivery address"
                      className="border-border focus:border-primary focus:ring-primary resize-none"
                    />
                  </Form.Item>
                </TabsContent>

                {/* Line Items Tab */}
                <TabsContent value="items" className="space-y-4 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onAddLine}
                        className="border-border hover:bg-muted/50"
                      >
                        <Plus className="h-4 w-4" />
                        Add Line Item
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {lineItems.map((li, idx) => (
                        <Card key={idx} className="border-border bg-muted/50">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground">Product</span>}
                                className="mb-0"
                              >
                                <div className="flex gap-2">
                                  <AntSelect
                                    showSearch
                                    placeholder={loadingInventory ? "Loading..." : inventoryItems.length === 0 ? "No products" : "Select product"}
                                    filterOption={(input: string, option: any) => {
                                      const searchText = (option?.searchLabel ?? option?.label ?? '').toString().toLowerCase()
                                      return searchText.includes(input.toLowerCase())
                                    }}
                                    optionFilterProp="label"
                                    value={li.product || undefined}
                                    onChange={(value: string) => onChangeLine(idx, { product: value })}
                                    disabled={loadingInventory || inventoryItems.length === 0}
                                    loading={loadingInventory}
                                    notFoundContent="No products found"
                                    popupRender={(menu) => (
                                      <>
                                        <div className="p-2 border-b border-border">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start"
                                            onClick={() => {
                                              setCurrentProductLineIndex(idx)
                                              setProductModalOpen(true)
                                            }}
                                          >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create New Product
                                          </Button>
                                        </div>
                                        {menu}
                                      </>
                                    )}
                                    options={inventoryItems.map((item) => {
                                      const isPending = (item as any).isPending || item._id.startsWith('pending-')
                                      const displayName = item.name || item.product_name || ''
                                      const sku = item.serialNumber || item.sku || ''
                                      const qty = item.qty ?? item.quantity_on_hand ?? 0
                                      const supplierName = item.supplier && typeof item.supplier === 'object' && item.supplier !== null
                                        ? (item.supplier as any).name : ''
                                      const searchLabel = `${displayName} ${sku} ${supplierName} ${item.description || ''}`.toLowerCase()
                                      const label = `${displayName}${sku ? ` (${sku})` : ''}${isPending ? ' ⏳ (Will be created)' : ` - Qty: ${qty}`}${!isPending && (qty === 0 ? ' 🔴 Out of Stock' : qty < 10 ? ' ⚠️ Low Stock' : '')}`
                                      return { value: item._id, label, searchLabel }
                                    })}
                                    style={{ flex: 1, minHeight: 40 }}
                                  />
                                </div>
                              </Form.Item>

                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground">Quantity</span>}
                                className="mb-0"
                              >
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Qty"
                                  value={li.qty || ''}
                                  onChange={(e: any) => onChangeLine(idx, { qty: Number(e.target.value) || 1 })}
                                  className="w-full h-10 border-border focus:border-primary focus:ring-primary bg-muted/50"
                                />
                              </Form.Item>

                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground">Delivered</span>}
                                className="mb-0"
                              >
                                <div className="flex items-center h-10">
                                  <Switch
                                    checked={li.delivered}
                                    onChange={(v) => onChangeLine(idx, { delivered: v })}
                                    className="data-[state=checked]:bg-primary"
                                  />
                                </div>
                              </Form.Item>

                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground opacity-0">Remove</span>}
                                className="mb-0"
                              >
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => onRemoveLine(idx)}
                                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 w-full h-10"
                                  disabled={lineItems.length === 1}
                                >
                                  <X className="h-4 w-4" />
                                  Remove
                                </Button>
                              </Form.Item>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Attachment Tab */}
                <TabsContent value="attachment" className="space-y-4 mt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Invoice File Attachment</h3>
                      <p className="text-xs text-muted-foreground mb-4">Upload the invoice file (PDF, images, or Office documents)</p>
                    </div>
                    <Upload
                      beforeUpload={(file) => {
                        setFiles((prev) => [...prev, file])
                        return false
                      }}
                      onRemove={(file) => {
                        setFiles((prev) => prev.filter((f) => f.uid !== file.uid))
                      }}
                      fileList={files.map((file, index) => ({
                        uid: `${index}-${file.name}`,
                        name: file.name,
                        status: 'done' as const,
                        size: file.size,
                        type: file.type,
                        originFileObj: file,
                      }))}
                      multiple
                      maxCount={10}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="border-border hover:bg-muted/50"
                      >
                        <UploadIcon className="h-4 w-4" />
                        Select Files (Max 10)
                      </Button>
                    </Upload>
                    {files.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {files.length} file{files.length > 1 ? 's' : ''} selected
                        </p>
                        {files.map((file, index) => (
                          <div key={index} className="p-3 bg-muted/50 rounded-md border border-border">
                            <p className="text-sm text-foreground">
                              <span className="font-medium">File {index + 1}:</span> {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/delivery-orders/manage')}
                  className="border-border hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  className="shadow-md hover:shadow-lg transition-shadow min-w-[170px]"
                >
                  {isEditMode ? 'Update Delivery Order' : 'Create Delivery Order'}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Live preview — renders the real print output for the current default template */}
      <div className="w-[520px] flex-shrink-0 sticky top-6 hidden xl:block">
        <LiveInvoicePreview
          docType="delivery"
          invoiceData={previewInvoiceData}
          inventoryMap={inventoryMap}
        />
      </div>
      </div>

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
                <div className="flex gap-2">
                  <AntSelect
                    showSearch
                    placeholder="Select supplier"
                    filterOption={(input: string, option: any) =>
                      (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                    optionFilterProp="label"
                    value={productForm.getFieldValue('supplier') || undefined}
                    onChange={(value: string) => productForm.setFieldsValue({ supplier: value })}
                    disabled={loadingSuppliers || suppliers.length === 0}
                    loading={loadingSuppliers}
                    notFoundContent="No suppliers found"
                    options={suppliers.map((s) => ({ value: s._id, label: s.name }))}
                    style={{ flex: 1, height: 44, minHeight: 44 }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSupplierModalOpen(true)}
                    className="border-border hover:bg-muted/50"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </Form.Item>
              <Form.Item
                name="brand"
                label={<span className="text-sm font-semibold text-foreground">Brand</span>}
              >
                <div className="flex gap-2">
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
                    style={{ flex: 1, height: 44, minHeight: 44 }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBrandModalOpen(true)}
                    className="border-border hover:bg-muted/50"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </Form.Item>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item
                name="qty"
                label={<span className="text-sm font-semibold text-foreground">Quantity *</span>}
                rules={[{ required: true, message: 'Quantity is required' }]}
              >
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="h-11 border-border focus:border-primary focus:ring-primary"
                />
              </Form.Item>
              <Form.Item
                name="unit"
                label={<span className="text-sm font-semibold text-foreground">Unit</span>}
              >
                <div className="flex gap-2">
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
                    style={{ flex: 1, height: 44, minHeight: 44 }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUnitModalOpen(true)}
                    className="border-border hover:bg-muted/50"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </Form.Item>
              <Form.Item
                name="costPrice"
                label={<span className="text-sm font-semibold text-foreground">Cost Price *</span>}
                rules={[{ required: true, message: 'Cost price is required' }]}
              >
                <Input
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
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="5"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="productionDate"
                label={<span className="text-sm font-semibold text-foreground">Production Date</span>}
              >
                <DatePicker
                  className="w-full h-11 border-border"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
              <Form.Item
                name="expiryDate"
                label={<span className="text-sm font-semibold text-foreground">Expiry Date</span>}
              >
                <DatePicker
                  className="w-full h-11 border-border"
                  format="YYYY-MM-DD HH:mm:ss"
                  showTime={{ format: 'HH:mm:ss' }}
                  placeholder="Select expiry date and time"
                />
              </Form.Item>
            </div>
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

      {/* Create Supplier Modal (for product creation) */}
      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier to your system. Name is required.
            </DialogDescription>
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
              rules={[{ required: true, message: 'Supplier name is required' }]}
            >
              <Input
                placeholder="Enter supplier name"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <Form.Item
              name="contact"
              label={<span className="text-sm font-semibold text-foreground">Contact</span>}
            >
              <Input
                placeholder="Enter contact information"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
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

      {/* Create Brand Modal (for product creation) */}
      <Dialog open={brandModalOpen} onOpenChange={setBrandModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Brand</DialogTitle>
            <DialogDescription>
              Add a new brand to your system. Name is required.
            </DialogDescription>
          </DialogHeader>
          <Form
            form={brandForm}
            layout="vertical"
            onFinish={onCreateBrand}
            className="space-y-4"
          >
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Name *</span>}
              rules={[{ required: true, message: 'Brand name is required' }]}
            >
              <Input
                placeholder="Enter brand name"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBrandModalOpen(false)
                  brandForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creatingBrand}>
                Create Brand
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Unit Modal (for product creation) */}
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUnitModalOpen(false)
                  unitForm.resetFields()
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
    </div>
  )
}
