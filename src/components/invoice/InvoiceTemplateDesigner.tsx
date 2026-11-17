import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { 
  Type, 
  Image as ImageIcon, 
  Table, 
  Minus, 
  Square, 
  Trash2, 
  Copy, 
  Eye,
  Save,
  X,
  Plus,
  Lock,
  Unlock,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { renderTemplateToHTML, getSampleInvoiceData } from '@/utils/templateRenderer'
import InvoicePreviewFrame from './InvoicePreviewFrame'

export type DesignElement = {
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
  locked?: boolean
  style?: {
    fontSize?: number
    fontFamily?: string
    fontWeight?: 'normal' | 'bold' | 'italic'
    color?: string
    backgroundColor?: string
    textAlign?: 'left' | 'center' | 'right'
    borderWidth?: number
    borderColor?: string
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | 'none'
    padding?: number
    margin?: number
    opacity?: number
    borderRadius?: number
    lineHeight?: number
    letterSpacing?: number
  }
  imageUrl?: string
  imageData?: string
  tableConfig?: {
    columns: Array<{
      field: string
      label: string
      width?: number
      align?: 'left' | 'center' | 'right'
      dataTemplate?: string // Template for cell data, can contain reference variables
      backgroundColor?: string // Background color for this column
    }>
    showHeader?: boolean
    showBorders?: boolean
    headerRowHeight?: number // Height for header row
    headerRowBackgroundColor?: string // Background color for header row
    bodyRowHeight?: number // Height for body rows
    bodyRowBackgroundColor?: string // Background color for body rows
    alternateRowBackgroundColor?: string // Background color for alternating rows (optional)
  }
}

interface InvoiceTemplateDesignerProps {
  initialDesign?: {
    pageWidth?: number
    pageHeight?: number
    elements: DesignElement[]
  }
  onSave: (design: { pageWidth: number; pageHeight: number; elements: DesignElement[] }) => void
  onCancel: () => void
  onDesignChange?: (design: { pageWidth: number; pageHeight: number; elements: DesignElement[] }) => void
}

// Starter layout seeded onto a blank canvas — a professional Tally-style
// invoice skeleton users can rearrange. Placeholders resolve at print time.
const STARTER_ELEMENTS: DesignElement[] = [
  {
    id: 'el-title', type: 'text', x: 247, y: 20, width: 300, height: 34,
    content: 'TAX INVOICE',
    style: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  },
  { id: 'el-logo', type: 'image', x: 30, y: 20, width: 110, height: 60 },
  {
    id: 'el-company', type: 'text', x: 30, y: 95, width: 360,
    content: 'YOUR COMPANY NAME\nYour Company Address, City, UAE\nTRN: {{trn}}',
    style: { fontSize: 11, lineHeight: 1.6 },
  },
  {
    id: 'el-meta', type: 'text', x: 560, y: 95, width: 200,
    content: 'Invoice No: {{invoiceNumber}}\nDate: {{date}}',
    style: { fontSize: 11, lineHeight: 1.6, textAlign: 'right' },
  },
  {
    id: 'el-customer', type: 'text', x: 30, y: 175, width: 400,
    content: 'BILL TO\n{{customer.name}}\n{{customer.address}}\nTRN: {{customer.trn}}',
    style: { fontSize: 11, lineHeight: 1.6 },
  },
  { id: 'el-sep1', type: 'line', x: 20, y: 255, width: 754, height: 2, style: { borderColor: '#000000' } },
  {
    id: 'el-items', type: 'table', x: 30, y: 275, width: 734, height: 400,
    tableConfig: {
      columns: [
        { field: 'slNo', label: 'Sl', width: 40, align: 'center', dataTemplate: '{{lineItems.slNo}}' },
        { field: 'product', label: 'Description of Goods', align: 'left', dataTemplate: '{{lineItems.product}}' },
        { field: 'qty', label: 'Qty', width: 60, align: 'center', dataTemplate: '{{lineItems.qty}}' },
        { field: 'unitPrice', label: 'Rate', width: 80, align: 'right', dataTemplate: '{{lineItems.unitPrice}}' },
        { field: 'total', label: 'Amount', width: 100, align: 'right', dataTemplate: '{{lineItems.total}}' },
      ],
      showHeader: true,
      showBorders: true,
      headerRowHeight: 36,
      headerRowBackgroundColor: '#f3f4f6',
      bodyRowHeight: 32,
      bodyRowBackgroundColor: '#ffffff',
    },
  },
  {
    id: 'el-totals', type: 'text', x: 500, y: 695, width: 260,
    content: 'Subtotal:  {{subtotal}}\nDiscount:  {{discount}}\nVAT (5%):  {{vat}}\nTotal:  {{total}}',
    style: { fontSize: 12, lineHeight: 1.8, textAlign: 'right' },
  },
  { id: 'el-sep2', type: 'line', x: 20, y: 960, width: 754, height: 2, style: { borderColor: '#000000' } },
  {
    id: 'el-footer', type: 'text', x: 30, y: 980, width: 500,
    content: 'Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    style: { fontSize: 9, lineHeight: 1.5 },
  },
  {
    id: 'el-signatory', type: 'text', x: 560, y: 980, width: 200,
    content: 'Authorised Signatory',
    style: { fontSize: 10, fontWeight: 'bold', textAlign: 'right' },
  },
]

// Sample line items for the on-canvas table preview
const SAMPLE_ROWS = (getSampleInvoiceData().lineItems || []).slice(0, 2) as any[]

// Resolve {{lineItems.field}} tokens against a sample row
function resolveLineItemToken(template: string | undefined, item: any): string {
  if (!template) return ''
  return template.replace(/\{\{\s*lineItems\.(\w+)\s*\}\}/g, (_m, field) => {
    const v = item?.[field]
    return v === undefined || v === null ? '' : String(v)
  })
}

const AVAILABLE_VARIABLES = [
  { label: 'Invoice Number', value: '{{invoiceNumber}}' },
  { label: 'Serial Number', value: '{{serialNumber}}' },
  { label: 'Date', value: '{{date}}' },
  { label: 'Customer Name', value: '{{customer.name}}' },
  { label: 'Customer Email', value: '{{customer.email}}' },
  { label: 'Customer Phone', value: '{{customer.phone}}' },
  { label: 'Customer Address', value: '{{customer.address}}' },
  { label: 'Customer TRN', value: '{{customer.trn}}' },
  { label: 'Delivery Address', value: '{{deliveryAddress}}' },
  { label: 'Payment Method', value: '{{paymentMethod}}' },
  { label: 'Status', value: '{{status}}' },
  { label: 'TRN', value: '{{trn}}' },
  { label: 'Subtotal', value: '{{subtotal}}' },
  { label: 'Discount', value: '{{discount}}' },
  { label: 'VAT', value: '{{vat}}' },
  { label: 'Total', value: '{{total}}' },
  { label: 'Line Items Table', value: '{{lineItems}}' },
]

const LINE_ITEM_VARIABLES = [
  { label: 'Line Item - Product', value: '{{lineItems.product}}' },
  { label: 'Line Item - Quantity', value: '{{lineItems.qty}}' },
  { label: 'Line Item - Unit Price', value: '{{lineItems.unitPrice}}' },
  { label: 'Line Item - Total', value: '{{lineItems.total}}' },
  { label: 'Line Item - Discount', value: '{{lineItems.discount}}' },
  { label: 'Line Item - VAT', value: '{{lineItems.vat}}' },
]

export default function InvoiceTemplateDesigner({ 
  initialDesign, 
  onSave, 
  onCancel,
  onDesignChange,
}: InvoiceTemplateDesignerProps) {
  const [pageWidth] = useState(794) // A4 width in pixels
  const [pageHeight] = useState(1123) // A4 height in pixels
  const [elements, setElements] = useState<DesignElement[]>(
    () => (initialDesign?.elements && initialDesign.elements.length > 0)
      ? initialDesign.elements
      : STARTER_ELEMENTS
  )
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [showLayers, setShowLayers] = useState(true)

  // Elements are initialized once from initialDesign (or the starter layout).
  // No live re-sync: elements flow OUT via onDesignChange only — this keeps
  // data flowing one direction and prevents render loops.

  const selectedElement = elements.find(el => el.id === selectedElementId)

  // Keep parent in sync so the outer form saves the latest design.
  // Debounced: dragging fires dozens of element updates per second and the
  // parent modal + form would re-render on every one.
  const designChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!onDesignChange) return
    designChangeTimer.current = setTimeout(() => {
      onDesignChange({ pageWidth, pageHeight, elements })
    }, 150)
    return () => {
      if (designChangeTimer.current) clearTimeout(designChangeTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements])

  // True WYSIWYG preview — generated by the SAME renderer used for printing.
  // Only computed while preview is open (string gen per drag-frame is wasteful).
  const previewHtml = useMemo(
    () => previewMode
      ? renderTemplateToHTML({ pageWidth, pageHeight, elements } as any, getSampleInvoiceData())
      : '',
    [elements, pageWidth, pageHeight, previewMode]
  )

  const generateId = () => `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const addElement = (type: DesignElement['type']) => {
    const newElement: DesignElement = {
      id: generateId(),
      type,
      x: 50,
      y: 50,
      width: type === 'text' ? 200 : type === 'image' ? 100 : type === 'table' ? 600 : 100,
      height: type === 'text' ? 30 : type === 'image' ? 100 : type === 'table' ? 200 : 2,
      content: type === 'text' ? 'Text Element' : '',
      locked: false,
      style: {
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#000000',
        textAlign: 'left',
      },
      ...(type === 'table' && {
        tableConfig: {
          columns: [
            { field: 'product', label: 'Product', align: 'left', dataTemplate: '{{lineItems.product}}' },
            { field: 'qty', label: 'Qty', align: 'center', dataTemplate: '{{lineItems.qty}}' },
            { field: 'unitPrice', label: 'Unit Price', align: 'right', dataTemplate: '{{lineItems.unitPrice}}' },
            { field: 'total', label: 'Total', align: 'right', dataTemplate: '{{lineItems.total}}' },
          ],
          showHeader: true,
          showBorders: true,
          headerRowHeight: 40,
          headerRowBackgroundColor: '#f3f4f6',
          bodyRowHeight: 35,
          bodyRowBackgroundColor: '#ffffff',
        },
      }),
    }
    setElements([...elements, newElement])
    setSelectedElementId(newElement.id)
  }

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id))
    if (selectedElementId === id) {
      setSelectedElementId(null)
    }
  }

  const duplicateElement = (id: string) => {
    const element = elements.find(el => el.id === id)
    if (element) {
      const newElement = {
        ...element,
        id: generateId(),
        x: element.x + 20,
        y: element.y + 20,
        locked: false, // Duplicated elements are unlocked by default
      }
      setElements([...elements, newElement])
      setSelectedElementId(newElement.id)
    }
  }

  const toggleLock = (id: string) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, locked: !el.locked } : el
    ))
  }

  const getElementName = (element: DesignElement): string => {
    if (element.type === 'text') {
      return element.contentEn || element.content || 'Text Element'
    } else if (element.type === 'image') {
      return 'Image'
    } else if (element.type === 'table') {
      return 'Table'
    } else if (element.type === 'line') {
      return 'Line'
    } else if (element.type === 'rectangle') {
      return 'Rectangle'
    }
    return 'Element'
  }

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    const element = elements.find(el => el.id === elementId)
    if (element?.locked) return // Prevent dragging locked elements
    setSelectedElementId(elementId)
    if (element && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - rect.left - element.x,
        y: e.clientY - rect.top - element.y,
      })
    }
  }

  const handleResizeStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    e.preventDefault()
    const element = elements.find(el => el.id === elementId)
    if (!element || element.locked) return
    setSelectedElementId(elementId)
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: element.width || 50,
      h: element.height || 30,
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Resize mode — SE corner handle
    if (isResizing && selectedElementId) {
      const dw = e.clientX - resizeStart.x
      const dh = e.clientY - resizeStart.y
      setElements((prev) => prev.map(el =>
        el.id === selectedElementId
          ? { ...el, width: Math.max(20, Math.round(resizeStart.w + dw)), height: Math.max(10, Math.round(resizeStart.h + dh)) }
          : el
      ))
      return
    }

    if (!isDragging || !selectedElementId) return
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - dragOffset.x
      const y = e.clientY - rect.top - dragOffset.y
      
      // Use functional update to ensure we're working with the latest state
      setElements((prev) => {
        const element = prev.find(el => el.id === selectedElementId)
        if (!element) return prev
        
        return prev.map(el => 
          el.id === selectedElementId 
            ? { ...el, x: Math.max(0, Math.min(x, pageWidth - (el.width || 0))), y: Math.max(0, Math.min(y, pageHeight - (el.height || 0))) }
            : el
        )
      })
    }
  }, [isDragging, isResizing, selectedElementId, dragOffset, resizeStart, pageWidth, pageHeight])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el))
  }

  const insertVariable = (variable: string) => {
    if (selectedElement && selectedElement.type === 'text') {
      const currentContent = selectedElement.content || ''
      updateElement(selectedElement.id, {
        content: currentContent + variable,
      })
    }
  }

  const renderElement = (element: DesignElement) => {
    const isSelected = element.id === selectedElementId && !isDragging
    const isLocked = element.locked || false
    const style: Record<string, string | number> = {
      position: 'absolute',
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: element.width ? `${element.width}px` : 'auto',
      height: element.height ? `${element.height}px` : 'auto',
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
      ...(element.style?.opacity !== undefined && { opacity: element.style.opacity }),
      ...(element.style?.borderRadius && { borderRadius: `${element.style.borderRadius}px` }),
      ...(element.style?.lineHeight && { lineHeight: element.style.lineHeight }),
      ...(element.style?.letterSpacing && { letterSpacing: `${element.style.letterSpacing}px` }),
      ...(element.rtl && { direction: 'rtl' }),
      cursor: isLocked ? 'not-allowed' : 'move',
      userSelect: 'none',
      border: isSelected ? '2px dashed #3b82f6' : 'none',
      outline: isSelected ? '2px solid #3b82f6' : 'none',
      outlineOffset: '-2px',
      opacity: isLocked ? 0.7 : (element.style?.opacity !== undefined ? element.style.opacity : 1),
    }

    switch (element.type) {
      case 'text':
        return (
          <div
            key={element.id}
            style={style}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={(e) => {
              {
                e.stopPropagation()
                setSelectedElementId(element.id)
              }
            }}
          >
            {element.content || 'Text Element'}
          </div>
        )
      case 'image':
        return (
          <div
            key={element.id}
            style={style}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={(e) => {
              {
                e.stopPropagation()
                setSelectedElementId(element.id)
              }
            }}
          >
            {element.imageData || element.imageUrl ? (
              <img 
                src={element.imageData || element.imageUrl} 
                alt="Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full border-2 border-dashed border-border bg-muted/50">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        )
      case 'table':
        return (
          <div
            key={element.id}
            style={style}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={(e) => {
              {
                e.stopPropagation()
                setSelectedElementId(element.id)
              }
            }}
          >
            {element.tableConfig && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {element.tableConfig.showHeader && (
                  <thead>
                    <tr style={{
                      height: element.tableConfig.headerRowHeight ? `${element.tableConfig.headerRowHeight}px` : '40px',
                      backgroundColor: element.tableConfig.headerRowBackgroundColor || '#f3f4f6'
                    }}>
                      {element.tableConfig.columns.map((col, idx) => (
                        <th
                          key={idx}
                          style={{
                            border: element.tableConfig?.showBorders ? '1px solid #000' : 'none',
                            padding: '8px',
                            textAlign: col.align || 'left',
                            backgroundColor: col.backgroundColor || (element.tableConfig?.headerRowBackgroundColor || '#f3f4f6'),
                            width: col.width ? `${col.width}px` : 'auto',
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {/* Sample rows — resolves {{lineItems.*}} tokens against preview data */}
                  {SAMPLE_ROWS.map((item, rowIdx) => (
                    <tr key={rowIdx} style={{
                      height: element.tableConfig?.bodyRowHeight ? `${element.tableConfig.bodyRowHeight}px` : '35px',
                      backgroundColor: (element.tableConfig?.alternateRowBackgroundColor && rowIdx % 2 === 1)
                        ? element.tableConfig.alternateRowBackgroundColor
                        : (element.tableConfig?.bodyRowBackgroundColor || '#ffffff'),
                    }}>
                      {element.tableConfig!.columns.map((col, ci) => (
                        <td
                          key={ci}
                          style={{
                            border: element.tableConfig?.showBorders ? '1px solid #ddd' : 'none',
                            padding: '8px',
                            textAlign: col.align || 'left',
                            backgroundColor: col.backgroundColor,
                            width: col.width ? `${col.width}px` : 'auto',
                          }}
                        >
                          {resolveLineItemToken(col.dataTemplate, item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{
                    height: element.tableConfig.bodyRowHeight ? `${element.tableConfig.bodyRowHeight}px` : '35px',
                    backgroundColor: element.tableConfig.bodyRowBackgroundColor || '#ffffff'
                  }}>
                    <td
                      colSpan={element.tableConfig!.columns.length}
                      style={{
                        border: element.tableConfig?.showBorders ? '1px solid #ddd' : 'none',
                        padding: '6px',
                        textAlign: 'center',
                        color: '#9ca3af',
                        fontStyle: 'italic',
                        fontSize: '10px',
                      }}
                    >
                      ⋮ all invoice line items render here at print time
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )
      case 'line':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              borderTop: `2px solid ${element.style?.borderColor || '#000'}`,
              height: '2px',
            }}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={(e) => {
              {
                e.stopPropagation()
                setSelectedElementId(element.id)
              }
            }}
          />
        )
      case 'rectangle':
        return (
          <div
            key={element.id}
            style={style}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={(e) => {
              {
                e.stopPropagation()
                setSelectedElementId(element.id)
              }
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-border p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addElement('text')
              }}
              className="border-border hover:bg-muted/50"
            >
              <Type className="h-4 w-4 mr-2" />
              Add Text
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addElement('image')
              }}
              className="border-border hover:bg-muted/50"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Add Image
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addElement('table')
              }}
              className="border-border hover:bg-muted/50"
            >
              <Table className="h-4 w-4 mr-2" />
              Add Table
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addElement('line')
              }}
              className="border-border hover:bg-muted/50"
            >
              <Minus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addElement('rectangle')
              }}
              className="border-border hover:bg-muted/50"
            >
              <Square className="h-4 w-4 mr-2" />
              Add Rectangle
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {!showLayers && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowLayers(true)
                }}
                className="border-border hover:bg-muted/50"
              >
                <Layers className="h-4 w-4 mr-2" />
                Layers
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setPreviewMode(!previewMode)
              }}
              className={cn(
                "border-border hover:bg-muted/50",
                previewMode && "bg-primary/10 border-primary"
              )}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Hide Preview' : 'Live Preview'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCancel()
              }}
              className="border-border hover:bg-muted/50"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSave({ pageWidth, pageHeight, elements })
              }}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Design
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Layers Panel */}
        {showLayers && (
          <div className="w-64 border-r border-border bg-card overflow-y-auto">
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Layers</h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowLayers(false)
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-2">
              {elements.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No elements yet
                </div>
              ) : (
                <div className="space-y-1">
                  {[...elements].reverse().map((element) => (
                    <div
                      key={element.id}
                      onClick={() => !element.locked && setSelectedElementId(element.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                        selectedElementId === element.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50",
                        element.locked && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {element.type === 'text' && <Type className="h-4 w-4 text-muted-foreground" />}
                          {element.type === 'image' && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                          {element.type === 'table' && <Table className="h-4 w-4 text-muted-foreground" />}
                          {element.type === 'line' && <Minus className="h-4 w-4 text-muted-foreground" />}
                          {element.type === 'rectangle' && <Square className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <span className="text-sm text-foreground truncate flex-1">
                          {getElementName(element)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleLock(element.id)
                        }}
                        className="h-7 w-7 p-0 flex-shrink-0"
                      >
                        {element.locked ? (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Properties Panel */}
        {selectedElement && !isDragging && (
          <div className="w-80 border-r border-border bg-card overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Properties</h3>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleLock(selectedElement.id)
                    }}
                    className={cn(
                      "h-8 w-8 p-0",
                      selectedElement.locked && "text-primary"
                    )}
                    title={selectedElement.locked ? "Unlock" : "Lock"}
                  >
                    {selectedElement.locked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      duplicateElement(selectedElement.id)
                    }}
                    className="h-8 w-8 p-0"
                    disabled={selectedElement.locked}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteElement(selectedElement.id)
                    }}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    disabled={selectedElement.locked}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  {selectedElement.type === 'text' && (
                    <>
                      <div>
                        <Label>Text Content (English)</Label>
                        <Input
                          value={selectedElement.contentEn || selectedElement.content || ''}
                          onChange={(e) => updateElement(selectedElement.id, { contentEn: e.target.value, content: e.target.value })}
                          placeholder="Enter text or use variables"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Text Content (Arabic)</Label>
                        <Input
                          value={selectedElement.contentAr || ''}
                          onChange={(e) => updateElement(selectedElement.id, { contentAr: e.target.value })}
                          placeholder="Enter Arabic text"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Reference Variables</Label>
                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                          {AVAILABLE_VARIABLES.map((variable) => (
                            <Button
                              key={variable.value}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                insertVariable(variable.value)
                              }}
                              className="w-full text-left justify-start text-xs"
                            >
                              {variable.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedElement.type === 'image' && (
                    <div>
                      <Label>Upload Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              updateElement(selectedElement.id, { imageData: reader.result as string })
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="mt-1"
                      />
                    </div>
                  )}

                  {selectedElement.type === 'table' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Table Columns</Label>
                        <div className="mt-2 space-y-3">
                          {selectedElement.tableConfig?.columns.map((col, idx) => (
                            <div key={idx} className="space-y-2 p-3 border border-border rounded-md">
                              <div className="flex gap-2">
                                <Input
                                  value={col.label}
                                  onChange={(e) => {
                                    const newColumns = [...(selectedElement.tableConfig?.columns || [])]
                                    newColumns[idx].label = e.target.value
                                    updateElement(selectedElement.id, {
                                      tableConfig: { ...selectedElement.tableConfig, columns: newColumns }
                                    })
                                  }}
                                  placeholder="Column label"
                                  className="flex-1"
                                />
                                <Select
                                  value={col.align || 'left'}
                                  onValueChange={(value: 'left' | 'center' | 'right') => {
                                    const newColumns = [...(selectedElement.tableConfig?.columns || [])]
                                    newColumns[idx].align = value
                                    updateElement(selectedElement.id, {
                                      tableConfig: { ...selectedElement.tableConfig, columns: newColumns }
                                    })
                                  }}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Align" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[9999]">
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Column Width (px)</Label>
                                  <Input
                                    type="number"
                                    value={col.width || ''}
                                    onChange={(e) => {
                                      const newColumns = [...(selectedElement.tableConfig?.columns || [])]
                                      newColumns[idx].width = e.target.value ? Number(e.target.value) : undefined
                                      updateElement(selectedElement.id, {
                                        tableConfig: { ...selectedElement.tableConfig, columns: newColumns }
                                      })
                                    }}
                                    placeholder="Auto"
                                    className="mt-1 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Column Background</Label>
                                  <Input
                                    type="color"
                                    value={col.backgroundColor || '#ffffff'}
                                    onChange={(e) => {
                                      const newColumns = [...(selectedElement.tableConfig?.columns || [])]
                                      newColumns[idx].backgroundColor = e.target.value
                                      updateElement(selectedElement.id, {
                                        tableConfig: { ...selectedElement.tableConfig, columns: newColumns }
                                      })
                                    }}
                                    className="mt-1 h-8 w-full"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Cell Data Template</Label>
                                <Input
                                  value={col.dataTemplate || ''}
                                  onChange={(e) => {
                                    const newColumns = [...(selectedElement.tableConfig?.columns || [])]
                                    newColumns[idx].dataTemplate = e.target.value
                                    updateElement(selectedElement.id, {
                                      tableConfig: { ...selectedElement.tableConfig, columns: newColumns }
                                    })
                                  }}
                                  placeholder="e.g., {{lineItems.product}} or static text"
                                  className="mt-1 text-sm"
                                />
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {LINE_ITEM_VARIABLES.map((variable) => (
                                    <Button
                                      key={variable.value}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        const newColumns = [...(selectedElement.tableConfig?.columns || [])]
                                        const currentTemplate = newColumns[idx].dataTemplate || ''
                                        newColumns[idx].dataTemplate = currentTemplate + variable.value
                                        updateElement(selectedElement.id, {
                                          tableConfig: { ...selectedElement.tableConfig, columns: newColumns }
                                        })
                                      }}
                                      className="h-6 px-2 text-xs"
                                    >
                                      {variable.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const newColumns = [...(selectedElement.tableConfig?.columns || []), {
                                field: `col${(selectedElement.tableConfig?.columns.length || 0) + 1}`,
                                label: 'New Column',
                                align: 'left' as const,
                                dataTemplate: '',
                              }]
                              updateElement(selectedElement.id, {
                                tableConfig: { ...selectedElement.tableConfig, columns: newColumns }
                              })
                            }}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Column
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedElement.tableConfig?.showHeader}
                            onChange={(e) => updateElement(selectedElement.id, {
                              tableConfig: { 
                                columns: selectedElement.tableConfig?.columns || [],
                                ...selectedElement.tableConfig, 
                                showHeader: e.target.checked 
                              }
                            })}
                          />
                          <Label>Show Header</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedElement.tableConfig?.showBorders}
                            onChange={(e) => updateElement(selectedElement.id, {
                              tableConfig: { 
                                columns: selectedElement.tableConfig?.columns || [],
                                ...selectedElement.tableConfig, 
                                showBorders: e.target.checked 
                              }
                            })}
                          />
                          <Label>Show Borders</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Header Row Height (px)</Label>
                            <Input
                              type="number"
                              value={selectedElement.tableConfig?.headerRowHeight || 40}
                              onChange={(e) => updateElement(selectedElement.id, {
                                tableConfig: { 
                                  columns: selectedElement.tableConfig?.columns || [],
                                  ...selectedElement.tableConfig, 
                                  headerRowHeight: Number(e.target.value) || 40 
                                }
                              })}
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Header Background</Label>
                            <Input
                              type="color"
                              value={selectedElement.tableConfig?.headerRowBackgroundColor || '#f3f4f6'}
                              onChange={(e) => updateElement(selectedElement.id, {
                                tableConfig: { 
                                  columns: selectedElement.tableConfig?.columns || [],
                                  ...selectedElement.tableConfig, 
                                  headerRowBackgroundColor: e.target.value 
                                }
                              })}
                              className="mt-1 h-8 w-full"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Body Row Height (px)</Label>
                            <Input
                              type="number"
                              value={selectedElement.tableConfig?.bodyRowHeight || 35}
                              onChange={(e) => updateElement(selectedElement.id, {
                                tableConfig: { 
                                  columns: selectedElement.tableConfig?.columns || [],
                                  ...selectedElement.tableConfig, 
                                  bodyRowHeight: Number(e.target.value) || 35 
                                }
                              })}
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Body Row Background</Label>
                            <Input
                              type="color"
                              value={selectedElement.tableConfig?.bodyRowBackgroundColor || '#ffffff'}
                              onChange={(e) => updateElement(selectedElement.id, {
                                tableConfig: { 
                                  columns: selectedElement.tableConfig?.columns || [],
                                  ...selectedElement.tableConfig, 
                                  bodyRowBackgroundColor: e.target.value 
                                }
                              })}
                              className="mt-1 h-8 w-full"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Alternate Row Background (optional)</Label>
                          <Input
                            type="color"
                            value={selectedElement.tableConfig?.alternateRowBackgroundColor || '#ffffff'}
                            onChange={(e) => updateElement(selectedElement.id, {
                              tableConfig: { 
                                columns: selectedElement.tableConfig?.columns || [],
                                ...selectedElement.tableConfig, 
                                alternateRowBackgroundColor: e.target.value !== '#ffffff' ? e.target.value : undefined 
                              }
                            })}
                            className="mt-1 h-8 w-full"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Leave as white to disable alternating colors</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>X Position</Label>
                      <Input
                        type="number"
                        value={selectedElement.x}
                        onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Y Position</Label>
                      <Input
                        type="number"
                        value={selectedElement.y}
                        onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  {selectedElement.type !== 'line' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Width</Label>
                        <Input
                          type="number"
                          value={selectedElement.width || ''}
                          onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) || undefined })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Height</Label>
                        <Input
                          type="number"
                          value={selectedElement.height || ''}
                          onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) || undefined })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="style" className="space-y-4 mt-4">
                  {selectedElement.type === 'text' && (
                    <>
                      <div>
                        <Label>Font Size</Label>
                        <Input
                          type="number"
                          value={selectedElement.style?.fontSize || 14}
                          onChange={(e) => updateElement(selectedElement.id, {
                            style: { ...selectedElement.style, fontSize: Number(e.target.value) }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Font Family</Label>
                        <Select
                          value={selectedElement.style?.fontFamily || 'Arial'}
                          onValueChange={(value: string) => updateElement(selectedElement.id, {
                            style: { ...selectedElement.style, fontFamily: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select font" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="Arial">Arial</SelectItem>
                            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                            <SelectItem value="Courier New">Courier New</SelectItem>
                            <SelectItem value="Helvetica">Helvetica</SelectItem>
                            <SelectItem value="Georgia">Georgia</SelectItem>
                            <SelectItem value="Verdana">Verdana</SelectItem>
                            <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Font Weight</Label>
                        <Select
                          value={selectedElement.style?.fontWeight || 'normal'}
                          onValueChange={(value: 'normal' | 'bold' | 'italic') => updateElement(selectedElement.id, {
                            style: { ...selectedElement.style, fontWeight: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select weight" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="bold">Bold</SelectItem>
                            <SelectItem value="italic">Italic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Line Height</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedElement.style?.lineHeight || 1.5}
                          onChange={(e) => updateElement(selectedElement.id, {
                            style: { ...selectedElement.style, lineHeight: Number(e.target.value) }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Letter Spacing</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedElement.style?.letterSpacing || 0}
                          onChange={(e) => updateElement(selectedElement.id, {
                            style: { ...selectedElement.style, letterSpacing: Number(e.target.value) }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Text Color</Label>
                        <Input
                          type="color"
                          value={selectedElement.style?.color || '#000000'}
                          onChange={(e) => updateElement(selectedElement.id, {
                            style: { ...selectedElement.style, color: e.target.value }
                          })}
                          className="mt-1 h-10"
                        />
                      </div>
                      <div>
                        <Label>Text Align</Label>
                        <Select
                          value={selectedElement.style?.textAlign || 'left'}
                          onValueChange={(value: 'left' | 'center' | 'right') => updateElement(selectedElement.id, {
                            style: { ...selectedElement.style, textAlign: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select alignment" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Background Color</Label>
                    <Input
                      type="color"
                      value={selectedElement.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateElement(selectedElement.id, {
                        style: { ...selectedElement.style, backgroundColor: e.target.value }
                      })}
                      className="mt-1 h-10"
                    />
                  </div>
                  <div>
                    <Label>Opacity</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedElement.style?.opacity !== undefined ? selectedElement.style.opacity : 1}
                      onChange={(e) => updateElement(selectedElement.id, {
                        style: { ...selectedElement.style, opacity: Number(e.target.value) }
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Border Radius</Label>
                    <Input
                      type="number"
                      value={selectedElement.style?.borderRadius || 0}
                      onChange={(e) => updateElement(selectedElement.id, {
                        style: { ...selectedElement.style, borderRadius: Number(e.target.value) }
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Padding</Label>
                    <Input
                      type="number"
                      value={selectedElement.style?.padding || 0}
                      onChange={(e) => updateElement(selectedElement.id, {
                        style: { ...selectedElement.style, padding: Number(e.target.value) }
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Margin</Label>
                    <Input
                      type="number"
                      value={selectedElement.style?.margin || 0}
                      onChange={(e) => updateElement(selectedElement.id, {
                        style: { ...selectedElement.style, margin: Number(e.target.value) }
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Border Width</Label>
                    <Input
                      type="number"
                      value={selectedElement.style?.borderWidth || 0}
                      onChange={(e) => updateElement(selectedElement.id, {
                        style: { ...selectedElement.style, borderWidth: Number(e.target.value) }
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Border Color</Label>
                    <Input
                      type="color"
                      value={selectedElement.style?.borderColor || '#000000'}
                      onChange={(e) => updateElement(selectedElement.id, {
                        style: { ...selectedElement.style, borderColor: e.target.value }
                      })}
                      className="mt-1 h-10"
                    />
                  </div>
                  <div>
                    <Label>Border Style</Label>
                    <Select
                      value={selectedElement.style?.borderStyle || 'solid'}
                      onValueChange={(value: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | 'none') => {
                        updateElement(selectedElement.id, {
                          style: { ...selectedElement.style, borderStyle: value }
                        })
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="dotted">Dotted</SelectItem>
                        <SelectItem value="double">Double</SelectItem>
                        <SelectItem value="groove">Groove</SelectItem>
                        <SelectItem value="ridge">Ridge</SelectItem>
                        <SelectItem value="inset">Inset</SelectItem>
                        <SelectItem value="outset">Outset</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* Canvas — always editable; Live Preview renders the actual print output beside it */}
        <div className="flex-1 overflow-auto bg-muted p-6">
          <div className="flex items-start gap-6 justify-center">
            <div className="bg-white shadow-lg flex-shrink-0" style={{ width: `${pageWidth}px`, height: `${pageHeight}px`, position: 'relative' }}>
              <div
                ref={canvasRef}
                className="w-full h-full relative"
                onClick={() => setSelectedElementId(null)}
                style={{ position: 'relative' }}
              >
                {elements.map(element => (
                  <React.Fragment key={element.id}>
                    {renderElement(element)}
                    {/* SE resize handle on the selected element */}
                    {element.id === selectedElementId && !element.locked && element.type !== 'line' && (
                      <div
                        onMouseDown={(e) => handleResizeStart(e, element.id)}
                        title="Drag to resize"
                        style={{
                          position: 'absolute',
                          left: element.x + (element.width || 0) - 7,
                          top: element.y + (element.height || 0) - 7,
                          width: 14,
                          height: 14,
                          background: '#10b981',
                          border: '2px solid #ffffff',
                          borderRadius: 3,
                          cursor: 'nwse-resize',
                          zIndex: 50,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Live print preview — updates as the design changes */}
            {previewMode && (
              <div className="w-[520px] flex-shrink-0 sticky top-0">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Eye className="h-3.5 w-3.5" />
                  Live print preview
                </div>
                <InvoicePreviewFrame html={previewHtml} className="rounded-lg shadow-lg" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

