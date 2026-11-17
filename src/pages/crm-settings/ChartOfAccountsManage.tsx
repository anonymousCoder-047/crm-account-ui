import { useEffect, useMemo, useState } from 'react'
import { Table, Modal, message, Form, Input as AntInput, Select } from 'antd'
import { Form as AntForm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { motion } from 'framer-motion'
import { Search, X, Plus, Edit, Trash2, BookOpen, ArrowUpDown } from 'lucide-react'
import { AccountAPI, type Account, type AccountInput, type AccountType, type AccountSubType } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'Asset', label: 'Asset' },
  { value: 'Liability', label: 'Liability' },
  { value: 'Equity', label: 'Equity' },
  { value: 'Revenue', label: 'Revenue' },
  { value: 'Expense', label: 'Expense' },
]

const ACCOUNT_SUB_TYPES: Record<AccountType, { value: AccountSubType; label: string }[]> = {
  Asset: [
    { value: 'Current Asset', label: 'Current Asset' },
    { value: 'Non-Current Asset', label: 'Non-Current Asset' },
    { value: 'Contra Asset', label: 'Contra Asset' },
  ],
  Liability: [
    { value: 'Current Liability', label: 'Current Liability' },
    { value: 'Non-Current Liability', label: 'Non-Current Liability' },
  ],
  Equity: [
    { value: 'Owner Capital', label: 'Owner Capital' },
    { value: 'Retained Earnings', label: 'Retained Earnings' },
    { value: 'Reserves', label: 'Reserves' },
  ],
  Revenue: [
    { value: 'Operating Revenue', label: 'Operating Revenue' },
    { value: 'Non-Operating Revenue', label: 'Non-Operating Revenue' },
  ],
  Expense: [
    { value: 'COGS', label: 'COGS (Cost of Goods Sold)' },
    { value: 'Operating Expense', label: 'Operating Expense' },
    { value: 'Non-Operating Expense', label: 'Non-Operating Expense' },
  ],
}

export default function ChartOfAccountsManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Account[]>([])
  const [q, setQ] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountType | undefined>(undefined)
  const [editingItem, setEditingItem] = useState<Account | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form] = Form.useForm<AccountInput>()

  const fetchData = async (searchQuery?: string, typeFilter?: AccountType) => {
    setLoading(true)
    try {
      const query = searchQuery !== undefined ? searchQuery : q
      const type = typeFilter !== undefined ? typeFilter : accountTypeFilter
      const res = await AccountAPI.list({
        q: query || undefined,
        account_type: type,
      })
      setData(res.data.data)
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fetch accounts')
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
  }, [q, accountTypeFilter])

  const columns: ColumnsType<Account> = useMemo(
    () => [
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Account ID</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'account_id',
        key: 'account_id',
        width: 150,
        sorter: (a, b) => (a.account_id || '').localeCompare(b.account_id || ''),
        render: (text) => <span className="text-foreground font-mono text-sm">{text}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Account Name</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'account_name',
        key: 'account_name',
        sorter: (a, b) => a.account_name.localeCompare(b.account_name),
        render: (text) => <span className="text-foreground font-medium">{text}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Type</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'account_type',
        key: 'account_type',
        width: 120,
        sorter: (a, b) => a.account_type.localeCompare(b.account_type),
        filters: ACCOUNT_TYPES.map((t) => ({ text: t.label, value: t.value })),
        onFilter: (value, record) => record.account_type === value,
        render: (type: AccountType) => {
          const colors: Record<AccountType, string> = {
            Asset: 'bg-blue-500/15 text-blue-300',
            Liability: 'bg-red-500/15 text-red-300',
            Equity: 'bg-green-500/15 text-green-300',
            Revenue: 'bg-purple-500/15 text-purple-300',
            Expense: 'bg-orange-500/15 text-orange-300',
          }
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[type]}`}>
              {type}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Sub-Type</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'account_sub_type',
        key: 'account_sub_type',
        width: 150,
        sorter: (a, b) => ((a.account_sub_type || '') || '').localeCompare((b.account_sub_type || '') || ''),
        render: (subType: AccountSubType | undefined) => {
          if (!subType) {
            return <span className="text-muted-foreground text-xs">-</span>
          }
          return (
            <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-foreground">
              {subType}
            </span>
          )
        },
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Code</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'account_code',
        key: 'account_code',
        width: 100,
        sorter: (a, b) => (a.account_code || '').localeCompare(b.account_code || ''),
        render: (text) => <span className="text-muted-foreground">{text || '-'}</span>,
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Opening Balance</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'opening_balance',
        key: 'opening_balance',
        width: 150,
        align: 'right',
        sorter: (a, b) => (a.opening_balance || 0) - (b.opening_balance || 0),
        render: (value) => (
          <span className="text-foreground font-medium">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(value || 0)}
          </span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Current Balance</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'current_balance',
        key: 'current_balance',
        width: 150,
        align: 'right',
        sorter: (a, b) => (a.current_balance || 0) - (b.current_balance || 0),
        render: (value) => (
          <span className="text-foreground font-medium">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(value || 0)}
          </span>
        ),
      },
      {
        title: (
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span>Status</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'is_active',
        key: 'is_active',
        width: 100,
        sorter: (a, b) => (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0),
        render: (isActive) => (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-green-500/15 text-green-300' : 'bg-muted text-foreground'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
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
              title="Edit account"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(record._id)}
              className="border-red-500/30 hover:bg-red-500/10"
              title="Delete account"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const handleEdit = (item: Account) => {
    setEditingItem(item)
    form.setFieldsValue({
      account_name: item.account_name,
      account_type: item.account_type,
      account_sub_type: item.account_sub_type,
      account_code: item.account_code || '',
      description: item.description || '',
      is_active: item.is_active,
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

  const onSubmit = async (values: AccountInput) => {
    try {
      if (editingItem) {
        await AccountAPI.update(editingItem._id, values)
        message.success('Account updated successfully')
      } else {
        await AccountAPI.create(values)
        message.success('Account created successfully')
      }
      setModalOpen(false)
      form.resetFields()
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save account')
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await AccountAPI.remove(deletingId)
      message.success('Account deleted successfully')
      setDeleteModalOpen(false)
      setDeletingId(null)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete account')
    }
  }

  const onSearch = () => fetchData()
  const onReset = () => {
    setQ('')
    setAccountTypeFilter(undefined)
    fetchData('', undefined)
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your chart of accounts • <span className="font-semibold text-foreground">{data.length}</span> total accounts
          </p>
        </div>
        <Button onClick={handleCreate} className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto" size="lg">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Account</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </motion.div>

      {/* Search Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts by name, code, ID..."
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
        <Select
          placeholder="Filter by type"
          value={accountTypeFilter}
          onChange={(value) => {
            setAccountTypeFilter(value)
            fetchData(q, value)
          }}
          allowClear
          className="w-full sm:w-48 h-11"
          options={ACCOUNT_TYPES}
        />
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
                Showing {total} {total === 1 ? 'account' : 'accounts'}
              </span>
            ),
            className: 'px-6 py-4',
          }}
          locale={{
            emptyText: (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No accounts found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q || accountTypeFilter ? 'Try adjusting your search or filter terms.' : 'Get started by adding your first account.'}
                </p>
                {!q && !accountTypeFilter && (
                  <Button onClick={handleCreate} className="shadow-sm hover:shadow-md transition-shadow">
                    <Plus className="h-4 w-4" />
                    Add Account
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
        title={editingItem ? 'Edit Account' : 'Add Account'}
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
            name="account_name"
            label={<span className="text-sm font-semibold text-foreground">Account Name</span>}
            rules={[{ required: true, message: 'Account name is required' }]}
          >
            <AntInput placeholder="e.g., Cash, Accounts Receivable, Sales Revenue" className="h-11" />
          </Form.Item>
          <Form.Item
            name="account_type"
            label={<span className="text-sm font-semibold text-foreground">Account Type</span>}
            rules={[{ required: true, message: 'Account type is required' }]}
          >
            <Select
              placeholder="Select account type"
              className="h-11"
              options={ACCOUNT_TYPES}
              disabled={!!editingItem}
              onChange={() => {
                // Clear sub-type when type changes
                form.setFieldsValue({ account_sub_type: undefined })
              }}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.account_type !== currentValues.account_type}
          >
            {({ getFieldValue }) => {
              const accountType = getFieldValue('account_type') as AccountType | undefined
              return (
                <Form.Item
                  name="account_sub_type"
                  label={<span className="text-sm font-semibold text-foreground">Account Sub-Type</span>}
                >
                  <Select
                    placeholder="Select account sub-type"
                    className="h-11"
                    disabled={!accountType}
                    options={accountType && ACCOUNT_SUB_TYPES[accountType] 
                      ? ACCOUNT_SUB_TYPES[accountType]
                      : []
                    }
                  />
                </Form.Item>
              )
            }}
          </Form.Item>
          <Form.Item
            name="account_code"
            label={<span className="text-sm font-semibold text-foreground">Account Code</span>}
          >
            <AntInput placeholder="e.g., 1000, 2000, 4000" className="h-11" />
          </Form.Item>
          <Form.Item
            name="description"
            label={<span className="text-sm font-semibold text-foreground">Description</span>}
          >
            <AntInput.TextArea
              rows={4}
              placeholder="Enter account description"
              className="border-border focus:border-primary focus:ring-primary resize-none"
            />
          </Form.Item>
          {editingItem && (
            <Form.Item
              name="is_active"
              label={<span className="text-sm font-semibold text-foreground">Status</span>}
              valuePropName="checked"
            >
              <Select
                className="h-11"
                options={[
                  { value: true, label: 'Active' },
                  { value: false, label: 'Inactive' },
                ]}
              />
            </Form.Item>
          )}
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
        title="Delete Account"
        open={deleteModalOpen}
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false)
          setDeletingId(null)
        }}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete this account? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}

