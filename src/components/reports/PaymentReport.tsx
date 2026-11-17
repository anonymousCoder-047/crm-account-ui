import { Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import BaseReport from './BaseReport'
import type { ReportFilters, ReportData } from '@/services/api'

interface PaymentReportProps {
  filters: ReportFilters
}

export default function PaymentReport({ filters }: PaymentReportProps) {
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
        <span className="font-semibold text-red-400">
          AED {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Account',
      dataIndex: 'account_name',
      key: 'account_name',
    },
    {
      title: 'Source',
      dataIndex: 'source_module',
      key: 'source_module',
      render: (source: string) => <Tag>{source}</Tag>,
    },
  ]

  return (
    <BaseReport
      reportType="payment_report"
      filters={filters}
      getTableColumns={getTableColumns}
      renderSummary={(data: ReportData) => (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-red-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-xl font-bold text-red-400">
              AED {data.summary?.total_payments?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Transaction Count</p>
            <p className="text-xl font-bold text-blue-400">{data.summary?.count || 0}</p>
          </div>
        </div>
      )}
    />
  )
}

