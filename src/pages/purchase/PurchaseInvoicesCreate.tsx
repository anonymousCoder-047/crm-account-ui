import { Form, DatePicker, Input as AntInput, Select as AntSelect, App, message as antdMessage, Spin, Radio, Checkbox } from 'antd'
import { ArrowLeft, FileSpreadsheet, Plus, X } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import dayjs from 'dayjs'
import { PurchaseInvoiceAPI, SupplierAPI, InventoryAPI, BrandAPI, UnitAPI, PaymentMethodAPI, PaymentStatusAPI, AccountAPI, type PurchaseInvoiceInput, type PurchaseInvoiceLineItem, type Supplier, type InventoryItem, type Brand, type Unit, type PaymentMethod, type PaymentStatus, type Account } from '@/services/api'
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

export default function PurchaseInvoicesCreate() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const [loading, setLoading] = useState(false)
  const [loadingItem, setLoadingItem] = useState(isEditMode)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [lineItems, setLineItems] = useState<PurchaseInvoiceLineItem[]>([{ product: '', qty: 1, unitPrice: 0 }])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [creatingSupplier, setCreatingSupplier] = useState(false)
  const [supplierForm] = Form.useForm()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [vatType, setVatType] = useState<'amount' | 'percentage'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [vatValue, setVatValue] = useState<number>(0)
  const [activeTab, setActiveTab] = useState('basic')
  const [selectKey, setSelectKey] = useState<number>(0)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [productForm] = Form.useForm()
  
  // Watch product form values for total calculation
  const productCostPrice = Form.useWatch('costPrice', productForm)
  const [brands, setBrands] = useState<Brand[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [brandModalOpen, setBrandModalOpen] = useState(false)
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [creatingUnit, setCreatingUnit] = useState(false)
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
  const [pendingProducts, setPendingProducts] = useState<Array<{ tempId: string; data: any; lineItemIndex: number }>>([])
  const pendingProductCounterRef = useRef<number>(0)
  
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

  // Watch form values - must call all hooks unconditionally
  const vendorIdValue = Form.useWatch('vendor_id', form)
  const supplierValueOld = Form.useWatch('supplier', form)
  const paymentStatusValueNew = Form.useWatch('payment_status', form)
  const paymentStatusValueOld = Form.useWatch('paymentStatus', form)
  const discountFormValue = Form.useWatch('discount', form)
  const vatFormValue = Form.useWatch('vat', form)
  
  // Use the new field names first, fallback to old ones
  const supplierValue = vendorIdValue || supplierValueOld
  const paymentStatusValue = paymentStatusValueNew || paymentStatusValueOld

  // Centralized form state that persists across tab switches
  const [formData, setFormData] = useState<Partial<PurchaseInvoiceInput & { lineItems?: PurchaseInvoiceLineItem[] }>>({
    invoice_number: '',
    vendor_id: undefined,
    invoice_date: undefined,
    due_date: undefined,
    payment_status: undefined,
    discount: 0,
    vat: 0,
    vatType: 'percentage' as 'amount' | 'percentage',
    vatValue: 0,
    lineItems: [{ product: '', qty: 1, unitPrice: 0 }],
  })

  const [loadedItemData, setLoadedItemData] = useState<Partial<PurchaseInvoiceInput & { lineItems?: PurchaseInvoiceLineItem[] }> | null>(null)

  // Auto-generate Invoice Number
  // Uses max existing numeric suffix so manually updated numbers continue the series correctly
  const generateInvoiceNumber = async () => {
    try {
      const res = await PurchaseInvoiceAPI.list()
      const invoices: any[] = res.data.data || []
      const prefix = 'PR-INV-'
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
      return `PR-INV-${timestamp}`
    }
  }

  // Fetch existing item data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchItem = async () => {
        setLoadingItem(true)
        try {
          const res = await PurchaseInvoiceAPI.get(id)
          const item = res.data.data
          
          const discountTypeValue = (item as any).discountType || 'amount'
          const discountValueValue = (item as any).discountValue || 0
          const vatTypeValue = (item as any).vatType || 'amount'
          const vatValueValue = (item as any).vatValue || 0
          
          const initialData = {
            invoice_number: item.invoice_number || (item as any).supplierNumber,
            vendor_id: typeof item.vendor_id === 'string' ? item.vendor_id : (item.vendor_id as any)?._id || (typeof (item as any).supplier === 'string' ? (item as any).supplier : ((item as any).supplier as any)?._id),
            invoice_date: item.invoice_date || (item as any).date,
            due_date: item.due_date,
            payment_status: item.payment_status || (item as any).status,
            discount: discountValueValue, // Use discountValue, not calculated discount
            discountType: discountTypeValue,
            discountValue: discountValueValue,
            vat: vatValueValue, // Use vatValue (original input), not calculated vat
            vatType: vatTypeValue,
            vatValue: vatValueValue,
            lineItems: (item.line_items || (item as any).lineItems || []).map((li: any) => {
              const q = li.quantity ?? li.qty ?? 0
              return {
                product: typeof li.product === 'string' ? li.product : (li.product?._id || li.product?.id || ''),
                quantity: q,
                qty: q,
                originalQty: q, // Preserve for edit-mode "After Update" display
                unit_cost: li.unit_cost || li.unitPrice || 0,
                unitPrice: li.unit_cost || li.unitPrice || 0,
                total: li.total || (q * (li.unit_cost || li.unitPrice || 0)),
                description: li.description,
                discount: li.discount,
                vat: li.vat,
              }
            }) || [{ product: '', qty: 1, unitPrice: 0 }],
          }
          setLoadedItemData(initialData)
          setFormData(initialData)
          setLineItems(initialData.lineItems || [{ product: '', qty: 1, unitPrice: 0 }])
          
          // Restore discount and VAT types from saved data
          setDiscountType(discountTypeValue)
          setDiscountValue(discountValueValue)
          setVatType(vatTypeValue)
          setVatValue(vatValueValue)
          
          // Set form values with the original input values, not calculated values
          form.setFieldsValue({
            discount: discountValueValue,
            vat: vatValueValue,
          })
        } catch (error) {
          console.error('Error fetching purchase invoice:', error)
          message.error('Failed to load purchase invoice')
          navigate('/purchase-invoices/manage')
        } finally {
          setLoadingItem(false)
        }
      }
      fetchItem()
    } else {
      generateInvoiceNumber().then((invoiceNumber) => {
        const initialData = {
          invoice_number: invoiceNumber,
          vendor_id: undefined,
          invoice_date: dayjs(),
          due_date: dayjs().add(30, 'days'),
          payment_status: 'unpaid' as const,
          discount: 0,
          vat: 0,
          vatType: 'percentage' as 'amount' | 'percentage',
          vatValue: 0,
          lineItems: [{ product: '', qty: 1, unitPrice: 0 }],
        }
        setFormData(initialData)
        setLineItems(initialData.lineItems)
        form.setFieldsValue({
          ...initialData,
          invoice_date: dayjs(initialData.invoice_date),
          due_date: dayjs(initialData.due_date),
        })
      })
    }
  }, [id, isEditMode, form, navigate, message])

  // Helper function to convert formData to form values format
  const prepareFormValues = (data: Partial<PurchaseInvoiceInput & { lineItems?: PurchaseInvoiceLineItem[] }>) => {
    const valuesToRestore: any = { ...data }
    
    // Handle date fields - convert strings to dayjs objects
    if (valuesToRestore.invoice_date && typeof valuesToRestore.invoice_date === 'string') {
      valuesToRestore.invoice_date = dayjs(valuesToRestore.invoice_date)
    } else if (valuesToRestore.date && typeof valuesToRestore.date === 'string') {
      valuesToRestore.invoice_date = dayjs(valuesToRestore.date)
    }
    
    if (valuesToRestore.due_date && typeof valuesToRestore.due_date === 'string') {
      valuesToRestore.due_date = dayjs(valuesToRestore.due_date)
    }
    
    // Map old field names to new ones for backward compatibility
    if (valuesToRestore.supplierNumber && !valuesToRestore.invoice_number) {
      valuesToRestore.invoice_number = valuesToRestore.supplierNumber
    }
    if (valuesToRestore.supplier && !valuesToRestore.vendor_id) {
      valuesToRestore.vendor_id = valuesToRestore.supplier
    }
    if (valuesToRestore.paymentStatus && !valuesToRestore.payment_status) {
      valuesToRestore.payment_status = valuesToRestore.paymentStatus
    }
    
    return valuesToRestore
  }

  // Helper function to restore form values from central state
  const restoreFormValues = (data: Partial<PurchaseInvoiceInput & { lineItems?: PurchaseInvoiceLineItem[] }>, tab?: string) => {
    if (!data.invoice_number && !data.supplierNumber && restorationState.isRestoring) return
    
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
    
    // Auto-calculate due_date when invoice_date changes (if due_date is not set)
    if (changedValues.invoice_date && !changedValues.due_date) {
      const invoiceDate = dayjs.isDayjs(changedValues.invoice_date) 
        ? changedValues.invoice_date 
        : dayjs(changedValues.invoice_date)
      const calculatedDueDate = invoiceDate.add(30, 'days')
      form.setFieldsValue({ due_date: calculatedDueDate })
      allValues.due_date = calculatedDueDate
    }
    
    setFormData((prev) => {
      const updated: any = { ...prev, ...allValues }
      
      // Handle date fields
      if (updated.invoice_date && dayjs.isDayjs(updated.invoice_date)) {
        updated.invoice_date = updated.invoice_date.toISOString()
      } else if (updated.date && dayjs.isDayjs(updated.date)) {
        updated.invoice_date = updated.date.toISOString()
      }
      
      if (updated.due_date && dayjs.isDayjs(updated.due_date)) {
        updated.due_date = updated.due_date.toISOString()
      }
      
      // Map old field names for backward compatibility
      if (updated.supplierNumber && !updated.invoice_number) {
        updated.invoice_number = updated.supplierNumber
      }
      if (updated.supplier && !updated.vendor_id) {
        updated.vendor_id = updated.supplier
      }
      if (updated.paymentStatus && !updated.payment_status) {
        updated.payment_status = updated.paymentStatus
      }
      
      if (updated.lineItems) {
        setLineItems(updated.lineItems)
      }
      
      return updated
    })
  }

  // Restore form values from central state when tab changes
  useEffect(() => {
    if (formData.supplierNumber && !restorationState.isRestoring) {
      restoreFormValues(formData, activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Force Select components to re-render when form values change
  useEffect(() => {
    if (supplierValue || paymentStatusValue) {
      const timer = setTimeout(() => {
        setSelectKey(selectKey + 1)
      }, 50)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierValue, paymentStatusValue])

  // Fetch suppliers and inventory
  useEffect(() => {
    const fetchData = async () => {
      setLoadingSuppliers(true)
      setLoadingInventory(true)
      try {
        const [suppliersRes, inventoryRes] = await Promise.all([
          SupplierAPI.list(),
          InventoryAPI.list(),
        ])
        setSuppliers(suppliersRes.data.data)
        setInventoryItems(inventoryRes.data.data)
      } catch (error) {
        console.error('Error fetching suppliers/inventory:', error)
      } finally {
        setLoadingSuppliers(false)
        setLoadingInventory(false)
      }
    }
    fetchData()
  }, [])

  // Fetch brands, units, and accounts for product creation
  useEffect(() => {
    const fetchData = async () => {
      setLoadingAccounts(true)
      try {
        const [brandsRes, unitsRes, accountsRes] = await Promise.all([
          BrandAPI.list(),
          UnitAPI.list(),
          AccountAPI.list().catch((err) => {
            console.error('Error fetching accounts:', err)
            return { data: { success: true, data: [] } }
          }),
        ])
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
        console.error('Error fetching brands/units/accounts:', error)
      } finally {
        setLoadingAccounts(false)
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
      
      // Ensure VAT is set (default to 0 if not present - user adds VAT when needed)
      if (!productFormData.vat && productFormData.vat !== 0) {
        productForm.setFieldsValue({ vat: 0 })
        setProductFormData((prev) => ({ ...prev, vat: 0 }))
      }
    } else {
      // Set default VAT to 0 - do not add VAT unless user explicitly adds it
      productForm.setFieldsValue({ vat: 0 })
      setProductFormData((prev) => ({ ...prev, vat: 0 }))
    }
  }, [productModalActiveTab, productModalOpen])

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

  // Generate product serial number
  const generateProductSerialNumber = async () => {
    try {
      const res = await InventoryAPI.list()
      const existingCount = res.data.data.length
      // Increment counter for this pending product (using ref for synchronous updates)
      // This ensures uniqueness even when multiple products are added quickly
      pendingProductCounterRef.current += 1
      const totalCount = existingCount + pendingProductCounterRef.current
      const nextNumber = (totalCount).toString().padStart(4, '0')
      return `INV-${nextNumber}`
    } catch (error) {
      // Fallback to timestamp-based if API fails
      const timestamp = Date.now().toString(36).toUpperCase()
      return `INV-${timestamp}`
    }
  }

  // Create product inline - now stores as pending product instead of creating immediately
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
      
      // Ensure VAT defaults to 0 if not provided - user adds VAT when needed
      const vatValue = mergedValues.vat !== undefined && mergedValues.vat !== null && mergedValues.vat !== '' 
        ? Number(mergedValues.vat) 
        : 0
      
      // Ensure VAT is always a valid number (default 0, not added unless user specifies)
      const finalVatValue = isNaN(vatValue) || vatValue < 0 ? 0 : vatValue
      
      const productData = {
        serialNumber,
        name: productName,
        description: productDescription,
        supplier: mergedValues.supplier || undefined,
        qty: 0, // Always create with 0 qty - qty will be added when invoice is created via stock movement
        costPrice: baseCostPrice, // Store base unit cost, not including material cost
        brand: mergedValues.brand || undefined,
        unit: mergedValues.unit || undefined,
        vat: finalVatValue, // VAT only when user adds it, default 0
        productionDate: mergedValues.productionDate?.toISOString?.() || undefined,
        expiryDate: mergedValues.expiryDate?.toISOString?.() || undefined,
        priceInclusiveMaterialCost: priceInclusiveMaterialCost,
        materialCostComponents: !priceInclusiveMaterialCost && materialCostComponents.length > 0 
          ? materialCostComponents.filter(comp => comp.account_id && comp.account_name && comp.amount > 0)
          : undefined,
      }
      
      // Generate a temporary ID for the pending product
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Store as pending product
      const lineItemIndex = currentProductLineIndex !== null ? currentProductLineIndex : lineItems.length - 1
      setPendingProducts([...pendingProducts, { tempId, data: productData, lineItemIndex }])
      
      // Create a temporary product object for the line item
      const tempProduct = {
        _id: tempId,
        name: productName,
        serialNumber,
        costPrice: baseCostPrice,
        qty: 0, // Display 0 qty for pending products
        unit: mergedValues.unit,
        isPending: true, // Flag to identify pending products
      }
      
      // Add to inventory items temporarily (for display)
      setInventoryItems([...inventoryItems, tempProduct as any])
      
      // Auto-fill the line item with the pending product data
      // Use the qty from form, but product will be created with 0 qty
      const qty = Number(mergedValues.qty) || 1
      // Unit price should be base cost price (without material cost and VAT)
      const unitPrice = Math.round(baseCostPrice * 100) / 100 // Round to 2 decimal places
      
      // Get unit name from unit ID if unit is selected
      let unitName: string | undefined = undefined
      if (mergedValues.unit) {
        const selectedUnit = units.find((u) => u._id === mergedValues.unit)
        unitName = selectedUnit ? selectedUnit.name : undefined
      }
      
      if (currentProductLineIndex !== null) {
        onChangeLine(currentProductLineIndex, { 
          product: tempId,
          qty: qty,
          unit: unitName,
          unitPrice: unitPrice,
        })
      } else {
        // Add a new line item if no current index
        const newLineItem = {
          product: tempId,
          qty: qty,
          unit: unitName,
          unitPrice: unitPrice,
        }
        setLineItems([...lineItems, newLineItem])
        form.setFieldsValue({ lineItems: [...lineItems, newLineItem] })
        setFormData((prev: any) => ({ ...prev, lineItems: [...lineItems, newLineItem] }))
      }
      
      setProductModalOpen(false)
      productForm.resetFields()
      productForm.setFieldsValue({ vat: 0 }) // Reset VAT to default 0
      setProductFormData({})
      setCurrentProductLineIndex(null)
      setPriceInclusiveMaterialCost(true)
      setMaterialCostComponents([])
      setProductModalActiveTab('basic')
      message.success('Product added to line items. It will be created when you submit the invoice.')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to prepare product')
    } finally {
      setCreatingProduct(false)
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
      setFormData((prev) => ({ ...prev, paymentMethod: res.data.data.name }))
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
      form.setFieldsValue({ paymentStatus: res.data.data.name.toLowerCase() })
      setFormData((prev) => ({ ...prev, paymentStatus: res.data.data.name.toLowerCase() }))
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
    const newItems = [...lineItems, { product: '', qty: 1, unitPrice: 0 }]
    setLineItems(newItems)
    form.setFieldsValue({ lineItems: newItems })
    setFormData((prev) => ({ ...prev, lineItems: newItems }))
  }
  
  const onChangeLine = (idx: number, patch: Partial<PurchaseInvoiceLineItem>) => {
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

  const onCreateSupplier = async (values: any) => {
    setCreatingSupplier(true)
    try {
      const res = await SupplierAPI.create(values)
      setSuppliers([...suppliers, res.data.data])
      // Update main form if supplier modal was opened from main form
      form.setFieldsValue({ supplier: res.data.data._id })
      setFormData((prev) => ({ ...prev, supplier: res.data.data._id }))
      // Also update product form if product modal is open
      if (productModalOpen) {
        productForm.setFieldsValue({ supplier: res.data.data._id })
      }
      setSupplierModalOpen(false)
      supplierForm.resetFields()
      message.success('Supplier created successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create supplier')
    } finally {
      setCreatingSupplier(false)
    }
  }

  // Calculate totals
  const lineItemTotals = useMemo(() => {
    return lineItems.map((item) => {
      const total = (item.qty || 0) * (item.unitPrice || 0)
      return Math.round(total * 100) / 100 // Round to 2 decimal places
    })
  }, [lineItems])

  const grandTotal = useMemo(() => {
    return lineItemTotals.reduce((sum, total) => sum + total, 0)
  }, [lineItemTotals])

  // Watch form values for recalculation
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
    const subtotal = grandTotal - discountAmount
    if (vatType === 'percentage') {
      return (subtotal * vatValue) / 100
    }
    return vatValue
  }, [vatType, grandTotal, discountAmount, vatValue])

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
    const supplierObj = suppliers.find(
      (s) => s._id === supplierValue || (s as any).id === supplierValue
    )
    const items = lineItems.map((li, idx) => ({
      ...(li as any),
      slNo: idx + 1,
      qty: (li as any).qty ?? (li as any).quantity,
      unitPrice: (li as any).unitPrice ?? (li as any).unit_price ?? (li as any).unit_cost,
    }))
    return {
      invoice: {
        invoice_number: formData.invoice_number || (formData as any).supplierNumber || '',
        serial_number: (formData as any).serialNumber || '',
        date: formData.date ? dayjs(formData.date).toISOString() : new Date().toISOString(),
        vendor_id: supplierValue,
        supplier: supplierObj,
        trn: (formData as any).trn || '',
        discount: discountAmount,
        vat: vatAmount,
        line_items: items,
      },
      supplier: supplierObj,
      lineItems: items,
    } as unknown as InvoiceData
  }, [formData, lineItems, supplierValue, suppliers, discountAmount, vatAmount])

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      // First, create all pending products
      const productIdMap: Record<string, string> = {} // Maps tempId to actual product ID
      
      if (pendingProducts.length > 0) {
        message.loading({ content: 'Creating products...', key: 'creating-products' })
        
        for (const pendingProduct of pendingProducts) {
          try {
            // Ensure VAT is always included and is a valid number
            const productDataToCreate = {
              ...pendingProduct.data,
              vat: pendingProduct.data.vat !== undefined && pendingProduct.data.vat !== null && !isNaN(Number(pendingProduct.data.vat))
                ? Number(pendingProduct.data.vat)
                : 0, // Default to 0 - do not add VAT unless part of product
            }
            
            const res = await InventoryAPI.create(productDataToCreate)
            const createdProduct = res.data.data
            productIdMap[pendingProduct.tempId] = createdProduct._id
            
            // Add to inventory items
            setInventoryItems((prev) => [...prev, createdProduct])
          } catch (error: any) {
            message.error({ content: `Failed to create product "${pendingProduct.data.name}": ${error.response?.data?.message || error.message}`, key: 'creating-products' })
            setLoading(false)
            return
          }
        }
        
        message.success({ content: 'Products created successfully', key: 'creating-products' })
      }
      
      // Sync form values to formData before submission to ensure we have all data
      // Use getFieldsValue(true) to get all values including unmounted fields
      const formValues = form.getFieldsValue(true)
      const allFormValues = { ...formData, ...formValues, ...values }
      
      // Update formData with latest form values
      // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
      setFormData((prev: any) => ({ ...prev, ...allFormValues }))
      
      let currentLineItems = allFormValues.lineItems || lineItems

      // Replace temporary product IDs with actual product IDs
      currentLineItems = currentLineItems.map((item: any) => {
        if (productIdMap[item.product]) {
          return { ...item, product: productIdMap[item.product] }
        }
        return item
      })

      // Validate line items (only for create mode)
      if (!isEditMode) {
        for (const lineItem of currentLineItems) {
          if (!lineItem.product) {
            message.error('Please select a product for all line items')
            setLoading(false)
            return
          }

          // Check if product exists (either in inventory or was just created)
          const inventoryItem = inventoryItems.find((item) => item._id === lineItem.product) ||
            Object.values(productIdMap).includes(lineItem.product)
          
          if (!inventoryItem && !Object.values(productIdMap).includes(lineItem.product)) {
            message.error(`Product not found in inventory`)
            setLoading(false)
            return
          }

          if (!lineItem.qty || lineItem.qty <= 0) {
            const productName = inventoryItems.find((item) => item._id === lineItem.product)?.name || 'Unknown'
            message.error(`Please enter a valid quantity for "${productName}"`)
            setLoading(false)
            return
          }
        }
      }

      // Clean line_items to match new structure first
      const cleanedLineItems = currentLineItems.map((item: any) => {
        const quantity = item.quantity || item.qty || 0
        const unitCost = item.unit_cost || item.unitPrice || 0
        const cleaned: any = {
          product: item.product,
          quantity: quantity,
          unit_cost: unitCost,
          total: quantity * unitCost, // Always recalculate to pick up qty/price edits
        }
        if (item.description !== undefined) cleaned.description = item.description
        if (item.discount !== undefined) cleaned.discount = item.discount
        if (item.vat !== undefined) cleaned.vat = item.vat
        return cleaned
      })

      // Calculate grand total from cleaned line items
      const calculatedGrandTotal = cleanedLineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)

      // Calculate discount and VAT amounts based on calculated grand total
      let finalDiscountValue = discountFormValue || formData.discount || 0
      let finalVatValue = vatFormValue || formData.vat || 0

      if (discountType === 'percentage') {
        finalDiscountValue = (calculatedGrandTotal * finalDiscountValue) / 100
      }
      if (vatType === 'percentage') {
        const subtotal = calculatedGrandTotal - finalDiscountValue
        finalVatValue = (subtotal * finalVatValue) / 100
      }

      // Calculate final totals
      const subtotal = calculatedGrandTotal - finalDiscountValue
      const totalAmount = subtotal + finalVatValue

      // Get dates - use invoice_date and due_date
      let invoiceDate = allFormValues.invoice_date || allFormValues.date || formData.invoice_date || formData.date
      let dueDate = allFormValues.due_date || formData.due_date
      
      // Convert dayjs objects to Date/ISO string
      if (invoiceDate) {
        if (dayjs.isDayjs(invoiceDate)) {
          invoiceDate = invoiceDate.toISOString()
        } else if (typeof invoiceDate === 'string') {
          // Already a string, validate it's a valid date
          if (!dayjs(invoiceDate).isValid()) {
            invoiceDate = dayjs().toISOString()
          }
        } else {
          invoiceDate = dayjs(invoiceDate).toISOString()
        }
      } else {
        invoiceDate = dayjs().toISOString()
      }
      
      // If due_date is not provided, default to 30 days from invoice_date
      if (!dueDate) {
        dueDate = dayjs(invoiceDate).add(30, 'days').toISOString()
      } else {
        if (dayjs.isDayjs(dueDate)) {
          dueDate = dueDate.toISOString()
        } else if (typeof dueDate === 'string') {
          if (!dayjs(dueDate).isValid()) {
            dueDate = dayjs(invoiceDate).add(30, 'days').toISOString()
          }
        } else {
          dueDate = dayjs(dueDate).toISOString()
        }
      }

      const payload: PurchaseInvoiceInput = {
        invoice_number: allFormValues.invoice_number || allFormValues.supplierNumber || formData.invoice_number || formData.supplierNumber || '',
        vendor_id: allFormValues.vendor_id || allFormValues.supplier || formData.vendor_id || formData.supplier || '',
        invoice_date: invoiceDate,
        due_date: dueDate,
        line_items: cleanedLineItems,
        subtotal: subtotal,
        tax_amount: finalVatValue,
        discount: finalDiscountValue,
        total_amount: totalAmount,
        currency: allFormValues.currency || formData.currency || 'AED',
        // Normalize payment status - handle case-insensitive 'paid'
        payment_status: (() => {
          const rawStatus = allFormValues.payment_status || allFormValues.paymentStatus || formData.payment_status || formData.paymentStatus || 'unpaid'
          const normalized = rawStatus.toLowerCase()
          if (normalized === 'paid') return 'paid'
          if (normalized === 'partial') return 'partial'
          if (normalized === 'overdue') return 'overdue'
          return 'unpaid'
        })() as 'unpaid' | 'partial' | 'paid' | 'overdue',
        balance_due: (() => {
          const rawStatus = allFormValues.payment_status || allFormValues.paymentStatus || formData.payment_status || formData.paymentStatus || 'unpaid'
          return rawStatus.toLowerCase() === 'paid' ? 0 : totalAmount
        })(), // If paid, balance_due is 0, otherwise equals total_amount
        payment_terms: allFormValues.payment_terms || formData.payment_terms,
        notes: allFormValues.notes || formData.notes,
        payment_method: allFormValues.payment_method || formData.payment_method,
        reference_number: allFormValues.reference_number || formData.reference_number,
        trn: allFormValues.trn || formData.trn,
      }
      
      // Log payload for debugging
      console.log('Purchase Invoice Payload:', JSON.stringify(payload, null, 2))
      
      if (isEditMode && id) {
        await PurchaseInvoiceAPI.update(id, payload)
        message.success('Purchase invoice updated successfully')
      } else {
        await PurchaseInvoiceAPI.create(payload)
        message.success('Purchase invoice created successfully')
        // Backend handles inventory updates automatically (normalizes pending_purchase status and adds qty)
      }
      
      // Clear pending products after successful invoice creation
      setPendingProducts([])
      pendingProductCounterRef.current = 0 // Reset counter after successful invoice creation
      
      navigate('/purchase-invoices/manage')
    } catch (error: any) {
      console.error('Purchase Invoice Error:', error)
      console.error('Error Response:', error.response)
      console.error('Error Data:', error.response?.data)
      console.error('Error Message:', error.message)
      
      const errorMessage = error.response?.data?.message || error.message || `Failed to ${isEditMode ? 'update' : 'create'} purchase invoice`
      message.error(errorMessage)
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
            <h1 className="text-3xl font-bold text-foreground">{isEditMode ? 'Edit Purchase Invoice' : 'Create Purchase Invoice'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isEditMode ? 'Update purchase invoice' : 'Create a new purchase invoice'}</p>
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
              key={isEditMode && loadedItemData ? `edit-${loadedItemData.invoice_number || loadedItemData.supplierNumber}` : 'create'}
            >
              {/* Hidden field to store line items in form */}
              <Form.Item name="lineItems" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="items">Line Items</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="invoice_number"
                      label={<span className="text-sm font-semibold text-foreground">Invoice Number</span>}
                      normalize={(value) => value || ''}
                    >
                      <Input
                        placeholder="Auto-generated"
                        className="h-11 border-border focus:border-primary focus:ring-primary bg-muted/50"
                      />
                    </Form.Item>

                    <Form.Item
                      name="vendor_id"
                      label={<span className="text-sm font-semibold text-foreground">Vendor/Supplier</span>}
                      rules={[{ required: true, message: 'Please select a vendor/supplier' }]}
                    >
                      <div className="flex gap-2">
                        <AntSelect
                          showSearch
                          placeholder={suppliers.length === 0 ? "No suppliers available" : "Select supplier"}
                          filterOption={(input: string, option: any) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                          value={supplierValue || undefined}
                          onChange={(value: string) => {
                            form.setFieldsValue({ vendor_id: value })
                            setFormData((prev) => ({ ...prev, vendor_id: value, supplier: value }))
                          }}
                          disabled={loadingSuppliers || suppliers.length === 0}
                          loading={loadingSuppliers}
                          notFoundContent="No suppliers found"
                          options={suppliers.map((s) => ({ value: s._id, label: s.name }))}
                          className="flex-1 h-11 border-border"
                          style={{ height: 44, minHeight: 44 }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSupplierModalOpen(true)}
                          className="border-border hover:bg-muted/50"
                          title="Create supplier with details"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </Form.Item>
                  </div>

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
                        onChange={(date) => {
                          if (date) {
                            // If payment terms days is set, use it; otherwise default to 30 days
                            const paymentTermsDays = form.getFieldValue('paymentTermsDays')
                            const days = paymentTermsDays && paymentTermsDays > 0 ? paymentTermsDays : 30
                            const calculatedDueDate = date.add(days, 'days')
                            form.setFieldsValue({ due_date: calculatedDueDate })
                            setFormData((prev: any) => ({ ...prev, due_date: calculatedDueDate }))
                          }
                        }}
                      />
                    </Form.Item>

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
                            const invoiceDate = form.getFieldValue('invoice_date')
                            if (invoiceDate) {
                              const invoiceDateObj = dayjs.isDayjs(invoiceDate) ? invoiceDate : dayjs(invoiceDate)
                              const calculatedDueDate = invoiceDateObj.add(days, 'days')
                              form.setFieldsValue({ due_date: calculatedDueDate })
                              setFormData((prev: any) => ({ ...prev, due_date: calculatedDueDate }))
                            }
                          }
                        }}
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
                        onChange={(date) => {
                          // Clear payment terms days when due date is manually changed
                          if (date) {
                            const invoiceDate = form.getFieldValue('invoice_date')
                            if (invoiceDate) {
                              const invoiceDateObj = dayjs.isDayjs(invoiceDate) ? invoiceDate : dayjs(invoiceDate)
                              const days = dayjs(date).diff(invoiceDateObj, 'days')
                              form.setFieldsValue({ paymentTermsDays: days > 0 ? days : undefined })
                            }
                          }
                        }}
                      />
                    </Form.Item>

                    {/* Payment Status - Hidden, defaults to 'unpaid' (set via Form initialValues/formData) */}
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
                          placeholder={loadingPaymentMethods ? "Loading..." : "Select payment method"}
                          filterOption={(input: string, option: any) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                          }
                          optionFilterProp="label"
                          value={form.getFieldValue('paymentMethod') === 'CREATE_NEW' ? undefined : form.getFieldValue('paymentMethod') || undefined}
                          onChange={(value: string) => {
                            if (value === 'CREATE_NEW') {
                              setPaymentMethodModalOpen(true)
                            } else {
                              form.setFieldsValue({ paymentMethod: value })
                              setFormData((prev) => ({ ...prev, paymentMethod: value }))
                            }
                          }}
                          disabled={loadingPaymentMethods}
                          loading={loadingPaymentMethods}
                          notFoundContent={loadingPaymentMethods ? "Loading..." : "No payment methods found"}
                          options={[
                            ...paymentMethods.map((m) => ({ value: m.name, label: m.name })),
                            { value: 'CREATE_NEW', label: '+ Create New Payment Method' },
                          ]}
                          style={{ flex: 1, height: 44, minHeight: 44 }}
                        />
                      </div>
                    </Form.Item>
                  </div>
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
                                    // Find the selected product
                                    const selectedProduct = inventoryItems.find((item) => item._id === value)
                                    if (selectedProduct) {
                                      // Get unit name - handle different unit formats
                                      let unitName: string | undefined = undefined
                                      if (selectedProduct.unit) {
                                        // Check if unit is a populated object
                                        if (typeof selectedProduct.unit === 'object' && (selectedProduct.unit as any).name) {
                                          unitName = (selectedProduct.unit as any).name
                                        } else {
                                          // Unit is a string - could be unit name or unit ID
                                          const unitValue = String(selectedProduct.unit)
                                          // Check if it's a unit ID by looking it up in units array
                                          const foundUnit = units.find((u) => u._id === unitValue)
                                          unitName = foundUnit ? foundUnit.name : unitValue
                                        }
                                      }
                                      
                                      // Get cost price - use costPrice (legacy) or unit_cost (new field)
                                      const costPrice = selectedProduct.costPrice || selectedProduct.unit_cost || 0
                                      const roundedCostPrice = Math.round(costPrice * 100) / 100 // Round to 2 decimal places
                                      
                                      // Auto-fill line item with product details
                                      onChangeLine(idx, {
                                        product: value,
                                        qty: li.qty || 1, // Keep existing qty or default to 1
                                        unit: unitName,
                                        unitPrice: roundedCostPrice,
                                      })
                                    } else {
                                      // If product not found, just set the product ID
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
                                label={<span className="text-xs font-medium text-muted-foreground">Quantity</span>}
                                className="mb-0"
                              >
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Qty"
                                  value={li.qty !== undefined && li.qty !== null ? li.qty : ''}
                                  onChange={(e: any) => {
                                    const value = e.target.value
                                    const qty = value === '' || value === null || value === undefined ? 0 : Number(value)
                                    onChangeLine(idx, { qty: qty >= 0 ? qty : 0, quantity: qty >= 0 ? qty : 0 })
                                  }}
                                  className="w-full h-10 border-border focus:border-primary focus:ring-primary bg-muted/50"
                                />
                                {li.product ? (() => {
                                  const selectedProduct = inventoryItems.find((item) => item._id === li.product)
                                  const currentQty = selectedProduct?.qty ?? 0
                                  const purchasedQty = li.qty ?? 0
                                  const originalQty = (li as any).originalQty ?? 0
                                  // Create: add to current. Edit: replace = current - original + new
                                  const afterQty = isEditMode
                                    ? currentQty - originalQty + purchasedQty
                                    : currentQty + purchasedQty
                                  const label = isEditMode ? 'After Update' : 'After Purchase'
                                  return (
                                    <div className="text-xs mt-1">
                                      <div className={currentQty === 0 ? 'text-red-400 font-semibold' : currentQty < 10 ? 'text-orange-400' : 'text-muted-foreground'}>
                                        Current: {currentQty}
                                        {currentQty === 0 && ' 🔴 Out of Stock'}
                                        {currentQty > 0 && currentQty < 10 && ' ⚠️ Low Stock'}
                                      </div>
                                      {purchasedQty > 0 && (
                                        <div className="text-green-400 font-medium mt-0.5">
                                          {label}: {afterQty}
                                        </div>
                                      )}
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
                                    placeholder={loadingUnits ? "Loading..." : "Select unit"}
                                    filterOption={(input: string, option: any) =>
                                      (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                    }
                                    optionFilterProp="label"
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
                                    value={li.unitPrice !== undefined && li.unitPrice !== null ? Math.round(Number(li.unitPrice) * 100) / 100 : ''}
                                    onChange={(e: any) => {
                                      const value = e.target.value
                                      const numValue = value === '' || value === null || value === undefined ? 0 : Number(value)
                                      onChangeLine(idx, { unitPrice: numValue >= 0 ? numValue : 0, unit_cost: numValue >= 0 ? numValue : 0 })
                                    }}
                                    onBlur={(e: any) => {
                                      // Round to 2 decimal places on blur
                                      const value = e.target.value
                                      if (value !== '' && value !== null && value !== undefined) {
                                        const numValue = Number(value)
                                        const roundedValue = Math.round(numValue * 100) / 100
                                        onChangeLine(idx, { unitPrice: roundedValue >= 0 ? roundedValue : 0, unit_cost: roundedValue >= 0 ? roundedValue : 0 })
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
                        <h3 className="text-sm font-semibold text-foreground mb-4">Discount & VAT</h3>
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
                                onChange={(e) => setDiscountType(e.target.value)}
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
                                    setFormData((prev) => ({ ...prev, discount: numValue }))
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
                            <div className="space-y-2">
                              <Radio.Group
                                value={vatType}
                                onChange={(e) => setVatType(e.target.value)}
                                className="mb-2"
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
                                    setFormData((prev) => ({ ...prev, vat: numValue }))
                                  }}
                                  className={`w-full h-11 border-border focus:border-primary focus:ring-primary bg-muted/50 ${
                                    vatType === 'amount' ? 'pl-12' : 'pr-8'
                                  }`}
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
                              VAT ({vatType === 'percentage' ? `${vatValue || 0}%` : 'Amount'}):
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
                  onClick={() => navigate('/purchase-invoices/manage')}
                  className="border-border hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  className="shadow-md hover:shadow-lg transition-shadow min-w-[180px]"
                >
                  {isEditMode ? 'Update Purchase Invoice' : 'Create Purchase Invoice'}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Live preview — renders the real print output for the current default template */}
      <div className="w-[520px] flex-shrink-0 sticky top-6 hidden xl:block">
        <LiveInvoicePreview
          docType="purchase"
          invoiceData={previewInvoiceData}
          inventoryMap={inventoryMap}
        />
      </div>
      </div>

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
              label={<span className="text-sm font-semibold text-foreground">Supplier Name</span>}
              rules={[{ required: true, message: 'Please enter supplier name' }]}
            >
              <AntInput
                placeholder="Enter supplier name"
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
                    initialValue={5}
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full h-11 pr-8 border-border focus:border-primary focus:ring-primary bg-muted/50"
                        placeholder="5"
                        defaultValue={5}
                        onChange={(e) => {
                          const value = Number(e.target.value) || 5
                          productForm.setFieldsValue({ vat: value })
                          setProductFormData((prev) => ({ ...prev, vat: value }))
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">%</span>
                    </div>
                  </Form.Item>
                </div>
                
                {/* Total Cost Display */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Total Cost (Unit + Material):</span>
                    <span className="text-lg font-bold text-blue-400">
                      AED {(() => {
                        const unitCost = Number(productCostPrice) || 0
                        const materialCost = !priceInclusiveMaterialCost && materialCostComponents.length > 0
                          ? materialCostComponents
                              .filter(comp => comp.account_id && comp.account_name && comp.amount > 0)
                              .reduce((sum, comp) => sum + (comp.amount || 0), 0)
                          : 0
                        const total = unitCost + materialCost
                        return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      })()}
                    </span>
                  </div>
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
                  productForm.setFieldsValue({ vat: 0 }) // Reset VAT to default 0
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
