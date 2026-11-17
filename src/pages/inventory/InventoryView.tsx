import { ArrowLeft, Package, Edit } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InventoryAPI, SupplierAPI, BrandAPI, UnitAPI, type InventoryItem, type Supplier, type Brand, type Unit } from '@/services/api'
import { App, Spin, message as antdMessage } from 'antd'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

export default function InventoryView() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [units, setUnits] = useState<Unit[]>([])

  // Create lookup maps
  const supplierMap = new Map<string, string>()
  suppliers.forEach(s => supplierMap.set(s._id, s.name))

  const brandMap = new Map<string, string>()
  brands.forEach(b => brandMap.set(b._id, b.name))

  const unitMap = new Map<string, string>()
  units.forEach(u => unitMap.set(u._id, u.name))

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      setLoading(true)
      try {
        // Fetch inventory item and reference data in parallel
        const [itemRes, suppliersRes, brandsRes, unitsRes] = await Promise.all([
          InventoryAPI.get(id),
          SupplierAPI.list(),
          BrandAPI.list(),
          UnitAPI.list(),
        ])
        
        setItem(itemRes.data.data)
        setSuppliers(suppliersRes.data.data)
        setBrands(brandsRes.data.data)
        setUnits(unitsRes.data.data)
      } catch (error) {
        console.error('Error fetching inventory item:', error)
        message.error('Failed to load inventory item')
        navigate('/inventory/manage')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate, message])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Inventory item not found</p>
        <Button onClick={() => navigate('/inventory/manage')}>Back to Inventory</Button>
      </div>
    )
  }

  // Helper to get display names
  const getSupplierName = () => {
    const supplierId = typeof item.supplier === 'string' ? item.supplier : item.supplier?._id
    return typeof item.supplier === 'object' && item.supplier?.name 
      ? item.supplier.name 
      : supplierMap.get(supplierId || '') || supplierId || '-'
  }

  const getBrandName = () => {
    if (!item.brand) return '-'
    const brandId = typeof item.brand === 'string' ? item.brand : item.brand?._id
    return typeof item.brand === 'object' && item.brand?.name 
      ? item.brand.name 
      : brandMap.get(brandId || '') || brandId || '-'
  }

  const getUnitName = () => {
    if (!item.unit) return '-'
    const unitId = typeof item.unit === 'string' ? item.unit : item.unit?._id
    return typeof item.unit === 'object' && item.unit?.name 
      ? item.unit.name 
      : unitMap.get(unitId || '') || unitId || '-'
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
              <h1 className="text-3xl font-bold text-foreground">{item.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">View inventory item details</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => navigate(`/inventory/edit/${item._id}`)}
          className="shadow-md hover:shadow-lg transition-shadow"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Item
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
                  <label className="text-sm font-semibold text-foreground">Serial Number</label>
                  <p className="text-foreground mt-1">{item.serialNumber}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Name</label>
                  <p className="text-foreground mt-1">{item.name}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Description</label>
                  <p className="text-muted-foreground mt-1">{item.description || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Supplier</label>
                  <p className="text-foreground mt-1">{getSupplierName()}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Brand</label>
                  <p className="text-foreground mt-1">{getBrandName()}</p>
                </div>
              </div>

              {/* Pricing & Details */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Pricing & Details
                </h2>

                <div>
                  <label className="text-sm font-semibold text-foreground">Quantity</label>
                  <p className="text-foreground mt-1">{item.qty.toLocaleString()}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Unit</label>
                  <p className="text-foreground mt-1">{getUnitName()}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Cost Price</label>
                  <p className="text-foreground mt-1">
                    AED {item.costPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Price Inclusive Material Cost</label>
                  <div className="mt-1">
                    <Badge
                      className={cn(
                        'px-3 py-1 text-xs font-medium rounded-full border',
                        item.priceInclusiveMaterialCost !== false
                          ? 'bg-green-500/15 text-green-300 border-green-500/30'
                          : 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                      )}
                    >
                      {item.priceInclusiveMaterialCost !== false ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">VAT %</label>
                  <p className="text-foreground mt-1">{item.vat ? `${item.vat}%` : '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground">Status</label>
                  <div className="mt-1">
                    <Badge
                      className={cn(
                        'px-3 py-1 text-xs font-medium rounded-full border',
                        item.qty > 0
                          ? 'bg-green-500/15 text-green-300 border-green-500/30'
                          : 'bg-red-500/15 text-red-300 border-red-500/30'
                      )}
                    >
                      {item.qty > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Material Cost Components */}
              {item.priceInclusiveMaterialCost === false && item.materialCostComponents && item.materialCostComponents.length > 0 && (
                <div className="space-y-4 md:col-span-2">
                  <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                    Material Cost Components
                  </h2>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="space-y-3">
                      {item.materialCostComponents.map((component, index) => (
                        <div key={index} className="bg-card rounded-lg p-4 border border-border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-foreground">Component {index + 1}</span>
                                <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-xs">
                                  {component.account_name}
                                </Badge>
                              </div>
                              {component.description && (
                                <p className="text-sm text-muted-foreground mb-2">{component.description}</p>
                              )}
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="text-xs text-muted-foreground">Account ID:</span>
                                  <span className="text-sm text-foreground ml-2 font-mono">{component.account_id}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Amount:</span>
                                  <span className="text-sm font-semibold text-foreground ml-2">
                                    AED {component.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-border mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-foreground">Total Material Cost:</span>
                          <span className="text-lg font-bold text-primary">
                            AED {item.materialCostComponents.reduce((sum, comp) => sum + (comp.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="space-y-4 md:col-span-2">
                <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Additional Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Production Date</label>
                    <p className="text-foreground mt-1">
                      {item.productionDate ? dayjs(item.productionDate).format('YYYY-MM-DD') : '-'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Expiry Date</label>
                    <p className="text-foreground mt-1">
                      {item.expiryDate ? dayjs(item.expiryDate).format('YYYY-MM-DD') : '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Created At</label>
                    <p className="text-muted-foreground mt-1">
                      {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Updated At</label>
                    <p className="text-muted-foreground mt-1">
                      {dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
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



