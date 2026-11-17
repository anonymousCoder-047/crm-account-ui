import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import BaseReport from './BaseReport'
import type { ReportFilters, ReportData } from '@/services/api'

interface StockMovementsReportProps {
  filters: ReportFilters
}

export default function StockMovementsReport({ filters }: StockMovementsReportProps) {
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
      title: 'Opening Stock',
      dataIndex: 'opening_stock',
      key: 'opening_stock',
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: 'Total In',
      dataIndex: 'total_in',
      key: 'total_in',
      render: (value: number) => <span className="text-green-400">+{value.toLocaleString()}</span>,
    },
    {
      title: 'Total Out',
      dataIndex: 'total_out',
      key: 'total_out',
      render: (value: number) => <span className="text-red-400">-{value.toLocaleString()}</span>,
    },
    {
      title: 'Closing Stock',
      dataIndex: 'closing_stock',
      key: 'closing_stock',
      render: (value: number) => <span className="font-semibold">{value.toLocaleString()}</span>,
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
  ]

  return (
    <BaseReport
      reportType="stock_movements"
      filters={filters}
      getTableColumns={getTableColumns}
      renderSummary={(data: ReportData) => (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-xl font-bold text-blue-400">{data.summary?.total_items || 0}</p>
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

