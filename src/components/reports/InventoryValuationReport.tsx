import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import BaseReport from './BaseReport'
import type { ReportFilters } from '@/services/api'

interface InventoryValuationReportProps {
  filters: ReportFilters
}

export default function InventoryValuationReport({ filters }: InventoryValuationReportProps) {
  const getTableColumns = (): ColumnsType<any> => [
    {
      title: 'Product Name',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Serial Number',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Cost Price',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Total Value',
      dataIndex: 'totalValue',
      key: 'totalValue',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
  ]

  const renderTable = (data: any) => {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Inventory Valuation</h3>
        <Table
          columns={getTableColumns()}
          dataSource={data.data.map((item: any, index: number) => ({ ...item, key: index }))}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20 }}
        />
      </div>
    )
  }

  return (
    <BaseReport
      reportType="inventory_valuation"
      filters={filters}
      title="Inventory Valuation"
      renderTable={renderTable}
      getTableColumns={getTableColumns}
    />
  )
}

