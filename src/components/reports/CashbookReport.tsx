import { Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import BaseReport from './BaseReport'
import type { ReportFilters, ReportData } from '@/services/api'

interface CashbookReportProps {
  filters: ReportFilters
}

export default function CashbookReport({ filters }: CashbookReportProps) {
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
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      render: (value: number) => value > 0 ? `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      render: (value: number) => value > 0 ? `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (value: number) => (
        <span className="font-semibold">
          AED {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
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
      reportType="cashbook"
      filters={filters}
      getTableColumns={getTableColumns}
      renderSummary={(data: ReportData) => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Opening Balance</p>
            <p className="text-xl font-bold text-blue-400">
              AED {data.summary?.opening_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Debits</p>
            <p className="text-xl font-bold text-green-400">
              AED {data.summary?.total_debits?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Credits</p>
            <p className="text-xl font-bold text-red-400">
              AED {data.summary?.total_credits?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div className="bg-purple-500/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Closing Balance</p>
            <p className="text-xl font-bold text-purple-400">
              AED {data.summary?.closing_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
        </div>
      )}
    />
  )
}

