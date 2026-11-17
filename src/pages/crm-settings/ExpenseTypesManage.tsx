import { useEffect, useMemo, useState } from 'react'
import { Table, Modal, message, Form, Input as AntInput, Checkbox } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { motion } from 'framer-motion'
import { Search, X, Plus, Edit, Trash2, Tag, ArrowUpDown } from 'lucide-react'
import { ExpenseTypeAPI, type ExpenseType, type ExpenseTypeInput } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function ExpenseTypesManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ExpenseType[]>([])
  const [q, setQ] = useState('')
  const [editingItem, setEditingItem] = useState<ExpenseType | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form] = Form.useForm<ExpenseTypeInput>()

  const fetchData = async (searchQuery?: string) => {
    setLoading(true)
    try {
      const query = searchQuery !== undefined ? searchQuery : q
      const res = await ExpenseTypeAPI.list(query ? { q: query } : undefined)
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fetch expense types')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 300) // Debounce search by 300ms
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const columns: ColumnsType<ExpenseType> = useMemo(
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
            <span>Description</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'description',
        key: 'description',
        sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
        render: (text) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Recurring</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'recurring',
        key: 'recurring',
        width: 120,
        sorter: (a, b) => (a.recurring ? 1 : 0) - (b.recurring ? 1 : 0),
        render: (recurring: boolean) => (
          <Badge
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              recurring
                ? 'bg-green-500/15 text-green-300 border border-green-500/30'
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            {recurring ? 'Yes' : 'No'}
          </Badge>
        ),
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
    []
  )

  const handleEdit = (item: ExpenseType) => {
    setEditingItem(item)
    form.setFieldsValue({
      name: item.name,
      description: item.description || '',
      recurring: item.recurring || false,
    })
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
    setDeleteModalOpen(true)
  }

  const handleCreate = () => {
    setEditingItem(null)
    form.resetFields()
    setModalOpen(true)
  }

  const onSubmit = async (values: ExpenseTypeInput) => {
    try {
      if (editingItem) {
        await ExpenseTypeAPI.update(editingItem._id, values)
        message.success('Expense type updated successfully')
      } else {
        await ExpenseTypeAPI.create(values)
        message.success('Expense type created successfully')
      }
      setModalOpen(false)
      form.resetFields()
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save expense type')
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await ExpenseTypeAPI.remove(deletingId)
      message.success('Expense type deleted successfully')
      setDeleteModalOpen(false)
      setDeletingId(null)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete expense type')
    }
  }

  const onSearch = () => fetchData()
  const onReset = () => {
    setQ('')
    fetchData('')
  }

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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Manage Expense Types</h1>
          <p className="text-sm text-muted-foreground">
            Manage your expense types • <span className="font-semibold text-foreground">{data.length}</span> total types
          </p>
        </div>
        <Button onClick={handleCreate} className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto" size="lg">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Expense Type</span>
          <span className="sm:hidden">Add</span>
        </Button>
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
            placeholder="Search expense types by name, description..."
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
          columns={columns}
          dataSource={data}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => (
              <span className="text-muted-foreground text-sm">
                Showing {total} {total === 1 ? 'expense type' : 'expense types'}
              </span>
            ),
            className: 'px-6 py-4',
          }}
          locale={{
            emptyText: (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Tag className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No expense types found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q ? 'Try adjusting your search terms.' : 'Get started by adding your first expense type.'}
                </p>
                {!q && (
                  <Button onClick={handleCreate} className="shadow-sm hover:shadow-md transition-shadow">
                    <Plus className="h-4 w-4" />
                    Add Expense Type
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
        title={editingItem ? 'Edit Expense Type' : 'Add Expense Type'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} className="mt-4">
          <Form.Item
            name="name"
            label={<span className="text-sm font-semibold text-foreground">Name</span>}
          >
            <AntInput placeholder="Expense type name" className="h-11" />
          </Form.Item>
          <Form.Item
            name="description"
            label={<span className="text-sm font-semibold text-foreground">Description</span>}
          >
            <AntInput.TextArea
              rows={4}
              placeholder="Enter description"
              className="border-border focus:border-primary focus:ring-primary resize-none"
            />
          </Form.Item>
          <Form.Item
            name="recurring"
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox>
              <span className="text-sm font-semibold text-foreground">Is this expense recurring?</span>
            </Checkbox>
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
            <Button type="submit">{editingItem ? 'Update' : 'Create'}</Button>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Expense Type"
        open={deleteModalOpen}
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false)
          setDeletingId(null)
        }}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete this expense type? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}

