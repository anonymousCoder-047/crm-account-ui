import { useEffect, useMemo, useState } from 'react'
import { Table, Modal, message, Form, Input as AntInput } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { motion } from 'framer-motion'
import { Search, X, Plus, Edit, Trash2, Ruler, ArrowUpDown } from 'lucide-react'
import { UnitAPI, type Unit, type UnitInput } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { ColumnsDropdown } from '@/components/ColumnsDropdown'

export default function UnitsManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Unit[]>([])
  const [q, setQ] = useState('')
  const [editingItem, setEditingItem] = useState<Unit | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form] = Form.useForm<UnitInput>()

  const UNITS_COLUMN_KEYS = ['name', 'symbol', 'description'] as const
  const UNITS_COLUMN_LABELS: Record<string, string> = {
    name: 'Name',
    symbol: 'Symbol',
    description: 'Description',
  }
  const { visibleColumns, toggleColumn, columnKeys: unitColumnKeys, columnLabels: unitColumnLabels } = useColumnVisibility(
    'units-visible-columns',
    UNITS_COLUMN_KEYS,
    UNITS_COLUMN_LABELS
  )

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await UnitAPI.list()
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fetch units')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredData = useMemo(() => {
    if (!q.trim()) return data
    const searchLower = q.trim().toLowerCase()
    return data.filter((item) => {
      const values = [item.name || '', item.symbol || '', item.description || '']
      return values.some((v) => v.toLowerCase().includes(searchLower))
    })
  }, [data, q])

  const columns: ColumnsType<Unit> = useMemo(
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
            <span>Symbol</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'symbol',
        key: 'symbol',
        sorter: (a, b) => (a.symbol || '').localeCompare(b.symbol || ''),
        render: (text) => <span className="text-muted-foreground">{text || '-'}</span>,
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

  const visibleColumnsList = useMemo(() => {
    return columns.filter((col) => col.key === 'actions' || visibleColumns[col.key as string] !== false)
  }, [columns, visibleColumns])

  const handleEdit = (item: Unit) => {
    setEditingItem(item)
    form.setFieldsValue({
      name: item.name,
      symbol: item.symbol || '',
      description: item.description || '',
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

  const onSubmit = async (values: UnitInput) => {
    try {
      if (editingItem) {
        await UnitAPI.update(editingItem._id, values)
        message.success('Unit updated successfully')
      } else {
        await UnitAPI.create(values)
        message.success('Unit created successfully')
      }
      setModalOpen(false)
      form.resetFields()
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save unit')
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await UnitAPI.remove(deletingId)
      message.success('Unit deleted successfully')
      setDeleteModalOpen(false)
      setDeletingId(null)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete unit')
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Manage Units</h1>
          <p className="text-sm text-muted-foreground">
            Manage your units •{' '}
            <span className="font-semibold text-foreground">
              {q.trim() ? `${filteredData.length} of ${data.length}` : data.length} unit{data.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <Button onClick={handleCreate} className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto" size="lg">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Unit</span>
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
            placeholder="Search units by name, symbol, description..."
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
            columnKeys={unitColumnKeys}
            columnLabels={unitColumnLabels}
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
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => (
              <span className="text-muted-foreground text-sm">
                Showing {total} {total === 1 ? 'unit' : 'units'}
              </span>
            ),
            className: 'px-6 py-4',
          }}
          locale={{
            emptyText: (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Ruler className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No units found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q ? 'Try adjusting your search terms.' : 'Get started by adding your first unit.'}
                </p>
                {!q && (
                  <Button onClick={handleCreate} className="shadow-sm hover:shadow-md transition-shadow">
                    <Plus className="h-4 w-4" />
                    Add Unit
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
        title={editingItem ? 'Edit Unit' : 'Add Unit'}
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
            <AntInput placeholder="Unit name (e.g., Kilogram)" className="h-11" />
          </Form.Item>
          <Form.Item
            name="symbol"
            label={<span className="text-sm font-semibold text-foreground">Symbol</span>}
          >
            <AntInput placeholder="Unit symbol (e.g., kg)" className="h-11" />
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
        title="Delete Unit"
        open={deleteModalOpen}
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false)
          setDeletingId(null)
        }}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete this unit? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}

