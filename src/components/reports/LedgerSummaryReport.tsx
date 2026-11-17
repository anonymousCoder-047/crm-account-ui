import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import BaseReport from './BaseReport'
import type { ReportFilters } from '@/services/api'

interface LedgerSummaryReportProps {
  filters: ReportFilters
}

export default function LedgerSummaryReport({ filters }: LedgerSummaryReportProps) {
  const getTableColumns = (): ColumnsType<any> => [
    {
      title: 'Account',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Total Debit',
      dataIndex: 'debit',
      key: 'debit',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Total Credit',
      dataIndex: 'credit',
      key: 'credit',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (value: number) => (
        <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
          AED {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ]

  const renderTable = (data: any) => {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Ledger Summary</h3>
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
      reportType="ledger_summary"
      filters={filters}
      title="Ledger Summary"
      renderTable={renderTable}
      getTableColumns={getTableColumns}
    />
  )
}

