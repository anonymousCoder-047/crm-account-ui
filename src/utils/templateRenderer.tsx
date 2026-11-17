import type { SalesInvoice, PurchaseInvoice } from '@/services/api'
import type { SimpleInvoiceTemplate } from '@/components/invoice/SimpleInvoiceTemplateEditor'
import dayjs from 'dayjs'

// Define DesignElement type locally to avoid import issues
export interface DesignElement {
  id: string
  type: 'text' | 'image' | 'table' | 'line' | 'rectangle'
  x: number
  y: number
  width?: number
  height?: number
  content?: string
  contentEn?: string
  contentAr?: string
  rtl?: boolean
  style?: {
    fontSize?: number
    fontFamily?: string
    fontWeight?: 'normal' | 'bold' | 'italic'
    color?: string
    backgroundColor?: string
    textAlign?: 'left' | 'center' | 'right'
    borderWidth?: number
    borderColor?: string
    borderStyle?: 'solid' | 'dashed' | 'dotted'
    padding?: number
    margin?: number
  }
  imageUrl?: string
  imageData?: string
  tableConfig?: {
    columns: Array<{
      field: string
      label: string
      width?: number
      align?: 'left' | 'center' | 'right'
      dataTemplate?: string
      backgroundColor?: string
    }>
    showHeader?: boolean
    showBorders?: boolean
    headerRowHeight?: number
    headerRowBackgroundColor?: string
    bodyRowHeight?: number
    bodyRowBackgroundColor?: string
    alternateRowBackgroundColor?: string
  }
}

export interface TemplateDesign {
  pageWidth?: number
  pageHeight?: number
  elements: DesignElement[]
}

export interface InvoiceData {
  invoice: SalesInvoice | PurchaseInvoice
  customer?: any
  supplier?: any
  lineItems?: Array<{
    product?: any
    qty?: number
    quantity?: number
    unitPrice?: number
    unit_price?: number
    total?: number
    description?: string
    discount?: number
    vat?: number
  }>
}

/**
 * Helper to safely get field value (supports both camelCase and snake_case)
 */
function getField(obj: any, ...keys: string[]): any {
  if (!obj) return ''
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key]
    }
  }
  return ''
}

/**
 * Replace template variables with actual invoice data
 */
function replaceVariables(text: string, invoiceData: InvoiceData): string {
  const { invoice, customer, supplier } = invoiceData

  // Check if it's a sales invoice or purchase invoice
  const isSalesInvoice = getField(invoice, 'invoice_number', 'invoiceNumber', 'serial_number', 'serialNumber')
  const isPurchaseInvoice = getField(invoice, 'supplier', 'supplier_id', 'vendor_id')

  // Extract customer/supplier data - handle both object and ID references
  const customerObj = getField(invoice, 'customer', 'customer_id') || customer
  // For purchase invoices, check vendor_id first, then supplier_id, then supplier
  // Also check if vendor_id/supplier_id is an object (populated) or just an ID
  let supplierObj = getField(invoice, 'vendor_id', 'supplier', 'supplier_id') || supplier
  // If supplierObj is still not found and we have a purchase invoice, try to get it from invoice directly
  if (!supplierObj && isPurchaseInvoice) {
    supplierObj = (invoice as any).vendor_id || (invoice as any).supplier_id || (invoice as any).supplier || supplier
  }

  let result = text

  // Replace invoice-level variables (common to both) - with optional whitespace
  const invoiceDate = getField(invoice, 'date', 'invoice_date', 'invoiceDate')
  result = result.replace(/\{\{\s*date\s*\}\}/gi, invoiceDate ? dayjs(invoiceDate).format('YYYY-MM-DD') : '')
  result = result.replace(/\{\{\s*status\s*\}\}/gi, getField(invoice, 'status', 'payment_status', 'paymentStatus'))

  // Sales invoice specific variables
  if (isSalesInvoice) {
    const invoiceNumber = getField(invoice, 'invoice_number', 'invoiceNumber')
    const serialNumber = getField(invoice, 'serial_number', 'serialNumber')
    const deliveryAddress = getField(invoice, 'delivery_address', 'deliveryAddress')
    const paymentMethod = getField(invoice, 'payment_method', 'paymentMethod')
    const trn = getField(invoice, 'trn', 'tax_registration_number')

    result = result.replace(/\{\{\s*invoiceNumber\s*\}\}/gi, invoiceNumber || serialNumber || '')
    result = result.replace(/\{\{\s*serialNumber\s*\}\}/gi, serialNumber || invoiceNumber || '')
    result = result.replace(/\{\{\s*deliveryAddress\s*\}\}/gi, deliveryAddress)
    result = result.replace(/\{\{\s*paymentMethod\s*\}\}/gi, paymentMethod)
    result = result.replace(/\{\{\s*trn\s*\}\}/gi, trn)
  }

  // Purchase invoice specific variables
  if (isPurchaseInvoice) {
    const invoiceNumber = getField(invoice, 'invoice_number', 'invoiceNumber', 'supplier_number', 'supplierNumber')
    const trn = getField(invoice, 'trn', 'tax_registration_number')

    result = result.replace(/\{\{\s*supplierNumber\s*\}\}/gi, invoiceNumber)
    result = result.replace(/\{\{\s*invoiceNumber\s*\}\}/gi, invoiceNumber)
    result = result.replace(/\{\{\s*trn\s*\}\}/gi, trn)
  }

  // For purchase invoices, replace customer placeholders with supplier data
  // This handles cases where the template still has customer fields
  if (isPurchaseInvoice && supplierObj) {
    const suppName = typeof supplierObj === 'object' ? getField(supplierObj, 'name', 'supplier_name') : supplierObj
    const suppEmail = typeof supplierObj === 'object' ? getField(supplierObj, 'email', 'supplier_email') : ''
    const suppPhone = typeof supplierObj === 'object' ? getField(supplierObj, 'phone', 'supplier_phone') : ''
    const suppAddress = typeof supplierObj === 'object' ? getField(supplierObj, 'address', 'supplier_address') : ''
    const suppTrn = typeof supplierObj === 'object' ? getField(supplierObj, 'trn', 'tax_registration_number') : ''

    // Replace customer placeholders with supplier data for purchase invoices
    result = result.replace(/\{\{\s*customer\.name\s*\}\}/gi, suppName)
    result = result.replace(/\{\{\s*customer\.email\s*\}\}/gi, suppEmail)
    result = result.replace(/\{\{\s*customer\.phone\s*\}\}/gi, suppPhone)
    result = result.replace(/\{\{\s*customer\.address\s*\}\}/gi, suppAddress)
    result = result.replace(/\{\{\s*customer\.trn\s*\}\}/gi, suppTrn)
  }

  // Customer variables - handle both object and string references (for sales invoices)
  if (customerObj && !isPurchaseInvoice) {
    const custName = typeof customerObj === 'object' ? getField(customerObj, 'name', 'customer_name') : customerObj
    const custEmail = typeof customerObj === 'object' ? getField(customerObj, 'email', 'customer_email') : ''
    const custPhone = typeof customerObj === 'object' ? getField(customerObj, 'phone', 'customer_phone') : ''
    const custAddress = typeof customerObj === 'object' ? getField(customerObj, 'address', 'customer_address') : ''
    const custTrn = typeof customerObj === 'object' ? getField(customerObj, 'trn', 'tax_registration_number') : ''

    result = result.replace(/\{\{\s*customer\.name\s*\}\}/gi, custName)
    result = result.replace(/\{\{\s*customer\.email\s*\}\}/gi, custEmail)
    result = result.replace(/\{\{\s*customer\.phone\s*\}\}/gi, custPhone)
    result = result.replace(/\{\{\s*customer\.address\s*\}\}/gi, custAddress)
    result = result.replace(/\{\{\s*customer\.trn\s*\}\}/gi, custTrn)
  }

  // Supplier variables - handle both object and string references
  if (supplierObj) {
    const suppName = typeof supplierObj === 'object' ? getField(supplierObj, 'name', 'supplier_name') : supplierObj
    const suppEmail = typeof supplierObj === 'object' ? getField(supplierObj, 'email', 'supplier_email') : ''
    const suppPhone = typeof supplierObj === 'object' ? getField(supplierObj, 'phone', 'supplier_phone') : ''
    const suppAddress = typeof supplierObj === 'object' ? getField(supplierObj, 'address', 'supplier_address') : ''
    const suppTrn = typeof supplierObj === 'object' ? getField(supplierObj, 'trn', 'tax_registration_number') : ''

    result = result.replace(/\{\{\s*supplier\.name\s*\}\}/gi, suppName)
    result = result.replace(/\{\{\s*supplier\.email\s*\}\}/gi, suppEmail)
    result = result.replace(/\{\{\s*supplier\.phone\s*\}\}/gi, suppPhone)
    result = result.replace(/\{\{\s*supplier\.address\s*\}\}/gi, suppAddress)
    result = result.replace(/\{\{\s*supplier\.trn\s*\}\}/gi, suppTrn)
  }

  // Calculate totals from line items - support both naming conventions
  const lineItems = getField(invoice, 'line_items', 'lineItems') || invoiceData.lineItems || []
  
  // Calculate grand total (subtotal) from line items
  // For purchase invoices, use unit_cost, for sales use unit_price
  const grandTotal = lineItems.reduce((sum: number, item: any) => {
    const qty = getField(item, 'qty', 'quantity') || 0
    const unitPrice = isPurchaseInvoice 
      ? (getField(item, 'unit_cost', 'unit_price', 'unitPrice') || 0)
      : (getField(item, 'unit_price', 'unitPrice') || 0)
    // Use item.total if available, otherwise calculate
    const itemTotal = getField(item, 'total') || (qty * unitPrice)
    return sum + itemTotal
  }, 0)

  // Get discount and VAT amounts
  const discountAmount = getField(invoice, 'discount', 'discount_amount') || 0
  const vatAmount = getField(invoice, 'vat', 'tax', 'tax_amount', 'taxAmount') || 0
  
  // Subtotal is the grand total (sum of all line items)
  // Net total = subtotal - discount + VAT
  const subtotal = grandTotal
  const netTotal = subtotal - discountAmount + vatAmount

  result = result.replace(/\{\{\s*subtotal\s*\}\}/gi, subtotal.toFixed(2))
  result = result.replace(/\{\{\s*discount\s*\}\}/gi, discountAmount.toFixed(2))
  result = result.replace(/\{\{\s*vat\s*\}\}/gi, vatAmount.toFixed(2))
  result = result.replace(/\{\{\s*total\s*\}\}/gi, netTotal.toFixed(2))

  return result
}

/**
 * Render line items table HTML
 */
function renderLineItemsTable(
  tableConfig: DesignElement['tableConfig'],
  lineItems: InvoiceData['lineItems'],
  inventoryMap?: Map<string, string>
): string {
  if (!tableConfig || !lineItems || lineItems.length === 0) {
    return ''
  }

  const getProductName = (product: string | any): string => {
    if (!product) return '-'
    if (typeof product === 'object' && product !== null) {
      return product.name || product._id || '-'
    }
    if (typeof product === 'string' && inventoryMap) {
      return inventoryMap.get(product) || product || '-'
    }
    return typeof product === 'string' ? product : '-'
  }

  let html = '<table style="width: 100%; border-collapse: collapse; table-layout: fixed; position: relative; border: 1px solid #d1d5db; border-spacing: 0;">'

  // Header
  if (tableConfig.showHeader) {
    const headerRowHeight = tableConfig.headerRowHeight ? `height: ${tableConfig.headerRowHeight}px;` : ''
    const headerRowBg = tableConfig.headerRowBackgroundColor || '#f3f4f6'
    html += `<thead><tr style="${headerRowHeight} background-color: ${headerRowBg}; border-bottom: 2px solid #d1d5db;">`
    tableConfig.columns.forEach(col => {
      const align = col.align || 'left'
      const borderStyle = tableConfig.showBorders ? 'border: 1px solid #d1d5db; border-bottom: 2px solid #d1d5db;' : 'border: 1px solid #d1d5db; border-bottom: 2px solid #d1d5db;'
      const colWidth = col.width ? `width: ${col.width}px;` : ''
      const colBg = col.backgroundColor || headerRowBg
      html += `<th style="${borderStyle} ${colWidth} padding: 8px; text-align: ${align}; background-color: ${colBg}; word-wrap: break-word; overflow-wrap: break-word; vertical-align: top; position: relative; font-weight: 600;">${col.label}</th>`
    })
    html += '</tr></thead>'
  }

  // Body
  html += '<tbody>'
  lineItems.forEach((item, rowIndex) => {
    // Determine row background color (alternating if configured)
    let rowBg = tableConfig.bodyRowBackgroundColor || '#ffffff'
    if (tableConfig.alternateRowBackgroundColor && rowIndex % 2 === 1) {
      rowBg = tableConfig.alternateRowBackgroundColor
    }
    const rowHeight = tableConfig.bodyRowHeight ? `height: ${tableConfig.bodyRowHeight}px;` : ''
    html += `<tr style="${rowHeight} background-color: ${rowBg}; border-bottom: 1px solid #e5e7eb;">`
      tableConfig.columns.forEach(col => {
        const align = col.align || 'left'
        const borderStyle = tableConfig.showBorders ? 'border: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;' : 'border: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;'
        const colWidth = col.width ? `width: ${col.width}px;` : ''
        // Column background color takes precedence over row background
        const cellBg = col.backgroundColor || rowBg
      let cellValue = ''

      // Use dataTemplate if available, otherwise fall back to field-based logic
      if (col.dataTemplate) {
        // Replace line item variables in the template (case-insensitive with optional whitespace)
        // Support both old (qty, unitPrice) and new (quantity, unit_price) field names
        // For purchase invoices, use unit_cost instead of unit_price
        let template = col.dataTemplate
        const quantity = getField(item, 'quantity', 'qty') || 0
        // Check if this is a purchase invoice by checking if unit_cost exists
        const unitPrice = getField(item, 'unit_cost', 'unit_price', 'unitPrice') || 0
        const total = getField(item, 'total') || (quantity * unitPrice) || 0
        const productName = getProductName(item.product)
        // Use product name as fallback if description is empty
        const description = getField(item, 'description') || productName

        // Add support for {{index}} - 1-based row number (must be replaced first)
        const indexValue = (rowIndex + 1).toString()
        template = template.replace(/\{\{\s*index\s*\}\}/gi, indexValue)
        template = template.replace(/\{\{\s*serial\s*\}\}/gi, indexValue)
        
        const discount = getField(item, 'discount') || 0
        const discountDisplay = discount > 0 ? discount.toFixed(2) : '-'
        
        template = template.replace(/\{\{\s*lineItems\.slNo\s*\}\}/gi, indexValue)
        template = template.replace(/\{\{\s*lineItems\.index\s*\}\}/gi, indexValue)
        template = template.replace(/\{\{\s*lineItems\.serial\s*\}\}/gi, indexValue)
        template = template.replace(/\{\{\s*lineItems\.product\s*\}\}/gi, productName)
        template = template.replace(/\{\{\s*lineItems\.qty\s*\}\}/gi, quantity.toString())
        template = template.replace(/\{\{\s*lineItems\.quantity\s*\}\}/gi, quantity.toString())
        template = template.replace(/\{\{\s*lineItems\.unitPrice\s*\}\}/gi, unitPrice.toFixed(2))
        template = template.replace(/\{\{\s*lineItems\.unit_price\s*\}\}/gi, unitPrice.toFixed(2))
        template = template.replace(/\{\{\s*lineItems\.unit_cost\s*\}\}/gi, unitPrice.toFixed(2))
        template = template.replace(/\{\{\s*lineItems\.total\s*\}\}/gi, total.toFixed(2))
        template = template.replace(/\{\{\s*lineItems\.discount\s*\}\}/gi, discountDisplay)
        template = template.replace(/\{\{\s*lineItems\.vat\s*\}\}/gi, ((item.vat || 0)).toFixed(2))
        template = template.replace(/\{\{\s*lineItems\.description\s*\}\}/gi, description)
        // Generic fallback — any other {{lineItems.<field>}} resolves straight off the item
        template = template.replace(/\{\{\s*lineItems\.([A-Za-z0-9_]+)\s*\}\}/gi, (_m, field) => {
          const v = getField(item, field)
          return v === undefined || v === null || typeof v === 'object' ? '' : String(v)
        })
        cellValue = template
      } else {
        // Fallback to field-based logic - support both old and new field names
        // For purchase invoices, use unit_cost instead of unit_price
        const quantity = getField(item, 'quantity', 'qty') || 0
        const unitPrice = getField(item, 'unit_cost', 'unit_price', 'unitPrice') || 0
        const total = getField(item, 'total') || (quantity * unitPrice) || 0

        switch (col.field) {
          case 'serial':
          case 'index':
            cellValue = (rowIndex + 1).toString()
            break
          case 'product':
            cellValue = getProductName(item.product)
            break
          case 'qty':
          case 'quantity':
            cellValue = quantity.toString()
            break
          case 'unitPrice':
          case 'unit_price':
          case 'unit_cost':
            cellValue = unitPrice.toFixed(2)
            break
          case 'total':
            cellValue = total.toFixed(2)
            break
          case 'discount':
            const discount = getField(item, 'discount') || 0
            cellValue = discount > 0 ? discount.toFixed(2) : '-'
            break
          case 'description':
            // Use product name as fallback if description is empty
            const itemDescription = getField(item, 'description') || ''
            cellValue = itemDescription || getProductName(item.product)
            break
          default:
            cellValue = '-'
        }
      }

      html += `<td style="${borderStyle} ${colWidth} padding: 8px; text-align: ${align}; background-color: ${cellBg}; word-wrap: break-word; overflow-wrap: break-word; vertical-align: top; position: relative;">${cellValue}</td>`
    })
    html += '</tr>'
  })
  html += '</tbody>'

  html += '</table>'
  return html
}

/**
 * Render a single design element to HTML
 */
function renderElement(
  element: DesignElement,
  invoiceData: InvoiceData,
  inventoryMap?: Map<string, string>
): string {
  // Check if this is a purchase invoice
  const isPurchaseInvoice = getField(invoiceData.invoice, 'supplier', 'supplier_id', 'vendor_id')
  
  // Ensure element doesn't overflow page boundaries
  const pageWidth = 794 // A4 width in pixels at 96 DPI
  const margin = 20
  const availableWidth = pageWidth - element.x - margin
  const maxWidth = element.width ? Math.min(element.width, availableWidth) : availableWidth
  
  // For table elements, keep absolute positioning but allow expansion
  const isTableElement = element.type === 'table'
  const style: Record<string, string | number> = {
    position: 'absolute',
    left: `${Math.min(element.x, pageWidth - 20)}px`,
    top: `${element.y}px`,
    width: element.width ? `${Math.min(element.width, maxWidth)}px` : `${maxWidth}px`,
    maxWidth: `${maxWidth}px`,
    height: isTableElement ? 'auto' : (element.height ? `${element.height}px` : 'auto'),
    ...(element.style?.fontSize && { fontSize: `${element.style.fontSize}px` }),
    ...(element.style?.fontFamily && { fontFamily: element.style.fontFamily }),
    ...(element.style?.fontWeight && { fontWeight: element.style.fontWeight }),
    ...(element.style?.color && { color: element.style.color }),
    ...(element.style?.backgroundColor && { backgroundColor: element.style.backgroundColor }),
    ...(element.style?.textAlign && { textAlign: element.style.textAlign }),
    ...(element.style?.borderWidth && { borderWidth: `${element.style.borderWidth}px` }),
    ...(element.style?.borderColor && { borderColor: element.style.borderColor }),
    ...(element.style?.borderStyle && { borderStyle: element.style.borderStyle }),
    ...(element.style?.padding && { padding: `${element.style.padding}px` }),
    ...(element.style?.margin && { margin: `${element.style.margin}px` }),
    ...(element.rtl && { direction: 'rtl' }),
    boxSizing: 'border-box',
    overflow: isTableElement ? 'visible' : 'hidden',
    zIndex: isTableElement ? 1 : 'auto',
  }

  const styleString = Object.entries(style)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ')

  switch (element.type) {
    case 'text':
      // Use contentEn, contentAr (if rtl), or content
      let content = element.rtl && element.contentAr
        ? element.contentAr
        : (element.contentEn || element.content || '')
      
      // For purchase invoices, replace customer labels with vendor/supplier labels
      if (isPurchaseInvoice) {
        content = content.replace(/Customer Name/gi, 'Vendor/Supplier')
        content = content.replace(/اسم العميل/gi, 'اسم المورد')
      }
      
      const replacedContent = replaceVariables(content, invoiceData)
      // Ensure text elements preserve all styling including margins and padding
      return `<div style="${styleString}; white-space: pre-wrap;">${replacedContent}</div>`

    case 'image':
      const imageSrc = element.imageData || element.imageUrl || ''
      if (!imageSrc) return ''
      // Preserve all image styling including margins and padding
      const imageStyle = styleString + (element.style?.margin ? '' : '') // Margin already in styleString
      // Ensure image doesn't overflow page
      const imageMaxWidth = element.width ? `${Math.min(element.width, maxWidth)}px` : `${maxWidth}px`
      return `<img src="${imageSrc}" alt="Logo" style="${imageStyle}; object-fit: contain; display: block; max-width: ${imageMaxWidth};" />`

    case 'table':
      if (element.tableConfig && invoiceData.lineItems) {
        const tableHtml = renderLineItemsTable(element.tableConfig, invoiceData.lineItems, inventoryMap)
        // For tables, ensure overflow is visible and height is auto
        let tableStyle = styleString
          .replace(/overflow:\s*hidden/gi, 'overflow: visible')
          .replace(/height:\s*[^;]+/gi, 'height: auto')
        // Ensure width is maintained and doesn't overflow
        const widthValue = element.width ? `${Math.min(element.width, maxWidth)}px` : `${maxWidth}px`
        // Store table width for header matching
        return `<div class="invoice-table-container" data-table-width="${widthValue}" style="${tableStyle}; width: ${widthValue}; max-width: ${widthValue}; box-sizing: border-box;">${tableHtml}</div>`
      }
      return ''

    case 'line':
      return `<div style="${styleString}; border-top: 2px solid ${element.style?.borderColor || '#000'}; height: 2px;"></div>`

    case 'rectangle':
      return `<div style="${styleString}"></div>`

    default:
      return ''
  }
}

/**
 * Render template design to HTML
 */
export function renderTemplateToHTML(
  design: TemplateDesign,
  invoiceData: InvoiceData,
  inventoryMap?: Map<string, string>
): string {
  const pageWidth = design.pageWidth || 794
  const pageHeight = design.pageHeight || 1123

  // Identify header and summary elements for print optimization
  const headerElements: DesignElement[] = []
  const summaryElements: DesignElement[] = []
  const tableElements: DesignElement[] = []
  
  design.elements.forEach(element => {
    if (element.type === 'table') {
      tableElements.push(element)
    } else if (element.y < 200) { // Header typically in top 200px
      headerElements.push(element)
    } else if (element.y > tableElements[0]?.y + 300) { // Summary typically after table
      summaryElements.push(element)
    }
  })

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        /* Screen styles */
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          overflow-x: hidden;
          background: #f5f5f5;
        }
        .invoice-page {
          width: ${pageWidth}px;
          min-height: ${pageHeight}px;
          max-width: ${pageWidth}px;
          position: relative;
          background: white;
          margin: 0 auto;
          overflow: hidden;
          box-sizing: border-box;
          padding: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        /* Print-specific styles */
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
            overflow: visible;
            width: 100%;
          }
          
          .invoice-page {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            padding: 15mm;
            overflow: visible;
            height: auto;
            min-height: auto;
            page-break-inside: avoid;
            page-break-after: auto;
            background: white;
            box-sizing: border-box;
            border: none;
          }
          
          /* Hide non-essential elements */
          .no-print {
            display: none !important;
          }
          
          /* Header section - repeat on each page */
          .invoice-header {
            position: relative;
            page-break-inside: avoid;
            page-break-after: avoid;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
            width: 100%;
            box-sizing: border-box;
          }
          
          /* Match header width to table width */
          .invoice-table-container {
            width: 100%;
            box-sizing: border-box;
          }
          
          /* Ensure header elements match table container width */
          .invoice-page > .invoice-header {
            width: 100%;
            max-width: 100%;
          }
          
          /* Table section - proper page breaks */
          .invoice-table-container {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            page-break-inside: auto;
            position: relative;
            margin: 15px 0;
          }
          
          .invoice-table-container table {
            width: 100% !important;
            border-collapse: collapse;
            page-break-inside: auto;
            border: 1px solid #d1d5db;
            border-spacing: 0;
          }
          
          /* Table header - repeat on each page */
          .invoice-table-container thead {
            display: table-header-group;
          }
          
          .invoice-table-container thead tr {
            page-break-inside: avoid;
            page-break-after: avoid;
            background-color: #f9fafb;
            border-bottom: 2px solid #d1d5db;
          }
          
          .invoice-table-container thead th {
            border: 1px solid #d1d5db;
            border-bottom: 2px solid #d1d5db;
            font-weight: 600;
          }
          
          /* Table rows - prevent breaking */
          .invoice-table-container tbody tr {
            page-break-inside: avoid;
            page-break-after: auto;
            break-inside: avoid;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .invoice-table-container tbody tr:hover {
            background-color: transparent;
          }
          
          /* Table cells - prevent breaking */
          .invoice-table-container td,
          .invoice-table-container th {
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: visible !important;
            word-wrap: break-word;
            overflow-wrap: break-word;
            border-right: 1px solid #e5e7eb;
          }
          
          .invoice-table-container td:last-child,
          .invoice-table-container th:last-child {
            border-right: none;
          }
          
          /* Summary section - keep together on last page */
          .invoice-summary {
            page-break-inside: avoid;
            page-break-before: avoid;
            margin-top: 25px;
            padding-top: 15px;
            border-top: 2px solid #d1d5db;
          }
          
          /* Footer section */
          .invoice-footer {
            page-break-inside: avoid;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          
          /* Prevent orphaned content */
          .invoice-table-container tbody tr:first-child {
            page-break-before: auto;
          }
          
          /* Ensure proper spacing */
          .invoice-table-container tbody tr:last-child {
            page-break-after: auto;
            border-bottom: 1px solid #d1d5db;
          }
          
          /* Remove screen-only borders in print */
          .invoice-page {
            border: none;
            box-shadow: none;
          }
        }
        /* Screen styles for elements */
        .invoice-page > div {
          max-width: 100%;
          box-sizing: border-box;
          position: relative;
        }
        
        .invoice-page > img {
          max-width: 100%;
          box-sizing: border-box;
        }
        
        /* Prevent elements from overflowing page boundaries */
        .invoice-page > div[style*="position: absolute"],
        .invoice-page > img[style*="position: absolute"] {
          max-width: ${pageWidth}px;
          right: auto;
        }
        
        /* Table styles */
        table {
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
          max-width: 100%;
          box-sizing: border-box;
        }
        
        .invoice-table-container {
          box-sizing: border-box;
          overflow: visible;
          height: auto;
        }
        
        .invoice-table-container table {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box;
        }
        
        .invoice-table-container td,
        .invoice-table-container th {
          overflow: visible;
          word-wrap: break-word;
          white-space: normal;
          vertical-align: top;
          padding: 8px;
        }
        
        thead {
          display: table-header-group;
        }
        
        tbody {
          display: table-row-group;
        }
      </style>
    </head>
    <body>
      <div class="invoice-page">
  `

  // Sort elements by Y position to render in order
  const sortedElements = [...design.elements].sort((a, b) => a.y - b.y)
  
  // Find table element and calculate its approximate height based on line items
  const tableElement = sortedElements.find(el => el.type === 'table')
  let tableHeight = tableElement?.height || 200 // Default to original height
  if (tableElement && invoiceData.lineItems && invoiceData.lineItems.length > 0) {
    const lineItems = invoiceData.lineItems || []
    const rowHeight = tableElement.tableConfig?.bodyRowHeight || 35
    const headerHeight = tableElement.tableConfig?.showHeader ? (tableElement.tableConfig?.headerRowHeight || 40) : 0
    const padding = 20
    // Calculate actual height needed
    tableHeight = headerHeight + (lineItems.length * rowHeight) + padding
    // Use the larger of calculated or original height
    tableHeight = Math.max(tableHeight, tableElement.height || 200)
  }
  
  // Render all elements with proper classes for print optimization
  sortedElements.forEach(element => {
    let elementHtml = renderElement(element, invoiceData, inventoryMap)
    
    // Add appropriate classes for print styling
    if (element.type === 'table') {
      // Table is already wrapped in invoice-table-container
      html += elementHtml
    } else if (headerElements.includes(element)) {
      // Wrap header elements
      elementHtml = elementHtml.replace(/<div style="/, '<div class="invoice-header" style="')
      elementHtml = elementHtml.replace(/<img style="/, '<img class="invoice-header" style="')
      html += elementHtml
    } else if (summaryElements.includes(element)) {
      // Wrap summary elements
      elementHtml = elementHtml.replace(/<div style="/, '<div class="invoice-summary" style="')
      html += elementHtml
    } else if (element.y > (tableElement?.y || 0) + 500) {
      // Footer elements
      elementHtml = elementHtml.replace(/<div style="/, '<div class="invoice-footer" style="')
      html += elementHtml
    } else {
      html += elementHtml
    }
  })

  html += `
      </div>
    </body>
    </html>
  `

  return html
}

/**
 * Print invoice using template
 */
export function printInvoiceWithTemplate(
  design: TemplateDesign,
  invoiceData: InvoiceData,
  inventoryMap?: Map<string, string>
): void {
  const html = renderTemplateToHTML(design, invoiceData, inventoryMap)
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    alert('Please allow popups to print the invoice')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }
}

export interface PrintTemplateOptions {
  isExportInvoice?: boolean
}

/**
 * Sample invoice data for template previews — shared by the editor canvas
 * and the template view pages so every preview shows identical content.
 */
export function getSampleInvoiceData(): InvoiceData {
  const customer = {
    name: 'Sample Customer LLC',
    address: 'Office 204, Business Bay, Dubai, UAE',
    phone: '+971 55 234 5678',
    email: 'accounts@samplecustomer.ae',
    trn: '100234567890003',
    emirate: 'Dubai',
    country: 'UAE',
  }
  const supplier = {
    name: 'Sample Vendor LLC',
    address: 'Warehouse 12, Al Quoz, Dubai, UAE',
    phone: '+971 55 987 6543',
    email: 'sales@samplevendor.ae',
    trn: '100987654321003',
    emirate: 'Dubai',
    country: 'UAE',
  }
  return {
    invoice: {
      invoice_number: 'INV-2025-001',
      date: '2026-01-04',
      invoice_date: '2026-01-04',
      subtotal: 3000,
      sub_total: 3000,
      discount: 50,
      vat: 147.5,
      tax: 147.5,
      total: 3097.5,
      grand_total: 3097.5,
      customer,
      supplier,
    } as any,
    customer,
    supplier,
    lineItems: [
      { slNo: 1, product: 'Sample Product 1', description: 'Sample Product 1', qty: 10, quantity: 10, unitPrice: 100, unit_price: 100, unit: 'pcs', total: 1000 },
      { slNo: 2, product: 'Sample Product 2', description: 'Sample Product 2', qty: 5, quantity: 5, unitPrice: 200, unit_price: 200, unit: 'pcs', total: 1000 },
      { slNo: 3, product: 'Sample Product 3', description: 'Sample Product 3', qty: 2, quantity: 2, unitPrice: 500, unit_price: 500, unit: 'pcs', total: 1000 },
    ] as any,
  }
}

/**
 * Render SimpleInvoiceTemplate to HTML (Tax Invoice Format)
 * Exported so the editor/view previews can render the exact same output as print.
 */
export function renderSimpleTemplateToHTML(
  template: SimpleInvoiceTemplate,
  invoiceData: InvoiceData,
  inventoryMap?: Map<string, string>,
  options?: PrintTemplateOptions
): string {
  const { invoice, customer, supplier } = invoiceData
  const isExportInvoice = !!(options?.isExportInvoice)

  // Detect document type: Delivery Order vs Purchase Invoice vs Tax Invoice vs Export Invoice
  // Delivery orders typically have serialNumber and deliveryAddress, and no invoice_number
  const isDeliveryOrder = !!(invoice as any).serialNumber || !!(invoice as any).deliveryAddress || !(invoice as any).invoice_number

  // Get customer and supplier objects
  const customerObj = typeof (invoice as any).customer === 'object' ? (invoice as any).customer :
    (typeof (invoice as any).customer_id === 'object' ? (invoice as any).customer_id : customer)
  const supplierObj = typeof (invoice as any).supplier === 'object' ? (invoice as any).supplier : supplier

  // Detect purchase invoice: has vendorName in template OR has supplier but no customer in invoiceData
  const hasVendorNameInTemplate = !!(template as any).vendorName
  const hasSupplierNoCustomer = !!supplierObj && !customerObj
  const isPurchaseInvoice = hasVendorNameInTemplate || hasSupplierNoCustomer

  const documentTitle = isExportInvoice && !isDeliveryOrder && !isPurchaseInvoice
    ? 'Export Invoice'
    : (isDeliveryOrder ? 'Delivery Order' : (isPurchaseInvoice ? 'Purchase Invoice' : 'Tax Invoice'))
  
  // Debug: Log template type detection
  console.log('🔍 Template Renderer - Invoice Type Detection:', {
    isPurchaseInvoice,
    hasVendorNameInTemplate,
    hasSupplierNoCustomer,
    hasSupplier: !!supplierObj,
    hasCustomer: !!customerObj,
    vendorNameVisible: (template as any).vendorName?.visible,
    hasConsignee: !!(template as any).consignee,
    hasCompanyName: !!(template as any).companyName,
  })

  // Replace placeholders in template values
  const replacePlaceholders = (text: string): string => {
    if (!text) return ''
    let result = text
    
    // Supplier placeholders
    if (supplierObj) {
      result = result.replace(/\{\{supplier\.name\}\}/g, supplierObj.name || '')
      result = result.replace(/\{\{supplier\.address\}\}/g, supplierObj.address || '')
      result = result.replace(/\{\{supplier\.phone\}\}/g, (supplierObj as any).phone || '')
      result = result.replace(/\{\{supplier\.email\}\}/g, (supplierObj as any).email || '')
      result = result.replace(/\{\{supplier\.trn\}\}/g, (supplierObj as any).trn || '')
      result = result.replace(/\{\{supplier\.emirate\}\}/g, (supplierObj as any).emirate || '')
    }
    
    // Customer placeholders
    if (customerObj) {
      result = result.replace(/\{\{customer\.name\}\}/g, customerObj.name || '')
      result = result.replace(/\{\{customer\.address\}\}/g, customerObj.address || '')
      result = result.replace(/\{\{customer\.phone\}\}/g, (customerObj as any).phone || '')
      result = result.replace(/\{\{customer\.email\}\}/g, (customerObj as any).email || '')
    }
    
    // Invoice placeholders
    const invoiceNumber = (invoice as any).invoice_number || (invoice as any).invoiceNumber || (invoice as any).serial_number || ''
    const invoiceDate = (invoice as any).date || (invoice as any).invoice_date || ''
    result = result.replace(/\{\{invoiceNumber\}\}/g, invoiceNumber)
    result = result.replace(/\{\{invoiceDate\}\}/g, invoiceDate ? dayjs(invoiceDate).format('DD-MMM-YY') : '')
    
    return result
  }

  // Get product name
  const getProductName = (product: string | any): string => {
    if (!product) return '-'
    if (typeof product === 'object' && product !== null) {
      return product.name || product._id || '-'
    }
    if (typeof product === 'string' && inventoryMap) {
      return inventoryMap.get(product) || product || '-'
    }
    return typeof product === 'string' ? product : '-'
  }

  // Use actual values directly from invoice data (no calculation needed)
  // For Export Invoice: subtotal and grandTotal exclude VAT
  const lineItems = invoiceData.lineItems || []
  const discountAmount = Number((invoice as any).discount || (invoice as any).discount_amount || 0)
  const vatAmount = Number((invoice as any).vat || (invoice as any).tax || (invoice as any).tax_amount || 0)
  const subtotal = isExportInvoice
    ? lineItems.reduce((sum: number, item: any) => {
        const lineTotal = Number(item.total || 0)
        const lineVat = Number(item.vat || 0)
        return sum + (lineTotal - lineVat)
      }, 0)
    : Number((invoice as any).subtotal || (invoice as any).sub_total || 0)
  const grandTotal = isExportInvoice
    ? subtotal - discountAmount
    : Number((invoice as any).total || (invoice as any).grand_total || (invoice as any).total_amount || 0)

  const borderStyle = template.borderStyle === 'full' ? 'border: 2px solid #000;' : ''
  const printBorderStyle = template.borderStyle === 'full' ? 'border: 2px solid #000;' : 'border: none;'

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${documentTitle}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: A4;
          margin: 5mm;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: ${template.fonts.body.family}, sans-serif;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .invoice-page {
          width: 200mm;
          min-height: 287mm;
          max-width: 200mm;
          background: white;
          ${borderStyle}
          margin: 0 auto;
          padding: 0;
          position: relative;
        }
        
        @media screen {
          body {
            background: #f5f5f5;
            padding: 20px;
          }
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .invoice-page {
            width: 200mm;
            min-height: 287mm;
            max-width: 200mm;
            margin: 0 auto;
            ${printBorderStyle}
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          
          @page {
            margin: 5mm;
            size: A4;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-page">
        <!-- Title -->
        <div style="text-align: center; padding: ${template.spacing.headerPadding}px 0; border-bottom: 2px solid #000; font-size: ${template.fonts.header.size}px; font-weight: bold;">
          ${documentTitle}
        </div>
        
        <!-- Main Content -->
        <div style="display: flex; min-height: 200px;">
          <!-- Left Column: Vendor Details (for purchase invoices) or Company + Customer Details (for sales invoices) -->
          <div style="width: 60%; border-right: 2px solid #000; display: flex; flex-direction: column;">
            ${isPurchaseInvoice ? (`
            <!-- PURCHASE INVOICE: Vendor Section (at top) -->
            ${(template.vendorName && template.vendorName.visible !== false) || (!template.vendorName && supplierObj) ? (`
            <div style="padding: 12px; border-bottom: 2px solid #000; font-size: ${template.fonts.body.size}px; line-height: 1.5; min-height: 160px;">
              <div style="font-weight: bold; font-size: ${template.fonts.body.size + 2}px; margin-bottom: 4px;">${template.vendorName?.label || 'Vendor Name'}</div>
              <div style="margin-bottom: 8px;">${supplierObj?.name || 'Vendor Name'}</div>
              ${(template.vendorAddress && template.vendorAddress.visible !== false) || !template.vendorAddress ? `<div style="margin-bottom: 4px;">${supplierObj?.address || 'Vendor Address'}</div>` : ''}
              ${(template.vendorEmirate && template.vendorEmirate.visible !== false) || !template.vendorEmirate ? `<div style="margin-bottom: 4px;"><strong>${template.vendorEmirate?.label || 'Vendor Emirate'}:</strong> ${(supplierObj as any)?.emirate || 'Dubai'}</div>` : ''}
              ${(template.vendorCountry && template.vendorCountry.visible !== false) || !template.vendorCountry ? `<div style="margin-bottom: 4px;"><strong>${template.vendorCountry?.label || 'Vendor Country'}:</strong> ${(supplierObj as any)?.country || 'UAE'}</div>` : ''}
              ${(template.vendorTRN && template.vendorTRN.visible !== false) || !template.vendorTRN ? `<div style="margin-bottom: 4px;"><strong>${template.vendorTRN?.label || 'Vendor TRN'}:</strong> ${(supplierObj as any)?.trn || ''}</div>` : ''}
              ${(template.vendorContact && template.vendorContact.visible !== false) || !template.vendorContact ? `<div style="margin-bottom: 4px;"><strong>${template.vendorContact?.label || 'Vendor Contact'}:</strong> ${(supplierObj as any)?.phone || ''}</div>` : ''}
              ${(template.vendorEmail && template.vendorEmail.visible !== false) || !template.vendorEmail ? `<div style="margin-bottom: 4px;"><strong>${template.vendorEmail?.label || 'Vendor E-Mail'}:</strong> ${(supplierObj as any)?.email || ''}</div>` : ''}
              ${(template.vendorPlaceOfSupply && template.vendorPlaceOfSupply.visible !== false) || !template.vendorPlaceOfSupply ? `<div><strong>${template.vendorPlaceOfSupply?.label || 'Place of supply'}:</strong> ${(supplierObj as any)?.placeOfSupply || 'UAE'}</div>` : ''}
            </div>
            `) : ''}
            
            <!-- PURCHASE INVOICE: Company Details (below vendor - items shipped to this company) -->
            ${template.companyName && template.companyName.visible !== false ? (`
            <div style="padding: 12px; font-size: ${template.fonts.body.size}px; line-height: 1.5; min-height: 160px;">
              ${template.companyName.value ? `<div style="font-weight: bold; font-size: ${template.fonts.body.size + 2}px; margin-bottom: 4px;">${replacePlaceholders(template.companyName.value) || 'Company Name'}</div>` : ''}
              ${template.companyAddress && template.companyAddress.visible !== false && template.companyAddress.value ? `<div style="margin-bottom: 4px;">${replacePlaceholders(template.companyAddress.value) || ''}</div>` : ''}
              ${template.emirate && template.emirate.visible !== false && template.emirate.value ? `<div style="margin-bottom: 4px;"><strong>${template.emirate.label}:</strong> ${replacePlaceholders(template.emirate.value) || ''}</div>` : ''}
              ${template.trn && template.trn.visible !== false && template.trn.value ? `<div style="margin-bottom: 4px;"><strong>${template.trn.label}:</strong> ${replacePlaceholders(template.trn.value) || ''}</div>` : ''}
              ${template.contact && template.contact.visible !== false && template.contact.value ? `<div style="margin-bottom: 4px;"><strong>${template.contact.label}:</strong> ${replacePlaceholders(template.contact.value) || ''}</div>` : ''}
              ${template.email && template.email.visible !== false && template.email.value ? `<div><strong>${template.email.label}:</strong> ${replacePlaceholders(template.email.value) || ''}</div>` : ''}
            </div>
            `) : ''}
            `) : (`
            <!-- SALES INVOICE: Company Details (Seller - at top) -->
            ${template.companyName?.visible ? (`
            <div style="padding: 12px; border-bottom: 2px solid #000; font-size: ${template.fonts.body.size}px; line-height: 1.5; min-height: 160px;">
              ${template.companyName.value ? `<div style="font-weight: bold; font-size: ${template.fonts.body.size + 2}px; margin-bottom: 4px;">${replacePlaceholders(template.companyName.value) || 'Company Name'}</div>` : ''}
              ${template.companyAddress?.visible && template.companyAddress.value ? `<div style="margin-bottom: 4px;">${replacePlaceholders(template.companyAddress.value) || ''}</div>` : ''}
              ${template.emirate?.visible && template.emirate.value ? `<div style="margin-bottom: 4px;"><strong>${template.emirate.label}:</strong> ${replacePlaceholders(template.emirate.value) || ''}</div>` : ''}
              ${template.trn?.visible && template.trn.value ? `<div style="margin-bottom: 4px;"><strong>${template.trn.label}:</strong> ${replacePlaceholders(template.trn.value) || ''}</div>` : ''}
              ${template.contact?.visible && template.contact.value ? `<div style="margin-bottom: 4px;"><strong>${template.contact.label}:</strong> ${replacePlaceholders(template.contact.value) || ''}</div>` : ''}
              ${template.email?.visible && template.email.value ? `<div><strong>${template.email.label}:</strong> ${replacePlaceholders(template.email.value) || ''}</div>` : ''}
            </div>
            `) : ''}
            
            <!-- SALES INVOICE: Customer Section (Buyer - below company) -->
            ${template.consignee?.visible ? (`
            <div style="padding: 12px; border-bottom: ${template.buyer?.visible ? '1px solid #000' : '2px solid #000'}; font-size: ${template.fonts.body.size}px; min-height: 60px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${template.consignee.label}</div>
              <div>${customerObj?.name || ''}</div>
            </div>
            `) : ''}
            ${template.buyer?.visible ? (`
            <div style="padding: 12px; font-size: ${template.fonts.body.size}px; line-height: 1.5; flex: 1;">
              <div style="font-weight: bold; margin-bottom: 4px;">${template.buyer.label}</div>
              <div>${customerObj?.name || ''}</div>
              <div style="margin-top: 8px;">
                ${template.customerEmirate?.visible ? `<div><strong>${template.customerEmirate.label}:</strong> ${(customerObj as any)?.emirate || 'Dubai'}</div>` : ''}
                ${template.customerCountry?.visible ? `<div><strong>${template.customerCountry.label}:</strong> ${(customerObj as any)?.country || 'UAE'}</div>` : ''}
                ${template.placeOfSupply?.visible ? `<div><strong>${template.placeOfSupply.label}:</strong> ${(customerObj as any)?.placeOfSupply || 'UAE'}</div>` : ''}
              </div>
            </div>
            `) : ''}
            `)}
          </div>
          
          <!-- Right Column: Invoice Metadata -->
          <div style="width: 40%; display: flex; flex-direction: column;">
            <!-- Invoice No & Date -->
            <div style="border-bottom: 2px solid #000;">
              <div style="display: flex; border-bottom: 1px solid #000;">
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold; border-right: 1px solid #000;">${template.invoiceNumber.label}</div>
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold;">${template.invoiceDate.label}</div>
              </div>
              <div style="display: flex; border-bottom: 1px solid #000;">
                <div style="flex: 1; padding: 8px; font-size: 10px; border-right: 1px solid #000;">${replacePlaceholders('{{invoiceNumber}}')}</div>
                <div style="flex: 1; padding: 8px; font-size: 10px;">${replacePlaceholders('{{invoiceDate}}')}</div>
              </div>
              <div style="display: flex; border-bottom: 1px solid #000;">
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold; border-right: 1px solid #000;">${template.deliveryNote.label}</div>
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold;">${template.paymentTerms.label}</div>
              </div>
              <div style="display: flex;">
                <div style="flex: 1; padding: 8px; font-size: 10px; border-right: 1px solid #000; min-height: 35px;"></div>
                <div style="flex: 1; padding: 8px; font-size: 10px;"></div>
              </div>
            </div>
            
            <!-- Supplier Ref & Other Ref -->
            <div style="border-bottom: 2px solid #000;">
              <div style="display: flex; border-bottom: 1px solid #000;">
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold; border-right: 1px solid #000;">${template.supplierRef.label}</div>
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold;">${template.otherRef.label}</div>
              </div>
              <div style="display: flex; border-bottom: 1px solid #000;">
                <div style="flex: 1; padding: 8px; font-size: 10px; border-right: 1px solid #000; min-height: 35px;"></div>
                <div style="flex: 1; padding: 8px; font-size: 10px;"></div>
              </div>
              <div style="display: flex; border-bottom: 1px solid #000;">
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold; border-right: 1px solid #000;">${template.buyerOrderNo.label}</div>
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold;">${template.buyerOrderDate.label}</div>
              </div>
              <div style="display: flex;">
                <div style="flex: 1; padding: 8px; font-size: 10px; border-right: 1px solid #000; min-height: 35px;"></div>
                <div style="flex: 1; padding: 8px; font-size: 10px;"></div>
              </div>
            </div>
            
            <!-- Despatch & Delivery -->
            <div style="border-bottom: 2px solid #000;">
              <div style="display: flex; border-bottom: 1px solid #000;">
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold; border-right: 1px solid #000;">${template.despatchDocNo.label}</div>
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold;">${template.deliveryNoteDate.label}</div>
              </div>
              <div style="display: flex; border-bottom: 1px solid #000;">
                <div style="flex: 1; padding: 8px; font-size: 10px; border-right: 1px solid #000; min-height: 35px;"></div>
                <div style="flex: 1; padding: 8px; font-size: 10px;"></div>
              </div>
              <div style="display: flex; border-bottom: 1px solid #000;">
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold; border-right: 1px solid #000;">${template.despatchedThrough.label}</div>
                <div style="flex: 1; padding: 8px; font-size: 9px; font-weight: bold;">${template.destination.label}</div>
              </div>
              <div style="display: flex;">
                <div style="flex: 1; padding: 8px; font-size: 10px; border-right: 1px solid #000; min-height: 35px;"></div>
                <div style="flex: 1; padding: 8px; font-size: 10px;"></div>
              </div>
            </div>
            
            ${template.termsOfDelivery.visible ? `
            <div style="flex: 1; padding: 12px; font-size: 9px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${template.termsOfDelivery.label}</div>
            </div>` : ''}
          </div>
        </div>
        
        <!-- Items Table -->
        <div style="border-top: 2px solid #000;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                ${template.lineItems.columns.filter(col => col.visible && (!isExportInvoice || col.mappedField !== 'vat')).map(col => `
                  <th style="border: 1px solid #000; padding: 8px; font-size: ${template.lineItems.rowStyle.fontSize}px; font-weight: bold; text-align: ${col.align}; width: ${col.width ? col.width + 'px' : 'auto'};">
                    ${col.label.replace(/\n/g, '<br/>')}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${invoiceData.lineItems && invoiceData.lineItems.length > 0 ? invoiceData.lineItems.map((item: any, idx: number) => {
                const visibleCols = template.lineItems.columns.filter(col => col.visible && (!isExportInvoice || col.mappedField !== 'vat'))
                return `
                <tr>
                  ${visibleCols.map(col => {
                    let value = ''
                    if (col.mappedField === 'slNo') value = String(idx + 1)
                    else if (col.mappedField === 'description' || col.mappedField === 'product') value = getProductName(item.product) || item.description || ''
                    else if (col.mappedField === 'quantity' || col.mappedField === 'qty') value = String(item.quantity || item.qty || '')
                    else if (col.mappedField === 'unitPrice' || col.mappedField === 'unit_price') value = item.unitPrice ? Number(item.unitPrice).toFixed(2) : (item.unit_price ? Number(item.unit_price).toFixed(2) : '')
                    else if (col.mappedField === 'total') {
                      const lineTotal = Number(item.total || 0)
                      const lineVat = Number(item.vat || 0)
                      value = isExportInvoice ? (lineTotal - lineVat).toFixed(2) : (item.total ? Number(item.total).toFixed(2) : '')
                    } else if (col.mappedField === 'vat' && !isExportInvoice) value = item.vat ? Number(item.vat).toFixed(2) : ''
                    else if (col.mappedField !== 'vat') value = item[col.mappedField] || ''
                    return `<td style="border: 1px solid #000; padding: 6px; font-size: ${template.lineItems.rowStyle.fontSize}px; text-align: ${col.align}; height: 30px;">${value}</td>`
                  }).join('')}
                </tr>
              `}).join('') : Array.from({length: 10}, () => `
                <tr>
                  ${template.lineItems.columns.filter(col => col.visible && (!isExportInvoice || col.mappedField !== 'vat')).map(() => 
                    `<td style="border: 1px solid #000; padding: 6px; font-size: ${template.lineItems.rowStyle.fontSize}px; height: 30px;"></td>`
                  ).join('')}
                </tr>
              `).join('')}
              ${!isDeliveryOrder ? `
              <!-- Subtotal Row -->
              <tr>
                <td colspan="${template.lineItems.columns.filter(col => col.visible && (!isExportInvoice || col.mappedField !== 'vat')).length - 1}" style="border: 1px solid #000; padding: 8px; font-size: ${template.lineItems.rowStyle.fontSize}px; text-align: right;">Subtotal:</td>
                <td style="border: 1px solid #000; padding: 8px; font-size: ${template.lineItems.rowStyle.fontSize}px; text-align: right;">${subtotal.toFixed(2)}</td>
              </tr>
              <!-- Discount Row -->
              ${discountAmount > 0 ? `
              <tr>
                <td colspan="${template.lineItems.columns.filter(col => col.visible && (!isExportInvoice || col.mappedField !== 'vat')).length - 1}" style="border: 1px solid #000; padding: 8px; font-size: ${template.lineItems.rowStyle.fontSize}px; text-align: right; color: #dc2626;">Discount:</td>
                <td style="border: 1px solid #000; padding: 8px; font-size: ${template.lineItems.rowStyle.fontSize}px; text-align: right; color: #dc2626;">- ${discountAmount.toFixed(2)}</td>
              </tr>
              ` : ''}
              ${!isExportInvoice ? `<!-- Tax (VAT) Row -->
              <tr>
                <td colspan="${template.lineItems.columns.filter(col => col.visible).length - 1}" style="border: 1px solid #000; padding: 8px; font-size: ${template.lineItems.rowStyle.fontSize}px; text-align: right; color: #059669;">Tax (VAT):</td>
                <td style="border: 1px solid #000; padding: 8px; font-size: ${template.lineItems.rowStyle.fontSize}px; text-align: right; color: #059669;">+ ${vatAmount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <!-- Grand Total Row -->
              <tr>
                <td colspan="${template.lineItems.columns.filter(col => col.visible && (!isExportInvoice || col.mappedField !== 'vat')).length - 1}" style="border: 1px solid #000; padding: 8px; font-size: ${template.lineItems.rowStyle.fontSize + 1}px; font-weight: bold; text-align: right; background-color: #f3f4f6;">Total Amount:</td>
                <td style="border: 1px solid #000; padding: 8px; font-size: ${template.lineItems.rowStyle.fontSize + 1}px; text-align: right; font-weight: bold; background-color: #f3f4f6; color: #059669;">${grandTotal.toFixed(2)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
        
        <!-- Footer -->
        <div style="display: flex; border-top: 2px solid #000; min-height: 120px;">
          ${template.declaration.visible ? `
          <div style="flex: 1; padding: ${template.spacing.footerPadding}px; border-right: 2px solid #000; font-size: ${template.fonts.footer.size}px;">
            <div style="font-weight: bold; margin-bottom: 6px;">${template.declaration.label}</div>
            <div style="line-height: 1.4;">${template.declaration.content}</div>
          </div>` : ''}
          
          ${template.authorizedSignatory.visible ? `
          <div style="width: 40%; padding: ${template.spacing.footerPadding}px; font-size: ${template.fonts.footer.size}px; display: flex; flex-direction: column; justify-content: flex-end;">
            <div style="text-align: right; margin-top: auto;">
              <div style="margin-bottom: 4px;">${replacePlaceholders(template.authorizedSignatory.content)}</div>
              <div style="font-weight: bold;">${template.authorizedSignatory.label}</div>
            </div>
          </div>` : ''}
        </div>
        
        <div style="text-align: right; padding: 8px 12px; font-size: 8px; font-style: italic; border-top: 1px solid #000;">E. & O.E</div>
        
        ${template.computerGenerated.visible ? `
        <div style="text-align: center; padding: 8px; font-size: ${template.fonts.footer.size}px; border-top: 1px solid #000;">
          ${template.computerGenerated.content}
        </div>` : ''}
      </div>
    </body>
    </html>
  `
  return html
}

/**
 * Print invoice using SimpleInvoiceTemplate
 */
export function printSimpleInvoiceTemplate(
  template: SimpleInvoiceTemplate,
  invoiceData: InvoiceData,
  inventoryMap?: Map<string, string>,
  options?: PrintTemplateOptions
): void {
  // Detect document type: Delivery Order vs Purchase Invoice vs Tax Invoice vs Export Invoice
  const { invoice, customer, supplier } = invoiceData
  const isExportInvoice = !!(options?.isExportInvoice)
  const isDeliveryOrder = !!(invoice as any).serialNumber || !!(invoice as any).deliveryAddress || !(invoice as any).invoice_number
  const customerObj = typeof (invoice as any).customer === 'object' ? (invoice as any).customer :
    (typeof (invoice as any).customer_id === 'object' ? (invoice as any).customer_id : customer)
  const supplierObj = typeof (invoice as any).supplier === 'object' ? (invoice as any).supplier : supplier
  const hasVendorNameInTemplate = !!(template as any).vendorName
  const hasSupplierNoCustomer = !!supplierObj && !customerObj
  const isPurchaseInvoice = hasVendorNameInTemplate || hasSupplierNoCustomer
  const documentTitle = isExportInvoice && !isDeliveryOrder && !isPurchaseInvoice
    ? 'Export Invoice'
    : (isDeliveryOrder ? 'Delivery Order' : (isPurchaseInvoice ? 'Purchase Invoice' : 'Tax Invoice'))

  const html = renderSimpleTemplateToHTML(template, invoiceData, inventoryMap, options)
  const printWindow = window.open('', '_blank', 'width=800,height=600')

  if (!printWindow) {
    alert('Please allow popups to print the invoice')
    return
  }

  // Write HTML and close document
  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    // Remove any browser UI elements that might interfere
    printWindow.document.title = documentTitle
    
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      // Close window after print dialog is closed
      setTimeout(() => {
        printWindow.close()
      }, 100)
    }, 500)
  }
  
  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (printWindow.document.readyState === 'complete') {
      printWindow.focus()
      printWindow.print()
      setTimeout(() => {
        printWindow.close()
      }, 100)
    }
  }, 1000)
}

/**
 * Generate PDF from template (using jsPDF)
 */
export async function generatePDFFromTemplate(
  design: TemplateDesign,
  invoiceData: InvoiceData,
  inventoryMap?: Map<string, string>
): Promise<void> {
  // For now, we'll use the HTML rendering and convert to PDF
  // In a production environment, you might want to use a headless browser or server-side PDF generation
  const html = renderTemplateToHTML(design, invoiceData, inventoryMap)

  // Create a hidden iframe to render HTML
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  iframe.contentDocument?.write(html)
  iframe.contentDocument?.close()

  // Wait for content to load, then print (which allows PDF save)
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 500)
}

