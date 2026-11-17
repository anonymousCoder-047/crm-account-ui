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
import { DeliveryOrderTemplateAPI, type DeliveryOrderTemplate, type DeliveryOrderTemplateInput } from '@/services/api'
import { Button as UIButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SimpleInvoiceTemplateEditor, { type SimpleInvoiceTemplate } from '@/components/invoice/SimpleInvoiceTemplateEditor'
import InvoiceTemplateDesigner from '@/components/invoice/InvoiceTemplateDesigner'

// Default Delivery Order template
// Structure: Company (Seller) at top, Customer (Buyer) below
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
  
  // Order Metadata (simplified for delivery orders)
  invoiceNumber: { label: 'Order No.', visible: true },
  invoiceDate: { label: 'Date', visible: true },
  deliveryNote: { label: 'Delivery Address', visible: true },
  paymentTerms: { label: 'Mode/Terms of Payment', visible: false },
  supplierRef: { label: "Supplier's Ref.", visible: false },
  otherRef: { label: 'Other Reference(s)', visible: false },
  buyerOrderNo: { label: "Buyer's Order No.", visible: false },
  buyerOrderDate: { label: 'Dated', visible: false },
  despatchDocNo: { label: 'Despatch Document No.', visible: false },
  deliveryNoteDate: { label: 'Delivery Note Date', visible: false },
  despatchedThrough: { label: 'Despatched through', visible: false },
  destination: { label: 'Destination', visible: false },
  termsOfDelivery: { label: 'Terms of delivery', visible: false },
  
  // Customer Section (only Consignee for delivery orders, no Buyer)
  consignee: { label: 'Consignee', visible: true },
  buyer: { label: 'Buyer', visible: false },
  customerEmirate: { label: 'Emirate', visible: false },
  customerCountry: { label: 'Country', visible: false },
  placeOfSupply: { label: 'Place of supply', visible: false },
  
  // Footer
  declaration: { 
    label: 'Declaration', 
    visible: true, 
    content: 'We declare that this delivery order shows the actual goods described and that all particulars are true and correct.' 
  },
  authorizedSignatory: { 
    label: 'Authorised Signatory', 
    visible: true, 
    content: 'for YOUR COMPANY NAME' 
  },
  computerGenerated: { 
    visible: true, 
    content: 'This is a Computer Generated Delivery Order' 
  },
  
  // Line Items (for delivery orders: SI No, Description, Quantity, Delivered)
  lineItems: {
    columns: [
      { id: '1', type: 'itemName', label: 'SI\nNo', mappedField: 'slNo', visible: true, align: 'center', width: 50 },
      { id: '2', type: 'description', label: 'Description of Goods', mappedField: 'description', visible: true, align: 'left' },
      { id: '3', type: 'quantity', label: 'Quantity', mappedField: 'quantity', visible: true, align: 'center', width: 80 },
      { id: '4', type: 'itemName', label: 'Delivered', mappedField: 'delivered', visible: true, align: 'center', width: 80 },
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

export default function DeliveryOrderTemplatesManage() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<DeliveryOrderTemplate[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<DeliveryOrderTemplate | null>(null)
  const [templateData, setTemplateData] = useState<SimpleInvoiceTemplate | null>(null)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const res = await DeliveryOrderTemplateAPI.list()
      setTemplates(res.data.data || [])
    } catch (error: any) {
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

  const handleEdit = (template: DeliveryOrderTemplate) => {
    console.log('🔍 Loading delivery order template for edit:', template)
    console.log('📋 Template design:', template.design)
    
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
      await DeliveryOrderTemplateAPI.remove(id)
      message.success('Template deleted successfully')
      loadTemplates()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete template')
    }
  }

  const onSetDefault = async (id: string) => {
    try {
      await DeliveryOrderTemplateAPI.setDefault(id)
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
      
      console.log('Saving delivery order template with design:', designToSave)
      
      // Create FormData for file upload support
      const formData = new FormData()
      formData.append('name', values.name || selectedTemplate?.name || 'Untitled Template')
      if (values.description) formData.append('description', values.description)
      formData.append('isDefault', (selectedTemplate?.isDefault || false) ? 'true' : 'false')
      formData.append('layout', JSON.stringify({}))
      formData.append('styling', JSON.stringify({}))
      formData.append('fieldsVisibility', JSON.stringify({}))
      formData.append('customFields', JSON.stringify([]))
      formData.append('design', JSON.stringify(designToSave))
      
      if (isEditing && selectedTemplate) {
        console.log('📡 API CALL: Updating delivery order template:', selectedTemplate._id)
        await DeliveryOrderTemplateAPI.update(selectedTemplate._id, formData as any)
        message.success('Template updated successfully in database!')
      } else {
        console.log('📡 API CALL: Creating new delivery order template')
        await DeliveryOrderTemplateAPI.create(formData as any)
        message.success('Template created successfully in database!')
      }
      
      setIsModalOpen(false)
      form.resetFields()
      setTemplateData(null)
      setSelectedTemplate(null)
      loadTemplates()
    } catch (error: any) {
      console.error('Error saving delivery order template:', error)
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

  const columns: ColumnsType<DeliveryOrderTemplate> = [
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
          <h1 className="text-3xl font-bold">Delivery Order Templates</h1>
          <p className="text-muted-foreground mt-1">Manage your delivery order templates</p>
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
              onSave={handleSaveTemplate}
              onCancel={handleCancel}
            />
          ) : (
          <SimpleInvoiceTemplateEditor
            initialTemplate={templateData || (selectedTemplate?.design ? (typeof selectedTemplate.design === 'object' && !('elements' in selectedTemplate.design) ? selectedTemplate.design as SimpleInvoiceTemplate : undefined) : DEFAULT_TEMPLATE)}
            onTemplateChange={setTemplateData}
            onSave={handleSaveTemplate}
            onCancel={handleCancel}
          />
          )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

