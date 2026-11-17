import { Form, InputNumber, DatePicker, Input as AntInput, App, message as antdMessage, Select as AntSelect } from 'antd'
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { LedgerAPI, AccountAPI, type JournalEntryInput, type JournalEntryLine, type JournalEntry, type Account } from '@/services/api'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const { TextArea } = AntInput

export default function JournalEntryCreate() {
  const appContext = App.useApp()
  const message = (appContext && appContext.message) ? appContext.message : antdMessage
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const [loading, setLoading] = useState(false)
  const [loadingEntry, setLoadingEntry] = useState(isEditMode)
  const [form] = Form.useForm<JournalEntryInput & { entries: JournalEntryLine[] }>()
  const navigate = useNavigate()
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [entries, setEntries] = useState<JournalEntryLine[]>([])

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true)
      try {
        const res = await AccountAPI.list()
        const allAccounts = res.data?.data || []
        const activeAccounts = allAccounts.filter((acc: Account) => acc.is_active !== false)
        const uniqueAccounts = activeAccounts.reduce((acc: Account[], current: Account) => {
          const existing = acc.find((item: Account) => item.account_id === current.account_id)
          if (!existing) {
            acc.push(current)
          }
          return acc
        }, [] as Account[])
        setAccounts(uniqueAccounts)
      } catch (error) {
        console.error('Error fetching accounts:', error)
        message.error('Failed to fetch accounts')
      } finally {
        setLoadingAccounts(false)
      }
    }
    fetchAccounts()
  }, [message])

  // Fetch journal entry if editing
  useEffect(() => {
    if (isEditMode && id) {
      const fetchEntry = async () => {
        setLoadingEntry(true)
        try {
          const res = await LedgerAPI.get(id)
          const entry = res.data.data
          
          // Convert entries/lines to the format we need
          const entryLines = (entry.entries || entry.lines || []).map((line: any) => ({
            account_id: line.account_id || line.account || '',
            account_name: line.account_name || line.account || '',
            debit: line.debit !== undefined ? line.debit : (line.type === 'debit' ? line.amount || 0 : 0),
            credit: line.credit !== undefined ? line.credit : (line.type === 'credit' ? line.amount || 0 : 0),
          }))
          
          form.setFieldsValue({
            date: dayjs(entry.date),
            reference: entry.reference || '',
            description: entry.description || '',
            entries: entryLines,
          })
          setEntries(entryLines)
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to fetch journal entry')
          navigate('/ledger/manage')
        } finally {
          setLoadingEntry(false)
        }
      }
      fetchEntry()
    }
  }, [id, isEditMode, form, message, navigate])

  const addEntry = () => {
    const newEntry: JournalEntryLine = {
      account_id: '',
      account_name: '',
      debit: 0,
      credit: 0,
    }
    const updatedEntries = [...entries, newEntry]
    setEntries(updatedEntries)
    // Don't update form fields here - we'll use entries state directly on submit
  }

  const removeEntry = (index: number) => {
    const updatedEntries = entries.filter((_, i) => i !== index)
    setEntries(updatedEntries)
    // Don't update form fields here - we'll use entries state directly on submit
  }

  const updateEntry = (index: number, field: keyof JournalEntryLine, value: any) => {
    setEntries((prevEntries) => {
      const updatedEntries = [...prevEntries]
      if (field === 'account_id') {
        const account = accounts.find((acc) => acc.account_id === value)
        updatedEntries[index] = {
          ...updatedEntries[index],
          account_id: value,
          account_name: account?.account_name || '',
        }
      } else {
        updatedEntries[index] = {
          ...updatedEntries[index],
          [field]: value,
        }
      }
      return updatedEntries
    })
  }

  const validateEntries = (): boolean => {
    if (entries.length < 2) {
      message.error('At least 2 entries are required (one debit and one credit)')
      return false
    }

    const totalDebit = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0)
    const totalCredit = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      message.error(`Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)})`)
      return false
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.account_id) {
        message.error(`Entry ${i + 1}: Account is required`)
        return false
      }
      if ((entry.debit || 0) > 0 && (entry.credit || 0) > 0) {
        message.error(`Entry ${i + 1}: Cannot have both debit and credit`)
        return false
      }
      if ((entry.debit || 0) === 0 && (entry.credit || 0) === 0) {
        message.error(`Entry ${i + 1}: Either debit or credit must be greater than 0`)
        return false
      }
    }

    return true
  }

  const onFinish = async (values: any) => {
    if (!validateEntries()) {
      return
    }

    setLoading(true)
    try {
      const payload: JournalEntryInput = {
        date: values.date.toISOString(),
        reference: values.reference || undefined,
        description: values.description || '',
        entries: entries.map((entry) => ({
          account_id: entry.account_id,
          account_name: entry.account_name,
          debit: Math.round((entry.debit || 0) * 100) / 100,
          credit: Math.round((entry.credit || 0) * 100) / 100,
        })),
        source_module: 'manual',
      }

      if (isEditMode && id) {
        await LedgerAPI.update(id, payload)
        message.success('Journal entry updated successfully')
      } else {
        await LedgerAPI.create(payload)
        message.success('Journal entry created successfully')
      }
      navigate('/ledger/manage')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save journal entry')
    } finally {
      setLoading(false)
    }
  }

  const totalDebit = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0)
  const totalCredit = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  if (loadingEntry) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading journal entry...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-muted/50 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/ledger/manage')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditMode ? 'Edit Journal Entry' : 'Create Journal Entry'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? 'Update journal entry details' : 'Add a new manual journal entry'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <Form
              form={form}
              onFinish={onFinish}
              layout="vertical"
              className="space-y-6"
              initialValues={{
                date: dayjs(),
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  name="date"
                  label={<span className="text-sm font-semibold text-foreground">Date *</span>}
                  rules={[{ required: true, message: 'Date is required' }]}
                >
                  <DatePicker
                    className="w-full h-11"
                    format="YYYY-MM-DD HH:mm:ss"
                    showTime={{ format: 'HH:mm:ss' }}
                    placeholder="Select date and time"
                  />
                </Form.Item>

                <Form.Item
                  name="reference"
                  label={<span className="text-sm font-semibold text-foreground">Reference</span>}
                >
                  <Input
                    placeholder="Enter reference number"
                    className="h-11"
                  />
                </Form.Item>
              </div>

              <Form.Item
                name="description"
                label={<span className="text-sm font-semibold text-foreground">Description *</span>}
                rules={[{ required: true, message: 'Description is required' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="Enter journal entry description"
                  className="resize-none"
                />
              </Form.Item>

              {/* Journal Entry Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-foreground">Journal Entry Lines *</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEntry}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Line
                  </Button>
                </div>

                {entries.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground mb-4">No entries added yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addEntry}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add First Entry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Account</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Debit</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Credit</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-foreground w-20">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry, index) => (
                            <tr key={index} className="border-b border-border hover:bg-muted/50">
                              <td className="py-3 px-4">
                                <AntSelect
                                  showSearch
                                  placeholder="Select account"
                                  filterOption={(input: string, option: any) =>
                                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                  }
                                  optionFilterProp="label"
                                  value={entry.account_id || undefined}
                                  onChange={(value) => updateEntry(index, 'account_id', value)}
                                  disabled={loadingAccounts}
                                  loading={loadingAccounts}
                                  notFoundContent="No accounts found"
                                  options={accounts.map((acc) => ({
                                    value: acc.account_id,
                                    label: `${acc.account_name}${acc.account_code ? ` (${acc.account_code})` : ''}${acc.account_sub_type ? ` - ${acc.account_sub_type}` : ''}`,
                                  }))}
                                  style={{ width: '100%', minHeight: 40 }}
                                />
                              </td>
                              <td className="py-3 px-4">
                                <InputNumber
                                  className="w-full"
                                  min={0}
                                  step={0.01}
                                  precision={2}
                                  value={entry.debit || 0}
                                  onChange={(value) => {
                                    const numValue = typeof value === 'number' ? value : (value ? parseFloat(value.toString()) : 0)
                                    updateEntry(index, 'debit', numValue)
                                    if (numValue > 0) {
                                      updateEntry(index, 'credit', 0)
                                    }
                                  }}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <InputNumber
                                  className="w-full"
                                  min={0}
                                  step={0.01}
                                  precision={2}
                                  value={entry.credit || 0}
                                  onChange={(value) => {
                                    const numValue = typeof value === 'number' ? value : (value ? parseFloat(value.toString()) : 0)
                                    updateEntry(index, 'credit', numValue)
                                    if (numValue > 0) {
                                      updateEntry(index, 'debit', 0)
                                    }
                                  }}
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeEntry(index)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/50 font-semibold">
                            <td className="py-3 px-4 text-foreground">Total</td>
                            <td className="py-3 px-4 text-right text-foreground">
                              AED {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-foreground">
                              AED {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Balance Status */}
                    <div className={`p-3 rounded-lg ${isBalanced ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${isBalanced ? 'text-green-300' : 'text-red-300'}`}>
                          {isBalanced ? '✓ Balanced' : '✗ Not Balanced'}
                        </span>
                        <span className={`text-sm ${isBalanced ? 'text-green-300' : 'text-red-300'}`}>
                          Difference: AED {Math.abs(totalDebit - totalCredit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/ledger/manage')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || entries.length === 0 || !isBalanced}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Saving...' : isEditMode ? 'Update Entry' : 'Create Entry'}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

