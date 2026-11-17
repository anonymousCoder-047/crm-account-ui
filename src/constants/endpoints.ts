// API endpoints constants
// Base URL comes from Vite env if provided, otherwise uses smart detection
import { getApiBaseUrl } from '@/utils/apiConfig'
export const API_BASE = getApiBaseUrl()

// Auth (session) routes
export const AUTH_ENDPOINTS = {
  login: `${API_BASE}/auth/login`,
  me: `${API_BASE}/auth/me`,
  forgotPassword: `${API_BASE}/auth/forgot-password`,
  validateResetToken: `${API_BASE}/auth/validate-reset-token`,
  resetPassword: `${API_BASE}/auth/reset-password`,
}

// Auth details (credentials meta) routes
export const AUTH_DETAILS_ENDPOINTS = {
  base: `${API_BASE}/auth-details`,
  list: `${API_BASE}/auth-details`,
  create: `${API_BASE}/auth-details`,
  byUser: (userId: string) => `${API_BASE}/auth-details/user/${encodeURIComponent(userId)}`,
  byEmail: (email: string) => `${API_BASE}/auth-details/email/${encodeURIComponent(email)}`,
  update: (id: string) => `${API_BASE}/auth-details/${encodeURIComponent(id)}`,
  lastLogin: (id: string) => `${API_BASE}/auth-details/${encodeURIComponent(id)}/last-login`,
  setResetToken: (id: string) => `${API_BASE}/auth-details/${encodeURIComponent(id)}/reset-token`,
  setOtp: (id: string) => `${API_BASE}/auth-details/${encodeURIComponent(id)}/otp`,
}

// Users (profiles + roles)
export const USER_ENDPOINTS = {
  base: `${API_BASE}/users`,
  list: `${API_BASE}/users`,
  create: `${API_BASE}/users`,
  byId: (id: string) => `${API_BASE}/users/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/users/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/users/${encodeURIComponent(id)}`,
}

// Settings routes
export const SETTINGS_ENDPOINTS = {
  base: `${API_BASE}/settings`,
}

// Inventory
export const INVENTORY_ENDPOINTS = {
  base: `${API_BASE}/inventory`,
  list: `${API_BASE}/inventory`,
  create: `${API_BASE}/inventory`,
  byId: (id: string) => `${API_BASE}/inventory/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/inventory/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/inventory/${encodeURIComponent(id)}`,
  adjustStock: `${API_BASE}/inventory/adjust-stock`,
  transactions: `${API_BASE}/inventory/transactions`,
  lowStock: `${API_BASE}/inventory/low-stock`,
  priceHistory: (id: string) => `${API_BASE}/inventory/${encodeURIComponent(id)}/price-history`,
}

// Sales Invoices
export const SALES_INVOICE_ENDPOINTS = {
  base: `${API_BASE}/sales-invoices`,
  list: `${API_BASE}/sales-invoices`,
  create: `${API_BASE}/sales-invoices`,
  byId: (id: string) => `${API_BASE}/sales-invoices/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/sales-invoices/${encodeURIComponent(id)}`,
  updatePaymentStatus: (id: string) => `${API_BASE}/sales-invoices/${encodeURIComponent(id)}/payment-status`,
  applyPayment: (id: string) => `${API_BASE}/sales-invoices/${encodeURIComponent(id)}/apply-payment`,
  delete: (id: string) => `${API_BASE}/sales-invoices/${encodeURIComponent(id)}`,
  generateShareLink: (id: string) => `${API_BASE}/sales-invoices/${encodeURIComponent(id)}/share`,
  getByShareToken: (token: string) => `${API_BASE}/sales-invoices/share/${encodeURIComponent(token)}`,
  getQrCode: (id: string) => `${API_BASE}/sales-invoices/${encodeURIComponent(id)}/qr-code`,
}

// Sales Invoice Templates
export const SALES_INVOICE_TEMPLATE_ENDPOINTS = {
  base: `${API_BASE}/sales-invoice-templates`,
  list: `${API_BASE}/sales-invoice-templates`,
  create: `${API_BASE}/sales-invoice-templates`,
  default: `${API_BASE}/sales-invoice-templates/default`,
  byId: (id: string) => `${API_BASE}/sales-invoice-templates/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/sales-invoice-templates/${encodeURIComponent(id)}`,
  setDefault: (id: string) => `${API_BASE}/sales-invoice-templates/${encodeURIComponent(id)}/set-default`,
  delete: (id: string) => `${API_BASE}/sales-invoice-templates/${encodeURIComponent(id)}`,
}

// Purchase Invoices
export const PURCHASE_INVOICE_ENDPOINTS = {
  base: `${API_BASE}/purchase-invoices`,
  list: `${API_BASE}/purchase-invoices`,
  create: `${API_BASE}/purchase-invoices`,
  byId: (id: string) => `${API_BASE}/purchase-invoices/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/purchase-invoices/${encodeURIComponent(id)}`,
  updatePaymentStatus: (id: string) => `${API_BASE}/purchase-invoices/${encodeURIComponent(id)}/payment-status`,
  applyPayment: (id: string) => `${API_BASE}/purchase-invoices/${encodeURIComponent(id)}/apply-payment`,
  delete: (id: string) => `${API_BASE}/purchase-invoices/${encodeURIComponent(id)}`,
  generateShareLink: (id: string) => `${API_BASE}/purchase-invoices/${encodeURIComponent(id)}/share`,
  getByShareToken: (token: string) => `${API_BASE}/purchase-invoices/share/${encodeURIComponent(token)}`,
  getQrCode: (id: string) => `${API_BASE}/purchase-invoices/${encodeURIComponent(id)}/qr-code`,
}

// Purchase Invoice Templates
export const PURCHASE_INVOICE_TEMPLATE_ENDPOINTS = {
  base: `${API_BASE}/purchase-invoice-templates`,
  list: `${API_BASE}/purchase-invoice-templates`,
  create: `${API_BASE}/purchase-invoice-templates`,
  default: `${API_BASE}/purchase-invoice-templates/default`,
  byId: (id: string) => `${API_BASE}/purchase-invoice-templates/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/purchase-invoice-templates/${encodeURIComponent(id)}`,
  setDefault: (id: string) => `${API_BASE}/purchase-invoice-templates/${encodeURIComponent(id)}/set-default`,
  delete: (id: string) => `${API_BASE}/purchase-invoice-templates/${encodeURIComponent(id)}`,
}

// Expenses
export const EXPENSE_ENDPOINTS = {
  base: `${API_BASE}/expenses`,
  list: `${API_BASE}/expenses`,
  create: `${API_BASE}/expenses`,
  byId: (id: string) => `${API_BASE}/expenses/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/expenses/${encodeURIComponent(id)}`,
  updateStatus: (id: string) => `${API_BASE}/expenses/${encodeURIComponent(id)}/status`,
  delete: (id: string) => `${API_BASE}/expenses/${encodeURIComponent(id)}`,
  attachment: (id: string) => `${API_BASE}/expenses/${encodeURIComponent(id)}/attachment`,
  generateZipLink: (id: string) => `${API_BASE}/expenses/${encodeURIComponent(id)}/generate-zip-link`,
  downloadZip: (token: string) => `${API_BASE}/expenses/download-zip/${encodeURIComponent(token)}`,
}

// Receivables
export const RECEIVABLE_ENDPOINTS = {
  base: `${API_BASE}/receivables`,
  list: `${API_BASE}/receivables`,
  create: `${API_BASE}/receivables`,
  byId: (id: string) => `${API_BASE}/receivables/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/receivables/${encodeURIComponent(id)}`,
  updateStatus: (id: string) => `${API_BASE}/receivables/${encodeURIComponent(id)}/status`,
  recordPayment: (id: string) => `${API_BASE}/receivables/${encodeURIComponent(id)}/payments`,
  close: (id: string) => `${API_BASE}/receivables/${encodeURIComponent(id)}/close`,
  delete: (id: string) => `${API_BASE}/receivables/${encodeURIComponent(id)}`,
}

// Payables (Payment Out)
export const PAYABLE_ENDPOINTS = {
  base: `${API_BASE}/payables`,
  list: `${API_BASE}/payables`,
  create: `${API_BASE}/payables`,
  byId: (id: string) => `${API_BASE}/payables/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/payables/${encodeURIComponent(id)}`,
  updateStatus: (id: string) => `${API_BASE}/payables/${encodeURIComponent(id)}/status`,
  recordPayment: (id: string) => `${API_BASE}/payables/${encodeURIComponent(id)}/payments`,
  close: (id: string) => `${API_BASE}/payables/${encodeURIComponent(id)}/close`,
  delete: (id: string) => `${API_BASE}/payables/${encodeURIComponent(id)}`,
}

// Delivery Orders
export const DELIVERY_ORDER_ENDPOINTS = {
  base: `${API_BASE}/delivery-orders`,
  list: `${API_BASE}/delivery-orders`,
  create: `${API_BASE}/delivery-orders`,
  byId: (id: string) => `${API_BASE}/delivery-orders/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/delivery-orders/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/delivery-orders/${encodeURIComponent(id)}`,
  bulkDelete: `${API_BASE}/delivery-orders/bulk-delete`,
  attachment: (id: string) => `${API_BASE}/delivery-orders/${encodeURIComponent(id)}/attachment`,
  generateZipLink: (id: string) => `${API_BASE}/delivery-orders/${encodeURIComponent(id)}/generate-zip-link`,
  downloadZip: (token: string) => `${API_BASE}/delivery-orders/download-zip/${encodeURIComponent(token)}`,
}

// Delivery Order Templates
export const DELIVERY_ORDER_TEMPLATE_ENDPOINTS = {
  base: `${API_BASE}/delivery-order-templates`,
  list: `${API_BASE}/delivery-order-templates`,
  create: `${API_BASE}/delivery-order-templates`,
  default: `${API_BASE}/delivery-order-templates/default`,
  byId: (id: string) => `${API_BASE}/delivery-order-templates/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/delivery-order-templates/${encodeURIComponent(id)}`,
  setDefault: (id: string) => `${API_BASE}/delivery-order-templates/${encodeURIComponent(id)}/set-default`,
  delete: (id: string) => `${API_BASE}/delivery-order-templates/${encodeURIComponent(id)}`,
}

// Suppliers
export const SUPPLIER_ENDPOINTS = {
  base: `${API_BASE}/suppliers`,
  list: `${API_BASE}/suppliers`,
  create: `${API_BASE}/suppliers`,
  byId: (id: string) => `${API_BASE}/suppliers/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/suppliers/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/suppliers/${encodeURIComponent(id)}`,
}

// Brands
export const BRAND_ENDPOINTS = {
  base: `${API_BASE}/brands`,
  list: `${API_BASE}/brands`,
  create: `${API_BASE}/brands`,
  byId: (id: string) => `${API_BASE}/brands/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/brands/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/brands/${encodeURIComponent(id)}`,
}

// Customers
export const CUSTOMER_ENDPOINTS = {
  base: `${API_BASE}/customers`,
  list: `${API_BASE}/customers`,
  create: `${API_BASE}/customers`,
  byId: (id: string) => `${API_BASE}/customers/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/customers/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/customers/${encodeURIComponent(id)}`,
}

// Units
export const UNIT_ENDPOINTS = {
  base: `${API_BASE}/units`,
  list: `${API_BASE}/units`,
  create: `${API_BASE}/units`,
  byId: (id: string) => `${API_BASE}/units/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/units/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/units/${encodeURIComponent(id)}`,
}

// Currencies
export const CURRENCY_ENDPOINTS = {
  base: `${API_BASE}/currencies`,
  list: `${API_BASE}/currencies`,
  create: `${API_BASE}/currencies`,
  byId: (id: string) => `${API_BASE}/currencies/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/currencies/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/currencies/${encodeURIComponent(id)}`,
}

// Payment Methods
export const PAYMENT_METHOD_ENDPOINTS = {
  base: `${API_BASE}/payment-methods`,
  list: `${API_BASE}/payment-methods`,
  create: `${API_BASE}/payment-methods`,
  byId: (id: string) => `${API_BASE}/payment-methods/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/payment-methods/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/payment-methods/${encodeURIComponent(id)}`,
}

// Payment Statuses
export const PAYMENT_STATUS_ENDPOINTS = {
  base: `${API_BASE}/payment-statuses`,
  list: `${API_BASE}/payment-statuses`,
  create: `${API_BASE}/payment-statuses`,
  byId: (id: string) => `${API_BASE}/payment-statuses/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/payment-statuses/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/payment-statuses/${encodeURIComponent(id)}`,
}

// Accounts (Chart of Accounts)
export const ACCOUNT_ENDPOINTS = {
  base: `${API_BASE}/accounts`,
  list: `${API_BASE}/accounts`,
  create: `${API_BASE}/accounts`,
  byId: (id: string) => `${API_BASE}/accounts/${encodeURIComponent(id)}`,
  byAccountId: (accountId: string) => `${API_BASE}/accounts/by-account-id/${encodeURIComponent(accountId)}`,
  update: (id: string) => `${API_BASE}/accounts/${encodeURIComponent(id)}`,
  updateOpeningBalance: (id: string) => `${API_BASE}/accounts/${encodeURIComponent(id)}/opening-balance`,
  delete: (id: string) => `${API_BASE}/accounts/${encodeURIComponent(id)}`,
}

// Ledger (Journal Entries)
export const LEDGER_ENDPOINTS = {
  base: `${API_BASE}/ledger`,
  list: `${API_BASE}/ledger`,
  create: `${API_BASE}/ledger`,
  update: (id: string) => `${API_BASE}/ledger/${encodeURIComponent(id)}`,
  byId: (id: string) => `${API_BASE}/ledger/${encodeURIComponent(id)}`,
  byReference: (referenceType: string, referenceId: string) =>
    `${API_BASE}/ledger/reference/${encodeURIComponent(referenceType)}/${encodeURIComponent(referenceId)}`,
  delete: (id: string) => `${API_BASE}/ledger/${encodeURIComponent(id)}`,
  bulkDelete: `${API_BASE}/ledger/bulk-delete`,
  regenerate: `${API_BASE}/ledger/regenerate`,
}

// General Ledger
export const GENERAL_LEDGER_ENDPOINTS = {
  base: `${API_BASE}/general-ledger`,
  list: `${API_BASE}/general-ledger`,
  accounts: `${API_BASE}/general-ledger/accounts`,
  trialBalance: `${API_BASE}/general-ledger/trial-balance`,
  summary: `${API_BASE}/general-ledger/summary`,
  byAccount: (accountId: string) => `${API_BASE}/general-ledger/account/${encodeURIComponent(accountId)}`,
  byId: (id: string) => `${API_BASE}/general-ledger/${encodeURIComponent(id)}`,
  update: (id: string) => `${API_BASE}/general-ledger/${encodeURIComponent(id)}`,
  delete: (id: string) => `${API_BASE}/general-ledger/${encodeURIComponent(id)}`,
  bulkDelete: `${API_BASE}/general-ledger/bulk-delete`,
}

// Financial Statements
export const FINANCIAL_STATEMENTS_ENDPOINTS = {
  base: `${API_BASE}/statements`,
  income: `${API_BASE}/statements/income`,
  balanceSheet: `${API_BASE}/statements/balance-sheet`,
  cashflow: `${API_BASE}/statements/cashflow`,
  equity: `${API_BASE}/statements/equity`,
  trialBalance: `${API_BASE}/statements/trial-balance`,
}

// Search
export const SEARCH_ENDPOINTS = {
  base: `${API_BASE}/search`,
  search: (query: string, limit?: number) => {
    const params = new URLSearchParams({ q: query })
    if (limit) params.append('limit', limit.toString())
    return `${API_BASE}/search?${params.toString()}`
  },
}

// Onboarding
export const ONBOARDING_ENDPOINTS = {
  base: `${API_BASE}/onboarding`,
  status: `${API_BASE}/onboarding/status`,
  businessProfile: `${API_BASE}/onboarding/business-profile`,
  chartOfAccounts: `${API_BASE}/onboarding/chart-of-accounts`,
  openingBalances: `${API_BASE}/onboarding/opening-balances`,
  tax: `${API_BASE}/onboarding/tax`,
  inventory: `${API_BASE}/onboarding/inventory`,
  paymentMethods: `${API_BASE}/onboarding/payment-methods`,
  complete: `${API_BASE}/onboarding/complete`,
}

// Reports
export const REPORT_ENDPOINTS = {
  base: `${API_BASE}/reports`,
  get: (type: string, params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return `${API_BASE}/reports/${encodeURIComponent(type)}${queryString}`
  },
}

// Chatbot / AI Agent
export const CHATBOT_ENDPOINTS = {
  sendMessage: `${API_BASE}/chatbot/message`,
}


