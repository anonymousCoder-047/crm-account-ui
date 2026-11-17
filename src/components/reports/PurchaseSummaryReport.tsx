import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import BaseReport from './BaseReport'
import type { ReportFilters, ReportData } from '@/services/api'

interface PurchaseSummaryReportProps {
  filters: ReportFilters
}

export default function PurchaseSummaryReport({ filters }: PurchaseSummaryReportProps) {
  const getTableColumns = (): ColumnsType<any> => [
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Total Purchases',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Invoice Count',
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
        <h3 className="text-lg font-semibold mb-4">Purchase Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          {filters.groupBy === 'supplier' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <Legend />
              <Bar dataKey="total" fill="#10b981" name="Purchases" />
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Purchases" dot={{ r: 4 }} />
            </LineChart>
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
      reportType="purchase_summary"
      filters={filters}
      title="Purchase Summary"
      renderChart={renderChart}
      renderTable={renderTable}
      getTableColumns={getTableColumns}
    />
  )
}

