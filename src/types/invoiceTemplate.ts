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
    }>
    showHeader?: boolean
    showBorders?: boolean
  }
}

export type TemplateDesign = {
  pageWidth?: number
  pageHeight?: number
  elements: DesignElement[]
}

