import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import BaseReport from './BaseReport'
import type { ReportFilters, ReportData } from '@/services/api'

interface ExpenseBreakdownReportProps {
  filters: ReportFilters
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function ExpenseBreakdownReport({ filters }: ExpenseBreakdownReportProps) {
  const getTableColumns = (): ColumnsType<any> => [
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Total Expenses',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
    },
  ]

  const renderChart = (data: ReportData) => {
    const chartData = data.data.map((item) => ({
      label: item.label,
      total: item.total || 0,
      count: item.count || 0,
    }))

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
        <ResponsiveContainer width="100%" height={400}>
          {filters.groupBy === 'category' ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ label, total }) => `${label}: AED ${total.toFixed(2)}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="total"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <Legend />
              <Bar dataKey="total" fill="#ef4444" name="Expenses" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    )
  }

  const renderTable = (data: ReportData) => {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Breakdown</h3>
        <Table
          columns={getTableColumns()}
          dataSource={data.data.map((item, index) => ({ ...item, key: index }))}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10 }}
        />
      </div>
    )
  }

  return (
    <BaseReport
      reportType="expense_breakdown"
      filters={filters}
      title="Expense Breakdown"
      renderChart={renderChart}
      renderTable={renderTable}
      getTableColumns={getTableColumns}
    />
  )
}

