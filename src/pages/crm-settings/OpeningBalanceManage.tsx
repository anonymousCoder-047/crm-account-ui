import { useEffect, useMemo, useState } from 'react'
import { Table, Modal, message, Form, Input as AntInput, InputNumber, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { motion } from 'framer-motion'
import { Search, X, Edit, DollarSign, ArrowUpDown, Save } from 'lucide-react'
import { AccountAPI, type Account, type AccountType } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'Asset', label: 'Asset' },
  { value: 'Liability', label: 'Liability' },
  { value: 'Equity', label: 'Equity' },
  { value: 'Revenue', label: 'Revenue' },
  { value: 'Expense', label: 'Expense' },
]

export default function OpeningBalanceManage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Account[]>([])
  const [q, setQ] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountType | undefined>(undefined)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<{ opening_balance: number }>()

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
            <span>Opening Balance</span>
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
        dataIndex: 'opening_balance',
        key: 'opening_balance',
        width: 180,
        align: 'right',
        sorter: (a, b) => (a.opening_balance || 0) - (b.opening_balance || 0),
        render: (value, record) => (
          <span className="text-foreground font-medium">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: record.currency || 'AED' }).format(value || 0)}
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
        width: 180,
        align: 'right',
        sorter: (a, b) => (a.current_balance || 0) - (b.current_balance || 0),
        render: (value, record) => (
          <span className="text-foreground font-medium">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: record.currency || 'AED' }).format(value || 0)}
          </span>
        ),
      },
      {
        title: <span className="text-foreground font-semibold">Actions</span>,
        key: 'actions',
        width: 120,
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
          </div>
        ),
      },
    ],
    []
  )

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    form.setFieldsValue({
      opening_balance: account.opening_balance || 0,
    })
    setModalOpen(true)
  }

  const onSubmit = async (values: { opening_balance: number }) => {
    if (!editingAccount) return
    
    try {
      await AccountAPI.updateOpeningBalance(editingAccount._id, values.opening_balance)
      message.success('Opening balance updated successfully')
      setModalOpen(false)
      form.resetFields()
      setEditingAccount(null)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to update opening balance')
    }
  }

  const onSearch = () => fetchData()
  const onReset = () => {
    setQ('')
    setAccountTypeFilter(undefined)
    fetchData('', undefined)
  }

  // Calculate totals
  const totals = useMemo(() => {
    const byType = data.reduce((acc, account) => {
      const type = account.account_type
      if (!acc[type]) {
        acc[type] = { opening: 0, current: 0 }
      }
      acc[type].opening += account.opening_balance || 0
      acc[type].current += account.current_balance || 0
      return acc
    }, {} as Record<AccountType, { opening: number; current: number }>)
    
    return {
      totalOpening: data.reduce((sum, acc) => sum + (acc.opening_balance || 0), 0),
      totalCurrent: data.reduce((sum, acc) => sum + (acc.current_balance || 0), 0),
      byType,
    }
  }, [data])

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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Opening Balances</h1>
          <p className="text-sm text-muted-foreground">
            Manage opening balances for your accounts • <span className="font-semibold text-foreground">{data.length}</span> accounts
          </p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-card rounded-lg border border-border shadow-sm p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Opening Balance</p>
              <p className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(totals.totalOpening)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-card rounded-lg border border-border shadow-sm p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Current Balance</p>
              <p className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(totals.totalCurrent)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </motion.div>
      </div>

      {/* Search Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
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
        transition={{ duration: 0.3, delay: 0.3 }}
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
                <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No accounts found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {q || accountTypeFilter ? 'Try adjusting your search or filter terms.' : 'No accounts available.'}
                </p>
              </div>
            ),
          }}
          className="[&_.ant-table-thead>tr>th]:bg-muted/50 [&_.ant-table-thead>tr>th]:border-b-2 [&_.ant-table-thead>tr>th]:border-border [&_.ant-table-thead>tr>th]:text-foreground [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:py-4 [&_.ant-table-tbody>tr>td]:py-4 [&_.ant-table-tbody>tr:hover]:bg-muted/50 [&_.ant-table-tbody>tr]:transition-colors"
        />
      </motion.div>

      {/* Edit Opening Balance Modal */}
      <Modal
        title={`Edit Opening Balance - ${editingAccount?.account_name || ''}`}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingAccount(null)
        }}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} className="mt-4">
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Account ID</p>
            <p className="text-sm font-mono font-semibold text-foreground">{editingAccount?.account_id}</p>
          </div>
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current Opening Balance</p>
            <p className="text-lg font-semibold text-foreground">
              {editingAccount && new Intl.NumberFormat('en-US', { style: 'currency', currency: editingAccount.currency || 'AED' }).format(editingAccount.opening_balance || 0)}
            </p>
          </div>
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
            <p className="text-lg font-semibold text-foreground">
              {editingAccount && new Intl.NumberFormat('en-US', { style: 'currency', currency: editingAccount.currency || 'AED' }).format(editingAccount.current_balance || 0)}
            </p>
          </div>
          <Form.Item
            name="opening_balance"
            label={<span className="text-sm font-semibold text-foreground">New Opening Balance</span>}
            rules={[
              { required: true, message: 'Opening balance is required' },
              { type: 'number', min: 0, message: 'Opening balance must be a positive number' },
            ]}
          >
            <InputNumber
              placeholder="Enter opening balance"
              className="w-full h-11"
              prefix={<span className="text-muted-foreground">{editingAccount?.currency || 'AED'}</span>}
              min={0}
              step={0.01}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
            <p className="text-xs text-blue-300">
              <strong>Note:</strong> Updating the opening balance will automatically adjust the current balance by the difference.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false)
                form.resetFields()
                setEditingAccount(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Update Balance
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

