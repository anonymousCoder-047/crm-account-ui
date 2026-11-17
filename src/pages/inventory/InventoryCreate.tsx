import { Form, InputNumber, DatePicker, Input as AntInput, App, message as antdMessage, Spin, Checkbox, Select as AntSelect } from 'antd'
import { ArrowLeft, Package, Plus, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { InventoryAPI, SupplierAPI, BrandAPI, UnitAPI, AccountAPI, type InventoryInput, type Supplier, type Brand, type Unit, type Account } from '@/services/api'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Store restoration state outside component to persist across renders without causing re-renders
const restorationState = { isRestoring: false, lastRestoredTab: '' }

export default function InventoryCreate() {
  // Use App.useApp() hook to get message instance with context support
  // Fallback to static message API if context is not available
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const [loading, setLoading] = useState(false)
  const [loadingItem, setLoadingItem] = useState(isEditMode)
  const [form] = Form.useForm<InventoryInput>()
  const navigate = useNavigate()
  
  // Watch form values used for computed UI
  const costPriceValue = Form.useWatch('costPrice', form)
  const vatValue = Form.useWatch('vat', form)
  const qtyValue = Form.useWatch('qty', form)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [optionsReady, setOptionsReady] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [brandModalOpen, setBrandModalOpen] = useState(false)
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [brandSearch, setBrandSearch] = useState('')
  const [unitSearch, setUnitSearch] = useState('')
  const [creatingSupplier, setCreatingSupplier] = useState(false)
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [supplierForm] = Form.useForm()
  const [brandForm] = Form.useForm()
  const [unitForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('basic')
  const [priceInclusiveMaterialCost, setPriceInclusiveMaterialCost] = useState(true)
  const [materialCostModalOpen, setMaterialCostModalOpen] = useState(false)
  const [materialCostComponents, setMaterialCostComponents] = useState<Array<{ account_id: string; account_name: string; amount: number; description?: string }>>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const selectSearchFilter = (input: string, option?: { label?: unknown; value?: unknown }) => {
    const term = input.trim().toLowerCase()
    const label = String(option?.label ?? '').toLowerCase()
    const value = String(option?.value ?? '').toLowerCase()
    return label.includes(term) || value.includes(term)
  }

  // Centralized form state that persists across tab switches
  const [formData, setFormData] = useState<Partial<InventoryInput & { vat?: number }>>({
    serialNumber: '',
    name: '',
    description: '',
    supplier: undefined,
    brand: undefined,
    qty: undefined,
    unit: undefined,
    costPrice: undefined,
    vat: 5,
    productionDate: undefined,
    expiryDate: undefined,
    priceInclusiveMaterialCost: true,
    materialCostComponents: [],
  })

  // Auto-generate serial number
  // Generate sequential serial number based on existing inventory count
  const generateSerialNumber = async () => {
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

  // Store loaded item data for edit mode (originalQty used for "Current" / "After Update" display)
  const [loadedItemData, setLoadedItemData] = useState<Partial<InventoryInput & { vat?: number; originalQty?: number }> | null>(null)

  // Fetch existing item data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchItem = async () => {
        setLoadingItem(true)
        try {
          const res = await InventoryAPI.get(id)
          const item = res.data.data
          
          // Extract IDs from populated objects if needed
          const supplierId = typeof item.supplier === 'string' ? item.supplier : (item.supplier as any)?._id
          const brandId = typeof item.brand === 'string' ? item.brand : (item.brand as any)?._id
          const unitId = typeof item.unit === 'string' ? item.unit : (item.unit as any)?._id
          
          const qtyVal = item.qty ?? item.quantity_on_hand ?? 0
          const initialData = {
            serialNumber: item.serialNumber,
            name: item.name,
            description: item.description || '',
            supplier: supplierId,
            brand: brandId,
            qty: qtyVal,
            originalQty: qtyVal, // Preserve for edit-mode "Current" / "After Update" display
            unit: unitId,
            costPrice: item.costPrice,
            vat: item.vat || 5,
            productionDate: item.productionDate,
            expiryDate: item.expiryDate,
            priceInclusiveMaterialCost: item.priceInclusiveMaterialCost !== undefined ? item.priceInclusiveMaterialCost : true,
            materialCostComponents: item.materialCostComponents || [],
          }
          setPriceInclusiveMaterialCost(initialData.priceInclusiveMaterialCost !== undefined ? initialData.priceInclusiveMaterialCost : true)
          setMaterialCostComponents(initialData.materialCostComponents || [])
          setLoadedItemData(initialData)
          setFormData(initialData)
          console.log('🔵 [Edit Mode] Loaded item data:', initialData)
        } catch (error) {
          console.error('Error fetching inventory item:', error)
          message.error('Failed to load inventory item')
          navigate('/inventory/manage')
        } finally {
          setLoadingItem(false)
        }
      }
      fetchItem()
    } else {
      // Initialize form data with serial number for create mode
      generateSerialNumber().then((serialNumber) => {
        const initialData = {
          serialNumber,
          name: '',
          description: '',
          supplier: undefined,
          brand: undefined,
          qty: undefined,
          unit: undefined,
          costPrice: undefined,
          vat: 5,
          productionDate: undefined,
          expiryDate: undefined,
          priceInclusiveMaterialCost: true,
          materialCostComponents: [],
        }
        setFormData(initialData)
        form.setFieldsValue(initialData)
        console.log('🔵 [Create Mode] Initialized form data:', initialData)
      })
    }
  }, [id, isEditMode]) // Run when id changes

  // Helper function to convert formData to form values format
  const prepareFormValues = (data: Partial<InventoryInput & { vat?: number }>) => {
    const valuesToRestore: any = { ...data }
    
    // Convert productionDate string to Dayjs object if it exists
    if (valuesToRestore.productionDate && typeof valuesToRestore.productionDate === 'string') {
      valuesToRestore.productionDate = dayjs(valuesToRestore.productionDate)
    }
    
    // Convert expiryDate string to Dayjs object if it exists
    if (valuesToRestore.expiryDate && typeof valuesToRestore.expiryDate === 'string') {
      valuesToRestore.expiryDate = dayjs(valuesToRestore.expiryDate)
    }
    
    // Ensure numeric values are properly set
    if (valuesToRestore.qty !== undefined && valuesToRestore.qty !== null) {
      valuesToRestore.qty = Number(valuesToRestore.qty)
    }
    if (valuesToRestore.costPrice !== undefined && valuesToRestore.costPrice !== null) {
      valuesToRestore.costPrice = Number(valuesToRestore.costPrice)
    }
    if (valuesToRestore.vat !== undefined && valuesToRestore.vat !== null) {
      valuesToRestore.vat = Number(valuesToRestore.vat)
    }
    
    return valuesToRestore
  }

  // Helper function to restore form values from central state
  const restoreFormValues = (data: Partial<InventoryInput & { vat?: number }>, tab?: string) => {
    if (!data.serialNumber || restorationState.isRestoring) return
    
    // Prevent restoring the same tab multiple times
    if (tab && restorationState.lastRestoredTab === tab) return
    
    restorationState.isRestoring = true
    if (tab) restorationState.lastRestoredTab = tab
    
    const valuesToRestore = prepareFormValues(data)
    
    // Restore all form values
    form.setFieldsValue(valuesToRestore)
    console.log('🔄 [Restore] Restored form values from central state:', valuesToRestore)
    
    // Reset flag after a short delay to allow form to update
    setTimeout(() => {
      restorationState.isRestoring = false
    }, 50)
  }

  // Sync form values to central state whenever form changes
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    // Skip updating central state if we're currently restoring values
    if (restorationState.isRestoring) {
      console.log('⏭️ [Central State] Skipping update during restoration')
      return
    }
    console.log('🔄 [Central State] Form values changed:', { changedValues, allValues })
    // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
    setFormData((prev: Partial<InventoryInput & { vat?: number }>) => {
      const updated: any = { ...prev, ...allValues }
      
      // Convert Dayjs objects to ISO strings for storage
      if (updated.productionDate && dayjs.isDayjs(updated.productionDate)) {
        updated.productionDate = updated.productionDate.toISOString()
      }
      if (updated.expiryDate && dayjs.isDayjs(updated.expiryDate)) {
        updated.expiryDate = updated.expiryDate.toISOString()
      }
      
      // Ensure numeric values are stored as numbers or strings (for form compatibility)
      if (updated.qty !== undefined && updated.qty !== null) {
        updated.qty = Number(updated.qty)
      }
      if (updated.costPrice !== undefined && updated.costPrice !== null) {
        updated.costPrice = String(updated.costPrice) // Keep as string for form compatibility
      }
      if (updated.vat !== undefined && updated.vat !== null) {
        updated.vat = String(updated.vat) // Keep as string for form compatibility
      }
      
      console.log('🔄 [Central State] Updated central state:', updated)
      return updated as Partial<InventoryInput & { vat?: number }>
    })
  }

  // Restore form values from central state when tab changes
  useEffect(() => {
    if (formData.serialNumber && !restorationState.isRestoring) {
      console.log('🔄 [Tab Change] Restoring values for tab:', activeTab, 'Form data:', formData)
      restoreFormValues(formData, activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]) // Only depend on activeTab to avoid unnecessary restorations

  // Fetch suppliers, brands, units, and accounts
  useEffect(() => {
    const fetchData = async () => {
      setLoadingSuppliers(true)
      setLoadingBrands(true)
      setLoadingUnits(true)
      setLoadingAccounts(true)
      try {
        const [suppliersRes, brandsRes, unitsRes, accountsRes] = await Promise.all([
          SupplierAPI.list(),
          BrandAPI.list(),
          UnitAPI.list(),
          AccountAPI.list().catch((err) => {
            console.error('Error fetching accounts:', err)
            // Return empty array if accounts fail to load
            return { data: { success: true, data: [] } }
          }),
        ])
        setSuppliers(suppliersRes.data.data)
        setBrands(brandsRes.data.data)
        setUnits(unitsRes.data.data)
        
        // Filter accounts to only show active ones on the frontend and remove duplicates
        const allAccounts = accountsRes.data?.data || []
        const activeAccounts = allAccounts.filter((acc: Account) => acc.is_active !== false)
        
        // Remove duplicates based on account_id (since account_id should be unique)
        const uniqueAccounts = activeAccounts.reduce((acc: Account[], current: Account) => {
          const existing = acc.find((item: Account) => item.account_id === current.account_id)
          if (!existing) {
            acc.push(current)
          }
          return acc
        }, [] as Account[])
        
        setAccounts(uniqueAccounts)
        
        console.log('🟢 [Fetch Data useEffect] Reference data loaded:', {
          suppliersCount: suppliersRes.data.data.length,
          brandsCount: brandsRes.data.data.length,
          unitsCount: unitsRes.data.data.length,
          accountsCount: allAccounts.length,
          activeAccountsCount: activeAccounts.length,
          accounts: activeAccounts.map((acc: Account) => ({
            account_id: acc.account_id,
            account_name: acc.account_name,
            account_type: acc.account_type,
            is_active: acc.is_active,
            account_code: acc.account_code,
          })),
        })
        
        // Mark options as ready after a short delay to ensure Select components have rendered
        setTimeout(() => {
          setOptionsReady(true)
        }, 100)
      } catch (error) {
        console.error('Error fetching suppliers/brands/units/accounts:', error)
        message.error('Failed to load some data. Please refresh the page.')
      } finally {
        setLoadingSuppliers(false)
        setLoadingBrands(false)
        setLoadingUnits(false)
        setLoadingAccounts(false)
      }
    }
    fetchData()
  }, []) // Only run once on mount

  // Restore form values when both item data and dropdowns are loaded (for edit mode)
  useEffect(() => {
    // In edit mode, wait for both item data and reference data to be loaded AND options are ready
    if (isEditMode && loadedItemData && suppliers.length > 0 && brands.length > 0 && units.length > 0 && optionsReady && !restorationState.isRestoring) {
      console.log('🟢 [Edit Mode] Both item and reference data loaded, restoring form values:', loadedItemData)
      console.log('🟢 [Edit Mode] Available options:', {
        suppliers: suppliers.map(s => ({ id: s._id, name: s.name })),
        brands: brands.map(b => ({ id: b._id, name: b.name })),
        units: units.map(u => ({ id: u._id, name: u.name }))
      })
      
      // Verify that the IDs exist in the options before setting
      const supplierExists = !loadedItemData.supplier || suppliers.some(s => s._id === loadedItemData.supplier)
      const brandExists = !loadedItemData.brand || brands.some(b => b._id === loadedItemData.brand)
      const unitExists = !loadedItemData.unit || units.some(u => u._id === loadedItemData.unit)
      
      console.log('🟢 [Edit Mode] ID verification:', {
        supplierExists,
        brandExists,
        unitExists,
        supplierId: loadedItemData.supplier,
        brandId: loadedItemData.brand,
        unitId: loadedItemData.unit
      })
      
      if (supplierExists && brandExists && unitExists) {
        restorationState.isRestoring = true
        // Use requestAnimationFrame and setTimeout to ensure DOM is ready and Select components have rendered
        requestAnimationFrame(() => {
          setTimeout(() => {
            const valuesToSet = prepareFormValues(loadedItemData)
            console.log('🟢 [Edit Mode] Setting form values:', valuesToSet)
            console.log('🟢 [Edit Mode] Available options at set time:', {
              suppliers: suppliers.map(s => s._id),
              brands: brands.map(b => b._id),
              units: units.map(u => u._id)
            })
            
            // Set form values explicitly with all fields - don't reset, just set
            form.setFieldsValue({
              serialNumber: valuesToSet.serialNumber,
              name: valuesToSet.name,
              description: valuesToSet.description,
              supplier: valuesToSet.supplier,
              brand: valuesToSet.brand,
              qty: valuesToSet.qty,
              unit: valuesToSet.unit,
              costPrice: valuesToSet.costPrice,
              vat: valuesToSet.vat,
              productionDate: valuesToSet.productionDate,
              expiryDate: valuesToSet.expiryDate,
            })
            
            // Verify values were set
            const afterSet = form.getFieldsValue()
            console.log('🟢 [Edit Mode] Form values after set:', afterSet)
            console.log('🟢 [Edit Mode] Supplier value:', afterSet.supplier, 'exists in options:', suppliers.some(s => s._id === afterSet.supplier))
            console.log('🟢 [Edit Mode] Brand value:', afterSet.brand, 'exists in options:', brands.some(b => b._id === afterSet.brand))
            console.log('🟢 [Edit Mode] Unit value:', afterSet.unit, 'exists in options:', units.some(u => u._id === afterSet.unit))
            
            setFormData(loadedItemData)
            
            // Force a re-render by setting values again after a short delay
            setTimeout(() => {
              const currentValues = form.getFieldsValue()
              if (currentValues.supplier !== valuesToSet.supplier || currentValues.brand !== valuesToSet.brand || currentValues.unit !== valuesToSet.unit) {
              console.warn('🟡 [Edit Mode] Values not persisted, re-setting...')
              form.setFieldsValue({
                supplier: valuesToSet.supplier,
                brand: valuesToSet.brand,
                unit: valuesToSet.unit,
              })
              }
              
              restorationState.isRestoring = false
              console.log('🟢 [Edit Mode] Final form values:', form.getFieldsValue())
            }, 200)
          }, 100)
        })
      } else {
        console.warn('🟡 [Edit Mode] Some IDs not found in options:', {
          supplierExists,
          brandExists,
          unitExists,
          supplierId: loadedItemData.supplier,
          brandId: loadedItemData.brand,
          unitId: loadedItemData.unit
        })
      }
    }
    // In create mode, restore when dropdowns are loaded
    else if (!isEditMode && formData.serialNumber && suppliers.length > 0 && brands.length > 0 && units.length > 0 && !restorationState.isRestoring) {
      requestAnimationFrame(() => {
        restoreFormValues(formData)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, loadedItemData, suppliers.length, brands.length, units.length, optionsReady]) // Restore when data is ready

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      // Use central state as the single source of truth
      // Merge with form values and values parameter to ensure we have the latest data
      // Use getFieldsValue(true) to get all values including unmounted fields
      const formValues = form.getFieldsValue(true)
      const allValues = { ...formData, ...formValues, ...values }
      console.log('💾 [onFinish] Central state (formData):', formData)
      console.log('💾 [onFinish] Form values:', formValues)
      console.log('💾 [onFinish] Values parameter:', values)
      console.log('💾 [onFinish] Merged allValues:', allValues)
      
      // Ensure serial number is always set
      let serialNumber = allValues.serialNumber?.trim()
      if (!serialNumber) {
        serialNumber = await generateSerialNumber()
        // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
        setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, serialNumber }))
        allValues.serialNumber = serialNumber
      }

      // Build payload with proper type conversions
      const qtyValue = allValues.qty !== undefined && allValues.qty !== null && allValues.qty !== '' ? Number(allValues.qty) : 0
      const costPriceValue = allValues.costPrice !== undefined && allValues.costPrice !== null && allValues.costPrice !== '' ? Number(allValues.costPrice) : 0
      
      // Calculate total material cost
      const totalMaterialCost = !priceInclusiveMaterialCost && materialCostComponents.length > 0
        ? materialCostComponents
            .filter(comp => comp.account_id && comp.account_name && comp.amount > 0)
            .reduce((sum, comp) => sum + (comp.amount || 0), 0)
        : 0
      
      // Base cost price - DO NOT add material cost here, keep it as base unit cost
      const baseCostPrice = isNaN(costPriceValue) ? 0 : costPriceValue
      
      const payload: InventoryInput = {
        sku: serialNumber || '',
        product_name: allValues.name?.trim() || '',
        serialNumber: serialNumber || '',
        name: allValues.name?.trim() || '',
        description: allValues.description?.trim() || undefined,
        supplier: allValues.supplier || '',
        qty: isNaN(qtyValue) ? 0 : qtyValue,
        unit: allValues.unit || undefined,
        brand: allValues.brand || undefined,
        unit_cost: baseCostPrice, // Store base unit cost, not including material cost
        selling_price: 0, // Default to 0 as we're not using selling price
        costPrice: baseCostPrice, // Store base unit cost, not including material cost
        vat: allValues.vat !== undefined && allValues.vat !== null && allValues.vat !== '' ? Number(allValues.vat) : undefined,
        productionDate: allValues.productionDate?.toISOString?.() || (allValues.productionDate ? new Date(allValues.productionDate).toISOString() : undefined),
        expiryDate: allValues.expiryDate?.toISOString?.() || (allValues.expiryDate ? new Date(allValues.expiryDate).toISOString() : undefined),
        priceInclusiveMaterialCost: priceInclusiveMaterialCost,
        materialCostComponents: !priceInclusiveMaterialCost && materialCostComponents.length > 0 
          ? materialCostComponents.filter(comp => comp.account_id && comp.account_name && comp.amount > 0)
          : undefined,
      }
      
      console.log('💾 [onFinish] Final payload:', payload)
      
      if (isEditMode && id) {
        await InventoryAPI.update(id, payload)
        message.success('Inventory item updated successfully')
      } else {
        await InventoryAPI.create(payload)
        message.success('Inventory item created successfully')
      }
      navigate('/inventory/manage')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create inventory item')
    } finally {
      setLoading(false)
    }
  }

  const onCreateSupplier = async (values: any) => {
    setCreatingSupplier(true)
    try {
      const res = await SupplierAPI.create(values)
      const newSupplier = res.data.data
      console.log('✅ [onCreateSupplier] New supplier created:', newSupplier)
      setSuppliers([...suppliers, newSupplier])
      // Update central state and form
      // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
      setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, supplier: newSupplier._id }))
      form.setFieldsValue({ supplier: newSupplier._id })
      console.log('✅ [onCreateSupplier] Updated central state with supplier:', newSupplier._id)
      setSupplierModalOpen(false)
      supplierForm.resetFields()
      message.success('Supplier created successfully')
    } catch (error: any) {
      console.error('Error creating supplier:', error)
      message.error(error.response?.data?.message || 'Failed to create supplier')
    } finally {
      setCreatingSupplier(false)
    }
  }

  const onCreateBrand = async (values: any) => {
    setCreatingBrand(true)
    try {
      const res = await BrandAPI.create(values)
      const newBrand = res.data.data
      console.log('✅ [onCreateBrand] New brand created:', newBrand)
      setBrands([...brands, newBrand])
      // Update central state and form
      // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
      setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, brand: newBrand._id }))
      form.setFieldsValue({ brand: newBrand._id })
      console.log('✅ [onCreateBrand] Updated central state with brand:', newBrand._id)
      setBrandModalOpen(false)
      brandForm.resetFields()
    } catch (error) {
      console.error('Error creating brand:', error)
    } finally {
      setCreatingBrand(false)
    }
  }

  const onCreateUnit = async (values: any) => {
    setCreatingUnit(true)
    try {
      const res = await UnitAPI.create(values)
      const newUnit = res.data.data
      console.log('✅ [onCreateUnit] New unit created:', newUnit)
      setUnits([...units, newUnit])
      // Update central state and form
      // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
      setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, unit: newUnit._id }))
      form.setFieldsValue({ unit: newUnit._id })
      console.log('✅ [onCreateUnit] Updated central state with unit:', newUnit._id)
      setUnitModalOpen(false)
      unitForm.resetFields()
    } catch (error) {
      console.error('Error creating unit:', error)
    } finally {
      setCreatingUnit(false)
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
          onClick={() => navigate('/inventory/manage')}
          className="border-border hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{isEditMode ? 'Edit Inventory Item' : 'Create Inventory Item'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isEditMode ? 'Update inventory item details' : 'Add a new item to your inventory'}</p>
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
              key={isEditMode && loadedItemData ? `edit-${loadedItemData.serialNumber}` : 'create'}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing & Details</TabsTrigger>
                  <TabsTrigger value="additional">Additional Info</TabsTrigger>
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
                      name="name"
                      label={<span className="text-sm font-semibold text-foreground">Name</span>}
                      normalize={(value) => value || ''}
                      getValueFromEvent={(e) => e.target.value || ''}
                    >
                      <Input
                        placeholder="Enter item name"
                        className="h-11 border-border focus:border-primary focus:ring-primary"
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="description"
                    label={<span className="text-sm font-semibold text-foreground">Description</span>}
                    normalize={(value) => value || ''}
                  >
                    <AntInput.TextArea
                      rows={4}
                      placeholder="Enter item description"
                      className="border-border focus:border-primary focus:ring-primary resize-none"
                    />
                  </Form.Item>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      label={<span className="text-sm font-semibold text-foreground">Supplier</span>}
                    >
                      <div className="flex gap-2">
                        <Form.Item name="supplier" noStyle>
                          <AntSelect
                            showSearch
                            allowClear
                            placeholder="Select supplier"
                            filterOption={selectSearchFilter}
                            optionFilterProp="label"
                            searchValue={supplierSearch}
                            onSearch={setSupplierSearch}
                            onBlur={() => setSupplierSearch('')}
                            onChange={() => setSupplierSearch('')}
                            disabled={loadingSuppliers}
                            loading={loadingSuppliers}
                            notFoundContent={loadingSuppliers ? 'Loading suppliers...' : 'No suppliers found'}
                            options={suppliers.map((s) => ({ value: s._id, label: s.name }))}
                            style={{ flex: 1, height: 44, minHeight: 44 }}
                          />
                        </Form.Item>
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
                      label={<span className="text-sm font-semibold text-foreground">Brand</span>}
                    >
                      <div className="flex gap-2">
                        <Form.Item name="brand" noStyle>
                          <AntSelect
                            showSearch
                            allowClear
                            placeholder="Select brand"
                            filterOption={selectSearchFilter}
                            optionFilterProp="label"
                            searchValue={brandSearch}
                            onSearch={setBrandSearch}
                            onBlur={() => setBrandSearch('')}
                            onChange={() => setBrandSearch('')}
                            disabled={loadingBrands || creatingBrand}
                            loading={loadingBrands}
                            notFoundContent={loadingBrands ? 'Loading brands...' : 'No brands found'}
                            options={brands.map((b) => ({ value: b._id, label: b.name }))}
                            style={{ flex: 1, height: 44, minHeight: 44 }}
                          />
                        </Form.Item>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setBrandModalOpen(true)}
                          className="border-border hover:bg-muted/50"
                          title="Create brand with details"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </Form.Item>
                  </div>
                </TabsContent>

                {/* Pricing & Details Tab */}
                <TabsContent value="pricing" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="qty"
                      label={<span className="text-sm font-semibold text-foreground">Quantity</span>}
                    >
                      <div>
                        <InputNumber
                          className="w-full h-11 [&_.ant-input-number-input]:h-11 border-border focus-within:border-primary focus-within:ring-primary"
                          min={0}
                          placeholder={isEditMode ? "Enter new quantity (replaces current)" : "Enter quantity"}
                          controls={false}
                        />
                        {isEditMode && loadedItemData && (
                          <div className="text-xs mt-1.5 space-y-0.5">
                            <div className="text-muted-foreground">
                              Current: {loadedItemData.originalQty ?? loadedItemData.qty ?? 0}
                            </div>
                            {qtyValue !== undefined && qtyValue !== null && qtyValue !== '' && Number(qtyValue) >= 0 && (
                              <div className="text-green-400 font-medium">
                                After Update: {Number(qtyValue)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Form.Item>

                    <Form.Item
                      label={<span className="text-sm font-semibold text-foreground">Unit</span>}
                    >
                      <div className="flex gap-2">
                        <Form.Item name="unit" noStyle>
                          <AntSelect
                            showSearch
                            allowClear
                            placeholder="Select unit"
                            filterOption={selectSearchFilter}
                            optionFilterProp="label"
                            searchValue={unitSearch}
                            onSearch={setUnitSearch}
                            onBlur={() => setUnitSearch('')}
                            onChange={() => setUnitSearch('')}
                            disabled={loadingUnits || creatingUnit}
                            loading={loadingUnits}
                            notFoundContent={loadingUnits ? 'Loading units...' : 'No units found'}
                            options={units.map((u) => ({
                              value: u._id,
                              label: u.symbol ? `${u.name} (${u.symbol})` : u.name,
                            }))}
                            style={{ flex: 1, height: 44, minHeight: 44 }}
                          />
                        </Form.Item>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setUnitModalOpen(true)}
                          className="border-border hover:bg-muted/50"
                          title="Create unit with details"
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
                        form.setFieldsValue({ priceInclusiveMaterialCost: checked })
                        // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                        setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, priceInclusiveMaterialCost: checked }))
                        // Clear material cost components if checked
                        if (checked) {
                          setMaterialCostComponents([])
                          form.setFieldsValue({ materialCostComponents: [] })
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
                      normalize={(value) => {
                        if (value === undefined || value === null || value === '') return undefined
                        return String(value)
                      }}
                      getValueFromEvent={(e) => {
                        const value = e.target.value
                        if (!value || value === '') return undefined
                        // Remove commas and allow decimal numbers
                        const cleaned = value.replace(/,/g, '')
                        return cleaned
                      }}
                    >
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">AED</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costPriceValue !== undefined && costPriceValue !== null ? String(costPriceValue) : ''}
                          onChange={(e: any) => {
                            const value = e.target.value
                            form.setFieldsValue({ costPrice: value || undefined })
                            // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                            setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, costPrice: value || undefined }))
                          }}
                          onBlur={(e: any) => {
                            // Format the value on blur
                            const value = e.target.value
                            if (value && !isNaN(Number(value))) {
                              const numValue = Number(value)
                              const formatted = numValue.toFixed(2)
                              form.setFieldsValue({ costPrice: formatted as any })
                              // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                              setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, costPrice: formatted }))
                            }
                          }}
                          className="w-full h-11 pl-12 border-border focus:border-primary focus:ring-primary bg-muted/50"
                          placeholder="0.00"
                        />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name="vat"
                      label={<span className="text-sm font-semibold text-foreground">VAT %</span>}
                      normalize={(value) => {
                        if (value === undefined || value === null || value === '') return undefined
                        return String(value)
                      }}
                      getValueFromEvent={(e) => {
                        const value = e.target.value
                        if (!value || value === '') return undefined
                        return value
                      }}
                    >
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={vatValue !== undefined && vatValue !== null ? String(vatValue) : ''}
                          onChange={(e: any) => {
                            const value = e.target.value
                            form.setFieldsValue({ vat: value || undefined })
                            // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                            setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, vat: value || undefined }))
                          }}
                          className="w-full h-11 pr-8 border-border focus:border-primary focus:ring-primary bg-muted/50"
                          placeholder="5"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-sm">%</span>
                      </div>
                    </Form.Item>
                  </div>
                </TabsContent>

                {/* Additional Info Tab */}
                <TabsContent value="additional" className="space-y-4 mt-6">
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
                      />
                    </Form.Item>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/inventory/manage')}
                  className="border-border hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading || loadingItem}
                  className="shadow-md hover:shadow-lg transition-shadow min-w-[140px]"
                >
                  {isEditMode ? 'Update Item' : 'Create Item'}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Supplier Modal */}
      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier to your system. All fields are optional.
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
              label={<span className="text-sm font-semibold text-foreground">Name</span>}
            >
              <Input
                placeholder="Enter supplier name"
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

      {/* Create Brand Modal */}
      <Dialog open={brandModalOpen} onOpenChange={setBrandModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Brand</DialogTitle>
            <DialogDescription>
              Add a new brand to your system. All fields are optional.
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
              label={<span className="text-sm font-semibold text-foreground">Name</span>}
            >
              <Input
                placeholder="Enter brand name"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <Form.Item
              name="description"
              label={<span className="text-sm font-semibold text-foreground">Description</span>}
            >
              <AntInput.TextArea
                rows={3}
                placeholder="Enter brand description"
                className="border-border focus:border-primary focus:ring-primary resize-none"
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
              label={<span className="text-sm font-semibold text-foreground">Name</span>}
            >
              <Input
                placeholder="Enter unit name (e.g., Kilogram)"
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </Form.Item>
            <Form.Item
              name="symbol"
              label={<span className="text-sm font-semibold text-foreground">Symbol</span>}
            >
              <Input
                placeholder="Enter unit symbol (e.g., kg)"
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
                      form.setFieldsValue({ materialCostComponents: updated })
                      // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                      setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, materialCostComponents: updated }))
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
                          form.setFieldsValue({ materialCostComponents: updated })
                          // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                          setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, materialCostComponents: updated }))
                        }
                      }}
                      disabled={loadingAccounts}
                      loading={loadingAccounts}
                      notFoundContent={loadingAccounts ? "Loading accounts..." : "No accounts available. Please create accounts in Chart of Accounts first."}
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
                        form.setFieldsValue({ materialCostComponents: updated })
                        // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                        setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, materialCostComponents: updated }))
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
                        form.setFieldsValue({ materialCostComponents: updated })
                        // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                        setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, materialCostComponents: updated }))
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
                form.setFieldsValue({ materialCostComponents: updated })
                // @ts-expect-error - React useState setter accepts functional updates, TypeScript inference issue
                setFormData((prev: Partial<InventoryInput & { vat?: number }>) => ({ ...prev, materialCostComponents: updated }))
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
    </div>
  )
}
