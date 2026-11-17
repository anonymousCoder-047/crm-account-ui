import { ArrowLeft, Printer, Download } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PurchaseInvoiceTemplateAPI, type PurchaseInvoiceTemplate } from '@/services/api'
import { App, Spin } from 'antd'
import { type SimpleInvoiceTemplate } from '@/components/invoice/SimpleInvoiceTemplateEditor'
import { renderSimpleTemplateToHTML, renderTemplateToHTML, getSampleInvoiceData } from '@/utils/templateRenderer'
import InvoicePreviewFrame from '@/components/invoice/InvoicePreviewFrame'
import { FileText } from 'lucide-react'

export default function PurchaseTemplateView() {
  const appContext = App.useApp()
  const message = appContext?.message
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState<PurchaseInvoiceTemplate | null>(null)

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id) {
        navigate('/purchase-invoice-templates/manage')
        return
      }

      setLoading(true)
      try {
        const res = await PurchaseInvoiceTemplateAPI.get(id)
        setTemplate(res.data.data)
      } catch (error: any) {
        console.error('Error fetching template:', error)
        message?.error('Failed to load template')
        navigate('/purchase-invoice-templates/manage')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [id, navigate, message])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-muted/50 p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-muted-foreground">Template not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Parse design if it's a string
  let design = template.design
  if (typeof design === 'string') {
    try {
      design = JSON.parse(design)
    } catch (e) {
      console.error('Failed to parse design:', e)
    }
  }

  // Check if it's old format (with elements) or new format
  const designAny = design as any
  const hasOldFormat = designAny && designAny.elements && Array.isArray(designAny.elements) && designAny.elements.length > 0
  const hasNewFormat = designAny && typeof designAny === 'object' && !hasOldFormat && (
    designAny.colorTheme !== undefined || 
    designAny.lineItems !== undefined || 
    designAny.fonts !== undefined ||
    designAny.invoiceNumber !== undefined ||
    designAny.borderStyle !== undefined
  )

  const renderTemplatePreview = () => {
    if (hasNewFormat) {
      return (
        <InvoicePreviewFrame
          html={renderSimpleTemplateToHTML(design as unknown as SimpleInvoiceTemplate, getSampleInvoiceData())}
          className="mx-auto max-w-[794px]"
        />
      )
    } else if (hasOldFormat) {
      return (
        <InvoicePreviewFrame
          html={renderTemplateToHTML(design as any, getSampleInvoiceData())}
          className="mx-auto max-w-[794px]"
        />
      )
    } else {
      return (
        <div className="p-8">
          <div className="text-center text-muted-foreground py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-semibold">No Template Design</p>
            <p className="text-xs text-muted-foreground mt-2">
              This template doesn't have a visual design yet. Please edit the template to add a design.
            </p>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/purchase-invoice-templates/manage')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{template.name}</h1>
              {template.description && (
                <p className="text-muted-foreground mt-2">{template.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Preview
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const dataStr = JSON.stringify(template.design, null, 2)
                  const dataBlob = new Blob([dataStr], { type: 'application/json' })
                  const url = URL.createObjectURL(dataBlob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `${template.name}-template.json`
                  link.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </div>

        {/* Template Preview */}
        <Card>
          <CardContent className="p-8">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="bg-card shadow-lg rounded overflow-hidden" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                {template.design ? renderTemplatePreview() : (
                  <div className="p-8">
                    <div className="text-center text-muted-foreground py-12">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">No Template Design</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        This template doesn't have a visual design yet. Please edit the template to add a design.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

