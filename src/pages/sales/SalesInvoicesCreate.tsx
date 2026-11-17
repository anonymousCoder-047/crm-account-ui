import { Form, DatePicker, Input as AntInput, Select as AntSelect, App, message as antdMessage, Spin, Radio, Checkbox } from 'antd'
import { ArrowLeft, ReceiptText, Plus, X } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import { SalesInvoiceAPI, CustomerAPI, SettingsAPI, InventoryAPI, DeliveryOrderAPI, SupplierAPI, BrandAPI, UnitAPI, PaymentMethodAPI, PaymentStatusAPI, AccountAPI, type SalesInvoiceInput, type SalesInvoiceLineItem, type Customer, type InventoryItem, type Supplier, type Brand, type Unit, type PaymentMethod, type PaymentStatus, type Account } from '@/services/api'
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

// Store restoration state outside component to persist across renders without causing re-renders
const restorationState = { isRestoring: false, lastRestoredTab: '' }

export default function SalesInvoicesCreate() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const [loading, setLoading] = useState(false)
  const [loadingItem, setLoadingItem] = useState(isEditMode)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [lineItems, setLineItems] = useState<SalesInvoiceLineItem[]>([{ product: '', quantity: 1, unit_price: 0, total: 0 }])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [customerForm] = Form.useForm()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [trnFromSettings, setTrnFromSettings] = useState<string>('')
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [vatType, setVatType] = useState<'amount' | 'percentage'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [vatValue, setVatValue] = useState<number>(5)
  const [isExportInvoice, setIsExportInvoice] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [selectKey, setSelectKey] = useState<number>(0)
  const [deliveryOrderDialogOpen, setDeliveryOrderDialogOpen] = useState(false)
  const [selectedLineItemsForDO, setSelectedLineItemsForDO] = useState<Set<number>>(new Set())
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null)
  const [creatingDeliveryOrder, setCreatingDeliveryOrder] = useState(false)
  const [lineItemsForDO, setLineItemsForDO] = useState<SalesInvoiceLineItem[]>([])
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  const [paymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false)
  const [creatingPaymentMethod, setCreatingPaymentMethod] = useState(false)
  const [paymentMethodForm] = Form.useForm()
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([])
  const [loadingPaymentStatuses, setLoadingPaymentStatuses] = useState(false)
  const [paymentStatusModalOpen, setPaymentStatusModalOpen] = useState(false)
  const [creatingPaymentStatus, setCreatingPaymentStatus] = useState(false)
  const [paymentStatusForm] = Form.useForm()
  const [currentUnitLineIndex, setCurrentUnitLineIndex] = useState<number | null>(null)
  const [productModalActiveTab, setProductModalActiveTab] = useState('basic')
  const [priceInclusiveMaterialCost, setPriceInclusiveMaterialCost] = useState(true)
  const [materialCostComponents, setMaterialCostComponents] = useState<Array<{ account_id: string; account_name: string; amount: number; description?: string }>>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [materialCostModalOpen, setMaterialCostModalOpen] = useState(false)
  
  // Centralized product form state that persists across tab switches
  const [productFormData, setProductFormData] = useState<Partial<{
    serialNumber: string
    name: string
    description: string
    supplier: string
    brand: string
    qty: number
    unit: string
    costPrice: number
    vat: number
    productionDate: any
    expiryDate: any
    priceInclusiveMaterialCost: boolean
    materialCostComponents: Array<{ account_id: string; account_name: string; amount: number; description?: string }>
  }>>({})

  // Watch form values
  const customerValueRaw = Form.useWatch('customer', form)
  // Ensure customerValue is always a string ID, not an object
  const customerValue = customerValueRaw && typeof customerValueRaw === 'object' && customerValueRaw._id 
    ? customerValueRaw._id 
    : (typeof customerValueRaw === 'string' ? customerValueRaw : undefined)
  const paymentMethodValue = Form.useWatch('paymentMethod', form)
  const discountFormValue = Form.useWatch('discount', form)
  const vatFormValue = Form.useWatch('vat', form)

  // Centralized form state that persists across tab switches
  const [formData, setFormData] = useState<Partial<SalesInvoiceInput & { lineItems?: SalesInvoiceLineItem[] }>>({
    invoiceNumber: '',
    serialNumber: '',
    customer: undefined,
    date: undefined,
        deliveryAddress: '',
        status: 'unpaid' as 'paid' | 'unpaid',
        paymentMethod: undefined,
        trn: '',
        discount: 0,
        vat: 5,
        vatType: 'percentage' as 'amount' | 'percentage',
        vatValue: 5,
        isExportInvoice: false,
        line_items: [{ product: '', quantity: 1, unit_price: 0, total: 0 }],
  })

  const [loadedItemData, setLoadedItemData] = useState<Partial<SalesInvoiceInput & { lineItems?: SalesInvoiceLineItem[] }> | null>(null)

  // Auto-generate Invoice Number and Serial Number
  // Uses max existing numeric suffix so manually updated numbers continue the series correctly
  const generateInvoiceNumber = async () => {
    try {
      const res = await SalesInvoiceAPI.list()
      const invoices: any[] = res.data.data || []
      const prefix = 'SL-INV-'
      let maxNum = 0
      invoices.forEach((inv: any) => {
        const num = inv.invoice_number || inv.invoiceNumber || ''
        if (num.startsWith(prefix)) {
          const parsed = parseInt(num.slice(prefix.length), 10)
          if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed
        }
      })
      return `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`
    } catch (error) {
      const timestamp = Date.now().toString(36).toUpperCase()
      return `SL-INV-${timestamp}`
    }
  }
  const generateSerialNumber = async () => {
    try {
      const res = await SalesInvoiceAPI.list()
      const invoices: any[] = res.data.data || []
      const prefix = 'SL-INV-'
      let maxNum = 0
      invoices.forEach((inv: any) => {
        const num = inv.invoice_number || inv.invoiceNumber || inv.serial_number || inv.serialNumber || ''
        if (num.startsWith(prefix)) {
          const parsed = parseInt(num.slice(prefix.length), 10)
          if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed
        }
      })
      return `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`
    } catch (error) {
      const timestamp = Date.now().toString(36).toUpperCase()
      return `SL-INV-${timestamp}`
    }
  }

  // Fetch existing item data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchItem = async () => {
        setLoadingItem(true)
        try {
          const res = await SalesInvoiceAPI.get(id)
          const item = res.data.data
          
          const discountTypeValue = (item as any).discountType || 'amount'
          const discountValueValue = (item as any).discountValue || 0
          const vatTypeValue = (item as any).vatType || 'amount'
          const vatValueValue = (item as any).vatValue || 0
          
          const initialData = {
            invoiceNumber: item.invoice_number || item.invoiceNumber,
            serialNumber: item.serialNumber || '',
            customer: typeof item.customer_id === 'string' ? item.customer_id : (item.customer_id as any)?._id || (typeof item.customer === 'string' ? item.customer : (item.customer as any)?._id),
            date: item.invoice_date || item.date,
            due_date: item.due_date,
            deliveryAddress: item.deliveryAddress || '',
            status: item.payment_status || item.status || 'unpaid',
            payment_status: item.payment_status || item.status || 'unpaid',
            paymentMethod: item.payment_method || item.paymentMethod,
            payment_terms: item.payment_terms,
            notes: item.notes,
            trn: item.trn || '',
            discount: discountValueValue, // Use discountValue, not calculated discount
            discountType: discountTypeValue,
            discountValue: discountValueValue,
            vat: vatValueValue, // Use vatValue (original input), not calculated vat
            vatType: vatTypeValue,
            vatValue: vatValueValue,
            isExportInvoice: (item as any).isExportInvoice || false,
            lineItems: ((item.line_items || item.lineItems || []).map((li: any) => ({
              product: typeof li.product === 'string' ? li.product : (li.product?._id || li.product?.id || ''),
              quantity: li.quantity || li.qty || 0,
              unit_price: li.unit_price || li.unitPrice || 0,
              total: li.total || 0,
              description: li.description || '',
              discount: li.discount || 0,
              vat: li.vat || 0,
            })) || [{ product: '', quantity: 1, unit_price: 0, total: 0 }]) as SalesInvoiceLineItem[],
          }
          setLoadedItemData(initialData)
          setFormData(initialData)
          setLineItems(initialData.lineItems || [{ product: '', quantity: 1, unit_price: 0, total: 0 }])
          
          // Restore discount and VAT types from saved data
          setDiscountType(discountTypeValue)
          setDiscountValue(discountValueValue)
          setVatType(vatTypeValue)
          setVatValue(vatValueValue)
          setIsExportInvoice((item as any).isExportInvoice || false)
          
          // Set form values with the original input values, not calculated values
          form.setFieldsValue({
            invoiceNumber: item.invoice_number || item.invoiceNumber,
            date: item.invoice_date || item.date ? dayjs(item.invoice_date || item.date) : undefined,
            due_date: item.due_date ? dayjs(item.due_date) : undefined,
            status: item.payment_status || item.status || 'unpaid',
            payment_status: item.payment_status || item.status || 'unpaid',
            payment_terms: item.payment_terms,
            notes: item.notes,
            discount: discountValueValue,
            vat: vatValueValue,
            isExportInvoice: (item as any).isExportInvoice || false,
          })
        } catch (error) {
          console.error('Error fetching sales invoice:', error)
          message.error('Failed to load sales invoice')
          navigate('/sales-invoices/manage')
        } finally {
          setLoadingItem(false)
        }
      }
      fetchItem()
    } else {
      Promise.all([generateInvoiceNumber(), generateSerialNumber()]).then(([invoiceNumber, serialNumber]) => {
        const initialData = {
          invoiceNumber,
          serialNumber,
          customer: undefined,
          date: undefined,
          due_date: undefined,
          deliveryAddress: '',
          status: 'unpaid' as 'paid' | 'unpaid',
          payment_status: 'unpaid' as 'unpaid' | 'partial' | 'paid' | 'overdue',
          paymentMethod: undefined,
          payment_terms: undefined,
          notes: undefined,
          trn: '',
          discount: 0,
          vat: 5,
          vatType: 'percentage' as 'amount' | 'percentage',
          vatValue: 5,
          lineItems: [{ product: '', quantity: 1, unit_price: 0, total: 0 }],
        }
        setFormData(initialData)
        setLineItems(initialData.lineItems)
        form.setFieldsValue(initialData)
      })
    }
  }, [id, isEditMode, form, navigate, message])

  // Helper function to convert formData to form values format
  const prepareFormValues = (data: Partial<SalesInvoiceInput & { lineItems?: SalesInvoiceLineItem[] }>) => {
    const valuesToRestore: any = { ...data }
    
    if (valuesToRestore.date && typeof valuesToRestore.date === 'string') {
      valuesToRestore.date = dayjs(valuesToRestore.date)
    }
    
    // Ensure customer is always a string ID, not an object
    if (valuesToRestore.customer) {
      if (typeof valuesToRestore.customer === 'object' && valuesToRestore.customer._id) {
        valuesToRestore.customer = valuesToRestore.customer._id
      } else if (typeof valuesToRestore.customer !== 'string') {
        valuesToRestore.customer = String(valuesToRestore.customer)
      }
    }
    
    return valuesToRestore
  }

  // Helper function to restore form values from central state
  const restoreFormValues = (data: Partial<SalesInvoiceInput & { lineItems?: SalesInvoiceLineItem[] }>, tab?: string) => {
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
  const handleFormValuesChange = (_changedValues: any, allValues: any) => {
    if (restorationState.isRestoring) return
    
    // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
    setFormData((prev: any) => {
      const updated: any = { ...prev, ...allValues }
      
      if (updated.date && dayjs.isDayjs(updated.date)) {
        updated.date = updated.date.toISOString()
      }
      
      // Ensure customer is always a string ID, not an object
      if (updated.customer) {
        if (typeof updated.customer === 'object' && updated.customer._id) {
          updated.customer = updated.customer._id
        } else if (typeof updated.customer !== 'string') {
          updated.customer = String(updated.customer)
        }
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
    if (customerValue || paymentMethodValue) {
      const timer = setTimeout(() => {
        setSelectKey(selectKey + 1)
      }, 50)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerValue, paymentMethodValue])

  // Fetch customers, settings, and inventory
  useEffect(() => {
    const fetchData = async () => {
      setLoadingCustomers(true)
      setLoadingInventory(true)
      try {
        const [customersRes, settingsRes, inventoryRes] = await Promise.all([
          CustomerAPI.list(),
          SettingsAPI.get(),
          InventoryAPI.list(),
        ])
        setCustomers(customersRes.data.data)
        setInventoryItems(inventoryRes.data.data)
        const trn = settingsRes.data.data?.taxInformation?.trn || ''
        setTrnFromSettings(trn)
        if (trn && !formData.trn) {
          form.setFieldsValue({ trn })
          // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
          setFormData((prev: any) => ({ ...prev, trn }))
        }
      } catch (error) {
        console.error('Error fetching customers/settings/inventory:', error)
      } finally {
        setLoadingCustomers(false)
        setLoadingInventory(false)
      }
    }
    fetchData()
  }, [form])

  // Fetch suppliers, brands, and units for product creation
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersRes, brandsRes, unitsRes, accountsRes] = await Promise.all([
          SupplierAPI.list(),
          BrandAPI.list(),
          UnitAPI.list(),
          AccountAPI.list().catch((err) => {
            console.error('Error fetching accounts:', err)
            return { data: { success: true, data: [] } }
          }),
        ])
        setSuppliers(suppliersRes.data.data)
        setBrands(brandsRes.data.data)
        setUnits(unitsRes.data.data)
        
        // Filter accounts to only show active ones and remove duplicates
        const allAccounts = accountsRes.data?.data || []
        const activeAccounts = allAccounts.filter((acc: Account) => acc.is_active !== false)
        const uniqueAccounts = activeAccounts.reduce((acc: Account[], current: Account) => {
          const existing = acc.find((item: Account) => item.account_id === current.account_id)
          if (!existing) {
            acc.push(current)
          }
          return acc
        }, [] as Account[])
        setAccounts(uniqueAccounts)
      } catch (error) {
        console.error('Error fetching suppliers/brands/units:', error)
      }
    }
    fetchData()
  }, [])

  // Fetch payment methods and payment statuses
  useEffect(() => {
    const fetchData = async () => {
      setLoadingPaymentMethods(true)
      setLoadingPaymentStatuses(true)
      try {
        const [paymentMethodsRes, paymentStatusesRes] = await Promise.all([
          PaymentMethodAPI.list({ activeOnly: true }),
          PaymentStatusAPI.list({ activeOnly: true }),
        ])
        setPaymentMethods(paymentMethodsRes.data.data)
        setPaymentStatuses(paymentStatusesRes.data.data)
      } catch (error) {
        console.error('Error fetching payment methods/statuses:', error)
      } finally {
        setLoadingPaymentMethods(false)
        setLoadingPaymentStatuses(false)
      }
    }
    fetchData()
  }, [])

  // Auto-populate serial number when product modal opens
  useEffect(() => {
    if (productModalOpen) {
      generateProductSerialNumber().then((serialNumber) => {
        productForm.setFieldsValue({ serialNumber })
        setProductFormData((prev) => ({ ...prev, serialNumber }))
      })
    } else {
      // Reset product form data when modal closes
      setProductFormData({})
      setPriceInclusiveMaterialCost(true)
      setMaterialCostComponents([])
      setProductModalActiveTab('basic')
    }
  }, [productModalOpen])

  // Restore form values from productFormData when switching tabs or opening modal
  useEffect(() => {
    if (!productModalOpen) return

    // Restore form values from persisted state
    if (Object.keys(productFormData).length > 0) {
      productForm.setFieldsValue(productFormData)
      
      // Restore material cost components state
      if (productFormData.materialCostComponents) {
        setMaterialCostComponents(productFormData.materialCostComponents)
      }
      if (productFormData.priceInclusiveMaterialCost !== undefined) {
        setPriceInclusiveMaterialCost(productFormData.priceInclusiveMaterialCost)
      }
    }
  }, [productModalActiveTab, productModalOpen])

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
      // Get all form values including unmounted fields (from all tabs)
      const allFormValues = productForm.getFieldsValue(true)
      // Merge with productFormData to ensure we have all persisted data
      const mergedValues = { ...productFormData, ...allFormValues, ...values }
      
      const serialNumber = mergedValues.serialNumber || await generateProductSerialNumber()
      
      // Trim and validate name - ensure it's not empty
      const productName = (mergedValues.name || '').trim()
      if (!productName) {
        message.error('Product name is required')
        setCreatingProduct(false)
        return
      }
      
      // Trim description and only include if it has a value
      const productDescription = mergedValues.description?.trim() || undefined
      
      // Base cost price - DO NOT add material cost here, keep it as base unit cost
      const baseCostPrice = Number(mergedValues.costPrice) || 0
      
      // Calculate total material cost for reference (not added to cost price)
      const totalMaterialCost = !priceInclusiveMaterialCost && materialCostComponents.length > 0
        ? materialCostComponents
            .filter(comp => comp.account_id && comp.account_name && comp.amount > 0)
            .reduce((sum, comp) => sum + (comp.amount || 0), 0)
        : 0
      
      // Ensure VAT defaults to 5 if not provided
      const vatValue = mergedValues.vat !== undefined && mergedValues.vat !== null && mergedValues.vat !== '' 
        ? Number(mergedValues.vat) 
        : 5
      
      // Ensure VAT is always a valid number
      const finalVatValue = isNaN(vatValue) || vatValue < 0 ? 5 : vatValue
      
      const payload = {
        serialNumber,
        name: productName,
        description: productDescription,
        supplier: mergedValues.supplier || undefined,
        qty: Number(mergedValues.qty) || 0,
        costPrice: baseCostPrice, // Store base unit cost, not including material cost
        brand: mergedValues.brand || undefined,
        unit: mergedValues.unit || undefined,
        vat: finalVatValue, // Always include VAT, default to 5%, ensure it's always a number
        productionDate: mergedValues.productionDate?.toISOString?.() || undefined,
        expiryDate: mergedValues.expiryDate?.toISOString?.() || undefined,
        priceInclusiveMaterialCost: priceInclusiveMaterialCost,
        materialCostComponents: !priceInclusiveMaterialCost && materialCostComponents.length > 0 
          ? materialCostComponents.filter(comp => comp.account_id && comp.account_name && comp.amount > 0)
          : undefined,
      }
      const res = await InventoryAPI.create(payload)
      setInventoryItems([...inventoryItems, res.data.data])
      // Select the newly created product in the current line item
      if (currentProductLineIndex !== null) {
        onChangeLine(currentProductLineIndex, { product: res.data.data._id })
      }
      setProductModalOpen(false)
      productForm.resetFields()
      setProductFormData({})
      setCurrentProductLineIndex(null)
      setPriceInclusiveMaterialCost(true)
      setMaterialCostComponents([])
      setProductModalActiveTab('basic')
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
      if (currentUnitLineIndex !== null) {
        onChangeLine(currentUnitLineIndex, { unit: res.data.data.name })
      } else {
        productForm.setFieldsValue({ unit: res.data.data._id })
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

  // Create payment method inline
  const onCreatePaymentMethod = async (values: any) => {
    setCreatingPaymentMethod(true)
    try {
      const res = await PaymentMethodAPI.create(values)
      setPaymentMethods([...paymentMethods, res.data.data])
      form.setFieldsValue({ paymentMethod: res.data.data.name })
      // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
      setFormData((prev: any) => ({ ...prev, paymentMethod: res.data.data.name }))
      setPaymentMethodModalOpen(false)
      paymentMethodForm.resetFields()
      message.success('Payment method created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create payment method')
    } finally {
      setCreatingPaymentMethod(false)
    }
  }

  // Create payment status inline
  const onCreatePaymentStatus = async (values: any) => {
    setCreatingPaymentStatus(true)
    try {
      const res = await PaymentStatusAPI.create(values)
      setPaymentStatuses([...paymentStatuses, res.data.data])
      form.setFieldsValue({ status: res.data.data.name.toLowerCase() })
      // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
      setFormData((prev: any) => ({ ...prev, status: res.data.data.name.toLowerCase() }))
      setPaymentStatusModalOpen(false)
      paymentStatusForm.resetFields()
      message.success('Payment status created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create payment status')
    } finally {
      setCreatingPaymentStatus(false)
    }
  }

  const onAddLine = () => {
    const newItems = [...lineItems, { product: '', quantity: 1, unit_price: 0, total: 0 }]
    setLineItems(newItems)
    form.setFieldsValue({ lineItems: newItems })
    // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
    setFormData((prev: any) => ({ ...prev, lineItems: newItems }))
  }
  
  const onChangeLine = (idx: number, patch: Partial<SalesInvoiceLineItem>) => {
    const newItems = lineItems.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    setLineItems(newItems)
    form.setFieldsValue({ lineItems: newItems })
    // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
    setFormData((prev: any) => ({ ...prev, lineItems: newItems }))
  }
  
  const onRemoveLine = (idx: number) => {
    const newItems = lineItems.filter((_, i) => i !== idx)
    setLineItems(newItems)
    form.setFieldsValue({ lineItems: newItems })
    // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
    setFormData((prev: any) => ({ ...prev, lineItems: newItems }))
  }

  const onCreateCustomer = async (values: any) => {
    setCreatingCustomer(true)
    try {
      const res = await CustomerAPI.create(values)
      const newCustomer = res.data.data
      setCustomers([...customers, newCustomer])
      form.setFieldsValue({ customer: newCustomer._id })
      // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
      setFormData((prev: any) => ({ ...prev, customer: newCustomer._id }))
      
      // Auto-fill delivery address from newly created customer
      if (newCustomer.address) {
        form.setFieldsValue({ deliveryAddress: newCustomer.address })
        // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
        setFormData((prev: any) => ({ ...prev, deliveryAddress: newCustomer.address }))
      }
      
      setCustomerModalOpen(false)
      customerForm.resetFields()
      message.success('Customer created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create customer')
    } finally {
      setCreatingCustomer(false)
    }
  }

  // Calculate totals
  const lineItemTotals = useMemo(() => {
    return lineItems.map((item) => {
      const total = (item.quantity || item.qty || 0) * (item.unit_price || item.unitPrice || 0)
      return Math.round(total * 100) / 100 // Round to 2 decimal places
    })
  }, [lineItems])

  const grandTotal = useMemo(() => {
    return lineItemTotals.reduce((sum, total) => sum + total, 0)
  }, [lineItemTotals])

  // Watch form values for recalculation - update state when form values change
  useEffect(() => {
    const discount = discountFormValue !== undefined && discountFormValue !== null ? Number(discountFormValue) : 0
    const vat = vatFormValue !== undefined && vatFormValue !== null ? Number(vatFormValue) : 0
    setDiscountValue(discount)
    setVatValue(vat)
  }, [discountFormValue, vatFormValue])

  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') {
      return (grandTotal * discountValue) / 100
    }
    return discountValue
  }, [discountType, grandTotal, discountValue])

  const vatAmount = useMemo(() => {
    // If it's an Export Invoice, VAT should be 0
    if (isExportInvoice) {
      return 0
    }
    const subtotal = grandTotal - discountAmount
    if (vatType === 'percentage') {
      return (subtotal * vatValue) / 100
    }
    return vatValue
  }, [vatType, grandTotal, discountAmount, vatValue, isExportInvoice])

  const finalTotal = useMemo(() => {
    return grandTotal - discountAmount + vatAmount
  }, [grandTotal, discountAmount, vatAmount])

  // product-id → product-name map used by the live preview renderer
  const inventoryMap = useMemo(
    () => new Map(inventoryItems.map((item) => [item._id, item.name || ''])),
    [inventoryItems]
  )

  // Live preview data — reconstructed from the form as the user types.
  // Shaped to match what the real print path passes to the renderer.
  const previewInvoiceData = useMemo<InvoiceData>(() => {
    const customerObj = customers.find((c) => c._id === customerValue)
    const pm = paymentMethods.find(
      (m) => (m as any)._id === paymentMethodValue || m.name === paymentMethodValue
    )
    const items = lineItems.map((li, idx) => ({
      ...(li as any),
      slNo: idx + 1,
      qty: (li as any).quantity ?? (li as any).qty,
      unitPrice: (li as any).unit_price ?? (li as any).unitPrice,
    }))
    return {
      invoice: {
        invoice_number: formData.invoiceNumber || '',
        serial_number: formData.serialNumber || '',
        date: formData.date ? dayjs(formData.date).toISOString() : new Date().toISOString(),
        delivery_address: formData.deliveryAddress || '',
        payment_method: pm?.name || '',
        status: formData.status || 'unpaid',
        trn: formData.trn || trnFromSettings,
        discount: discountAmount,
        vat: vatAmount,
        customer: customerObj,
        line_items: items,
      },
      customer: customerObj,
      lineItems: items,
    } as unknown as InvoiceData
  }, [
    formData, lineItems, customerValue, customers,
    paymentMethodValue, paymentMethods,
    discountAmount, vatAmount, trnFromSettings,
  ])

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

      // Validate line items and show stock impact hints (only for create mode)
      if (!isEditMode) {
        const lowStockAlerts: string[] = []
        const outOfStockAlerts: string[] = []
        const negativeStockAlerts: string[] = []

        for (const lineItem of currentLineItems) {
          if (!lineItem.product) {
            message.error('Please select a product for all line items')
            setLoading(false)
            return
          }

          const inventoryItem = inventoryItems.find((item) => item._id === lineItem.product)
          if (!inventoryItem) {
            message.error(`Product not found in inventory`)
            setLoading(false)
            return
          }

          const availableQty = inventoryItem.qty ?? inventoryItem.quantity_on_hand ?? 0
          const requestedQty = lineItem.quantity || lineItem.qty || 0
          const newQty = availableQty - requestedQty

          if (availableQty <= 0) {
            outOfStockAlerts.push(`${inventoryItem.name} (currently ${availableQty})`)
          }

          if (newQty < 0) {
            negativeStockAlerts.push(`${inventoryItem.name} (${newQty} after sale)`)
          } else if (newQty < 10) {
            lowStockAlerts.push(`${inventoryItem.name} (${newQty} remaining)`)
          }
        }

        // Show out of stock alerts
        if (outOfStockAlerts.length > 0) {
          message.warning(
            `Out of stock alert: ${outOfStockAlerts.join(', ')}. Invoice will still be created and stock can go negative.`,
            6
          )
        }

        if (negativeStockAlerts.length > 0) {
          message.warning(
            `Negative stock after sale: ${negativeStockAlerts.join(', ')}`,
            6
          )
        }

        // Show low stock alerts
        if (lowStockAlerts.length > 0) {
          message.warning(
            `Low stock alert: ${lowStockAlerts.join(', ')} will have less than 10 units remaining after this sale.`,
            5
          )
        }
      }

      // Calculate discount and VAT amounts
      let finalDiscountValue = discountFormValue || 0
      let finalVatValue = vatFormValue || 0

      if (discountType === 'percentage') {
        finalDiscountValue = (grandTotal * finalDiscountValue) / 100
      }
      if (vatType === 'percentage') {
        const subtotal = grandTotal - finalDiscountValue
        finalVatValue = (subtotal * finalVatValue) / 100
      }

      // Transform lineItems to line_items with new field names and calculate totals
      const transformedLineItems = currentLineItems.map((item: any) => {
        const quantity = item.quantity || item.qty || 0
        const unit_price = item.unit_price || item.unitPrice || 0
        const lineDiscount = item.discount || 0
        const lineVat = isExportInvoice ? 0 : (item.vat || 0)
        const lineTotal = (quantity * unit_price) - lineDiscount + lineVat
        
        return {
          product: item.product,
          description: item.description || '',
          quantity,
          unit_price,
          total: lineTotal,
          discount: lineDiscount,
          vat: lineVat,
        }
      })

      // Get customer ID
      const customerId = typeof allFormValues.customer === 'string' 
        ? allFormValues.customer 
        : (allFormValues.customer as any)?._id || formData.customer || ''
      if (!customerId || !String(customerId).trim()) {
        message.error('Customer is required')
        setLoading(false)
        return
      }

      // Get dates
      const invoiceDate = allFormValues.date || formData.date || allFormValues.invoice_date || formData.invoice_date
      const dueDate = allFormValues.due_date || formData.due_date || (invoiceDate ? dayjs(invoiceDate).add(30, 'days').toISOString() : dayjs().add(30, 'days').toISOString())

      // Determine payment status - normalize to lowercase and check if paid
      const rawPaymentStatus = allFormValues.payment_status || allFormValues.status || formData.payment_status || formData.status || 'unpaid'
      const normalizedPaymentStatus = rawPaymentStatus.toLowerCase()
      const isPaid = normalizedPaymentStatus === 'paid'
      // Normalize status values: 'paid' -> 'paid', others keep their normalized form
      const paymentStatus = isPaid ? 'paid' : (normalizedPaymentStatus === 'partial' ? 'partial' : normalizedPaymentStatus === 'overdue' ? 'overdue' : 'unpaid')

      // Calculate total amount for balance_due
      const totalAmount = transformedLineItems.reduce((sum, item) => sum + (item.total || 0), 0) - finalDiscountValue + finalVatValue

      const payload: SalesInvoiceInput = {
        invoice_number: allFormValues.invoice_number || allFormValues.invoiceNumber || formData.invoice_number || formData.invoiceNumber || '',
        customer_id: customerId,
        invoice_date: invoiceDate?.toISOString?.() || (typeof invoiceDate === 'string' ? invoiceDate : dayjs(invoiceDate).toISOString()),
        due_date: dueDate?.toISOString?.() || (typeof dueDate === 'string' ? dueDate : dayjs(dueDate).toISOString()),
        line_items: transformedLineItems,
        discount: finalDiscountValue,
        tax_amount: finalVatValue,
        currency: allFormValues.currency || formData.currency || 'AED',
        payment_status: paymentStatus as 'unpaid' | 'partial' | 'paid' | 'overdue',
        balance_due: isPaid ? 0 : totalAmount, // If paid, balance_due is 0, otherwise equals total_amount
        payment_terms: allFormValues.payment_terms || formData.payment_terms || undefined,
        notes: allFormValues.notes || formData.notes || undefined,
        payment_method: isPaid ? (allFormValues.payment_method || allFormValues.paymentMethod || formData.payment_method || formData.paymentMethod || undefined) : undefined,
        reference_number: isPaid ? (allFormValues.reference_number || allFormValues.referenceNumber || formData.reference_number || formData.referenceNumber || undefined) : undefined,
        trn: allFormValues.trn || formData.trn || trnFromSettings || undefined,
        isExportInvoice: isExportInvoice || formData.isExportInvoice || false,
      }

      if (isEditMode && id) {
        await SalesInvoiceAPI.update(id, payload)
        message.success('Sales invoice updated successfully')
        navigate('/sales-invoices/manage')
      } else {
        const response = await SalesInvoiceAPI.create(payload)
        message.success('Sales invoice created successfully')
        // Backend handles inventory updates automatically
        
        // Show delivery order dialog after successful creation
        if (response.data.success && response.data.data) {
          setCreatedInvoiceId(response.data.data._id)
          // Pre-select all line items
          const allIndices = new Set<number>(currentLineItems.map((_: any, index: number) => index))
          setSelectedLineItemsForDO(allIndices)
          // Store current line items for dialog access
          setLineItemsForDO(currentLineItems)
          setDeliveryOrderDialogOpen(true)
        } else {
          navigate('/sales-invoices/manage')
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} sales invoice`)
    } finally {
      setLoading(false)
    }
  }

  // Generate delivery order serial number
  const generateDeliveryOrderSerialNumber = async () => {
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

  // Handle creating delivery order
  const handleCreateDeliveryOrder = async (useAllItems: boolean) => {
    if (!createdInvoiceId) return

    setCreatingDeliveryOrder(true)
    try {
      // Get the created invoice to get invoice number and other details
      const invoiceResponse = await SalesInvoiceAPI.get(createdInvoiceId)
      const invoice = invoiceResponse.data.data

      // Use stored line items from invoice creation
      const currentLineItemsForDO = lineItemsForDO.length > 0 ? lineItemsForDO : lineItems

      // Get selected line items
      const itemsToInclude = useAllItems 
        ? currentLineItemsForDO 
        : currentLineItemsForDO.filter((_: any, index: number) => selectedLineItemsForDO.has(index))

      if (itemsToInclude.length === 0) {
        message.error('Please select at least one item for the delivery order')
        setCreatingDeliveryOrder(false)
        return
      }

      // Convert sales invoice line items to delivery order line items
      const deliveryOrderLineItems = itemsToInclude.map((item: any) => ({
        product: item.product,
        qty: item.quantity || item.qty || 0,
        delivered: false,
      }))

      // Create FormData for delivery order
      const formDataPayload = new FormData()
      const doSerialNumber = await generateDeliveryOrderSerialNumber()
      formDataPayload.append('serialNumber', doSerialNumber)
      formDataPayload.append('invoiceNumber', createdInvoiceId)
      formDataPayload.append('date', invoice.invoice_date || invoice.date || new Date().toISOString())
      const customerId = typeof invoice.customer_id === 'string' ? invoice.customer_id : (invoice.customer_id as any)?._id || (typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?._id)
      formDataPayload.append('customer', customerId)
      if (invoice.deliveryAddress) {
        formDataPayload.append('deliveryAddress', invoice.deliveryAddress)
      }
      formDataPayload.append('lineItems', JSON.stringify(deliveryOrderLineItems))

      await DeliveryOrderAPI.create(formDataPayload)
      message.success('Delivery order created successfully')
      setDeliveryOrderDialogOpen(false)
      navigate('/sales-invoices/manage')
    } catch (error: any) {
      console.error('Error creating delivery order:', error)
      message.error(error.response?.data?.message || 'Failed to create delivery order')
    } finally {
      setCreatingDeliveryOrder(false)
    }
  }

  // Handle skipping delivery order creation
  const handleSkipDeliveryOrder = () => {
    setDeliveryOrderDialogOpen(false)
    navigate('/sales-invoices/manage')
  }

  // Toggle line item selection
  const toggleLineItemSelection = (index: number) => {
    const newSet = new Set<number>(selectedLineItemsForDO)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedLineItemsForDO(newSet)
  }

  // Get product name helper
  const getProductName = (productId: string) => {
    const product = inventoryItems.find((item) => item._id === productId)
    return product?.name || productId
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
          onClick={() => navigate('/sales-invoices/manage')}
          className="border-border hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ReceiptText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{isEditMode ? 'Edit Sales Invoice' : 'Create Sales Invoice'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isEditMode ? 'Update sales invoice' : 'Create a new sales invoice'}</p>
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
                  <TabsTrigger value="payment">Payment & Delivery</TabsTrigger>
                  <TabsTrigger value="items">Line Items</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="invoiceNumber"
                      label={<span className="text-sm font-semibold text-foreground">Invoice Number</span>}
                      normalize={(value) => value || ''}
                    >
                      <Input
                        placeholder="Auto-generated"
                        className="h-11 border-border focus:border-primary focus:ring-primary bg-muted/50"
                      />
                    </Form.Item>

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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="customer"
                      label={<span className="text-sm font-semibold text-foreground">Customer</span>}
                      rules={[{ required: true, message: 'Customer is required' }]}
                      normalize={(value) => {
                        // Ensure value is always a string ID, not an object
                        if (!value) return undefined
                        if (typeof value === 'object' && value._id) return value._id
                        if (typeof value === 'string') return value
                        return String(value)
                      }}
                    >
                      <div className="flex gap-2">
                        <AntSelect
                          showSearch
                          value={customerValue || undefined}
                          onChange={(value: string) => {
                            form.setFieldsValue({ customer: value })
                            // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                            setFormData((prev: any) => ({ ...prev, customer: value }))
                            const selectedCustomer = customers.find((c) => c._id === value)
                            if (selectedCustomer && selectedCustomer.address) {
                              form.setFieldsValue({ deliveryAddress: selectedCustomer.address })
                              // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                              setFormData((prev: any) => ({ ...prev, deliveryAddress: selectedCustomer.address }))
                            }
                          }}
                          disabled={loadingCustomers || customers.length === 0}
                          loading={loadingCustomers}
                          placeholder={customers.length === 0 ? "No customers available" : "Select customer"}
                          filterOption={(input: string, option: any) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                          notFoundContent="No customers found"
                          options={customers.map((c) => ({ value: c._id, label: c.name }))}
                          style={{ flex: 1, height: 44, minHeight: 44 }}
                          getPopupContainer={(node) => node.parentElement || document.body}
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

                    <Form.Item
                      name="date"
                      label={<span className="text-sm font-semibold text-foreground">Invoice Date *</span>}
                      rules={[{ required: true, message: 'Invoice date is required' }]}
                    >
                      <DatePicker
                        className="w-full h-11 border-border focus-within:border-primary focus-within:ring-primary [&_.ant-picker-input>input]:h-11"
                        placeholder="Select invoice date and time"
                        format="YYYY-MM-DD HH:mm:ss"
                        showTime={{ format: 'HH:mm:ss' }}
                        onChange={(date) => {
                          if (date) {
                            // If payment terms days is set, use it; otherwise default to 30 days
                            const paymentTermsDays = form.getFieldValue('paymentTermsDays')
                            const days = paymentTermsDays && paymentTermsDays > 0 ? paymentTermsDays : 30
                            const calculatedDueDate = dayjs(date).add(days, 'days')
                            form.setFieldsValue({ due_date: calculatedDueDate })
                            // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                            setFormData((prev: any) => ({ ...prev, due_date: calculatedDueDate }))
                          }
                        }}
                      />
                    </Form.Item>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="paymentTermsDays"
                      label={<span className="text-sm font-semibold text-foreground">Payment Terms (Days)</span>}
                    >
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g., 30"
                        className="h-11 border-border focus:border-primary focus:ring-primary"
                        onChange={(e) => {
                          const days = parseInt(e.target.value) || 0
                          if (days > 0) {
                            const invoiceDate = form.getFieldValue('date')
                            if (invoiceDate) {
                              const invoiceDateObj = dayjs.isDayjs(invoiceDate) ? invoiceDate : dayjs(invoiceDate)
                              const calculatedDueDate = invoiceDateObj.add(days, 'days')
                              form.setFieldsValue({ due_date: calculatedDueDate })
                              // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                              setFormData((prev: any) => ({ ...prev, due_date: calculatedDueDate }))
                            }
                          }
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="due_date"
                      label={<span className="text-sm font-semibold text-foreground">Due Date *</span>}
                      rules={[{ required: true, message: 'Due date is required' }]}
                    >
                      <DatePicker
                        className="w-full h-11 border-border focus-within:border-primary focus-within:ring-primary [&_.ant-picker-input>input]:h-11"
                        placeholder="Select due date and time"
                        format="YYYY-MM-DD HH:mm:ss"
                        showTime={{ format: 'HH:mm:ss' }}
                        onChange={(date) => {
                          // Clear payment terms days when due date is manually changed
                          if (date) {
                            const invoiceDate = form.getFieldValue('date')
                            if (invoiceDate) {
                              const invoiceDateObj = dayjs.isDayjs(invoiceDate) ? invoiceDate : dayjs(invoiceDate)
                              const days = dayjs(date).diff(invoiceDateObj, 'days')
                              form.setFieldsValue({ paymentTermsDays: days > 0 ? days : undefined })
                            }
                          }
                        }}
                      />
                    </Form.Item>
                  </div>
                </TabsContent>

                {/* Payment & Delivery Tab */}
                <TabsContent value="payment" className="space-y-4 mt-6">
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Payment Status - Hidden, defaults to 'unpaid' */}
                    <Form.Item
                      name="status"
                      hidden
                      initialValue="unpaid"
                    >
                      <Input type="hidden" />
                    </Form.Item>
                    {/* Payment Status - Hidden (set via Form initialValues/formData) */}
                    <Form.Item name="payment_status" hidden>
                      <Input type="hidden" />
                    </Form.Item>

                    <Form.Item
                      name="paymentMethod"
                      label={<span className="text-sm font-semibold text-foreground">Payment Method</span>}
                    >
                      <div className="flex gap-2">
                        <AntSelect
                          showSearch
                          key={`paymentMethod-${selectKey}-${paymentMethodValue || 'empty'}`}
                          value={paymentMethodValue === 'CREATE_NEW' ? undefined : paymentMethodValue || undefined}
                          onChange={(value: string) => {
                            if (value === 'CREATE_NEW') {
                              setPaymentMethodModalOpen(true)
                            } else {
                              form.setFieldsValue({ paymentMethod: value })
                              // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                              setFormData((prev: any) => ({ ...prev, paymentMethod: value as any }))
                            }
                          }}
                          disabled={loadingPaymentMethods}
                          loading={loadingPaymentMethods}
                          placeholder={loadingPaymentMethods ? "Loading..." : "Select payment method"}
                          filterOption={(input: string, option: any) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                          notFoundContent={loadingPaymentMethods ? "Loading..." : "No payment methods found"}
                          options={[
                            ...paymentMethods.map((m) => ({ value: m.name, label: m.name })),
                            { value: 'CREATE_NEW', label: '+ Create New Payment Method' },
                          ]}
                          style={{ flex: 1, height: 44, minHeight: 44 }}
                        />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name="trn"
                      label={<span className="text-sm font-semibold text-foreground">TRN</span>}
                      normalize={(value) => value || ''}
                    >
                      <Input
                        placeholder={trnFromSettings ? `From settings: ${trnFromSettings}` : "Enter TRN manually"}
                        className="h-11 border-border focus:border-primary focus:ring-primary bg-muted/50"
                      />
                    </Form.Item>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground">Product</span>}
                                className="mb-0"
                              >
                                <AntSelect
                                  showSearch
                                  placeholder={loadingInventory ? "Loading..." : inventoryItems.length === 0 ? "No products" : "Select product"}
                                  filterOption={(input: string, option: any) => {
                                    const searchText = (option?.searchLabel ?? option?.label ?? '').toString().toLowerCase()
                                    return searchText.includes(input.toLowerCase())
                                  }}
                                  optionFilterProp="label"
                                  optionLabelProp="label"
                                  value={li.product || undefined}
                                  onChange={(value: string) => {
                                    const selectedProduct = inventoryItems.find((item) => item._id === value)
                                    if (selectedProduct) {
                                      let unitName: string | undefined = undefined
                                      if (selectedProduct.unit) {
                                        if (typeof selectedProduct.unit === 'object' && (selectedProduct.unit as any).name) {
                                          unitName = (selectedProduct.unit as any).name
                                        } else {
                                          const unitValue = String(selectedProduct.unit)
                                          const foundUnit = units.find((u) => u._id === unitValue)
                                          unitName = foundUnit ? foundUnit.name : unitValue
                                        }
                                      }
                                      const unitPrice = selectedProduct.selling_price || selectedProduct.costPrice || selectedProduct.unit_cost || 0
                                      const roundedUnitPrice = Math.round(unitPrice * 100) / 100
                                      onChangeLine(idx, {
                                        product: value,
                                        quantity: li.quantity || li.qty || 1,
                                        unit: unitName,
                                        unit_price: roundedUnitPrice,
                                      })
                                    } else {
                                      onChangeLine(idx, { product: value })
                                    }
                                  }}
                                  disabled={loadingInventory}
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
                                      ? (item.supplier as any).name
                                      : typeof item.supplier === 'string'
                                        ? (suppliers.find((s) => s._id === item.supplier)?.name ?? '')
                                        : ''
                                    const searchLabel = `${displayName} ${sku} ${supplierName} ${item.description || ''}`.toLowerCase()
                                    const label = `${displayName}${sku ? ` (${sku})` : ''}`
                                    return { value: item._id, label, searchLabel, displayName, sku, qty, supplierName, isPending }
                                  })}
                                  optionRender={(option: any) => {
                                    const d = option.data ?? option
                                    return (
                                      <div className="flex flex-col py-1">
                                        <span className="font-medium text-foreground">{d?.displayName ?? d?.label}{d?.sku ? ` (${d.sku})` : ''}</span>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                                          {d?.supplierName && <span>Vendor: {d.supplierName}</span>}
                                          <span>Qty: {d?.qty ?? 0}</span>
                                          {d?.isPending && <span className="text-amber-400">⏳ Will be created</span>}
                                          {!d?.isPending && (d?.qty === 0 ? <span className="text-red-400">🔴 Out of Stock</span> : (d?.qty ?? 0) < 10 ? <span className="text-orange-400">⚠️ Low Stock</span> : null)}
                                        </div>
                                      </div>
                                    )
                                  }}
                                  dropdownStyle={{ minWidth: 450 }}
                                  style={{ width: '100%', minHeight: 40 }}
                                />
                              </Form.Item>

                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground">Description</span>}
                                className="mb-0"
                              >
                                <AntInput
                                  placeholder="Item description (optional)"
                                  value={li.description || ''}
                                  onChange={(e: any) => onChangeLine(idx, { description: e.target.value })}
                                  className="h-10 border-border focus:border-primary focus:ring-primary bg-muted/50"
                                />
                              </Form.Item>

                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground">Quantity</span>}
                                className="mb-0"
                              >
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Qty"
                                  value={li.quantity || li.qty || ''}
                                  onChange={(e: any) => {
                                    const qty = Number(e.target.value) || 0
                                    onChangeLine(idx, { quantity: qty })
                                  }}
                                  className="w-full h-10 border-border focus:border-primary focus:ring-primary bg-muted/50"
                                />
                                {li.product ? (() => {
                                  const selectedProduct = inventoryItems.find((item) => item._id === li.product)
                                  const availableQty = selectedProduct?.qty ?? 0
                                  const enteredQty = Number(li.quantity || li.qty || 0)
                                  const projectedQty = availableQty - enteredQty
                                  return (
                                    <div className="text-xs mt-1">
                                      <span className={projectedQty < 0 ? 'text-red-400 font-semibold' : availableQty <= 0 ? 'text-red-400 font-semibold' : availableQty < 10 ? 'text-orange-400' : 'text-muted-foreground'}>
                                        Available: {availableQty}
                                        {projectedQty < 0 && ` | Balance after sale: ${projectedQty}`}
                                        {availableQty === 0 && ' | Out of Stock'}
                                        {availableQty > 0 && availableQty < 10 && ' ⚠️ Low stock'}
                                      </span>
                                    </div>
                                  )
                                })() : null}
                              </Form.Item>

                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground">Unit</span>}
                                className="mb-0"
                              >
                                <div className="flex gap-2">
                                  <AntSelect
                                    showSearch
                                    value={li.unit === 'CREATE_NEW' ? undefined : li.unit || undefined}
                                    onChange={(value: string) => {
                                      if (value === 'CREATE_NEW') {
                                        setCurrentUnitLineIndex(idx)
                                        setUnitModalOpen(true)
                                      } else {
                                        onChangeLine(idx, { unit: value })
                                      }
                                    }}
                                    disabled={loadingUnits}
                                    loading={loadingUnits}
                                    placeholder={loadingUnits ? "Loading..." : "Select unit"}
                                    filterOption={(input: string, option: any) =>
                                      (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                    }
                                    optionFilterProp="label"
                                    notFoundContent={loadingUnits ? "Loading..." : "No units available"}
                                    options={[
                                      ...units.map((u) => ({ value: u.name, label: u.name })),
                                      { value: 'CREATE_NEW', label: '+ Create New Unit' },
                                    ]}
                                    className="flex-1 min-w-0"
                                    style={{ height: 40, minHeight: 40 }}
                                  />
                                </div>
                              </Form.Item>

                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground">Unit Price</span>}
                                className="mb-0"
                              >
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-xs">AED</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={li.unit_price || li.unitPrice ? Math.round(Number(li.unit_price || li.unitPrice) * 100) / 100 : ''}
                                    onChange={(e: any) => {
                                      const value = e.target.value
                                      const numValue = value === '' || value === null || value === undefined ? 0 : Number(value)
                                      onChangeLine(idx, { unit_price: numValue >= 0 ? numValue : 0 })
                                    }}
                                    onBlur={(e: any) => {
                                      // Round to 2 decimal places on blur
                                      const value = e.target.value
                                      if (value !== '' && value !== null && value !== undefined) {
                                        const numValue = Number(value)
                                        const roundedValue = Math.round(numValue * 100) / 100
                                        onChangeLine(idx, { unit_price: roundedValue >= 0 ? roundedValue : 0 })
                                      }
                                    }}
                                    className="w-full h-10 pl-10 border-border focus:border-primary focus:ring-primary bg-muted/50"
                                  />
                                </div>
                              </Form.Item>

                              <Form.Item
                                label={<span className="text-xs font-medium text-muted-foreground">Total Amount</span>}
                                className="mb-0"
                              >
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-xs">AED</span>
                                  <Input
                                    value={lineItemTotals[idx]?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    className="h-10 pl-10 border-border bg-muted text-foreground font-semibold"
                                    readOnly
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

                    {/* Discount and VAT Section */}
                    <Card className="border-border bg-card mt-6">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-foreground">Discount & VAT</h3>
                          <Form.Item
                            name="isExportInvoice"
                            valuePropName="checked"
                            className="mb-0"
                          >
                            <Checkbox
                              checked={isExportInvoice}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setIsExportInvoice(checked)
                                form.setFieldsValue({ isExportInvoice: checked })
                                // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                                setFormData((prev: any) => ({ ...prev, isExportInvoice: checked }))
                                // If Export Invoice, set VAT to 0
                                if (checked) {
                                  setVatValue(0)
                                  form.setFieldsValue({ vat: 0 })
                                  // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                                  setFormData((prev: any) => ({ ...prev, vat: 0, vatValue: 0 }))
                                } else {
                                  // If Local Invoice, restore default VAT
                                  setVatValue(5)
                                  form.setFieldsValue({ vat: 5 })
                                  // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                                  setFormData((prev: any) => ({ ...prev, vat: 5, vatValue: 5 }))
                                }
                              }}
                            >
                              <span className="text-sm font-medium text-foreground">Export Invoice / Local Invoice</span>
                            </Checkbox>
                          </Form.Item>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Form.Item
                            name="discount"
                            label={<span className="text-sm font-semibold text-foreground">Discount</span>}
                            normalize={(value) => {
                              if (value === undefined || value === null || value === '') return 0
                              return String(value)
                            }}
                            getValueFromEvent={(e: any) => {
                              const value = e.target.value
                              if (!value || value === '') return 0
                              return value
                            }}
                          >
                            <div className="space-y-2">
                              <Radio.Group
                                value={discountType}
                                onChange={(e: any) => setDiscountType(e.target.value)}
                                className="mb-2"
                              >
                                <Radio value="amount">Amount (AED)</Radio>
                                <Radio value="percentage">Percentage (%)</Radio>
                              </Radio.Group>
                              <div className="relative">
                                {discountType === 'amount' && (
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">AED</span>
                                )}
                                {discountType === 'percentage' && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">%</span>
                                )}
                                <Input
                                  type="number"
                                  min="0"
                                  max={discountType === 'percentage' ? 100 : undefined}
                                  step={discountType === 'amount' ? 0.01 : 0.1}
                                  placeholder={discountType === 'amount' ? "0.00" : "0"}
                                  value={discountFormValue !== undefined && discountFormValue !== null ? String(discountFormValue) : ''}
                                  onChange={(e: any) => {
                                    const numValue = e.target.value !== '' ? Number(e.target.value) : 0
                                    setDiscountValue(numValue)
                                    form.setFieldsValue({ discount: numValue })
                                    // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                                    setFormData((prev: any) => ({ ...prev, discount: numValue }))
                                  }}
                                  className={`w-full h-11 border-border focus:border-primary focus:ring-primary bg-muted/50 ${
                                    discountType === 'amount' ? 'pl-12' : 'pr-8'
                                  }`}
                                />
                              </div>
                            </div>
                          </Form.Item>

                          <Form.Item
                            name="vat"
                            label={<span className="text-sm font-semibold text-foreground">VAT</span>}
                            normalize={(value) => {
                              if (value === undefined || value === null || value === '') return 0
                              return String(value)
                            }}
                            getValueFromEvent={(e: any) => {
                              const value = e.target.value
                              if (!value || value === '') return 0
                              return value
                            }}
                          >
                            {isExportInvoice && (
                              <div className="mb-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                                Export Invoice: VAT is set to 0
                              </div>
                            )}
                            <div className="space-y-2">
                              <Radio.Group
                                value={vatType}
                                onChange={(e: any) => setVatType(e.target.value)}
                                className="mb-2"
                                disabled={isExportInvoice}
                              >
                                <Radio value="amount">Amount (AED)</Radio>
                                <Radio value="percentage">Percentage (%)</Radio>
                              </Radio.Group>
                              <div className="relative">
                                {vatType === 'amount' && (
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">AED</span>
                                )}
                                {vatType === 'percentage' && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">%</span>
                                )}
                                <Input
                                  type="number"
                                  min="0"
                                  max={vatType === 'percentage' ? 100 : undefined}
                                  step={vatType === 'amount' ? 0.01 : 0.1}
                                  placeholder={vatType === 'amount' ? "0.00" : "0"}
                                  value={vatFormValue !== undefined && vatFormValue !== null ? String(vatFormValue) : ''}
                                  onChange={(e: any) => {
                                    const numValue = e.target.value !== '' ? Number(e.target.value) : 0
                                    setVatValue(numValue)
                                    form.setFieldsValue({ vat: numValue })
                                    // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                                    setFormData((prev: any) => ({ ...prev, vat: numValue }))
                                  }}
                                  disabled={isExportInvoice}
                                  className={`w-full h-11 border-border focus:border-primary focus:ring-primary bg-muted/50 ${
                                    vatType === 'amount' ? 'pl-12' : 'pr-8'
                                  } ${isExportInvoice ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                              </div>
                            </div>
                          </Form.Item>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Totals Section */}
                    <Card className="border-border bg-card mt-6">
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-base">
                            <span className="font-semibold text-foreground">Grand Total:</span>
                            <span className="font-bold text-foreground text-lg">
                              AED {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>
                              Discount ({discountType === 'percentage' ? `${discountValue || 0}%` : 'Amount'}):
                            </span>
                            <span className={`font-semibold ${discountAmount > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                              {discountAmount > 0 ? '-' : ''} AED {discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>
                              VAT ({isExportInvoice ? 'Export Invoice (0%)' : vatType === 'percentage' ? `${vatValue || 0}%` : 'Amount'}):
                            </span>
                            <span className={`font-semibold ${vatAmount > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                              {vatAmount > 0 ? '+' : ''} AED {vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="border-t border-border pt-3 mt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-foreground">Final Total:</span>
                              <span className="text-2xl font-bold text-primary">
                                AED {finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/sales-invoices/manage')}
                  className="border-border hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  className="shadow-md hover:shadow-lg transition-shadow min-w-[160px]"
                >
                  {isEditMode ? 'Update Sales Invoice' : 'Create Sales Invoice'}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Live preview — renders the real print output for the current default template */}
      <div className="w-[520px] flex-shrink-0 sticky top-6 hidden xl:block">
        <LiveInvoicePreview
          docType="sales"
          invoiceData={previewInvoiceData}
          inventoryMap={inventoryMap}
          isExport={isExportInvoice}
        />
      </div>
      </div>

      {/* Create Customer Modal */}
      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to your system. Name is required.
            </DialogDescription>
          </DialogHeader>
          <Form
            form={customerForm}
            layout="vertical"
            onFinish={onCreateCustomer}
            className="space-y-4"
          >
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Name *</span>}
              rules={[{ required: true, message: 'Customer name is required' }]}
            >
              <Input
                placeholder="Enter customer name"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <Form.Item
              name="email"
              label={<span className="text-sm font-semibold text-foreground">Email</span>}
            >
              <Input
                type="email"
                placeholder="Enter email address"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <Form.Item
              name="phone"
              label={<span className="text-sm font-semibold text-foreground">Phone</span>}
            >
              <Input
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
            <Form.Item
              name="trn"
              label={<span className="text-sm font-semibold text-foreground">TRN</span>}
            >
              <Input
                placeholder="Enter TRN (Tax Registration Number)"
                className="h-11 border-border focus:border-primary focus:ring-primary"
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your inventory. All fields are optional.
            </DialogDescription>
          </DialogHeader>
          <Form
            form={productForm}
            layout="vertical"
            onFinish={onCreateProduct}
            className="space-y-4"
          >
            <Tabs value={productModalActiveTab} onValueChange={setProductModalActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="pricing">Pricing & Details</TabsTrigger>
                <TabsTrigger value="additional">Additional Info</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <Form.Item
                  name="serialNumber"
                  label={<span className="text-sm font-semibold text-foreground">Serial Number</span>}
                >
                  <Input
                    placeholder="Auto-generated"
                    className="h-11 border-border focus:border-primary focus:ring-primary bg-muted/50"
                    disabled
                  />
                </Form.Item>
                  <Form.Item
                    name="name"
                    label={<span className="text-sm font-semibold text-foreground">Name *</span>}
                    rules={[{ required: true, message: 'Product name is required' }]}
                  >
                    <Input
                      placeholder="Enter product name"
                      className="h-11 border-border focus:border-primary focus:ring-primary"
                      onChange={(e) => {
                        const value = e.target.value
                        productForm.setFieldsValue({ name: value })
                        setProductFormData((prev) => ({ ...prev, name: value }))
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="description"
                    label={<span className="text-sm font-semibold text-foreground">Description</span>}
                  >
                    <AntInput.TextArea
                      rows={4}
                      placeholder="Enter product description"
                      className="border-border focus:border-primary focus:ring-primary resize-none"
                      onChange={(e) => {
                        const value = e.target.value
                        productForm.setFieldsValue({ description: value })
                        setProductFormData((prev) => ({ ...prev, description: value }))
                      }}
                    />
                  </Form.Item>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    name="supplier"
                    label={<span className="text-sm font-semibold text-foreground">Supplier</span>}
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
                        onChange={(value: string) => {
                          productForm.setFieldsValue({ supplier: value })
                          setProductFormData((prev) => ({ ...prev, supplier: value }))
                        }}
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
                        onChange={(value: string) => {
                          productForm.setFieldsValue({ brand: value })
                          setProductFormData((prev) => ({ ...prev, brand: value }))
                        }}
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
              </TabsContent>

              {/* Pricing & Details Tab */}
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    name="qty"
                    label={<span className="text-sm font-semibold text-foreground">Quantity</span>}
                  >
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="h-11 border-border focus:border-primary focus:ring-primary"
                      onChange={(e) => {
                        const value = Number(e.target.value) || 0
                        productForm.setFieldsValue({ qty: value })
                        setProductFormData((prev) => ({ ...prev, qty: value }))
                      }}
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
                        onChange={(value: string) => {
                          productForm.setFieldsValue({ unit: value })
                          setProductFormData((prev) => ({ ...prev, unit: value }))
                        }}
                        disabled={loadingUnits || units.length === 0}
                        loading={loadingUnits}
                        notFoundContent="No units found"
                        options={units.map((u) => ({
                          value: u._id,
                          label: u.symbol ? `${u.name} (${u.symbol})` : u.name,
                        }))}
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
                </div>

                {/* Price Inclusive Material Cost Checkbox */}
                <Form.Item
                  name="priceInclusiveMaterialCost"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Checkbox
                    checked={priceInclusiveMaterialCost}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setPriceInclusiveMaterialCost(checked)
                      productForm.setFieldsValue({ priceInclusiveMaterialCost: checked })
                      setProductFormData((prev) => ({ ...prev, priceInclusiveMaterialCost: checked }))
                      if (checked) {
                        setMaterialCostComponents([])
                        productForm.setFieldsValue({ materialCostComponents: [] })
                        setProductFormData((prev) => ({ ...prev, materialCostComponents: [] }))
                      }
                    }}
                    className="text-sm"
                  >
                    Price inclusive material cost
                  </Checkbox>
                </Form.Item>

                {/* Button to open material cost modal when checkbox is unchecked */}
                {!priceInclusiveMaterialCost && (
                  <div className="mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMaterialCostModalOpen(true)}
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Material Cost Components
                    </Button>
                    {materialCostComponents.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {materialCostComponents.length} component(s) added. Total: AED {materialCostComponents.reduce((sum, comp) => sum + (comp.amount || 0), 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    name="costPrice"
                    label={<span className="text-sm font-semibold text-foreground">Cost Price</span>}
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">AED</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full h-11 pl-12 border-border focus:border-primary focus:ring-primary bg-muted/50"
                        placeholder="0.00"
                        onChange={(e) => {
                          const value = Number(e.target.value) || 0
                          productForm.setFieldsValue({ costPrice: value })
                          setProductFormData((prev) => ({ ...prev, costPrice: value }))
                        }}
                      />
                    </div>
                  </Form.Item>
                  <Form.Item
                    name="vat"
                    label={<span className="text-sm font-semibold text-foreground">VAT %</span>}
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full h-11 pr-8 border-border focus:border-primary focus:ring-primary bg-muted/50"
                        placeholder="5"
                        onChange={(e) => {
                          const value = Number(e.target.value) || 0
                          productForm.setFieldsValue({ vat: value })
                          setProductFormData((prev) => ({ ...prev, vat: value }))
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">%</span>
                    </div>
                  </Form.Item>
                </div>
              </TabsContent>

              {/* Additional Info Tab */}
              <TabsContent value="additional" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    name="productionDate"
                    label={<span className="text-sm font-semibold text-foreground">Production Date</span>}
                  >
                    <DatePicker
                      className="w-full h-11 border-border focus-within:border-primary focus-within:ring-primary [&_.ant-picker-input>input]:h-11"
                      placeholder="Select production date and time"
                      format="YYYY-MM-DD HH:mm:ss"
                      showTime={{ format: 'HH:mm:ss' }}
                      onChange={(date) => {
                        productForm.setFieldsValue({ productionDate: date })
                        setProductFormData((prev) => ({ ...prev, productionDate: date }))
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="expiryDate"
                    label={<span className="text-sm font-semibold text-foreground">Expiry Date</span>}
                  >
                    <DatePicker
                      className="w-full h-11 border-border focus-within:border-primary focus-within:ring-primary [&_.ant-picker-input>input]:h-11"
                      placeholder="Select expiry date and time"
                      format="YYYY-MM-DD HH:mm:ss"
                      showTime={{ format: 'HH:mm:ss' }}
                      onChange={(date) => {
                        productForm.setFieldsValue({ expiryDate: date })
                        setProductFormData((prev) => ({ ...prev, expiryDate: date }))
                      }}
                    />
                  </Form.Item>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setProductModalOpen(false)
                  productForm.resetFields()
                  setProductFormData({})
                  setCurrentProductLineIndex(null)
                  setPriceInclusiveMaterialCost(true)
                  setMaterialCostComponents([])
                  setProductModalActiveTab('basic')
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

      {/* Material Cost Components Modal */}
      <Dialog open={materialCostModalOpen} onOpenChange={setMaterialCostModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Material Cost Components</DialogTitle>
            <DialogDescription>
              Add material cost components that will be expensed and journaled. Each component will create an expense entry linked to the selected chart of account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {materialCostComponents.map((component, index) => (
              <Card key={index} className="p-4 border-border">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">Component {index + 1}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = materialCostComponents.filter((_, i) => i !== index)
                      setMaterialCostComponents(updated)
                      productForm.setFieldsValue({ materialCostComponents: updated })
                      setProductFormData((prev) => ({ ...prev, materialCostComponents: updated }))
                    }}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">Chart of Account *</label>
                    <AntSelect
                      showSearch
                      placeholder={loadingAccounts ? "Loading..." : "Select account"}
                      filterOption={(input: string, option: any) =>
                        (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                      }
                      optionFilterProp="label"
                      value={component.account_id || undefined}
                      onChange={(value) => {
                        const account = accounts.find((acc) => acc.account_id === value)
                        if (account) {
                          const updated = [...materialCostComponents]
                          updated[index] = {
                            ...updated[index],
                            account_id: account.account_id,
                            account_name: account.account_name,
                          }
                          setMaterialCostComponents(updated)
                          productForm.setFieldsValue({ materialCostComponents: updated })
                          setProductFormData((prev) => ({ ...prev, materialCostComponents: updated }))
                        }
                      }}
                      disabled={loadingAccounts}
                      loading={loadingAccounts}
                      notFoundContent={loadingAccounts ? "Loading..." : "No accounts available. Please create accounts in Chart of Accounts first."}
                      options={(() => {
                        const expenseAccounts = accounts.filter((acc) => acc.account_type === 'Expense')
                        const unique = accounts.reduce((acc: Account[], current: Account) => {
                          if (!acc.find((item) => item.account_id === current.account_id)) acc.push(current)
                          return acc
                        }, [] as Account[])
                        return unique.map((acc) => ({
                          value: acc.account_id,
                          label: `${acc.account_name}${acc.account_code ? ` (${acc.account_code})` : ''}${expenseAccounts.length === 0 ? ` - ${acc.account_type}` : ''}`,
                        }))
                      })()}
                      style={{ height: 44, minHeight: 44 }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">Amount (AED) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={component.amount || ''}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0
                        const updated = [...materialCostComponents]
                        updated[index] = { ...updated[index], amount }
                        setMaterialCostComponents(updated)
                        productForm.setFieldsValue({ materialCostComponents: updated })
                        setProductFormData((prev) => ({ ...prev, materialCostComponents: updated }))
                      }}
                      className="h-11 border-border"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">Description (Optional)</label>
                    <AntInput.TextArea
                      rows={2}
                      value={component.description || ''}
                      onChange={(e) => {
                        const updated = [...materialCostComponents]
                        updated[index] = { ...updated[index], description: e.target.value }
                        setMaterialCostComponents(updated)
                        productForm.setFieldsValue({ materialCostComponents: updated })
                        setProductFormData((prev) => ({ ...prev, materialCostComponents: updated }))
                      }}
                      className="border-border focus:border-primary focus:ring-primary resize-none"
                      placeholder="Enter description"
                    />
                  </div>
                </div>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const newComponent = { account_id: '', account_name: '', amount: 0, description: '' }
                const updated = [...materialCostComponents, newComponent]
                setMaterialCostComponents(updated)
                productForm.setFieldsValue({ materialCostComponents: updated })
                setProductFormData((prev) => ({ ...prev, materialCostComponents: updated }))
              }}
              className="w-full border-primary text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
            {materialCostComponents.length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Total Amount:</span>
                  <span className="text-lg font-bold text-primary">
                    AED {materialCostComponents.reduce((sum, comp) => sum + (comp.amount || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMaterialCostModalOpen(false)
              }}
            >
              Done
            </Button>
          </DialogFooter>
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

      {/* Delivery Order Creation Dialog */}
      <Dialog open={deliveryOrderDialogOpen} onOpenChange={setDeliveryOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Delivery Order</DialogTitle>
            <DialogDescription>
              Would you like to create a delivery order for this invoice? You can select all items or choose specific items.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <Button
                type="button"
                onClick={() => handleCreateDeliveryOrder(true)}
                disabled={creatingDeliveryOrder}
                className="flex-1"
              >
                Create with All Items
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipDeliveryOrder}
                disabled={creatingDeliveryOrder}
                className="flex-1"
              >
                Skip
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-foreground mb-3">Or select specific items:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(lineItemsForDO.length > 0 ? lineItemsForDO : (form.getFieldsValue(true).lineItems || lineItems)).map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedLineItemsForDO.has(index)}
                      onChange={() => toggleLineItemSelection(index)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {getProductName(item.product)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Quantity: {item.quantity || item.qty || 0} • Unit Price: {(item.unit_price || item.unitPrice || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={() => handleCreateDeliveryOrder(false)}
                disabled={creatingDeliveryOrder || selectedLineItemsForDO.size === 0}
                className="w-full mt-4"
              >
                {creatingDeliveryOrder ? 'Creating...' : `Create Delivery Order with ${selectedLineItemsForDO.size} Item(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payment Method Modal */}
      <Dialog open={paymentMethodModalOpen} onOpenChange={setPaymentMethodModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
              <Input
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

      {/* Create Payment Status Modal */}
      <Dialog open={paymentStatusModalOpen} onOpenChange={setPaymentStatusModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
              rules={[{ required: true, message: 'Payment status name is required' }]}
            >
              <Input
                placeholder="Enter payment status name"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <Form.Item
              name="description"
              label={<span className="text-sm font-semibold text-foreground">Description</span>}
            >
              <AntInput.TextArea
                rows={3}
                placeholder="Enter payment status description (optional)"
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
