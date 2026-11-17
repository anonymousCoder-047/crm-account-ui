import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, Form, Input as AntInput, message, InputNumber, DatePicker, Select } from 'antd'
import dayjs from 'dayjs'
import {
  FileText,
  ShoppingCart,
  UserPlus,
  Building2,
  Package,
  Receipt,
  CreditCard,
} from 'lucide-react'
import {
  CustomerAPI,
  SupplierAPI,
  InventoryAPI,
  ExpenseAPI,
  ReceivableAPI,
  PayableAPI,
  SalesInvoiceAPI, 
  PurchaseInvoiceAPI,
  type CustomerInput,
  type SupplierInput,
  type InventoryInput,
  type ExpenseInput,
  type ReceivableInput,
  type PayableInput,
  type SalesInvoiceInput,
  type PurchaseInvoiceInput,
  type Customer,
  type Supplier,
  type InventoryItem,
} from '@/services/api'

const actions = [
  {
    label: 'Create Sales Invoice',
    icon: FileText,
    path: '/sales-invoices/create',
    color: 'bg-blue-500/10 hover:bg-blue-500/15 text-blue-400',
    type: 'sales_invoice',
  },
  {
    label: 'Create Purchase Invoice',
    icon: ShoppingCart,
    path: '/purchase-invoices/create',
    color: 'bg-green-500/10 hover:bg-green-500/15 text-green-400',
    type: 'purchase_invoice',
  },
  {
    label: 'Add Customer',
    icon: UserPlus,
    path: '/crm-settings/customers',
    color: 'bg-purple-500/10 hover:bg-purple-500/15 text-purple-400',
    type: 'customer',
  },
  {
    label: 'Add Supplier',
    icon: Building2,
    path: '/crm-settings/suppliers',
    color: 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-400',
    type: 'supplier',
  },
  {
    label: 'Add Inventory',
    icon: Package,
    path: '/inventory/create',
    color: 'bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-400',
    type: 'inventory',
  },
  {
    label: 'Add Expense',
    icon: Receipt,
    path: '/expenses/create',
    color: 'bg-red-500/10 hover:bg-red-500/15 text-red-400',
    type: 'expense',
  },
  {
    label: 'Add Receivable',
    icon: CreditCard,
    path: '/receivables/create',
    color: 'bg-teal-500/10 hover:bg-teal-500/15 text-teal-400',
    type: 'receivable',
  },
  {
    label: 'Add Payable',
    icon: CreditCard,
    path: '/payables/create',
    color: 'bg-pink-500/10 hover:bg-pink-500/15 text-pink-400',
    type: 'payable',
  },
]

export default function QuickActions() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [customerForm] = Form.useForm<CustomerInput>()
  const [supplierForm] = Form.useForm<SupplierInput>()
  const [inventoryForm] = Form.useForm<InventoryInput>()
  const [expenseForm] = Form.useForm<ExpenseInput>()
  const [receivableForm] = Form.useForm<ReceivableInput>()
  const [payableForm] = Form.useForm<PayableInput>()
  const [salesInvoiceForm] = Form.useForm<SalesInvoiceInput>()
  const [purchaseInvoiceForm] = Form.useForm<PurchaseInvoiceInput>()

  // Fetch data when modal opens
  useEffect(() => {
    if (modalOpen) {
      const fetchData = async () => {
        if (activeAction === 'receivable' || activeAction === 'sales_invoice') {
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
        
        if (activeAction === 'payable' || activeAction === 'purchase_invoice') {
          setLoadingSuppliers(true)
          try {
            const res = await SupplierAPI.list()
            setSuppliers(res.data.data)
          } catch (error) {
            console.error('Error fetching suppliers:', error)
          } finally {
            setLoadingSuppliers(false)
          }
        }
        
        if (activeAction === 'sales_invoice' || activeAction === 'purchase_invoice') {
          setLoadingInventory(true)
          try {
            const res = await InventoryAPI.list()
            setInventoryItems(res.data.data)
          } catch (error) {
            console.error('Error fetching inventory:', error)
          } finally {
            setLoadingInventory(false)
          }
        }
      }
      fetchData()
    }
  }, [modalOpen, activeAction])

  const handleActionClick = (action: typeof actions[0]) => {
    // Open modal for all actions
    setActiveAction(action.type)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setActiveAction(null)
    customerForm.resetFields()
    supplierForm.resetFields()
    inventoryForm.resetFields()
    expenseForm.resetFields()
    receivableForm.resetFields()
    payableForm.resetFields()
    salesInvoiceForm.resetFields()
    purchaseInvoiceForm.resetFields()
  }

  // Customer form submit
  const handleCustomerSubmit = async (values: CustomerInput) => {
    setLoading(true)
    try {
      await CustomerAPI.create(values)
      message.success('Customer added successfully!')
      handleClose()
      // Optionally refresh the page or update state
      window.location.reload()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to add customer')
    } finally {
      setLoading(false)
    }
  }

  // Supplier form submit
  const handleSupplierSubmit = async (values: SupplierInput) => {
    setLoading(true)
    try {
      await SupplierAPI.create(values)
      message.success('Supplier added successfully!')
      handleClose()
      window.location.reload()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to add supplier')
    } finally {
      setLoading(false)
    }
  }

  // Inventory form submit
  const handleInventorySubmit = async (values: any) => {
    setLoading(true)
    try {
      // Generate serial number
      const res = await InventoryAPI.list()
      const count = res.data.data.length
      const serialNumber = `INV-${(count + 1).toString().padStart(4, '0')}`
      
      const inventoryData: InventoryInput = {
        sku: serialNumber,
        product_name: values.name || '',
        description: values.description || '',
        unit_cost: values.costPrice || 0,
        selling_price: values.costPrice || 0,
        quantity_on_hand: values.qty || 0,
        tax_percent: values.vat || 5,
        inventory_valuation_method: 'Weighted Average',
        is_active: true,
        // Legacy fields
        serialNumber,
        name: values.name,
        supplier: values.supplier,
        brand: values.brand,
        qty: values.qty || 0,
        unit: values.unit,
        costPrice: values.costPrice || 0,
        vat: values.vat || 5,
        productionDate: values.productionDate,
        expiryDate: values.expiryDate,
      }
      
      await InventoryAPI.create(inventoryData)
      message.success('Inventory item added successfully!')
      handleClose()
      window.location.reload()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to add inventory item')
    } finally {
      setLoading(false)
    }
  }

  // Expense form submit
  const handleExpenseSubmit = async (values: any) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('expense_id', values.expense_id || '')
      formData.append('category', values.category)
      if (values.vendor_id) formData.append('vendor_id', values.vendor_id)
      formData.append('amount', String(values.amount || 0))
      formData.append('currency', values.currency || 'AED')
      formData.append('expense_date', values.expense_date ? (dayjs.isDayjs(values.expense_date) ? values.expense_date.toISOString() : values.expense_date) : dayjs().toISOString())
      if (values.payment_method) formData.append('payment_method', values.payment_method)
      formData.append('status', values.status || 'unpaid')
      if (values.description) formData.append('description', values.description)
      if (values.reference_number) formData.append('reference_number', values.reference_number)
      
      await ExpenseAPI.create(formData)
      message.success('Expense added successfully!')
      handleClose()
      window.location.reload()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to add expense')
    } finally {
      setLoading(false)
    }
  }

  // Receivable form submit
  const handleReceivableSubmit = async (values: any) => {
    setLoading(true)
    try {
      const receivableData: ReceivableInput = {
        customer_id: values.customer_id,
        invoice_number: values.invoice_number || '',
        invoice_date: values.invoice_date ? (dayjs.isDayjs(values.invoice_date) ? values.invoice_date.toISOString() : values.invoice_date) : dayjs().toISOString(),
        due_date: values.due_date ? (dayjs.isDayjs(values.due_date) ? values.due_date.toISOString() : values.due_date) : dayjs().add(30, 'days').toISOString(),
        total_amount: values.total_amount || 0,
        tax_amount: values.tax_amount || 0,
        currency: values.currency || 'AED',
        payment_terms: values.payment_terms || 'Net 30',
        notes: values.notes || '',
      }
      
      await ReceivableAPI.create(receivableData)
      message.success('Receivable added successfully!')
      handleClose()
      window.location.reload()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to add receivable')
    } finally {
      setLoading(false)
    }
  }

  // Payable form submit
  const handlePayableSubmit = async (values: any) => {
    setLoading(true)
    try {
      const payableData: PayableInput = {
        vendor_id: values.vendor_id,
        bill_number: values.bill_number || '',
        bill_date: values.bill_date ? (dayjs.isDayjs(values.bill_date) ? values.bill_date.toISOString() : values.bill_date) : dayjs().toISOString(),
        due_date: values.due_date ? (dayjs.isDayjs(values.due_date) ? values.due_date.toISOString() : values.due_date) : dayjs().add(30, 'days').toISOString(),
        total_amount: values.total_amount || 0,
        tax_amount: values.tax_amount || 0,
        currency: values.currency || 'AED',
        payment_terms: values.payment_terms || 'Net 30',
        notes: values.notes || '',
      }
      
      await PayableAPI.create(payableData)
      message.success('Payable added successfully!')
      handleClose()
      window.location.reload()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to add payable')
    } finally {
      setLoading(false)
    }
  }

  // Sales Invoice form submit
  const handleSalesInvoiceSubmit = async (values: any) => {
    setLoading(true)
    try {
      // Generate invoice number
      const res = await SalesInvoiceAPI.list()
      const count = res.data.data.length
      const invoiceNumber = `SI-${(count + 1).toString().padStart(4, '0')}`
      
      const lineItems = (values.line_items || []).map((item: any) => {
        const quantity = item.quantity || 1
        const unitPrice = item.unit_price || 0
        const subtotal = quantity * unitPrice
        const vat = item.vat || 0
        const total = subtotal + vat
        
        return {
          product: item.product,
          quantity,
          unit_price: unitPrice,
          total,
          vat,
          discount: item.discount || 0,
        }
      })
      
      const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)
      const taxAmount = lineItems.reduce((sum: number, item: any) => sum + (item.vat || 0), 0)
      const discount = values.discount || 0
      const totalAmount = subtotal + taxAmount - discount
      
      const invoiceData: SalesInvoiceInput = {
        invoice_number: invoiceNumber,
        customer_id: values.customer_id,
        invoice_date: values.invoice_date ? (dayjs.isDayjs(values.invoice_date) ? values.invoice_date.toISOString() : values.invoice_date) : dayjs().toISOString(),
        due_date: values.due_date ? (dayjs.isDayjs(values.due_date) ? values.due_date.toISOString() : values.due_date) : dayjs().add(30, 'days').toISOString(),
        line_items: lineItems,
        subtotal,
        tax_amount: taxAmount,
        discount,
        total_amount: totalAmount,
        currency: values.currency || 'AED',
        payment_status: 'unpaid',
        balance_due: totalAmount,
        payment_terms: values.payment_terms || 'Net 30',
        notes: values.notes || '',
      }
      
      await SalesInvoiceAPI.create(invoiceData)
      message.success('Sales invoice created successfully!')
      handleClose()
      window.location.reload()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create sales invoice')
    } finally {
      setLoading(false)
    }
  }

  // Purchase Invoice form submit
  const handlePurchaseInvoiceSubmit = async (values: any) => {
    setLoading(true)
    try {
      // Generate invoice number
      const res = await PurchaseInvoiceAPI.list()
      const count = res.data.data.length
      const invoiceNumber = `PI-${(count + 1).toString().padStart(4, '0')}`
      
      const lineItems = (values.line_items || []).map((item: any) => {
        const quantity = item.quantity || 1
        const unitCost = item.unit_cost || 0
        const subtotal = quantity * unitCost
        const vat = item.vat || 0
        const total = subtotal + vat
        
        return {
          product: item.product,
          quantity,
          unit_cost: unitCost,
          total,
          vat,
          discount: item.discount || 0,
        }
      })
      
      const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_cost), 0)
      const taxAmount = lineItems.reduce((sum: number, item: any) => sum + (item.vat || 0), 0)
      const discount = values.discount || 0
      const totalAmount = subtotal + taxAmount - discount
      
      const invoiceData: PurchaseInvoiceInput = {
        invoice_number: invoiceNumber,
        vendor_id: values.vendor_id,
        invoice_date: values.invoice_date ? (dayjs.isDayjs(values.invoice_date) ? values.invoice_date.toISOString() : values.invoice_date) : dayjs().toISOString(),
        due_date: values.due_date ? (dayjs.isDayjs(values.due_date) ? values.due_date.toISOString() : values.due_date) : dayjs().add(30, 'days').toISOString(),
        line_items: lineItems,
        subtotal,
        tax_amount: taxAmount,
        discount,
        total_amount: totalAmount,
        currency: values.currency || 'AED',
        payment_status: 'unpaid',
        balance_due: totalAmount,
        payment_terms: values.payment_terms || 'Net 30',
        notes: values.notes || '',
      }
      
      await PurchaseInvoiceAPI.create(invoiceData)
      message.success('Purchase invoice created successfully!')
      handleClose()
      window.location.reload()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to create purchase invoice')
    } finally {
      setLoading(false)
    }
  }

  const renderModalContent = () => {
    switch (activeAction) {
      case 'customer':
        return (
          <Form form={customerForm} layout="vertical" onFinish={handleCustomerSubmit} className="mt-4">
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Name *</span>}
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <AntInput placeholder="Customer name" className="h-11" />
            </Form.Item>
            <Form.Item name="email" label={<span className="text-sm font-semibold text-foreground">Email</span>}>
              <AntInput type="email" placeholder="customer@example.com" className="h-11" />
            </Form.Item>
            <Form.Item name="phone" label={<span className="text-sm font-semibold text-foreground">Phone</span>}>
              <AntInput placeholder="+1234567890" className="h-11" />
            </Form.Item>
            <Form.Item name="trn" label={<span className="text-sm font-semibold text-foreground">TRN (Tax Registration Number)</span>}>
              <AntInput placeholder="Tax Registration Number" className="h-11" />
            </Form.Item>
            <Form.Item name="address" label={<span className="text-sm font-semibold text-foreground">Address</span>}>
              <AntInput.TextArea
                rows={3}
                placeholder="Street address"
                className="border-border focus:border-primary focus:ring-primary resize-none"
              />
            </Form.Item>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Customer'}
              </Button>
            </div>
          </Form>
        )

      case 'supplier':
        return (
          <Form form={supplierForm} layout="vertical" onFinish={handleSupplierSubmit} className="mt-4">
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Name *</span>}
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <AntInput placeholder="Supplier name" className="h-11" />
            </Form.Item>
            <Form.Item name="email" label={<span className="text-sm font-semibold text-foreground">Email</span>}>
              <AntInput type="email" placeholder="supplier@example.com" className="h-11" />
            </Form.Item>
            <Form.Item name="phone" label={<span className="text-sm font-semibold text-foreground">Phone</span>}>
              <AntInput placeholder="+1234567890" className="h-11" />
            </Form.Item>
            <Form.Item name="trn" label={<span className="text-sm font-semibold text-foreground">TRN (Tax Registration Number)</span>}>
              <AntInput placeholder="Tax Registration Number" className="h-11" />
            </Form.Item>
            <Form.Item name="address" label={<span className="text-sm font-semibold text-foreground">Address</span>}>
              <AntInput.TextArea
                rows={3}
                placeholder="Street address"
                className="border-border focus:border-primary focus:ring-primary resize-none"
              />
            </Form.Item>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Supplier'}
              </Button>
            </div>
          </Form>
        )

      case 'inventory':
        return (
          <Form form={inventoryForm} layout="vertical" onFinish={handleInventorySubmit} className="mt-4">
            <Form.Item
              name="name"
              label={<span className="text-sm font-semibold text-foreground">Product Name</span>}
            >
              <AntInput placeholder="Product name" className="h-11" />
            </Form.Item>
            <Form.Item name="description" label={<span className="text-sm font-semibold text-foreground">Description</span>}>
              <AntInput.TextArea
                rows={3}
                placeholder="Product description"
                className="border-border focus:border-primary focus:ring-primary resize-none"
              />
            </Form.Item>
            <Form.Item name="qty" label={<span className="text-sm font-semibold text-foreground">Quantity</span>}>
              <InputNumber min={0} placeholder="0" className="w-full h-11" />
            </Form.Item>
            <Form.Item name="costPrice" label={<span className="text-sm font-semibold text-foreground">Cost Price</span>}>
              <InputNumber min={0} placeholder="0.00" className="w-full h-11" />
            </Form.Item>
            <Form.Item name="vat" label={<span className="text-sm font-semibold text-foreground">VAT %</span>}>
              <InputNumber min={0} max={100} defaultValue={5} className="w-full h-11" />
            </Form.Item>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Inventory'}
              </Button>
            </div>
          </Form>
        )

      case 'expense':
        return (
          <Form form={expenseForm} layout="vertical" onFinish={handleExpenseSubmit} className="mt-4">
            <Form.Item
              name="description"
              label={<span className="text-sm font-semibold text-foreground">Description *</span>}
              rules={[{ required: true, message: 'Description is required' }]}
            >
              <AntInput placeholder="Expense description" className="h-11" />
            </Form.Item>
            <Form.Item
              name="category"
              label={<span className="text-sm font-semibold text-foreground">Category *</span>}
              rules={[{ required: true, message: 'Category is required' }]}
            >
              <Select placeholder="Select category" className="h-11">
                <Select.Option value="Rent">Rent</Select.Option>
                <Select.Option value="Utilities">Utilities</Select.Option>
                <Select.Option value="Travel">Travel</Select.Option>
                <Select.Option value="Supplies">Supplies</Select.Option>
                <Select.Option value="Salaries">Salaries</Select.Option>
                <Select.Option value="Marketing">Marketing</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="amount"
              label={<span className="text-sm font-semibold text-foreground">Amount *</span>}
              rules={[{ required: true, message: 'Amount is required' }]}
            >
              <InputNumber min={0} placeholder="0.00" className="w-full h-11" />
            </Form.Item>
            <Form.Item name="expense_date" label={<span className="text-sm font-semibold text-foreground">Date</span>} initialValue={dayjs()}>
              <DatePicker className="w-full h-11" format="YYYY-MM-DD HH:mm:ss" showTime={{ format: 'HH:mm:ss' }} />
            </Form.Item>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </Form>
        )

      case 'receivable':
        return (
          <Form form={receivableForm} layout="vertical" onFinish={handleReceivableSubmit} className="mt-4">
            <Form.Item
              name="customer_id"
              label={<span className="text-sm font-semibold text-foreground">Customer *</span>}
              rules={[{ required: true, message: 'Customer is required' }]}
            >
              <Select
                placeholder="Select customer"
                loading={loadingCustomers}
                showSearch
                optionFilterProp="children"
                className="h-11"
                filterOption={(input: string, option: any) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {customers.map((customer) => (
                  <Select.Option key={customer._id} value={customer._id}>
                    {customer.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="invoice_number"
              label={<span className="text-sm font-semibold text-foreground">Invoice Number *</span>}
              rules={[{ required: true, message: 'Invoice number is required' }]}
            >
              <AntInput placeholder="Invoice number" className="h-11" />
            </Form.Item>
            <Form.Item
              name="total_amount"
              label={<span className="text-sm font-semibold text-foreground">Total Amount *</span>}
              rules={[{ required: true, message: 'Amount is required' }]}
            >
              <InputNumber min={0} placeholder="0.00" className="w-full h-11" />
            </Form.Item>
            <Form.Item name="invoice_date" label={<span className="text-sm font-semibold text-foreground">Invoice Date</span>} initialValue={dayjs()}>
              <DatePicker className="w-full h-11" format="YYYY-MM-DD HH:mm:ss" showTime={{ format: 'HH:mm:ss' }} />
            </Form.Item>
            <Form.Item name="due_date" label={<span className="text-sm font-semibold text-foreground">Due Date</span>} initialValue={dayjs().add(30, 'days')}>
              <DatePicker className="w-full h-11" format="YYYY-MM-DD HH:mm:ss" showTime={{ format: 'HH:mm:ss' }} />
            </Form.Item>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Receivable'}
              </Button>
            </div>
          </Form>
        )

      case 'payable':
        return (
          <Form form={payableForm} layout="vertical" onFinish={handlePayableSubmit} className="mt-4">
            <Form.Item
              name="vendor_id"
              label={<span className="text-sm font-semibold text-foreground">Vendor *</span>}
              rules={[{ required: true, message: 'Vendor is required' }]}
            >
              <Select
                placeholder="Select vendor"
                loading={loadingSuppliers}
                showSearch
                optionFilterProp="children"
                className="h-11"
                filterOption={(input: string, option: any) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {suppliers.map((supplier) => (
                  <Select.Option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="bill_number"
              label={<span className="text-sm font-semibold text-foreground">Bill Number *</span>}
              rules={[{ required: true, message: 'Bill number is required' }]}
            >
              <AntInput placeholder="Bill number" className="h-11" />
            </Form.Item>
            <Form.Item
              name="total_amount"
              label={<span className="text-sm font-semibold text-foreground">Total Amount *</span>}
              rules={[{ required: true, message: 'Amount is required' }]}
            >
              <InputNumber min={0} placeholder="0.00" className="w-full h-11" />
            </Form.Item>
            <Form.Item name="bill_date" label={<span className="text-sm font-semibold text-foreground">Bill Date</span>} initialValue={dayjs()}>
              <DatePicker className="w-full h-11" format="YYYY-MM-DD HH:mm:ss" showTime={{ format: 'HH:mm:ss' }} />
            </Form.Item>
            <Form.Item name="due_date" label={<span className="text-sm font-semibold text-foreground">Due Date</span>} initialValue={dayjs().add(30, 'days')}>
              <DatePicker className="w-full h-11" format="YYYY-MM-DD HH:mm:ss" showTime={{ format: 'HH:mm:ss' }} />
            </Form.Item>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Payable'}
              </Button>
            </div>
          </Form>
        )

      case 'sales_invoice':
        return (
          <Form form={salesInvoiceForm} layout="vertical" onFinish={handleSalesInvoiceSubmit} className="mt-4">
            <Form.Item
              name="customer_id"
              label={<span className="text-sm font-semibold text-foreground">Customer *</span>}
              rules={[{ required: true, message: 'Customer is required' }]}
            >
              <Select
                placeholder="Select customer"
                loading={loadingCustomers}
                showSearch
                optionFilterProp="children"
                className="h-11"
                filterOption={(input: string, option: any) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {customers.map((customer) => (
                  <Select.Option key={customer._id} value={customer._id}>
                    {customer.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="invoice_date" label={<span className="text-sm font-semibold text-foreground">Invoice Date</span>} initialValue={dayjs()}>
              <DatePicker className="w-full h-11" format="YYYY-MM-DD HH:mm:ss" showTime={{ format: 'HH:mm:ss' }} />
            </Form.Item>
            <Form.Item name="due_date" label={<span className="text-sm font-semibold text-foreground">Due Date</span>} initialValue={dayjs().add(30, 'days')}>
              <DatePicker className="w-full h-11" format="YYYY-MM-DD HH:mm:ss" showTime={{ format: 'HH:mm:ss' }} />
            </Form.Item>
            <Form.Item label={<span className="text-sm font-semibold text-foreground">Line Items *</span>}>
              <Form.List name="line_items" initialValue={[{ product: '', quantity: 1, unit_price: 0 }]}>
                {(fields: any, { add, remove }: any) => (
                  <>
                    {fields.map(({ key, name, ...restField }: any) => (
                      <div key={key} className="flex gap-2 mb-4 items-end">
                        <Form.Item
                          {...restField}
                          name={[name, 'product']}
                          label={<span className="text-sm font-semibold text-foreground">Product *</span>}
                          rules={[{ required: true, message: 'Product is required' }]}
                          className="flex-1 mb-0"
                        >
                          <Select placeholder="Select product" loading={loadingInventory} className="h-11">
                            {inventoryItems.map((item) => (
                              <Select.Option key={item._id} value={item._id}>
                                {item.name || item.product_name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label={<span className="text-sm font-semibold text-foreground">Qty *</span>}
                          rules={[{ required: true, message: 'Quantity is required' }]}
                          className="w-24 mb-0"
                        >
                          <InputNumber min={1} placeholder="Qty" className="w-full h-11" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'unit_price']}
                          label={<span className="text-sm font-semibold text-foreground">Price *</span>}
                          rules={[{ required: true, message: 'Price is required' }]}
                          className="w-32 mb-0"
                        >
                          <InputNumber min={0} placeholder="Price" className="w-full h-11" />
                        </Form.Item>
                        <Form.Item className="mb-0">
                          <Button type="button" onClick={() => remove(name)} variant="outline" className="h-11">
                            Remove
                          </Button>
                        </Form.Item>
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} className="w-full">
                      Add Item
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </Form>
        )

      case 'purchase_invoice':
        return (
          <Form form={purchaseInvoiceForm} layout="vertical" onFinish={handlePurchaseInvoiceSubmit} className="mt-4">
            <Form.Item
              name="vendor_id"
              label={<span className="text-sm font-semibold text-foreground">Vendor *</span>}
              rules={[{ required: true, message: 'Vendor is required' }]}
            >
              <Select
                placeholder="Select vendor"
                loading={loadingSuppliers}
                showSearch
                optionFilterProp="children"
                className="h-11"
                filterOption={(input: string, option: any) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {suppliers.map((supplier) => (
                  <Select.Option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="invoice_date" label={<span className="text-sm font-semibold text-foreground">Invoice Date</span>} initialValue={dayjs()}>
              <DatePicker className="w-full h-11" format="YYYY-MM-DD HH:mm:ss" showTime={{ format: 'HH:mm:ss' }} />
            </Form.Item>
            <Form.Item name="due_date" label={<span className="text-sm font-semibold text-foreground">Due Date</span>} initialValue={dayjs().add(30, 'days')}>
              <DatePicker className="w-full h-11" format="YYYY-MM-DD HH:mm:ss" showTime={{ format: 'HH:mm:ss' }} />
            </Form.Item>
            <Form.Item label={<span className="text-sm font-semibold text-foreground">Line Items *</span>}>
              <Form.List name="line_items" initialValue={[{ product: '', quantity: 1, unit_cost: 0 }]}>
                {(fields: any, { add, remove }: any) => (
                  <>
                    {fields.map(({ key, name, ...restField }: any) => (
                      <div key={key} className="flex gap-2 mb-4 items-end">
                        <Form.Item
                          {...restField}
                          name={[name, 'product']}
                          label={<span className="text-sm font-semibold text-foreground">Product *</span>}
                          rules={[{ required: true, message: 'Product is required' }]}
                          className="flex-1 mb-0"
                        >
                          <Select placeholder="Select product" loading={loadingInventory} className="h-11">
                            {inventoryItems.map((item) => (
                              <Select.Option key={item._id} value={item._id}>
                                {item.name || item.product_name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label={<span className="text-sm font-semibold text-foreground">Qty *</span>}
                          rules={[{ required: true, message: 'Quantity is required' }]}
                          className="w-24 mb-0"
                        >
                          <InputNumber min={1} placeholder="Qty" className="w-full h-11" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'unit_cost']}
                          label={<span className="text-sm font-semibold text-foreground">Cost *</span>}
                          rules={[{ required: true, message: 'Cost is required' }]}
                          className="w-32 mb-0"
                        >
                          <InputNumber min={0} placeholder="Cost" className="w-full h-11" />
                        </Form.Item>
                        <Form.Item className="mb-0">
                          <Button type="button" onClick={() => remove(name)} variant="outline" className="h-11">
                            Remove
                          </Button>
                        </Form.Item>
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} className="w-full">
                      Add Item
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </Form>
        )

      default:
        return null
    }
  }

  const getModalTitle = () => {
    switch (activeAction) {
      case 'customer':
        return 'Add Customer'
      case 'supplier':
        return 'Add Supplier'
      case 'inventory':
        return 'Add Inventory'
      case 'expense':
        return 'Add Expense'
      case 'receivable':
        return 'Add Receivable'
      case 'payable':
        return 'Add Payable'
      case 'sales_invoice':
        return 'Create Sales Invoice'
      case 'purchase_invoice':
        return 'Create Purchase Invoice'
      default:
        return 'Quick Add'
    }
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <motion.div
                  key={action.path}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    className={`w-full h-auto flex flex-col items-center gap-2 p-4 ${action.color} border-0`}
                      onClick={() => handleActionClick(action)}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </Button>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>

      <Modal
        title={getModalTitle()}
        open={modalOpen}
        onCancel={handleClose}
        footer={null}
        width={activeAction === 'sales_invoice' || activeAction === 'purchase_invoice' ? 800 : 600}
      >
        {renderModalContent()}
      </Modal>
    </>
  )
}
