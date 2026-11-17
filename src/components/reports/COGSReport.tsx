import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import BaseReport from './BaseReport'
import type { ReportFilters, ReportData } from '@/services/api'

interface COGSReportProps {
  filters: ReportFilters
}

export default function COGSReport({ filters }: COGSReportProps) {
  const getTableColumns = (): ColumnsType<any> => [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => (
        <span className="font-semibold">
          AED {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Account',
      dataIndex: 'account_name',
      key: 'account_name',
    },
  ]

  return (
    <BaseReport
      reportType="cogs_report"
      filters={filters}
      getTableColumns={getTableColumns}
      renderSummary={(data: ReportData) => (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total COGS</p>
            <p className="text-xl font-bold text-blue-400">
              AED {data.summary?.total_cogs?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Transaction Count</p>
            <p className="text-xl font-bold text-green-400">{data.summary?.count || 0}</p>
          </div>
        </div>
      )}
    />
  )
}

