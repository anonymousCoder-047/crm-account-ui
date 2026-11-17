import type { SalesInvoice, PurchaseInvoice } from '@/services/api'

/**
 * Calculate the total for a sales invoice.
 * Supports both the new backend model (with `total_amount` and `line_items`)
 * and legacy front-end-only invoice structures.
 */
export function calculateSalesInvoiceTotal(invoice: SalesInvoice | any): number {
  // Prefer backend-calculated total_amount when available
  if (typeof invoice.total_amount === 'number') {
    return invoice.total_amount
  }

  // New model: line_items with quantity/unit_price/total
  if (Array.isArray(invoice.line_items)) {
    return invoice.line_items.reduce((sum: number, item: any) => {
      if (typeof item.total === 'number') {
        return sum + item.total
      }
      const qty = item.quantity ?? item.qty ?? 0
      const unitPrice = item.unit_price ?? item.unitPrice ?? 0
      return sum + qty * unitPrice
    }, 0)
  }

  // Legacy front-end model: lineItems/qty/unitPrice/discountType/vatType, etc.
  const grandTotal =
    invoice.lineItems?.reduce((sum: number, item: any) => {
      return sum + ((item.qty || 0) * (item.unitPrice || 0))
    }, 0) || 0

  // Calculate discount amount
  let discountAmount = 0
  if (invoice.discountType === 'percentage' && invoice.discountValue) {
    discountAmount = (grandTotal * invoice.discountValue) / 100
  } else if (invoice.discountType === 'amount' && invoice.discount) {
    discountAmount = invoice.discount
  } else if (invoice.discount) {
    discountAmount = invoice.discount
  }

  // Calculate VAT amount
  const subtotal = grandTotal - discountAmount
  let vatAmount = 0
  if (invoice.vatType === 'percentage' && invoice.vatValue) {
    vatAmount = (subtotal * invoice.vatValue) / 100
  } else if (invoice.vatType === 'amount' && invoice.vat) {
    vatAmount = invoice.vat
  } else if (invoice.vat) {
    vatAmount = invoice.vat
  }

  // Final total
  return grandTotal - discountAmount + vatAmount
}

/**
 * Calculate the total for a purchase invoice.
 * Supports both the new backend model (with `total_amount` and `line_items`)
 * and legacy front-end-only invoice structures.
 */
export function calculatePurchaseInvoiceTotal(invoice: PurchaseInvoice | any): number {
  // Prefer backend-calculated total_amount when available
  if (typeof invoice.total_amount === 'number') {
    return invoice.total_amount
  }

  // New model: line_items with quantity/unit_cost/total
  if (Array.isArray(invoice.line_items)) {
    return invoice.line_items.reduce((sum: number, item: any) => {
      if (typeof item.total === 'number') {
        return sum + item.total
      }
      const qty = item.quantity ?? item.qty ?? 0
      const unitCost = item.unit_cost ?? item.unitPrice ?? 0
      return sum + qty * unitCost
    }, 0)
  }

  // Legacy front-end model: lineItems/qty/unitPrice/discountType/vatType, etc.
  const grandTotal =
    invoice.lineItems?.reduce((sum: number, item: any) => {
      return sum + ((item.qty || 0) * (item.unitPrice || 0))
    }, 0) || 0

  // Calculate discount amount
  let discountAmount = 0
  if (invoice.discountType === 'percentage' && invoice.discountValue) {
    discountAmount = (grandTotal * invoice.discountValue) / 100
  } else if (invoice.discountType === 'amount' && invoice.discount) {
    discountAmount = invoice.discount
  } else if (invoice.discount) {
    discountAmount = invoice.discount
  }

  // Calculate VAT amount
  const subtotal = grandTotal - discountAmount
  let vatAmount = 0
  if (invoice.vatType === 'percentage' && invoice.vatValue) {
    vatAmount = (subtotal * invoice.vatValue) / 100
  } else if (invoice.vatType === 'amount' && invoice.vat) {
    vatAmount = invoice.vat
  } else if (invoice.vat) {
    vatAmount = invoice.vat
  }

  // Final total
  return grandTotal - discountAmount + vatAmount
}

