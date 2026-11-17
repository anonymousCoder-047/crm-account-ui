import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, Modal, Form, Input as AntInput, Switch, ColorPicker, Select, App, Popconfirm, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { Upload as UploadIcon, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  StarOff, 
  Layout, 
  Palette, 
  Settings,
  Copy,
  Download,
  Printer,
  Image as ImageIcon
} from 'lucide-react'
import { SalesInvoiceTemplateAPI, type SalesInvoiceTemplate, type SalesInvoiceTemplateInput } from '@/services/api'
import { Button as UIButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import SimpleInvoiceTemplateEditor, { type SimpleInvoiceTemplate } from '@/components/invoice/SimpleInvoiceTemplateEditor'
import InvoiceTemplateDesigner from '@/components/invoice/InvoiceTemplateDesigner'

// Default Tax Invoice template for SALES invoices only
// Structure: Company (Seller) at top, Customer (Buyer) below
// NO vendor fields - purchase invoices use different structure
export const DEFAULT_TEMPLATE: SimpleInvoiceTemplate = {
  colorTheme: 'light',
  borderStyle: 'full',
  
  // Company Details
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
  
  // Customer Section
  consignee: { label: 'Consignee', visible: true },
  buyer: { label: 'Buyer', visible: true },
  customerEmirate: { label: 'Emirate', visible: true },
  customerCountry: { label: 'Country', visible: true },
  placeOfSupply: { label: 'Place of supply', visible: true },
  
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

export default function SalesTemplatesManage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SalesInvoiceTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SalesInvoiceTemplate | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [designerMode, setDesignerMode] = useState(false)
  const [templateData, setTemplateData] = useState<SimpleInvoiceTemplate | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await SalesInvoiceTemplateAPI.list()
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const onSetDefault = async (id: string) => {
    try {
    await SalesInvoiceTemplateAPI.setDefault(id)
      message.success('Template set as default successfully')
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to set default template')
    }
  }

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedTemplate(null)
    setLogoFile(null)
    setLogoPreview(null)
    // New templates open in the modern canvas designer (element format)
    setTemplateData({ pageWidth: 794, pageHeight: 1123, elements: [] } as any)
    form.resetFields()
    form.setFieldsValue({
      name: '',
      description: '',
      isDefault: false,
      logo: null,
      companyNameEn: '',
      companyNameAr: '',
      companyAddressEn: '',
      companyAddressAr: '',
      companyContactEn: '',
      companyContactAr: '',
      footerTextEn: '',
      footerTextAr: '',
      layout: {
        header: {
          showLogo: true,
          logoPosition: 'left',
          showCompanyName: true,
          showCompanyAddress: true,
          showCompanyContact: true,
        },
        body: {
          showInvoiceNumber: true,
          showDate: true,
          showCustomerDetails: true,
          showDeliveryAddress: true,
          showLineItems: true,
          showDiscount: true,
          showVat: true,
          showTotal: true,
          showPaymentMethod: true,
          showStatus: true,
          showTrn: true,
        },
        footer: {
          showTerms: false,
          showNotes: false,
          customFooter: '',
        },
      },
      styling: {
        primaryColor: '#10b981',
        secondaryColor: '#6b7280',
        fontFamily: 'Inter',
        fontSize: '14px',
        borderStyle: 'solid',
        logoSize: 'medium',
      },
    })
    setModalOpen(true)
  }

  const handleEdit = (template: SalesInvoiceTemplate) => {
    console.log('🔍 Loading template for edit:', template)
    console.log('📋 Template design:', template.design)
    console.log('✅ Has design?', !!template.design)
    console.log('✅ Is new format?', template.design && typeof template.design === 'object' && !('elements' in template.design))
    
    // Initialize templateData with existing design so edits persist —
    // supports both element (canvas) and field-based (simple) formats.
    let initialDesign: any
    if (template.design && typeof template.design === 'object' && !Array.isArray(template.design)) {
      console.log('✅ Using saved design:', template.design)
      initialDesign = template.design
    } else {
      console.log('⚠️ No valid design found, using defaults')
      initialDesign = DEFAULT_TEMPLATE
    }
    
    // Set all state together
    setIsEditing(true)
    setSelectedTemplate(template)
    setLogoFile(null)
    setLogoPreview(template.logo || null)
    setTemplateData(initialDesign)
    setDesignerMode(!!template.design)
    
    form.setFieldsValue({
      name: template.name,
      description: template.description || '',
      isDefault: template.isDefault || false,
      logo: template.logo || null,
      companyNameEn: template.companyNameEn || '',
      companyNameAr: template.companyNameAr || '',
      companyAddressEn: template.companyAddressEn || '',
      companyAddressAr: template.companyAddressAr || '',
      companyContactEn: template.companyContactEn || '',
      companyContactAr: template.companyContactAr || '',
      footerTextEn: template.footerTextEn || '',
      footerTextAr: template.footerTextAr || '',
      layout: template.layout || {},
      styling: template.styling || {},
    })
    setModalOpen(true)
  }

  const handleLogoUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('You can only upload image files!')
      return false
    }
    const isLt2M = file.size / 1024 / 1024 < 2
    if (!isLt2M) {
      message.error('Image must be smaller than 2MB!')
      return false
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    return false // Prevent auto upload
  }

  const handleLogoRemove = () => {
    setLogoFile(null)
    setLogoPreview(null)
    form.setFieldsValue({ logo: null })
  }

  const handleDelete = async (id: string) => {
    try {
      await SalesInvoiceTemplateAPI.remove(id)
      message.success('Template deleted successfully')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting template:', error)
      message.error(error.response?.data?.message || 'Failed to delete template')
    }
  }


  const handleSaveTemplate = async (templateDesign: any) => {
    setTemplateData(templateDesign)
    // Get form values and save
    const values = form.getFieldsValue()
    await saveTemplateToDatabase(values, templateDesign)
  }

  const saveTemplateToDatabase = async (values: any, templateDesign?: any) => {
    try {
      // Ensure we have template data before saving
      const designToSave = templateDesign || templateData || (selectedTemplate?.design as SimpleInvoiceTemplate) || DEFAULT_TEMPLATE
      
      console.log('Saving template with design:', designToSave)

      const formData = new FormData()
      formData.append('name', values.name || selectedTemplate?.name || 'Untitled Template')
      if (values.description) formData.append('description', values.description)
      formData.append('isDefault', values.isDefault ? 'true' : 'false')
      formData.append('companyNameEn', values.companyNameEn || '')
      formData.append('companyNameAr', values.companyNameAr || '')
      formData.append('companyAddressEn', values.companyAddressEn || '')
      formData.append('companyAddressAr', values.companyAddressAr || '')
      formData.append('companyContactEn', values.companyContactEn || '')
      formData.append('companyContactAr', values.companyContactAr || '')
      formData.append('footerTextEn', values.footerTextEn || '')
      formData.append('footerTextAr', values.footerTextAr || '')
      formData.append('layout', JSON.stringify(values.layout || {}))
      formData.append('styling', JSON.stringify(values.styling || {}))
      formData.append('fieldsVisibility', JSON.stringify({}))
      formData.append('customFields', JSON.stringify([]))
      formData.append('design', JSON.stringify(designToSave))
      
      if (logoFile) {
        formData.append('logo', logoFile)
      } else if (logoPreview && !logoFile) {
        // If editing and logo exists but no new file, keep existing logo
        formData.append('logo', logoPreview)
      }

      if (isEditing && selectedTemplate) {
        console.log('📡 API CALL: Updating template:', selectedTemplate._id)
        console.log('📦 Payload design:', designToSave)
        const response = await SalesInvoiceTemplateAPI.update(selectedTemplate._id, formData as any)
        console.log('✅ API Response:', response)
        message.success('Template updated successfully in database!')
      } else {
        console.log('📡 API CALL: Creating new template')
        console.log('📦 Payload design:', designToSave)
        const response = await SalesInvoiceTemplateAPI.create(formData as any)
        console.log('✅ API Response:', response)
        message.success('Template created successfully in database!')
      }
      setModalOpen(false)
      setLogoFile(null)
      setLogoPreview(null)
      setDesignerMode(false)
      setTemplateData(null)
      fetchData()
    } catch (error: any) {
      console.error('Error saving template:', error)
      message.error(error.response?.data?.message || 'Failed to save template')
    }
  }

  const onFinish = async (values: any) => {
    await saveTemplateToDatabase(values)
  }

  const columns: ColumnsType<SalesInvoiceTemplate> = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: SalesInvoiceTemplate) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{text}</div>
            {record.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{record.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (isDefault: boolean) => (
        <Badge
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full border',
            isDefault
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-muted text-muted-foreground border-border'
          )}
        >
          {isDefault ? (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              Default
            </span>
          ) : (
            'Standard'
          )}
        </Badge>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <UIButton
            variant="outline"
            size="sm"
            onClick={() => handleEdit(record)}
            className="border-border hover:bg-muted/50"
          >
            <Edit className="h-4 w-4" />
          </UIButton>
          {!record.isDefault && (
            <Popconfirm
              title="Delete template"
              description="Are you sure you want to delete this template?"
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <UIButton
                variant="outline"
                size="sm"
                className="border-red-500/30 hover:bg-red-500/10 text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </UIButton>
            </Popconfirm>
          )}
          {!record.isDefault && (
            <UIButton
              variant="outline"
              size="sm"
              onClick={() => onSetDefault(record._id)}
              className="border-primary/20 hover:bg-primary/10 text-primary"
              title="Set as default"
            >
              <Star className="h-4 w-4" />
            </UIButton>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invoice Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and customize your invoice templates</p>
          </div>
        </div>
        <UIButton
          onClick={handleCreate}
          className="shadow-md hover:shadow-lg transition-shadow"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </UIButton>
      </motion.div>

      {/* Templates Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <Table
              rowKey="_id"
              loading={loading}
              columns={columns}
              dataSource={data}
              scroll={{ x: 'max-content' }}
              pagination={{ pageSize: 10 }}
              className="[&_.ant-table-thead>tr>th]:bg-muted/50 [&_.ant-table-thead>tr>th]:border-border"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Template Modal — full screen so the canvas + live preview fit */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width="100vw"
        style={{ top: 0, margin: 0, maxWidth: '100vw', paddingBottom: 0, height: '100vh' }}
        className="[&_.ant-modal-content]:p-0"
      >
        <div className="p-6 flex flex-col" style={{ height: 'calc(100vh - 55px)' }}>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-foreground">
              {isEditing ? 'Edit Template' : 'Create New Template'}
            </h2>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="flex flex-col flex-1 min-h-0 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="name"
                label={<span className="text-sm font-semibold text-foreground">Template Name</span>}
                rules={[{ required: true, message: 'Please enter template name' }]}
              >
                <AntInput
                  placeholder="Enter template name"
                  className="h-11 border-border focus:border-primary focus:ring-primary"
                />
              </Form.Item>

              <Form.Item
                name="description"
                label={<span className="text-sm font-semibold text-foreground">Description</span>}
              >
                <AntInput
                  placeholder="Enter description (optional)"
                  className="h-11 border-border focus:border-primary focus:ring-primary"
                />
              </Form.Item>
            </div>

            <Form.Item
              name="isDefault"
              valuePropName="checked"
              label={<span className="text-sm font-semibold text-foreground">Set as Default</span>}
            >
              <Switch />
            </Form.Item>

            <div className="w-full flex-1 min-h-0">
              <div 
                className="h-full border border-border rounded-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                  }
                }}
              >
                {templateData && (
                  Array.isArray((templateData as any).elements) ? (
                    <InvoiceTemplateDesigner
                      key={selectedTemplate?._id || 'new'}
                      initialDesign={templateData as any}
                      onDesignChange={(design) => setTemplateData(design as any)}
                      onSave={(design) => {
                        console.log('💾 Design save clicked')
                        handleSaveTemplate(design as any)
                      }}
                      onCancel={() => {
                        setDesignerMode(false)
                        setModalOpen(false)
                      }}
                    />
                  ) : (
                  <SimpleInvoiceTemplateEditor
                    key={selectedTemplate?._id || 'new'}
                    initialTemplate={templateData}
                    onTemplateChange={(template) => {
                      console.log('📝 Template changed in editor')
                      setTemplateData(template)
                    }}
                    onSave={(template) => {
                      console.log('💾 Template save clicked')
                      handleSaveTemplate(template)
                    }}
                    onCancel={() => {
                      setDesignerMode(false)
                      setModalOpen(false)
                    }}
                  />
                  )
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" className="bg-primary hover:bg-primary/90">
                {isEditing ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  )
}
