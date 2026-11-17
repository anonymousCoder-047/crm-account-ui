import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import BaseReport from './BaseReport'
import type { ReportFilters, ReportData } from '@/services/api'

interface ProfitLossReportProps {
  filters: ReportFilters
}

export default function ProfitLossReport({ filters }: ProfitLossReportProps) {
  const getTableColumns = (): ColumnsType<any> => [
    {
      title: 'Period',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Expenses',
      dataIndex: 'expenses',
      key: 'expenses',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Profit/Loss',
      dataIndex: 'profit',
      key: 'profit',
      render: (value: number) => (
        <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
          AED {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ]

  const renderChart = (data: ReportData) => {
    const chartData = data.data.map((item) => ({
      label: item.label,
      revenue: item.revenue || 0,
      expenses: item.expenses || 0,
      profit: item.profit || 0,
    }))

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Profit & Loss Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit/Loss" dot={{ r: 4 }} />
          </LineChart>
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
      reportType="profit_loss"
      filters={filters}
      title="Profit & Loss"
      renderChart={renderChart}
      renderTable={renderTable}
      getTableColumns={getTableColumns}
    />
  )
}

