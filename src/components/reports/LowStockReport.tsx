import { Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import BaseReport from './BaseReport'
import type { ReportFilters, ReportData } from '@/services/api'

interface LowStockReportProps {
  filters: ReportFilters
}

export default function LowStockReport({ filters }: LowStockReportProps) {
  const getTableColumns = (): ColumnsType<any> => [
    {
      title: 'Product',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
    },
    {
      title: 'Current Stock',
      dataIndex: 'current_stock',
      key: 'current_stock',
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: 'Min Stock Level',
      dataIndex: 'min_stock_level',
      key: 'min_stock_level',
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unit_cost',
      key: 'unit_cost',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Total Value',
      dataIndex: 'total_value',
      key: 'total_value',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'out_of_stock' ? 'red' : 'orange'}>
          {status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
        </Tag>
      ),
    },
  ]

  return (
    <BaseReport
      reportType="low_stock"
      filters={filters}
      getTableColumns={getTableColumns}
      renderSummary={(data: ReportData) => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-xl font-bold text-blue-400">{data.summary?.total_items || 0}</p>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Out of Stock</p>
            <p className="text-xl font-bold text-red-400">{data.summary?.out_of_stock || 0}</p>
          </div>
          <div className="bg-orange-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Low Stock</p>
            <p className="text-xl font-bold text-orange-400">{data.summary?.low_stock || 0}</p>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold text-green-400">
              AED {data.summary?.total_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
        </div>
      )}
    />
  )
}

