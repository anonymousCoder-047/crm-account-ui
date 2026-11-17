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
  Eye, 
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
import { PurchaseInvoiceTemplateAPI, type PurchaseInvoiceTemplate, type PurchaseInvoiceTemplateInput } from '@/services/api'
import { Button as UIButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SimpleInvoiceTemplateEditor, { type SimpleInvoiceTemplate } from '@/components/invoice/SimpleInvoiceTemplateEditor'
import InvoiceTemplateDesigner from '@/components/invoice/InvoiceTemplateDesigner'

// Default Tax Invoice template for PURCHASE invoices only
// Structure: Vendor (Supplier) at top, Company (Buyer) below
// NO consignee/buyer fields - sales invoices use different structure
export const DEFAULT_TEMPLATE: SimpleInvoiceTemplate = {
  colorTheme: 'light',
  borderStyle: 'full',
  
  // Vendor Details (for purchase invoices - supplier/vendor information)
  vendorName: { label: 'Vendor Name', visible: true },
  vendorAddress: { label: 'Vendor Address', visible: true },
  vendorEmirate: { label: 'Vendor Emirate', visible: true },
  vendorCountry: { label: 'Vendor Country', visible: true },
  vendorTRN: { label: 'Vendor TRN', visible: true },
  vendorContact: { label: 'Vendor Contact', visible: true },
  vendorEmail: { label: 'Vendor E-Mail', visible: true },
  vendorPlaceOfSupply: { label: 'Place of supply', visible: true },
  
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
  
  // Company Details (moved to end of invoice)
  companyName: { label: 'Company Name', value: 'YOUR COMPANY NAME', visible: true },
  companyAddress: { label: 'Address', value: 'Your Company Address, City, UAE', visible: true },
  emirate: { label: 'Emirate', value: 'Dubai', visible: true },
  trn: { label: 'TRN', value: '1234567890123', visible: true },
  contact: { label: 'Contact', value: '+971 XX XXX XXXX', visible: true },
  email: { label: 'E-Mail', value: 'info@yourcompany.com', visible: true },
  
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

export default function PurchaseTemplatesManage() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<PurchaseInvoiceTemplate[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PurchaseInvoiceTemplate | null>(null)
  const [templateData, setTemplateData] = useState<SimpleInvoiceTemplate | null>(null)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const res = await PurchaseInvoiceTemplateAPI.list()
      setTemplates(res.data.data || [])
    } catch (error: any) {
      console.error('Error loading templates:', error)
      message.error(error.response?.data?.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setIsEditing(false)
    setSelectedTemplate(null)
    // New templates open in the modern canvas designer (element format)
    setTemplateData({ pageWidth: 794, pageHeight: 1123, elements: [] } as any)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (template: PurchaseInvoiceTemplate) => {
    console.log('🔍 Loading template for edit:', template)
    console.log('📋 Template design:', template.design)
    console.log('✅ Has design?', !!template.design)
    console.log('✅ Is new format?', template.design && typeof template.design === 'object' && !('elements' in template.design))
    
    // Initialize templateData with existing design so edits persist —
    // supports both element (canvas) and field-based (simple) formats.
    let initialDesign: any
    if (template.design && typeof template.design === 'object' && 'elements' in template.design) {
      console.log('✅ Using saved element design:', template.design)
      initialDesign = template.design
    } else if (template.design && typeof template.design === 'object' && !('elements' in template.design)) {
      console.log('✅ Using saved design:', template.design)
      const savedDesign = template.design as SimpleInvoiceTemplate
      
      // If template has vendorName, ensure it doesn't have consignee/buyer (clean up old structure)
      if (savedDesign.vendorName) {
        // Remove consignee/buyer fields if they exist
        const { consignee, buyer, customerEmirate, customerCountry, placeOfSupply, ...cleanedDesign } = savedDesign
        initialDesign = cleanedDesign as SimpleInvoiceTemplate
      } else {
        // If no vendorName but has consignee/buyer, migrate to vendor structure
        if (savedDesign.consignee || savedDesign.buyer) {
          initialDesign = {
            ...DEFAULT_TEMPLATE,
            ...savedDesign,
            // Remove old customer fields
            consignee: undefined,
            buyer: undefined,
            customerEmirate: undefined,
            customerCountry: undefined,
            placeOfSupply: undefined,
            // Add vendor fields from DEFAULT_TEMPLATE
            vendorName: DEFAULT_TEMPLATE.vendorName,
            vendorAddress: DEFAULT_TEMPLATE.vendorAddress,
            vendorEmirate: DEFAULT_TEMPLATE.vendorEmirate,
            vendorCountry: DEFAULT_TEMPLATE.vendorCountry,
            vendorTRN: DEFAULT_TEMPLATE.vendorTRN,
            vendorContact: DEFAULT_TEMPLATE.vendorContact,
            vendorEmail: DEFAULT_TEMPLATE.vendorEmail,
            vendorPlaceOfSupply: DEFAULT_TEMPLATE.vendorPlaceOfSupply,
          }
        } else {
          initialDesign = savedDesign
        }
      }
    } else {
      console.log('⚠️ No valid design found, using defaults')
      initialDesign = DEFAULT_TEMPLATE
    }
    
    // Set all state together
    setIsEditing(true)
    setSelectedTemplate(template)
    setTemplateData(initialDesign)
    
    form.setFieldsValue({
      name: template.name,
      description: template.description || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await PurchaseInvoiceTemplateAPI.remove(id)
      message.success('Template deleted successfully')
      loadTemplates()
    } catch (error: any) {
      console.error('Error deleting template:', error)
      message.error(error.response?.data?.message || 'Failed to delete template')
    }
  }

  const onSetDefault = async (id: string) => {
    try {
      await PurchaseInvoiceTemplateAPI.setDefault(id)
      message.success('Default template updated successfully')
      loadTemplates()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to set default template')
    }
  }

  const saveTemplateToDatabase = async (templateDesign?: any) => {
    try {
      const values = form.getFieldsValue()
      
      // Always include template design (use templateDesign if provided, otherwise use templateData or default)
      const designToSave = templateDesign || templateData || DEFAULT_TEMPLATE
      
      console.log('Saving template with design:', designToSave)
      
      if (isEditing && selectedTemplate) {
        console.log('📡 API CALL: Updating template:', selectedTemplate._id)
        console.log('📦 Payload design:', designToSave)
        const response = await PurchaseInvoiceTemplateAPI.update(selectedTemplate._id, {
          ...values,
          design: designToSave,
        } as any)
        console.log('✅ API Response:', response)
        message.success('Template updated successfully in database!')
      } else {
        console.log('📡 API CALL: Creating new template')
        console.log('📦 Payload design:', designToSave)
        const response = await PurchaseInvoiceTemplateAPI.create({
          ...values,
          design: designToSave,
        } as PurchaseInvoiceTemplateInput)
        console.log('✅ API Response:', response)
        message.success('Template created successfully in database!')
      }
      
      setIsModalOpen(false)
      form.resetFields()
      setTemplateData(null)
      setSelectedTemplate(null)
      loadTemplates()
    } catch (error: any) {
      console.error('Error saving template:', error)
      message.error(error.response?.data?.message || 'Failed to save template')
    }
  }

  const handleSaveTemplate = async (templateDesign: any) => {
    setTemplateData(templateDesign)
    await saveTemplateToDatabase(templateDesign)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await saveTemplateToDatabase(templateData)
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.response?.data?.message || 'Failed to save template')
    }
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
    setTemplateData(null)
    setSelectedTemplate(null)
    setIsEditing(false)
  }

  const columns: ColumnsType<PurchaseInvoiceTemplate> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-medium">{text}</span>
          {record.isDefault && (
            <Badge variant="default" className="bg-primary text-primary-foreground">
              Default
            </Badge>
          )}
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-',
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
              disabled={record.isDefault}
              title={record.isDefault ? "Cannot delete default template" : "Delete template"}
            >
              <Trash2 className="h-4 w-4" />
            </UIButton>
          </Popconfirm>
          {!record.isDefault && (
            <UIButton
              variant="outline"
              size="sm"
              onClick={() => onSetDefault(record._id)}
              className="border-yellow-500/30 hover:bg-yellow-500/10"
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Invoice Templates</h1>
          <p className="text-muted-foreground mt-1">Manage your purchase invoice templates</p>
        </div>
        <UIButton onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </UIButton>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={templates}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        open={isModalOpen}
        onCancel={handleCancel}
        onOk={handleSave}
        title={isEditing ? 'Edit Template' : 'Create Template'}
        width="100vw"
        style={{ top: 0, margin: 0, maxWidth: '100vw', paddingBottom: 0, height: '100vh' }}
        okText="Save"
        cancelText="Cancel"
      >
        <div className="mt-4 flex flex-col" style={{ height: 'calc(100vh - 165px)' }}>
          <Form form={form} layout="vertical" className="flex-shrink-0">
            <Form.Item
              name="name"
              label="Template Name"
              rules={[{ required: true, message: 'Please enter template name' }]}
            >
              <AntInput placeholder="Enter template name" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Description"
            >
              <AntInput.TextArea rows={3} placeholder="Enter template description" />
            </Form.Item>
          </Form>

          <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden mt-2">
          {Array.isArray((templateData as any)?.elements) ? (
            <InvoiceTemplateDesigner
              key={selectedTemplate?._id || 'new'}
              initialDesign={templateData as any}
              onDesignChange={(design) => setTemplateData(design as any)}
              onSave={(design) => {
                console.log('💾 Design save clicked')
                handleSaveTemplate(design as any)
              }}
              onCancel={handleCancel}
            />
          ) : (
          <SimpleInvoiceTemplateEditor
            initialTemplate={templateData || (selectedTemplate?.design && typeof selectedTemplate.design === 'object' && !('elements' in selectedTemplate.design) ? selectedTemplate.design as SimpleInvoiceTemplate : DEFAULT_TEMPLATE)}
            onTemplateChange={(template) => {
              console.log('📝 Template changed in editor')
              setTemplateData(template)
            }}
            onSave={(template) => {
              console.log('💾 Template save clicked')
              handleSaveTemplate(template)
            }}
            onCancel={handleCancel}
          />
          )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
