import { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Upload, 
  Eye, 
  Save, 
  X, 
  Plus, 
  Trash2,
  Download,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import { renderSimpleTemplateToHTML, getSampleInvoiceData } from '@/utils/templateRenderer'
import InvoicePreviewFrame from './InvoicePreviewFrame'

// Color themes
const COLOR_THEMES = {
  light: {
    name: 'Light',
    primary: '#ffffff',
    secondary: '#f3f4f6',
    text: '#000000',
    accent: '#3b82f6',
  },
  dark: {
    name: 'Dark',
    primary: '#1f2937',
    secondary: '#111827',
    text: '#ffffff',
    accent: '#60a5fa',
  },
  blue: {
    name: 'Blue',
    primary: '#eff6ff',
    secondary: '#dbeafe',
    text: '#1e40af',
    accent: '#3b82f6',
  },
  green: {
    name: 'Green',
    primary: '#f0fdf4',
    secondary: '#dcfce7',
    text: '#166534',
    accent: '#22c55e',
  },
  gray: {
    name: 'Gray',
    primary: '#f9fafb',
    secondary: '#f3f4f6',
    text: '#374151',
    accent: '#6b7280',
  },
}

// Border styles
const BORDER_STYLES = {
  none: 'No Border',
  full: 'Full Frame Border',
  topBottom: 'Top-Bottom Border',
}

// Line item column types
const COLUMN_TYPES = [
  { value: 'itemName', label: 'Item Name' },
  { value: 'description', label: 'Description' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'price', label: 'Price' },
  { value: 'total', label: 'Total' },
]

export interface SimpleInvoiceTemplate {
  // Layout
  logo?: string
  headerImage?: string
  footerImage?: string
  colorTheme: keyof typeof COLOR_THEMES
  borderStyle: keyof typeof BORDER_STYLES
  
  // Company Details (Left Column)
  companyName: {
    label: string
    value: string
    visible: boolean
  }
  companyAddress: {
    label: string
    value: string
    visible: boolean
  }
  emirate: {
    label: string
    value: string
    visible: boolean
  }
  trn: {
    label: string
    value: string
    visible: boolean
  }
  contact: {
    label: string
    value: string
    visible: boolean
  }
  email: {
    label: string
    value: string
    visible: boolean
  }
  
  // Invoice Metadata (Right Column Table)
  invoiceNumber: {
    label: string
    visible: boolean
  }
  invoiceDate: {
    label: string
    visible: boolean
  }
  deliveryNote: {
    label: string
    visible: boolean
  }
  paymentTerms: {
    label: string
    visible: boolean
  }
  supplierRef: {
    label: string
    visible: boolean
  }
  otherRef: {
    label: string
    visible: boolean
  }
  buyerOrderNo: {
    label: string
    visible: boolean
  }
  buyerOrderDate: {
    label: string
    visible: boolean
  }
  despatchDocNo: {
    label: string
    visible: boolean
  }
  deliveryNoteDate: {
    label: string
    visible: boolean
  }
  despatchedThrough: {
    label: string
    visible: boolean
  }
  destination: {
    label: string
    visible: boolean
  }
  termsOfDelivery: {
    label: string
    visible: boolean
  }
  
  // Customer Section (for sales invoices)
  consignee?: {
    label: string
    visible: boolean
  }
  buyer?: {
    label: string
    visible: boolean
  }
  customerEmirate?: {
    label: string
    visible: boolean
  }
  customerCountry?: {
    label: string
    visible: boolean
  }
  placeOfSupply?: {
    label: string
    visible: boolean
  }
  
  // Vendor Section (for purchase invoices)
  vendorName?: {
    label: string
    visible: boolean
  }
  vendorAddress?: {
    label: string
    visible: boolean
  }
  vendorEmirate?: {
    label: string
    visible: boolean
  }
  vendorCountry?: {
    label: string
    visible: boolean
  }
  vendorTRN?: {
    label: string
    visible: boolean
  }
  vendorContact?: {
    label: string
    visible: boolean
  }
  vendorEmail?: {
    label: string
    visible: boolean
  }
  vendorPlaceOfSupply?: {
    label: string
    visible: boolean
  }
  
  // Footer
  declaration: {
    label: string
    visible: boolean
    content: string
  }
  authorizedSignatory: {
    label: string
    visible: boolean
    content: string
  }
  computerGenerated: {
    visible: boolean
    content: string
  }
  
  // Line Items
  lineItems: {
    columns: Array<{
      id: string
      type: string
      label: string
      mappedField: string
      visible: boolean
      width?: number
      align: 'left' | 'center' | 'right'
    }>
    rowStyle: {
      fontSize: number
      color: string
      alignment: 'left' | 'center' | 'right'
      backgroundColor?: string
    }
  }
  
  // Design Controls
  fonts: {
    header: {
      family: string
      size: number
    }
    body: {
      family: string
      size: number
    }
    footer: {
      family: string
      size: number
    }
  }
  spacing: {
    headerPadding: number
    bodyPadding: number
    footerPadding: number
    sectionSpacing: number
  }
  alignment: {
    header: 'left' | 'center' | 'right'
    body: 'left' | 'center' | 'right'
    footer: 'left' | 'center' | 'right'
  }
}

// Default template for SALES invoices only (Company at top, Customer below)
// Purchase invoices should use their own DEFAULT_TEMPLATE from TemplatesManage.tsx
const DEFAULT_TEMPLATE: SimpleInvoiceTemplate = {
  colorTheme: 'light',
  borderStyle: 'full',
  
  // Company Details (Seller - at top for sales invoices)
  companyName: { label: 'Company Name', value: 'YOUR COMPANY NAME', visible: true },
  companyAddress: { label: 'Address', value: 'Your Company Address, City, UAE', visible: true },
  emirate: { label: 'Emirate', value: 'Dubai', visible: true },
  trn: { label: 'TRN', value: '1234567890123', visible: true },
  contact: { label: 'Contact', value: '+971 XX XXX XXXX', visible: true },
  email: { label: 'E-Mail', value: 'info@yourcompany.com', visible: true },
  
  // Invoice Metadata
  invoiceNumber: { label: 'Invoice No.', visible: true },
  invoiceDate: { label: 'Dated', visible: true },
  deliveryNote: { label: 'Delivery Note', visible: true },
  paymentTerms: { label: 'Mode/Terms of Payment', visible: true },
  supplierRef: { label: "Supplier's Ref.", visible: true },
  otherRef: { label: 'Other Reference(s)', visible: true },
  buyerOrderNo: { label: "Buyer's Order No.", visible: true },
  buyerOrderDate: { label: 'Dated', visible: true },
  despatchDocNo: { label: 'Despatch Document No.', visible: true },
  deliveryNoteDate: { label: 'Delivery Note Date', visible: true },
  despatchedThrough: { label: 'Despatched through', visible: true },
  destination: { label: 'Destination', visible: true },
  termsOfDelivery: { label: 'Terms of delivery', visible: true },
  
  // Customer Section (Buyer - below company for sales invoices)
  consignee: { label: 'Consignee', visible: true },
  buyer: { label: 'Buyer', visible: true },
  customerEmirate: { label: 'Emirate', visible: true },
  customerCountry: { label: 'Country', visible: true },
  placeOfSupply: { label: 'Place of supply', visible: true },
  
  // NO vendor fields - this is for sales invoices only
  
  // Footer
  declaration: { 
    label: 'Declaration', 
    visible: true, 
    content: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.' 
  },
  authorizedSignatory: { 
    label: 'Authorised Signatory', 
    visible: true, 
    content: 'for YOUR COMPANY NAME' 
  },
  computerGenerated: { 
    visible: true, 
    content: 'This is a Computer Generated Invoice' 
  },
  
  // Line Items
  lineItems: {
    columns: [
      { id: '1', type: 'itemName', label: 'SI\nNo', mappedField: 'slNo', visible: true, align: 'center', width: 50 },
      { id: '2', type: 'description', label: 'Description of Goods', mappedField: 'description', visible: true, align: 'left' },
      { id: '3', type: 'quantity', label: 'Quantity', mappedField: 'quantity', visible: true, align: 'center', width: 80 },
      { id: '4', type: 'price', label: 'Rate', mappedField: 'unitPrice', visible: true, align: 'right', width: 80 },
      { id: '5', type: 'itemName', label: 'per', mappedField: 'unit', visible: true, align: 'center', width: 60 },
      { id: '6', type: 'total', label: 'Amount', mappedField: 'total', visible: true, align: 'right', width: 100 },
    ],
    rowStyle: {
      fontSize: 10,
      color: '#000000',
      alignment: 'left',
    },
  },
  
  fonts: {
    header: { family: 'Arial', size: 18 },
    body: { family: 'Arial', size: 10 },
    footer: { family: 'Arial', size: 9 },
  },
  spacing: {
    headerPadding: 10,
    bodyPadding: 0,
    footerPadding: 10,
    sectionSpacing: 0,
  },
  alignment: {
    header: 'center',
    body: 'left',
    footer: 'left',
  },
}

interface SimpleInvoiceTemplateEditorProps {
  initialTemplate?: Partial<SimpleInvoiceTemplate>
  onSave: (template: SimpleInvoiceTemplate) => void
  onCancel: () => void
  onTemplateChange?: (template: SimpleInvoiceTemplate) => void
}

export default function SimpleInvoiceTemplateEditor({
  initialTemplate,
  onSave,
  onCancel,
  onTemplateChange,
}: SimpleInvoiceTemplateEditorProps) {
  const [template, setTemplate] = useState<SimpleInvoiceTemplate>(() => {
    console.log('ðŸŽ¨ Editor Initializing with initialTemplate:', initialTemplate)
    console.log('ðŸ”‘ InitialTemplate keys:', initialTemplate ? Object.keys(initialTemplate) : 'none')
    
    // If initialTemplate exists, use it as-is (user's saved template)
    // Otherwise use DEFAULT_TEMPLATE
    if (initialTemplate && Object.keys(initialTemplate).length > 0) {
      console.log('âœ… Using initialTemplate')
      return initialTemplate as SimpleInvoiceTemplate
    }
    console.log('âš ï¸ Using DEFAULT_TEMPLATE')
    return DEFAULT_TEMPLATE
  })
  
  // Notify parent of template changes
  useEffect(() => {
    if (onTemplateChange) {
      onTemplateChange(template)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template])
  
  const [previewMode, setPreviewMode] = useState(false)
  const [activeTab, setActiveTab] = useState('layout')
  const logoInputRef = useRef<HTMLInputElement>(null)
  const headerInputRef = useRef<HTMLInputElement>(null)
  const footerInputRef = useRef<HTMLInputElement>(null)

  // Sync initialTemplate only when it actually changes (not on every render)
  const initialTemplateRef = useRef<string | null>(null)
  const hasInitialized = useRef(false)
  
  useEffect(() => {
    console.log('ðŸ”„ useEffect triggered. hasInitialized:', hasInitialized.current, 'initialTemplate:', initialTemplate)
    
    // Only sync on initial mount if initialTemplate is provided
    if (!hasInitialized.current && initialTemplate && Object.keys(initialTemplate).length > 0) {
      const templateKey = JSON.stringify(initialTemplate)
      console.log('âœ… Initializing template from initialTemplate')
      initialTemplateRef.current = templateKey
      // Use initialTemplate as-is without merging with defaults
      setTemplate(initialTemplate as SimpleInvoiceTemplate)
      hasInitialized.current = true
    }
  }, [initialTemplate])

  // Live preview HTML â€” generated by the SAME renderer used for printing,
  // so the canvas is pixel-identical to the printed invoice.
  const deferredTemplate = useDeferredValue(template)
  const previewHtml = useMemo(
    () => renderSimpleTemplateToHTML(deferredTemplate, getSampleInvoiceData()),
    [deferredTemplate]
  )

  const handleImageUpload = useCallback((type: 'logo' | 'headerImage' | 'footerImage', file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setTemplate(prev => ({
        ...prev,
        [type]: reader.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }, [])

  const addLineItemColumn = () => {
    const newId = Date.now().toString()
    setTemplate(prev => ({
      ...prev,
      lineItems: {
        ...prev.lineItems,
        columns: [
          ...prev.lineItems.columns,
          {
            id: newId,
            type: 'itemName',
            label: 'New Column',
            mappedField: 'product',
            visible: true,
            align: 'left',
          },
        ],
      },
    }))
  }

  const removeLineItemColumn = (id: string) => {
    setTemplate(prev => ({
      ...prev,
      lineItems: {
        ...prev.lineItems,
        columns: prev.lineItems.columns.filter(col => col.id !== id),
      },
    }))
  }

  const updateLineItemColumn = (id: string, updates: Partial<SimpleInvoiceTemplate['lineItems']['columns'][0]>) => {
    setTemplate(prev => ({
      ...prev,
      lineItems: {
        ...prev.lineItems,
        columns: prev.lineItems.columns.map(col =>
          col.id === id ? { ...col, ...updates } : col
        ),
      },
    }))
  }

  const exportTemplate = () => {
    const dataStr = JSON.stringify(template, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'invoice-template.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleColorThemeChange = useCallback((value: keyof typeof COLOR_THEMES) => {
    setTemplate(prev => {
      if (prev.colorTheme === value) return prev
      return { ...prev, colorTheme: value }
    })
  }, [])

  const handleBorderStyleChange = useCallback((value: keyof typeof BORDER_STYLES) => {
    setTemplate(prev => {
      if (prev.borderStyle === value) return prev
      return { ...prev, borderStyle: value }
    })
  }, [])

  return (
    <div className="flex flex-col h-full bg-muted/50">
      {/* Header */}
      <div className="border-b border-border p-4 bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Invoice Template Editor</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Edit Mode' : 'Preview'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onSave(template)}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!previewMode && (
          <div className="w-80 border-r border-border bg-card overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 m-4">
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="fields">Fields</TabsTrigger>
              </TabsList>

              <TabsContent value="layout" className="px-4 pb-4 space-y-4">
                {/* Logo Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Logo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload('logo', file)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                    </div>
                    {template.logo && (
                      <div className="relative">
                        <img src={template.logo} alt="Logo" className="w-full h-20 object-contain" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setTemplate(prev => ({ ...prev, logo: undefined }))}
                          className="absolute top-0 right-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Header Image */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Header Image</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        ref={headerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload('headerImage', file)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => headerInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Header
                      </Button>
                    </div>
                    {template.headerImage && (
                      <div className="relative">
                        <img src={template.headerImage} alt="Header" className="w-full h-24 object-cover" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setTemplate(prev => ({ ...prev, headerImage: undefined }))}
                          className="absolute top-0 right-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Footer Image */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Footer Image</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        ref={footerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload('footerImage', file)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => footerInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Footer
                      </Button>
                    </div>
                    {template.footerImage && (
                      <div className="relative">
                        <img src={template.footerImage} alt="Footer" className="w-full h-24 object-cover" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setTemplate(prev => ({ ...prev, footerImage: undefined }))}
                          className="absolute top-0 right-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Color Theme */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color Theme
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={template.colorTheme}
                      onValueChange={handleColorThemeChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="!z-[9999]" style={{ zIndex: 9999 }}>
                        {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                          <SelectItem key={key} value={key}>
                            {theme.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Border Style */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Border Style</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={template.borderStyle}
                      onValueChange={handleBorderStyleChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="!z-[9999]" style={{ zIndex: 9999 }}>
                        {Object.entries(BORDER_STYLES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Design Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Design Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Fonts */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Header Font</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={template.fonts.header.family}
                          onValueChange={(value) =>
                            setTemplate(prev => ({
                              ...prev,
                              fonts: {
                                ...prev.fonts,
                                header: { ...prev.fonts.header, family: value },
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="!z-[9999]" style={{ zIndex: 9999 }}>
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                            <SelectItem value="Courier New">Courier New</SelectItem>
                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                            <SelectItem value="Georgia">Georgia</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={template.fonts.header.size}
                          onChange={(e) =>
                            setTemplate(prev => ({
                              ...prev,
                              fonts: {
                                ...prev.fonts,
                                header: { ...prev.fonts.header, size: Number(e.target.value) },
                              },
                            }))
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Body Font</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={template.fonts.body.family}
                          onValueChange={(value) =>
                            setTemplate(prev => ({
                              ...prev,
                              fonts: {
                                ...prev.fonts,
                                body: { ...prev.fonts.body, family: value },
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="!z-[9999]" style={{ zIndex: 9999 }}>
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                            <SelectItem value="Courier New">Courier New</SelectItem>
                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                            <SelectItem value="Georgia">Georgia</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={template.fonts.body.size}
                          onChange={(e) =>
                            setTemplate(prev => ({
                              ...prev,
                              fonts: {
                                ...prev.fonts,
                                body: { ...prev.fonts.body, size: Number(e.target.value) },
                              },
                            }))
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Footer Font</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={template.fonts.footer.family}
                          onValueChange={(value) =>
                            setTemplate(prev => ({
                              ...prev,
                              fonts: {
                                ...prev.fonts,
                                footer: { ...prev.fonts.footer, family: value },
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="!z-[9999]" style={{ zIndex: 9999 }}>
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                            <SelectItem value="Courier New">Courier New</SelectItem>
                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                            <SelectItem value="Georgia">Georgia</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={template.fonts.footer.size}
                          onChange={(e) =>
                            setTemplate(prev => ({
                              ...prev,
                              fonts: {
                                ...prev.fonts,
                                footer: { ...prev.fonts.footer, size: Number(e.target.value) },
                              },
                            }))
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {/* Spacing */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Header Padding</Label>
                      <Input
                        type="number"
                        value={template.spacing.headerPadding}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            spacing: { ...prev.spacing, headerPadding: Number(e.target.value) },
                          }))
                        }
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Body Padding</Label>
                      <Input
                        type="number"
                        value={template.spacing.bodyPadding}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            spacing: { ...prev.spacing, bodyPadding: Number(e.target.value) },
                          }))
                        }
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Footer Padding</Label>
                      <Input
                        type="number"
                        value={template.spacing.footerPadding}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            spacing: { ...prev.spacing, footerPadding: Number(e.target.value) },
                          }))
                        }
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Section Spacing</Label>
                      <Input
                        type="number"
                        value={template.spacing.sectionSpacing}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            spacing: { ...prev.spacing, sectionSpacing: Number(e.target.value) },
                          }))
                        }
                        className="text-xs"
                      />
                    </div>

                    {/* Alignment */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Header Alignment</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={template.alignment.header === 'left' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setTemplate(prev => ({
                              ...prev,
                              alignment: { ...prev.alignment, header: 'left' },
                            }))
                          }
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={template.alignment.header === 'center' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setTemplate(prev => ({
                              ...prev,
                              alignment: { ...prev.alignment, header: 'center' },
                            }))
                          }
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={template.alignment.header === 'right' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setTemplate(prev => ({
                              ...prev,
                              alignment: { ...prev.alignment, header: 'right' },
                            }))
                          }
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Body Alignment</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={template.alignment.body === 'left' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setTemplate(prev => ({
                              ...prev,
                              alignment: { ...prev.alignment, body: 'left' },
                            }))
                          }
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={template.alignment.body === 'center' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setTemplate(prev => ({
                              ...prev,
                              alignment: { ...prev.alignment, body: 'center' },
                            }))
                          }
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={template.alignment.body === 'right' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setTemplate(prev => ({
                              ...prev,
                              alignment: { ...prev.alignment, body: 'right' },
                            }))
                          }
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Footer Alignment</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={template.alignment.footer === 'left' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setTemplate(prev => ({
                              ...prev,
                              alignment: { ...prev.alignment, footer: 'left' },
                            }))
                          }
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={template.alignment.footer === 'center' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setTemplate(prev => ({
                              ...prev,
                              alignment: { ...prev.alignment, footer: 'center' },
                            }))
                          }
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={template.alignment.footer === 'right' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setTemplate(prev => ({
                              ...prev,
                              alignment: { ...prev.alignment, footer: 'right' },
                            }))
                          }
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fields" className="px-4 pb-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Company Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Company Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Company Name</Label>
                      <Input
                        value={template.companyName.value}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            companyName: { ...prev.companyName, value: e.target.value },
                          }))
                        }
                        placeholder="{{supplier.name}}"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Address</Label>
                      <Textarea
                        value={template.companyAddress.value}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            companyAddress: { ...prev.companyAddress, value: e.target.value },
                          }))
                        }
                        placeholder="{{supplier.address}}"
                        className="text-xs"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Emirate</Label>
                      <Input
                        value={template.emirate.value}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            emirate: { ...prev.emirate, value: e.target.value },
                          }))
                        }
                        placeholder="{{supplier.emirate}}"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">TRN</Label>
                      <Input
                        value={template.trn.value}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            trn: { ...prev.trn, value: e.target.value },
                          }))
                        }
                        placeholder="{{supplier.trn}}"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Contact</Label>
                      <Input
                        value={template.contact.value}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            contact: { ...prev.contact, value: e.target.value },
                          }))
                        }
                        placeholder="{{supplier.phone}}"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Email</Label>
                      <Input
                        value={template.email.value}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            email: { ...prev.email, value: e.target.value },
                          }))
                        }
                        placeholder="{{supplier.email}}"
                        className="text-xs"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Invoice Metadata Labels */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Invoice Metadata (Labels)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={template.invoiceNumber.label}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            invoiceNumber: { ...prev.invoiceNumber, label: e.target.value },
                          }))
                        }
                        placeholder="Invoice No."
                        className="text-xs"
                      />
                      <Input
                        value={template.invoiceDate.label}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            invoiceDate: { ...prev.invoiceDate, label: e.target.value },
                          }))
                        }
                        placeholder="Dated"
                        className="text-xs"
                      />
                      <Input
                        value={template.deliveryNote.label}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            deliveryNote: { ...prev.deliveryNote, label: e.target.value },
                          }))
                        }
                        placeholder="Delivery Note"
                        className="text-xs"
                      />
                      <Input
                        value={template.paymentTerms.label}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            paymentTerms: { ...prev.paymentTerms, label: e.target.value },
                          }))
                        }
                        placeholder="Mode/Terms of Payment"
                        className="text-xs"
                      />
                      <Input
                        value={template.supplierRef.label}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            supplierRef: { ...prev.supplierRef, label: e.target.value },
                          }))
                        }
                        placeholder="Supplier's Ref."
                        className="text-xs"
                      />
                      <Input
                        value={template.otherRef.label}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            otherRef: { ...prev.otherRef, label: e.target.value },
                          }))
                        }
                        placeholder="Other Reference(s)"
                        className="text-xs"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Vendor Section Labels (for purchase invoices) */}
                {template.vendorName ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Vendor Section</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={template.vendorName.label}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          vendorName: { ...prev.vendorName!, label: e.target.value },
                        }))
                      }
                      placeholder="Vendor Name"
                      className="text-xs"
                    />
                    <Input
                      value={template.vendorAddress?.label || ''}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          vendorAddress: { ...prev.vendorAddress || { visible: true }, label: e.target.value },
                        }))
                      }
                      placeholder="Vendor Address"
                      className="text-xs"
                    />
                    <Input
                      value={template.vendorEmirate?.label || ''}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          vendorEmirate: { ...prev.vendorEmirate || { visible: true }, label: e.target.value },
                        }))
                      }
                      placeholder="Vendor Emirate"
                      className="text-xs"
                    />
                    <Input
                      value={template.vendorCountry?.label || ''}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          vendorCountry: { ...prev.vendorCountry || { visible: true }, label: e.target.value },
                        }))
                      }
                      placeholder="Vendor Country"
                      className="text-xs"
                    />
                    <Input
                      value={template.vendorTRN?.label || ''}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          vendorTRN: { ...prev.vendorTRN || { visible: true }, label: e.target.value },
                        }))
                      }
                      placeholder="Vendor TRN"
                      className="text-xs"
                    />
                    <Input
                      value={template.vendorContact?.label || ''}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          vendorContact: { ...prev.vendorContact || { visible: true }, label: e.target.value },
                        }))
                      }
                      placeholder="Vendor Contact"
                      className="text-xs"
                    />
                    <Input
                      value={template.vendorEmail?.label || ''}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          vendorEmail: { ...prev.vendorEmail || { visible: true }, label: e.target.value },
                        }))
                      }
                      placeholder="Vendor E-Mail"
                      className="text-xs"
                    />
                    <Input
                      value={template.vendorPlaceOfSupply?.label || ''}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          vendorPlaceOfSupply: { ...prev.vendorPlaceOfSupply || { visible: true }, label: e.target.value },
                        }))
                      }
                      placeholder="Place of supply"
                      className="text-xs"
                    />
                  </CardContent>
                </Card>
                ) : (
                /* Customer Section Labels (for sales invoices) */
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Customer Section</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {template.consignee && (
                    <Input
                      value={template.consignee.label}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          consignee: { ...prev.consignee!, label: e.target.value },
                        }))
                      }
                      placeholder="Consignee"
                      className="text-xs"
                    />
                    )}
                    {template.buyer && (
                    <Input
                      value={template.buyer.label}
                      onChange={(e) =>
                        setTemplate(prev => ({
                          ...prev,
                          buyer: { ...prev.buyer!, label: e.target.value },
                        }))
                      }
                      placeholder="Buyer"
                      className="text-xs"
                    />
                    )}
                  </CardContent>
                </Card>
                )}

                {/* Footer Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Footer Section</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Declaration</Label>
                      <Textarea
                        value={template.declaration.content}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            declaration: { ...prev.declaration, content: e.target.value },
                          }))
                        }
                        placeholder="Declaration text"
                        className="text-xs"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Authorized Signatory</Label>
                      <Input
                        value={template.authorizedSignatory.content}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            authorizedSignatory: { ...prev.authorizedSignatory, content: e.target.value },
                          }))
                        }
                        placeholder="for {{supplier.name}}"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Computer Generated Notice</Label>
                      <Input
                        value={template.computerGenerated.content}
                        onChange={(e) =>
                          setTemplate(prev => ({
                            ...prev,
                            computerGenerated: { ...prev.computerGenerated, content: e.target.value },
                          }))
                        }
                        placeholder="This is a Computer Generated Invoice"
                        className="text-xs"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Line Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {template.lineItems.columns.map((column) => (
                        <div key={column.id} className="p-3 border border-border rounded-md space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={column.visible}
                                onChange={(e) =>
                                  updateLineItemColumn(column.id, { visible: e.target.checked })
                                }
                              />
                              <Label className="text-xs">Visible</Label>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItemColumn(column.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                          <Input
                            value={column.label}
                            onChange={(e) => updateLineItemColumn(column.id, { label: e.target.value })}
                            placeholder="Column Label"
                            className="text-xs"
                          />
                          <Select
                            value={column.type}
                            onValueChange={(value) => updateLineItemColumn(column.id, { type: value })}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="!z-[9999]" style={{ zIndex: 9999 }}>
                              {COLUMN_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={column.mappedField}
                            onChange={(e) => updateLineItemColumn(column.id, { mappedField: e.target.value })}
                            placeholder="Map to field (e.g., product, qty, unitPrice)"
                            className="text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={column.align === 'left' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateLineItemColumn(column.id, { align: 'left' })}
                            >
                              <AlignLeft className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant={column.align === 'center' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateLineItemColumn(column.id, { align: 'center' })}
                            >
                              <AlignCenter className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant={column.align === 'right' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateLineItemColumn(column.id, { align: 'right' })}
                            >
                              <AlignRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLineItemColumn}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Column
                    </Button>

                    {/* Row Style */}
                    <div className="pt-4 border-t border-border space-y-2">
                      <Label className="text-xs font-semibold">Row Style</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Font Size</Label>
                          <Input
                            type="number"
                            value={template.lineItems.rowStyle.fontSize}
                            onChange={(e) =>
                              setTemplate(prev => ({
                                ...prev,
                                lineItems: {
                                  ...prev.lineItems,
                                  rowStyle: {
                                    ...prev.lineItems.rowStyle,
                                    fontSize: Number(e.target.value),
                                  },
                                },
                              }))
                            }
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Text Color</Label>
                          <Input
                            type="color"
                            value={template.lineItems.rowStyle.color}
                            onChange={(e) =>
                              setTemplate(prev => ({
                                ...prev,
                                lineItems: {
                                  ...prev.lineItems,
                                  rowStyle: {
                                    ...prev.lineItems.rowStyle,
                                    color: e.target.value,
                                  },
                                },
                              }))
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Row Alignment</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={template.lineItems.rowStyle.alignment === 'left' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setTemplate(prev => ({
                                ...prev,
                                lineItems: {
                                  ...prev.lineItems,
                                  rowStyle: {
                                    ...prev.lineItems.rowStyle,
                                    alignment: 'left',
                                  },
                                },
                              }))
                            }
                          >
                            <AlignLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant={template.lineItems.rowStyle.alignment === 'center' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setTemplate(prev => ({
                                ...prev,
                                lineItems: {
                                  ...prev.lineItems,
                                  rowStyle: {
                                    ...prev.lineItems.rowStyle,
                                    alignment: 'center',
                                  },
                                },
                              }))
                            }
                          >
                            <AlignCenter className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant={template.lineItems.rowStyle.alignment === 'right' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setTemplate(prev => ({
                                ...prev,
                                lineItems: {
                                  ...prev.lineItems,
                                  rowStyle: {
                                    ...prev.lineItems.rowStyle,
                                    alignment: 'right',
                                  },
                                },
                              }))
                            }
                          >
                            <AlignRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Live preview — same renderer as print (true WYSIWYG) */}
        <div className="flex-1 overflow-auto bg-muted p-8">
          <InvoicePreviewFrame html={previewHtml} className="mx-auto max-w-[794px] rounded-lg shadow-lg" />
        </div>
      </div>
    </div>
  )
}
