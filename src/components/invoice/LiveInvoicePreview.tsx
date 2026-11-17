import { useEffect, useMemo, useState } from 'react'
import { Eye } from 'lucide-react'
import {
  SalesInvoiceTemplateAPI,
  PurchaseInvoiceTemplateAPI,
  DeliveryOrderTemplateAPI,
} from '@/services/api'
import {
  renderSimpleTemplateToHTML,
  renderTemplateToHTML,
  type InvoiceData,
} from '@/utils/templateRenderer'
import { DEFAULT_TEMPLATE as DEFAULT_SALES_TEMPLATE } from '@/pages/sales/TemplatesManage'
import InvoicePreviewFrame from './InvoicePreviewFrame'

type DocType = 'sales' | 'purchase' | 'delivery'

interface LiveInvoicePreviewProps {
  /** Which document type — controls which default template is fetched */
  docType: DocType
  /** Live invoice data reconstructed from the form */
  invoiceData: InvoiceData
  /** product-id → product-name map for line item labels */
  inventoryMap?: Map<string, string>
  /** Sales export-invoice styling (simple format only) */
  isExport?: boolean
  className?: string
}

const TEMPLATE_API: Record<DocType, { getDefault: () => Promise<any> }> = {
  sales: SalesInvoiceTemplateAPI as any,
  purchase: PurchaseInvoiceTemplateAPI as any,
  delivery: DeliveryOrderTemplateAPI as any,
}

/**
 * Live invoice preview — renders the form's current values through the
 * same renderer used for printing, inside a scaled A4 frame.
 */
export default function LiveInvoicePreview({
  docType,
  invoiceData,
  inventoryMap,
  isExport,
  className,
}: LiveInvoicePreviewProps) {
  const [design, setDesign] = useState<any>(null)
  const [templateName, setTemplateName] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    TEMPLATE_API[docType]
      .getDefault()
      .then((res) => {
        if (cancelled) return
        const tpl = res?.data?.data
        setDesign(tpl?.design && Object.keys(tpl.design).length > 0 ? tpl.design : null)
        setTemplateName(tpl?.name || '')
      })
      .catch(() => {
        if (!cancelled) setDesign(null)
      })
    return () => {
      cancelled = true
    }
  }, [docType])

  const html = useMemo(() => {
    const d = design || DEFAULT_SALES_TEMPLATE
    try {
      if (Array.isArray(d?.elements)) {
        return renderTemplateToHTML(d, invoiceData, inventoryMap)
      }
      return renderSimpleTemplateToHTML(d, invoiceData, inventoryMap, { isExportInvoice: isExport })
    } catch {
      return renderSimpleTemplateToHTML(DEFAULT_SALES_TEMPLATE as any, invoiceData, inventoryMap, {
        isExportInvoice: isExport,
      })
    }
  }, [design, invoiceData, inventoryMap, isExport])

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <Eye className="h-3.5 w-3.5" />
          Live preview
        </div>
        {templateName && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={templateName}>
            {templateName}
          </span>
        )}
      </div>
      <InvoicePreviewFrame html={html} className="rounded-lg shadow-lg" />
    </div>
  )
}
