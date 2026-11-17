import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { ReportAPI, type ReportType, type ReportData, type ReportFilters } from '@/services/api'
import { message, Table } from 'antd'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'

interface BaseReportProps {
  reportType: ReportType
  filters: ReportFilters
  title?: string
  renderChart?: (data: ReportData) => React.ReactNode
  renderTable?: (data: ReportData) => React.ReactNode
  renderSummary?: (data: ReportData) => React.ReactNode
  getChartData?: (data: ReportData) => any[]
  getTableColumns?: () => any[]
}

export default function BaseReport({
  reportType,
  filters,
  title,
  renderChart,
  renderTable,
  renderSummary,
  getChartData,
  getTableColumns,
}: BaseReportProps) {
  const reportTitle = title || reportType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        const response = await ReportAPI.get(reportType, filters)
        setReportData(response.data.data)
      } catch (error: any) {
        message.error(error.message || 'Failed to fetch report')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [reportType, filters])

  const handleExportCSV = () => {
    if (!reportData) return

    const worksheet = XLSX.utils.json_to_sheet(reportData.data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, reportTitle)
    XLSX.writeFile(workbook, `${reportTitle}-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    message.success('Report exported to Excel successfully')
  }

  const handleExportPDF = () => {
    if (!reportData || !getTableColumns) return

    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(reportTitle, 14, 20)

    // Add filters info
    doc.setFontSize(10)
    let yPos = 30
    if (reportData.filters.from) {
      doc.text(`From: ${reportData.filters.from}`, 14, yPos)
      yPos += 5
    }
    if (reportData.filters.to) {
      doc.text(`To: ${reportData.filters.to}`, 14, yPos)
      yPos += 5
    }
    if (reportData.filters.groupBy) {
      doc.text(`Group By: ${reportData.filters.groupBy}`, 14, yPos)
      yPos += 10
    }

    // Add summary if available
    if (reportData.summary) {
      doc.setFontSize(12)
      doc.text('Summary', 14, yPos)
      yPos += 5
      doc.setFontSize(10)
      Object.entries(reportData.summary).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 14, yPos)
        yPos += 5
      })
      yPos += 5
    }

    // Add table
    const columns = getTableColumns()
    const tableData = reportData.data.map((row) =>
      columns.map((col) => row[col.key] || '')
    )

    autoTable(doc, {
      head: [columns.map((col) => col.title)],
      body: tableData,
      startY: yPos,
    })

    doc.save(`${reportTitle}-${dayjs().format('YYYY-MM-DD')}.pdf`)
    message.success('Report exported to PDF successfully')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No data available for this report</p>
      </div>
    )
  }

  const isCurrencyKey = (key: string) => {
    const k = key.toLowerCase()
    // Heuristic: treat common financial totals as currency, others as plain numbers
    const currencyKeywords = [
      'amount',
      'total',
      'revenue',
      'sales',
      'purchase',
      'cost',
      'profit',
      'income',
      'expense',
      'tax',
      'vat',
      'balance',
      'value',
      'debit',
      'credit',
      'cash',
    ]
    const countKeywords = ['count', 'qty', 'quantity', 'items', 'invoices', 'days', 'entries']

    if (countKeywords.some(word => k.includes(word))) return false
    return currencyKeywords.some(word => k.includes(word))
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {renderSummary ? renderSummary(reportData) : reportData.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {Object.entries(reportData.summary).map(([key, value]) => (
            <Card key={key} className="border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground break-words">
                  {typeof value === 'number'
                    ? isCurrencyKey(key)
                      ? `AED ${value.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : value.toLocaleString('en-US')
                    : value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={handleExportCSV} className="flex-shrink-0">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">CSV</span>
        </Button>
        {getTableColumns && (
          <Button variant="outline" onClick={handleExportPDF} className="flex-shrink-0">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        )}
      </div>

      {/* Chart */}
      {renderChart && renderChart(reportData)}

      {/* Table */}
      {renderTable ? renderTable(reportData) : getTableColumns && (
        <Table
          columns={getTableColumns()}
          dataSource={reportData.data.map((item, index) => ({ ...item, key: index }))}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </div>
  )
}

