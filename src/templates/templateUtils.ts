import defaultTemplate from './default-invoice-template.json'
import { DesignElement } from '@/types/invoiceTemplate'

export interface InvoiceTemplate {
  name: string
  description: string
  pageWidth: number
  pageHeight: number
  elements: DesignElement[]
}

/**
 * Get the default bilingual invoice template
 * This template has English on the left and Arabic on the right
 */
export const getDefaultTemplate = (): InvoiceTemplate => {
  return defaultTemplate as InvoiceTemplate
}

/**
 * Get a list of all available templates
 */
export const getAvailableTemplates = (): InvoiceTemplate[] => {
  return [
    getDefaultTemplate()
  ]
}

/**
 * Get a template by name
 */
export const getTemplateByName = (name: string): InvoiceTemplate | null => {
  const templates = getAvailableTemplates()
  return templates.find(t => t.name === name) || null
}
