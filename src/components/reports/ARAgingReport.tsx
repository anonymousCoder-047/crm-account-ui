import { Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import BaseReport from './BaseReport'
import type { ReportFilters, ReportData } from '@/services/api'

interface ARAgingReportProps {
  filters: ReportFilters
}

export default function ARAgingReport({ filters }: ARAgingReportProps) {
  const getTableColumns = (): ColumnsType<any> => [
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text: string) => text || 'Unknown',
    },
    {
      title: 'Invoice Number',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
    },
    {
      title: 'Invoice Date',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Balance Due',
      dataIndex: 'balance_due',
      key: 'balance_due',
      render: (value: number) => `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Days Past Due',
      dataIndex: 'days_past_due',
      key: 'days_past_due',
      render: (days: number) => (
        <Tag color={days === 0 ? 'green' : days <= 30 ? 'blue' : days <= 60 ? 'orange' : 'red'}>
          {days} days
        </Tag>
      ),
    },
    {
      title: 'Aging Bucket',
      dataIndex: 'bucket',
      key: 'bucket',
      render: (bucket: string) => {
        const colors: Record<string, string> = {
          current: 'green',
          '0-30': 'blue',
          '31-60': 'orange',
          '61-90': 'red',
          '90+': 'red',
        }
        return <Tag color={colors[bucket] || 'default'}>{bucket}</Tag>
      },
    },
  ]

  return (
    <BaseReport
      reportType="ar_aging"
      filters={filters}
      getTableColumns={getTableColumns}
      renderSummary={(data: ReportData) => (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
            <p className="text-xl font-bold text-blue-400">
              AED {data.summary?.total_outstanding?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">0-30 Days</p>
            <p className="text-xl font-bold text-green-400">
              AED {data.summary?.bucket_0_30?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div className="bg-yellow-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">31-60 Days</p>
            <p className="text-xl font-bold text-yellow-400">
              AED {data.summary?.bucket_31_60?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div className="bg-orange-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">61-90 Days</p>
            <p className="text-xl font-bold text-orange-400">
              AED {data.summary?.bucket_61_90?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">90+ Days</p>
            <p className="text-xl font-bold text-red-400">
              AED {data.summary?.bucket_90_plus?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
        </div>
      )}
    />
  )
}

