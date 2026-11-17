import { useEffect, useMemo, useState, useCallback } from 'react'
import { Table, Modal, message, Form, Input as AntInput } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { motion } from 'framer-motion'
import { Search, X, Plus, Edit, Trash2, Building2, ArrowUpDown, Trash } from 'lucide-react'
import { SupplierAPI, type Supplier, type SupplierInput } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSearchParams } from 'react-router-dom'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { ColumnsDropdown } from '@/components/ColumnsDropdown'

export default function SuppliersManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Supplier[]>([])
  const [q, setQ] = useState('')
  const [editingItem, setEditingItem] = useState<Supplier | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false)
  const [form] = Form.useForm<SupplierInput>()
  const [searchParams, setSearchParams] = useSearchParams()
  const viewId = searchParams.get('view')

  const SUPPLIERS_COLUMN_KEYS = ['name', 'email', 'phone', 'trn', 'address'] as const
  const SUPPLIERS_COLUMN_LABELS: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    trn: 'TRN',
    address: 'Address',
  }
  const { visibleColumns, toggleColumn, columnKeys: supColumnKeys, columnLabels: supColumnLabels } = useColumnVisibility(
    'suppliers-visible-columns',
    SUPPLIERS_COLUMN_KEYS,
    SUPPLIERS_COLUMN_LABELS
  )

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await SupplierAPI.list()
      setData(res.data.data)
      
      // If viewId is in URL, highlight that supplier
      if (viewId && res.data.data.length > 0) {
        const supplier = res.data.data.find((s: Supplier) => s._id === viewId)
        if (supplier) {
          // Remove view param after highlighting
          setTimeout(() => {
            setSearchParams((prev) => {
              const newParams = new URLSearchParams(prev)
              newParams.delete('view')
              return newParams
            })
          }, 2000)
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEdit = useCallback((item: Supplier) => {
    setEditingItem(item)
    form.setFieldsValue({
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      trn: item.trn || '',
      address: item.address || '',
    })
    setModalOpen(true)
  }, [form])

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id)
    setDeleteModalOpen(true)
  }, [])

  const columns: ColumnsType<Supplier> = useMemo(
    () => [
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Name</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (text) => <span className="text-foreground font-medium">{text}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Email</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'email',
        key: 'email',
        sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
        render: (text) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Phone</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'phone',
        key: 'phone',
        sorter: (a, b) => (a.phone || '').localeCompare(b.phone || ''),
        render: (text) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>TRN</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'trn',
        key: 'trn',
        sorter: (a, b) => (a.trn || '').localeCompare(b.trn || ''),
        render: (text) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Address</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'address',
        key: 'address',
        sorter: (a, b) => (a.address || '').localeCompare(b.address || ''),
        render: (text) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: <span className="text-foreground font-semibold">Actions</span>,
        key: 'actions',
        width: 150,
        render: (_, record) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(record)}
              className="border-blue-500/30 hover:bg-blue-500/10"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(record._id)}
              className="border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </Button>
          </div>
        ),
      },
    ],
    [handleEdit, handleDelete]
  )

  const filteredData = useMemo(() => {
    if (!q.trim()) return data
    const searchLower = q.trim().toLowerCase()
    return data.filter((item) => {
      const values: string[] = [
        item.name || '',
        item.email || '',
        item.phone || '',
        item.trn || '',
        item.address || '',
      ]
      return values.some((v) => v.toLowerCase().includes(searchLower))
    })
  }, [data, q])

  const visibleColumnsList = useMemo(() => {
    return columns.filter((col) => col.key === 'actions' || visibleColumns[col.key as string] !== false)
  }, [columns, visibleColumns])

  const handleCreate = () => {
    setEditingItem(null)
    form.resetFields()
    setModalOpen(true)
  }

  const onSubmit = async (values: SupplierInput) => {
    try {
      if (editingItem) {
        await SupplierAPI.update(editingItem._id, values)
        message.success('Supplier updated successfully')
      } else {
        await SupplierAPI.create(values)
        message.success('Supplier created successfully')
      }
      setModalOpen(false)
      form.resetFields()
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save supplier')
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await SupplierAPI.remove(deletingId)
      message.success('Supplier deleted successfully')
      setDeleteModalOpen(false)
      setDeletingId(null)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete supplier')
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select suppliers to delete')
      return
    }
    setBulkDeleteModalVisible(true)
  }

  const handleBulkDeleteConfirm = async () => {
    if (selectedRowKeys.length === 0) {
      return
    }

    setBulkDeleteLoading(true)
    try {
      const deletePromises = selectedRowKeys.map((key) => SupplierAPI.remove(key as string))
      await Promise.all(deletePromises)
      message.success(`Successfully deleted ${selectedRowKeys.length} supplier(s)`)
      setSelectedRowKeys([])
      setBulkDeleteModalVisible(false)
      fetchData()
    } catch (error) {
      message.error('Failed to delete some suppliers')
      console.error('Error deleting suppliers:', error)
      fetchData() // Refresh to show current state
    } finally {
      setBulkDeleteLoading(false)
    }
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys)
    },
    getCheckboxProps: (record: Supplier) => ({
      disabled: false,
    }),
  }

  const onSearch = () => fetchData()
  const onReset = () => setQ('')

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Manage Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your suppliers •{' '}
            <span className="font-semibold text-foreground">
              {q.trim() ? `${filteredData.length} of ${data.length}` : data.length} supplier{data.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {selectedRowKeys.length > 0 && (
            <Button
              onClick={handleBulkDeleteClick}
              variant="outline"
              className="shadow-sm hover:shadow-md transition-shadow border-red-500/30 hover:bg-red-500/10 hover:border-red-500/30 text-red-400 w-full sm:w-auto"
              size="lg"
              disabled={bulkDeleteLoading}
            >
              <Trash className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Delete ({selectedRowKeys.length})</span>
              <span className="sm:hidden">Delete</span>
            </Button>
          )}
          <Button onClick={handleCreate} className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto" size="lg">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Supplier</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </motion.div>

      {/* Search Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers by name, email, phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="pl-10 pr-10 h-11 border-border focus:border-primary focus:ring-primary"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSearch} className="shadow-sm hover:shadow-md transition-shadow flex-shrink-0" size="lg">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Search</span>
          </Button>
          <Button onClick={onReset} variant="outline" size="lg" className="border-border hover:bg-muted/50 flex-shrink-0">
            Reset
          </Button>
          <ColumnsDropdown
            columnKeys={supColumnKeys}
            columnLabels={supColumnLabels}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
          />
        </div>
      </motion.div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-card rounded-lg border border-border shadow-sm overflow-hidden"
      >
        <Table
          rowKey="_id"
          loading={loading}
          columns={visibleColumnsList}
          dataSource={filteredData}
          rowSelection={rowSelection}
          scroll={{ x: 'max-content' }}
          rowClassName={(record) => {
            return record._id === viewId ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : ''
          }}
          onChange={(pagination, filters, sorter) => {
            console.log('SuppliersManage - Pagination changed:', {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
            })
          }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number, range: [number, number]) => (
              <span className="text-muted-foreground text-sm">
                Showing {range[0]}-{range[1]} of {total} {total === 1 ? 'supplier' : 'suppliers'}
              </span>
            ),
            pageSizeOptions: ['10', '20', '50', '100'],
            className: 'px-6 py-4',
          }}
          locale={{
            emptyText: (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No suppliers found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q ? 'Try adjusting your search terms.' : 'Get started by adding your first supplier.'}
                </p>
                {!q && (
                  <Button onClick={handleCreate} className="shadow-sm hover:shadow-md transition-shadow">
                    <Plus className="h-4 w-4" />
                    Add Supplier
                  </Button>
                )}
              </div>
            ),
          }}
          className="[&_.ant-table-thead>tr>th]:bg-muted/50 [&_.ant-table-thead>tr>th]:border-b-2 [&_.ant-table-thead>tr>th]:border-border [&_.ant-table-thead>tr>th]:text-foreground [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:py-4 [&_.ant-table-tbody>tr>td]:py-4 [&_.ant-table-tbody>tr:hover]:bg-muted/50 [&_.ant-table-tbody>tr]:transition-colors"
        />
      </motion.div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingItem ? 'Edit Supplier' : 'Add Supplier'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          className="mt-4"
        >
          <Form.Item
            name="name"
            label={<span className="text-sm font-semibold text-foreground">Name</span>}
          >
            <AntInput placeholder="Supplier name" className="h-11" />
          </Form.Item>
          <Form.Item
            name="email"
            label={<span className="text-sm font-semibold text-foreground">Email</span>}
          >
            <AntInput type="email" placeholder="supplier@example.com" className="h-11" />
          </Form.Item>
          <Form.Item
            name="phone"
            label={<span className="text-sm font-semibold text-foreground">Phone</span>}
          >
            <AntInput placeholder="+1234567890" className="h-11" />
          </Form.Item>
          <Form.Item
            name="trn"
            label={<span className="text-sm font-semibold text-foreground">TRN (Tax Registration Number)</span>}
          >
            <AntInput placeholder="Tax Registration Number" className="h-11" />
          </Form.Item>
          <Form.Item
            name="address"
            label={<span className="text-sm font-semibold text-foreground">Address</span>}
          >
            <AntInput.TextArea
              rows={3}
              placeholder="Street address"
              className="border-border focus:border-primary focus:ring-primary resize-none"
            />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false)
                form.resetFields()
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Supplier"
        open={deleteModalOpen}
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false)
          setDeletingId(null)
        }}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete this supplier? This action cannot be undone.</p>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        title="Delete Selected Suppliers"
        open={bulkDeleteModalVisible}
        onOk={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteModalVisible(false)}
        okText="Yes, Delete"
        okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
        cancelText="Cancel"
        confirmLoading={bulkDeleteLoading}
      >
        <p>
          Are you sure you want to delete <strong>{selectedRowKeys.length}</strong> supplier(s)? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

