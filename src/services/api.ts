import axios, { AxiosError } from 'axios'
import type { AxiosInstance } from 'axios'
import { handleApiError } from '@/utils/errorHandler'
import {
  AUTH_DETAILS_ENDPOINTS,
  AUTH_ENDPOINTS,
  SETTINGS_ENDPOINTS,
  INVENTORY_ENDPOINTS,
  SALES_INVOICE_ENDPOINTS,
  SALES_INVOICE_TEMPLATE_ENDPOINTS,
  PURCHASE_INVOICE_ENDPOINTS,
  PURCHASE_INVOICE_TEMPLATE_ENDPOINTS,
  EXPENSE_ENDPOINTS,
  RECEIVABLE_ENDPOINTS,
  PAYABLE_ENDPOINTS,
  DELIVERY_ORDER_ENDPOINTS,
  DELIVERY_ORDER_TEMPLATE_ENDPOINTS,
  SUPPLIER_ENDPOINTS,
  BRAND_ENDPOINTS,
  CUSTOMER_ENDPOINTS,
  UNIT_ENDPOINTS,
  CURRENCY_ENDPOINTS,
  PAYMENT_METHOD_ENDPOINTS,
  PAYMENT_STATUS_ENDPOINTS,
  ACCOUNT_ENDPOINTS,
  LEDGER_ENDPOINTS,
  GENERAL_LEDGER_ENDPOINTS,
  FINANCIAL_STATEMENTS_ENDPOINTS,
  ONBOARDING_ENDPOINTS,
  SEARCH_ENDPOINTS,
  REPORT_ENDPOINTS,
  CHATBOT_ENDPOINTS,
  USER_ENDPOINTS,
} from '@/constants/endpoints'

// Shared axios instance (AuthContext also manages auth header at runtime)
export const apiClient: AxiosInstance = axios.create({
  // baseURL is already included in endpoints; keep default here
  withCredentials: false,
})

// Attach token for protected routes
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      ;(config.headers as any).Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle response errors (401, 403, etc.)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const appError = handleApiError(error)

    // Handle 401 - Unauthorized
    if (appError.statusCode === 401) {
      localStorage.removeItem('token')
      // Don't redirect if already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    // Handle 403 - Forbidden
    if (appError.statusCode === 403) {
      // Optionally redirect to unauthorized page or show message
      // For now, just reject with error - pages can handle it
    }

    return Promise.reject(appError)
  }
)

// Types
export type Id = string

// User profiles / roles
export interface UserProfile {
  _id: string
  name: string
  email: string
  role: 'superadmin' | 'admin' | 'user' | 'manager'
  isActive: boolean
  employeeId?: string
  department?: string
  position?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserProfileInput {
  name: string
  email: string
  role?: UserProfile['role']
  isActive?: boolean
  employeeId?: string
  department?: string
  position?: string
  phone?: string
  // optional auth fields
  username?: string
  password?: string
}

export interface UpdateUserProfileInput extends Partial<CreateUserProfileInput> {}

export const UsersAPI = {
  list: (params?: { q?: string; role?: UserProfile['role']; isActive?: boolean }) =>
    apiClient.get<{ success: boolean; data: UserProfile[] }>(USER_ENDPOINTS.list, {
      params: {
        ...(params?.q ? { q: params.q } : {}),
        ...(params?.role ? { role: params.role } : {}),
        ...(params?.isActive !== undefined ? { isActive: params.isActive } : {}),
      },
    }),
  create: (payload: CreateUserProfileInput) =>
    apiClient.post<{ success: boolean; data: UserProfile }>(USER_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: UserProfile }>(USER_ENDPOINTS.byId(id)),
  update: (id: Id, updates: UpdateUserProfileInput) =>
    apiClient.put<{ success: boolean; data: UserProfile }>(USER_ENDPOINTS.update(id), updates),
  delete: (id: Id) =>
    apiClient.delete<{ success: boolean; data: UserProfile }>(USER_ENDPOINTS.delete(id)),
}

export interface AuthDetails {
  _id: string
  username: string
  email: string
  lastLogin?: string
  created_by?: string
  updated_by?: string
  ip_address?: string
  country?: string
  user_profile: string
  token_expiry?: string
  otp?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAuthDetailsInput {
  username: string
  email: string
  password: string
  user_profile: Id
  created_by?: Id
  ip_address?: string
  country?: string
}

export interface UpdateAuthDetailsInput {
  username?: string
  email?: string
  password?: string
  resetToken?: string
  lastLogin?: string
  updated_by?: Id
  ip_address?: string
  country?: string
  token_expiry?: string
  otp?: string
  active?: boolean
}

// Auth session APIs (existing backend)
export const AuthAPI = {
  login: (email: string, password: string) =>
    apiClient.post(AUTH_ENDPOINTS.login, { email, password }),
  me: () => apiClient.get(AUTH_ENDPOINTS.me),
  forgotPassword: (email: string) =>
    apiClient.post(AUTH_ENDPOINTS.forgotPassword, { email }),
  validateResetToken: (token: string) =>
    apiClient.get(AUTH_ENDPOINTS.validateResetToken, { params: { token } }),
  resetPassword: (token: string, password: string) =>
    apiClient.post(AUTH_ENDPOINTS.resetPassword, { token, password }),
}

// Auth details APIs
export const AuthDetailsAPI = {
  list: (q?: string, active?: boolean) =>
    apiClient.get<{ success: boolean; data: AuthDetails[] }>(AUTH_DETAILS_ENDPOINTS.list, {
      params: {
        ...(q ? { q } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    }),
  create: (payload: CreateAuthDetailsInput) =>
    apiClient.post<{ success: boolean; data: AuthDetails }>(AUTH_DETAILS_ENDPOINTS.create, payload),
  byUser: (userId: Id) =>
    apiClient.get<{ success: boolean; data: AuthDetails }>(AUTH_DETAILS_ENDPOINTS.byUser(userId)),
  byEmail: (email: string) =>
    apiClient.get<{ success: boolean; data: AuthDetails }>(AUTH_DETAILS_ENDPOINTS.byEmail(email)),
  update: (id: Id, updates: UpdateAuthDetailsInput) =>
    apiClient.put<{ success: boolean; data: AuthDetails }>(AUTH_DETAILS_ENDPOINTS.update(id), updates),
  markLastLogin: (id: Id, ip_address?: string, country?: string) =>
    apiClient.post<{ success: boolean; data: AuthDetails }>(
      AUTH_DETAILS_ENDPOINTS.lastLogin(id),
      { ...(ip_address ? { ip_address } : {}), ...(country ? { country } : {}) }
    ),
  setResetToken: (id: Id, token: string, token_expiry: string) =>
    apiClient.post<{ success: boolean; data: AuthDetails }>(
      AUTH_DETAILS_ENDPOINTS.setResetToken(id),
      { token, token_expiry }
    ),
  setOtp: (id: Id, otp: string, token_expiry?: string) =>
    apiClient.post<{ success: boolean; data: AuthDetails }>(
      AUTH_DETAILS_ENDPOINTS.setOtp(id),
      { otp, ...(token_expiry ? { token_expiry } : {}) }
    ),
}

// Settings API
export interface SettingsPayload {
  businessInformation?: {
    companyName?: string
    registrationNumber?: string
    website?: string
    phone?: string
    supportEmail?: string
    logoUrl?: string
  }
  companyAddress?: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  taxInformation?: {
    trn?: string
    vatNumber?: string
  }
  themeColors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  emailSettings?: {
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpFrom?: string
    secure?: boolean
  }
  notificationSettings?: {
    emailEnabled?: boolean
    pushEnabled?: boolean
  }
}

export const SettingsAPI = {
  get: () => apiClient.get<{ success: boolean; data: any }>(SETTINGS_ENDPOINTS.base),
  update: (payload: SettingsPayload) =>
    apiClient.put<{ success: boolean; data: any }>(SETTINGS_ENDPOINTS.base, payload),
}

// Inventory API
export interface InventoryItem {
  _id: string
  product_id?: string
  sku: string
  product_name: string
  category?: string
  description?: string
  unit_cost: number
  selling_price: number
  quantity_on_hand: number
  reorder_level?: number
  reorder_quantity?: number
  opening_stock?: number
  inventory_valuation_method: 'FIFO' | 'Weighted Average'
  tax_percent?: number
  is_active: boolean
  
  // Legacy fields for backward compatibility
  serialNumber?: string
  name?: string
  supplier?: string | Supplier
  qty?: number
  productionDate?: string
  expiryDate?: string
  unit?: string
  brand?: string | Brand
  costPrice?: number
  vat?: number
  status?: 'normal' | 'pending_purchase' | 'pending_delivery'
  
  // Material cost components
  priceInclusiveMaterialCost?: boolean
  materialCostComponents?: Array<{
    account_id: string
    account_name: string
    amount: number
    description?: string
  }>
  
  // Price history fields
  average_purchase_price?: number
  purchase_count?: number
  price_history_count?: number
  
  // Quantity tracking fields
  qty_sold?: number
  total_qty?: number
  
  createdAt: string
  updatedAt: string
}

export interface InventoryInput {
  sku: string
  product_name: string
  category?: string
  description?: string
  unit_cost: number
  selling_price: number
  quantity_on_hand?: number
  reorder_level?: number
  reorder_quantity?: number
  opening_stock?: number
  inventory_valuation_method?: 'FIFO' | 'Weighted Average'
  tax_percent?: number
  is_active?: boolean
  
  // Legacy fields for backward compatibility
  serialNumber?: string
  name?: string
  supplier?: string
  qty?: number
  productionDate?: string
  expiryDate?: string
  unit?: string
  brand?: string
  costPrice?: number
  vat?: number
  status?: 'normal' | 'pending_purchase' | 'pending_delivery'
  
  // Material cost components
  priceInclusiveMaterialCost?: boolean
  materialCostComponents?: Array<{
    account_id: string
    account_name: string
    amount: number
    description?: string
  }>
}

export interface InventoryTransaction {
  _id: string
  product_id: string | InventoryItem
  type: 'purchase' | 'sale' | 'adjustment_in' | 'adjustment_out' | 'return_in' | 'return_out'
  reference: string
  reference_id?: string
  quantity: number
  unit_cost: number
  total_cost: number
  date: string
  notes?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface StockAdjustmentInput {
  product_id: string
  type: 'adjustment_in' | 'adjustment_out'
  quantity: number
  unit_cost: number
  notes?: string
  reference?: string
}

export const InventoryAPI = {
  list: (params?: any) =>
    apiClient.get<{ success: boolean; data: InventoryItem[] }>(INVENTORY_ENDPOINTS.list, {
      params,
    }),
  create: (payload: InventoryInput) =>
    apiClient.post<{ success: boolean; data: InventoryItem }>(INVENTORY_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: InventoryItem }>(INVENTORY_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<InventoryInput>) =>
    apiClient.put<{ success: boolean; data: InventoryItem }>(INVENTORY_ENDPOINTS.update(id), payload),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(INVENTORY_ENDPOINTS.delete(id)),
  adjustStock: (payload: StockAdjustmentInput) =>
    apiClient.post<{ success: boolean; data: { transaction: InventoryTransaction; inventory: InventoryItem } }>(
      INVENTORY_ENDPOINTS.adjustStock,
      payload
    ),
  getTransactions: (params?: { product_id?: string; type?: string; startDate?: string; endDate?: string }) =>
    apiClient.get<{ success: boolean; data: InventoryTransaction[] }>(INVENTORY_ENDPOINTS.transactions, {
      params,
    }),
  getLowStock: () =>
    apiClient.get<{ success: boolean; data: InventoryItem[] }>(INVENTORY_ENDPOINTS.lowStock),
  getPriceHistory: (id: Id) =>
    apiClient.get<{ success: boolean; data: { averagePrice: number; purchaseCount: number; totalQuantity: number; priceHistory: Array<{ date: string; unit_cost: number; quantity: number; reference: string }> } }>(
      INVENTORY_ENDPOINTS.priceHistory(id)
    ),
}

// Sales Invoice API
export interface SalesInvoiceLineItem {
  product: string
  description?: string
  quantity: number
  unit_price: number
  total: number
  discount?: number
  vat?: number
}
export interface SalesInvoice {
  _id: string
  invoice_number: string
  customer_id: string | { _id: string; name: string }
  invoice_date: string
  due_date: string
  line_items: SalesInvoiceLineItem[]
  subtotal: number
  tax_amount: number
  discount: number
  total_amount: number
  currency: string
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  balance_due: number
  payment_terms?: string
  notes?: string
  receivable_id?: string | { _id: string; invoice_number: string }
  payment_method?: string
  reference_number?: string
  trn?: string
  isExportInvoice?: boolean // true = Export Invoice (no VAT), false = Local Invoice (with VAT)
  createdAt: string
  updatedAt: string
}
export type SalesInvoiceInput = Omit<SalesInvoice, '_id' | 'createdAt' | 'updatedAt' | 'customer_id' | 'receivable_id'> & {
  customer_id: string
}
export interface ApplyPaymentInput {
  date: string
  amount: number
  payment_method?: string
  reference_number?: string
  notes?: string
}
export const SalesInvoiceAPI = {
  list: (params?: any) =>
    apiClient.get<{ success: boolean; data: SalesInvoice[] }>(SALES_INVOICE_ENDPOINTS.list, {
      params,
    }),
  create: (payload: SalesInvoiceInput) =>
    apiClient.post<{ success: boolean; data: SalesInvoice }>(SALES_INVOICE_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: SalesInvoice }>(SALES_INVOICE_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<SalesInvoiceInput>) =>
    apiClient.put<{ success: boolean; data: SalesInvoice }>(SALES_INVOICE_ENDPOINTS.update(id), payload),
  updatePaymentStatus: (id: Id, payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue') =>
    apiClient.patch<{ success: boolean; data: SalesInvoice }>(SALES_INVOICE_ENDPOINTS.updatePaymentStatus(id), { payment_status }),
  applyPayment: (id: Id, payment: ApplyPaymentInput) =>
    apiClient.post<{ success: boolean; data: { invoice: SalesInvoice; receivable: any; message: string } }>(
      SALES_INVOICE_ENDPOINTS.applyPayment(id),
      payment
    ),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(SALES_INVOICE_ENDPOINTS.delete(id)),
  generateShareLink: (id: Id) =>
    apiClient.post<{ success: boolean; data: { shareUrl: string; token: string; expiresAt: string } }>(
      SALES_INVOICE_ENDPOINTS.generateShareLink(id)
    ),
  getByShareToken: (token: string) =>
    apiClient.get<{ success: boolean; data: SalesInvoice }>(SALES_INVOICE_ENDPOINTS.getByShareToken(token)),
  getQrCode: (id: Id) =>
    apiClient.get<{ success: boolean; data: { qrData: string; qrImage: string } }>(SALES_INVOICE_ENDPOINTS.getQrCode(id)),
}

// Sales Invoice Template API
export interface SalesInvoiceTemplate {
  _id: string
  name: string
  description?: string
  isDefault?: boolean
  layout?: any
  styling?: any
  fieldsVisibility?: any
  customFields?: any
  design?: {
    pageWidth?: number
    pageHeight?: number
    elements: Array<{
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
      style?: any
      imageUrl?: string
      imageData?: string
      tableConfig?: any
    }>
  }
  companyNameEn?: string
  companyNameAr?: string
  companyAddressEn?: string
  companyAddressAr?: string
  companyContactEn?: string
  companyContactAr?: string
  footerTextEn?: string
  footerTextAr?: string
  logo?: string
  createdAt: string
  updatedAt: string
}
export type SalesInvoiceTemplateInput = Omit<SalesInvoiceTemplate, '_id' | 'createdAt' | 'updatedAt'>
export const SalesInvoiceTemplateAPI = {
  list: () =>
    apiClient.get<{ success: boolean; data: SalesInvoiceTemplate[] }>(SALES_INVOICE_TEMPLATE_ENDPOINTS.list),
  getDefault: () =>
    apiClient.get<{ success: boolean; data: SalesInvoiceTemplate }>(SALES_INVOICE_TEMPLATE_ENDPOINTS.default),
  create: (payload: SalesInvoiceTemplateInput) =>
    apiClient.post<{ success: boolean; data: SalesInvoiceTemplate }>(
      SALES_INVOICE_TEMPLATE_ENDPOINTS.create,
      payload
    ),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: SalesInvoiceTemplate }>(
      SALES_INVOICE_TEMPLATE_ENDPOINTS.byId(id)
    ),
  update: (id: Id, payload: Partial<SalesInvoiceTemplateInput>) =>
    apiClient.put<{ success: boolean; data: SalesInvoiceTemplate }>(
      SALES_INVOICE_TEMPLATE_ENDPOINTS.update(id),
      payload
    ),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(SALES_INVOICE_TEMPLATE_ENDPOINTS.delete(id)),
  setDefault: (id: Id) =>
    apiClient.patch<{ success: boolean; data: SalesInvoiceTemplate }>(
      SALES_INVOICE_TEMPLATE_ENDPOINTS.setDefault(id)
    ),
}

// Purchase Invoice API
export interface PurchaseInvoiceLineItem {
  product: string
  description?: string
  quantity: number
  unit_cost: number
  total: number
  discount?: number
  vat?: number
}
export interface PurchaseInvoice {
  _id: string
  invoice_number: string
  vendor_id: string | { _id: string; name: string }
  invoice_date: string
  due_date: string
  line_items: PurchaseInvoiceLineItem[]
  subtotal: number
  tax_amount: number
  discount: number
  total_amount: number
  currency: string
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  balance_due: number
  payment_terms?: string
  notes?: string
  payable_id?: string | { _id: string; bill_number: string }
  payment_method?: string
  reference_number?: string
  trn?: string
  createdAt: string
  updatedAt: string
}
export type PurchaseInvoiceInput = Omit<PurchaseInvoice, '_id' | 'createdAt' | 'updatedAt' | 'vendor_id' | 'payable_id'> & {
  vendor_id: string
}
export interface ApplyPaymentInput {
  date: string
  amount: number
  payment_method?: string
  reference_number?: string
  notes?: string
}
export const PurchaseInvoiceAPI = {
  list: (params?: any) =>
    apiClient.get<{ success: boolean; data: PurchaseInvoice[] }>(PURCHASE_INVOICE_ENDPOINTS.list, {
      params,
    }),
  create: (payload: PurchaseInvoiceInput) =>
    apiClient.post<{ success: boolean; data: PurchaseInvoice }>(
      PURCHASE_INVOICE_ENDPOINTS.create,
      payload
    ),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: PurchaseInvoice }>(PURCHASE_INVOICE_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<PurchaseInvoiceInput>) =>
    apiClient.put<{ success: boolean; data: PurchaseInvoice }>(
      PURCHASE_INVOICE_ENDPOINTS.update(id),
      payload
    ),
  updatePaymentStatus: (id: Id, payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue') =>
    apiClient.patch<{ success: boolean; data: PurchaseInvoice }>(PURCHASE_INVOICE_ENDPOINTS.updatePaymentStatus(id), { payment_status }),
  applyPayment: (id: Id, payment: ApplyPaymentInput) =>
    apiClient.post<{ success: boolean; data: { invoice: PurchaseInvoice; payable: any; message: string } }>(
      PURCHASE_INVOICE_ENDPOINTS.applyPayment(id),
      payment
    ),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(PURCHASE_INVOICE_ENDPOINTS.delete(id)),
  generateShareLink: (id: Id) =>
    apiClient.post<{ success: boolean; data: { shareUrl: string; token: string; expiresAt: string } }>(
      PURCHASE_INVOICE_ENDPOINTS.generateShareLink(id)
    ),
  getByShareToken: (token: string) =>
    apiClient.get<{ success: boolean; data: PurchaseInvoice }>(PURCHASE_INVOICE_ENDPOINTS.getByShareToken(token)),
  getQrCode: (id: Id) =>
    apiClient.get<{ success: boolean; data: { qrData: string; qrImage: string } }>(PURCHASE_INVOICE_ENDPOINTS.getQrCode(id)),
}

// Purchase Invoice Template API
export interface PurchaseInvoiceTemplate {
  _id: string
  name: string
  description?: string
  isDefault?: boolean
  layout?: any
  styling?: any
  fieldsVisibility?: any
  customFields?: any
  design?: any // Can be old format (with elements) or new SimpleInvoiceTemplate format | SimpleInvoiceTemplate
  companyNameEn?: string
  companyNameAr?: string
  companyAddressEn?: string
  companyAddressAr?: string
  companyContactEn?: string
  companyContactAr?: string
  footerTextEn?: string
  footerTextAr?: string
  logo?: string
  createdAt: string
  updatedAt: string
}
export type PurchaseInvoiceTemplateInput = Omit<PurchaseInvoiceTemplate, '_id' | 'createdAt' | 'updatedAt'>
export const PurchaseInvoiceTemplateAPI = {
  list: () =>
    apiClient.get<{ success: boolean; data: PurchaseInvoiceTemplate[] }>(
      PURCHASE_INVOICE_TEMPLATE_ENDPOINTS.list
    ),
  getDefault: () =>
    apiClient.get<{ success: boolean; data: PurchaseInvoiceTemplate }>(
      PURCHASE_INVOICE_TEMPLATE_ENDPOINTS.default
    ),
  create: (payload: PurchaseInvoiceTemplateInput) =>
    apiClient.post<{ success: boolean; data: PurchaseInvoiceTemplate }>(
      PURCHASE_INVOICE_TEMPLATE_ENDPOINTS.create,
      payload
    ),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: PurchaseInvoiceTemplate }>(
      PURCHASE_INVOICE_TEMPLATE_ENDPOINTS.byId(id)
    ),
  update: (id: Id, payload: Partial<PurchaseInvoiceTemplateInput>) =>
    apiClient.put<{ success: boolean; data: PurchaseInvoiceTemplate }>(
      PURCHASE_INVOICE_TEMPLATE_ENDPOINTS.update(id),
      payload
    ),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(
      PURCHASE_INVOICE_TEMPLATE_ENDPOINTS.delete(id)
    ),
  setDefault: (id: Id) =>
    apiClient.patch<{ success: boolean; data: PurchaseInvoiceTemplate }>(
      PURCHASE_INVOICE_TEMPLATE_ENDPOINTS.setDefault(id)
    ),
}

// Expense API
export interface ExpenseItem {
  _id: string
  expense_id: string
  category: string
  vendor_id?: string | { _id: string; name: string }
  amount: number
  currency: string
  expense_date: string
  payment_method?: string
  reference_number?: string
  tax_amount: number
  description?: string
  attachments?: string[]
  created_by: string | { _id: string; name: string; email: string }
  associated_account: string
  status: string // Payment status (e.g., 'paid', 'unpaid', 'partial', etc.)
  payable_id?: string | { _id: string; bill_number: string }
  payment_terms?: string // Payment terms (e.g., Net 30, Due on receipt, etc.)
  notes?: string // Additional notes or comments
  createdAt: string
  updatedAt: string
}
export type ExpenseInput = Omit<ExpenseItem, '_id' | 'createdAt' | 'updatedAt' | 'created_by' | 'payable_id'> & {
  vendor_id?: string
}
export const ExpenseAPI = {
  list: (params?: any) =>
    apiClient.get<{ success: boolean; data: ExpenseItem[] }>(EXPENSE_ENDPOINTS.list, { params }),
  create: (formData: FormData) =>
    apiClient.post<{ success: boolean; data: ExpenseItem }>(
      EXPENSE_ENDPOINTS.create,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: ExpenseItem }>(EXPENSE_ENDPOINTS.byId(id)),
  update: (id: Id, formData: FormData) =>
    apiClient.put<{ success: boolean; data: ExpenseItem }>(
      EXPENSE_ENDPOINTS.update(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  updateStatus: (id: Id, status: 'paid' | 'unpaid') =>
    apiClient.patch<{ success: boolean; data: ExpenseItem }>(EXPENSE_ENDPOINTS.updateStatus(id), { status }),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(EXPENSE_ENDPOINTS.delete(id)),
  downloadAttachment: (id: Id, index?: number) =>
    apiClient.get(EXPENSE_ENDPOINTS.attachment(id), { 
      params: index !== undefined ? { index } : {},
      responseType: 'blob' 
    }),
  generateZipLink: (id: Id) =>
    apiClient.post<{ success: boolean; data: { downloadUrl: string; expiresAt: string | null; token?: string } }>(
      EXPENSE_ENDPOINTS.generateZipLink(id)
    ),
  downloadZip: (token: string) =>
    apiClient.get(EXPENSE_ENDPOINTS.downloadZip(token), { responseType: 'blob' }),
}

// Receivable API
// Shared Payment interface (used by both Receivable and Payable)
export interface Payment {
  _id?: string
  date: string
  amount: number
  paymentMethod?: string
  referenceNumber?: string
  notes?: string
  createdAt?: string
}

export interface ReceivableItem {
  _id: string
  customer_id: string | Customer
  invoice_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  tax_amount: number
  currency: string
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  balance_due: number
  credit_limit?: number
  payment_terms?: string
  notes?: string
  payments: Payment[]
  createdAt: string
  updatedAt: string
}

export interface ReceivableInput {
  customer_id: string
  invoice_number: string
  invoice_date: string | Date
  due_date: string | Date
  total_amount: number
  tax_amount?: number
  currency?: string
  credit_limit?: number
  payment_terms?: string
  notes?: string
}

export interface PaymentInput {
  date: string | Date
  amount: number
  paymentMethod?: string
  referenceNumber?: string
  notes?: string
}

export const ReceivableAPI = {
  list: (params?: any) =>
    apiClient.get<{ success: boolean; data: ReceivableItem[] }>(RECEIVABLE_ENDPOINTS.list, { params }),
  create: (payload: ReceivableInput) =>
    apiClient.post<{ success: boolean; data: ReceivableItem }>(RECEIVABLE_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: ReceivableItem }>(RECEIVABLE_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<ReceivableInput>) =>
    apiClient.put<{ success: boolean; data: ReceivableItem }>(RECEIVABLE_ENDPOINTS.update(id), payload),
  updateStatus: (id: Id, status: 'unpaid' | 'partial' | 'paid' | 'overdue') =>
    apiClient.patch<{ success: boolean; data: ReceivableItem }>(RECEIVABLE_ENDPOINTS.updateStatus(id), { status }),
  recordPayment: (id: Id, payload: PaymentInput) =>
    apiClient.post<{ success: boolean; data: ReceivableItem }>(RECEIVABLE_ENDPOINTS.recordPayment(id), payload),
  close: (id: Id) =>
    apiClient.post<{ success: boolean; data: ReceivableItem }>(RECEIVABLE_ENDPOINTS.close(id)),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(RECEIVABLE_ENDPOINTS.delete(id)),
}

// Payable API (Payment Out)
// Payment interface is defined above (shared between Receivable and Payable)
export interface PayableItem {
  _id: string
  vendor_id: string | Supplier
  bill_number: string
  bill_date: string
  due_date: string
  total_amount: number
  tax_amount: number
  currency: string
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  balance_due: number
  payment_terms?: string
  notes?: string
  payments: Payment[]
  createdAt: string
  updatedAt: string
}

export interface PayableInput {
  vendor_id: string
  bill_number: string
  bill_date: string | Date
  due_date: string | Date
  total_amount: number
  tax_amount?: number
  currency?: string
  payment_terms?: string
  notes?: string
}

// PaymentInput interface is defined above (shared between Receivable and Payable)

export const PayableAPI = {
  list: (params?: any) =>
    apiClient.get<{ success: boolean; data: PayableItem[] }>(PAYABLE_ENDPOINTS.list, { params }),
  create: (payload: PayableInput) =>
    apiClient.post<{ success: boolean; data: PayableItem }>(PAYABLE_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: PayableItem }>(PAYABLE_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<PayableInput>) =>
    apiClient.put<{ success: boolean; data: PayableItem }>(PAYABLE_ENDPOINTS.update(id), payload),
  updateStatus: (id: Id, status: 'unpaid' | 'partial' | 'paid' | 'overdue') =>
    apiClient.patch<{ success: boolean; data: PayableItem }>(PAYABLE_ENDPOINTS.updateStatus(id), { status }),
  recordPayment: (id: Id, payload: PaymentInput) =>
    apiClient.post<{ success: boolean; data: PayableItem }>(PAYABLE_ENDPOINTS.recordPayment(id), payload),
  close: (id: Id) =>
    apiClient.post<{ success: boolean; data: PayableItem }>(PAYABLE_ENDPOINTS.close(id)),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(PAYABLE_ENDPOINTS.delete(id)),
}

// Delivery Order API
export interface DeliveryOrderLineItem {
  product: string | { _id: string; name?: string; serialNumber?: string } // Can be ObjectId string or populated Inventory object
  qty: number
  delivered: boolean
}
export interface DeliveryOrderItem {
  _id: string
  serialNumber: string
  invoiceNumber: string
  date: string
  customer: string
  deliveryAddress?: string
  lineItems: DeliveryOrderLineItem[]
  attachments?: string[]
  attachment?: string // Legacy support
  createdAt: string
  updatedAt: string
}
export type DeliveryOrderInput = Omit<DeliveryOrderItem, '_id' | 'createdAt' | 'updatedAt'>
export const DeliveryOrderAPI = {
  list: (params?: any) =>
    apiClient.get<{ success: boolean; data: DeliveryOrderItem[] }>(DELIVERY_ORDER_ENDPOINTS.list, {
      params,
    }),
  create: (formData: FormData) =>
    apiClient.post<{ success: boolean; data: DeliveryOrderItem }>(
      DELIVERY_ORDER_ENDPOINTS.create,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: DeliveryOrderItem }>(DELIVERY_ORDER_ENDPOINTS.byId(id)),
  update: (id: Id, formData: FormData) =>
    apiClient.put<{ success: boolean; data: DeliveryOrderItem }>(
      DELIVERY_ORDER_ENDPOINTS.update(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(DELIVERY_ORDER_ENDPOINTS.delete(id)),
  bulkDelete: (ids: string[]) =>
    apiClient.post<{ success: boolean; message: string }>(
      DELIVERY_ORDER_ENDPOINTS.bulkDelete,
      { ids }
    ),
  downloadAttachment: (id: Id, index?: number) =>
    apiClient.get(DELIVERY_ORDER_ENDPOINTS.attachment(id), { 
      params: index !== undefined ? { index } : {},
      responseType: 'blob' 
    }),
  generateZipLink: (id: Id) =>
    apiClient.post<{ success: boolean; data: { downloadUrl: string; expiresAt: string | null; token?: string } }>(
      DELIVERY_ORDER_ENDPOINTS.generateZipLink(id)
    ),
  downloadZip: (token: string) =>
    apiClient.get(DELIVERY_ORDER_ENDPOINTS.downloadZip(token), { responseType: 'blob' }),
}

// Delivery Order Template API
export interface DeliveryOrderTemplate {
  _id: string
  name: string
  description?: string
  isDefault?: boolean
  layout?: any
  styling?: any
  fieldsVisibility?: any
  customFields?: any
  design?: any // Can be old format (with elements) or new SimpleInvoiceTemplate format | SimpleInvoiceTemplate
  companyNameEn?: string
  companyNameAr?: string
  companyAddressEn?: string
  companyAddressAr?: string
  companyContactEn?: string
  companyContactAr?: string
  footerTextEn?: string
  footerTextAr?: string
  logo?: string
  createdAt: string
  updatedAt: string
}
export type DeliveryOrderTemplateInput = Omit<DeliveryOrderTemplate, '_id' | 'createdAt' | 'updatedAt'>
export const DeliveryOrderTemplateAPI = {
  list: () =>
    apiClient.get<{ success: boolean; data: DeliveryOrderTemplate[] }>(
      DELIVERY_ORDER_TEMPLATE_ENDPOINTS.list
    ),
  getDefault: () =>
    apiClient.get<{ success: boolean; data: DeliveryOrderTemplate }>(
      DELIVERY_ORDER_TEMPLATE_ENDPOINTS.default
    ),
  create: (payload: DeliveryOrderTemplateInput) =>
    apiClient.post<{ success: boolean; data: DeliveryOrderTemplate }>(
      DELIVERY_ORDER_TEMPLATE_ENDPOINTS.create,
      payload
    ),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: DeliveryOrderTemplate }>(
      DELIVERY_ORDER_TEMPLATE_ENDPOINTS.byId(id)
    ),
  update: (id: Id, payload: Partial<DeliveryOrderTemplateInput>) =>
    apiClient.put<{ success: boolean; data: DeliveryOrderTemplate }>(
      DELIVERY_ORDER_TEMPLATE_ENDPOINTS.update(id),
      payload
    ),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(
      DELIVERY_ORDER_TEMPLATE_ENDPOINTS.delete(id)
    ),
  setDefault: (id: Id) =>
    apiClient.patch<{ success: boolean; data: DeliveryOrderTemplate }>(
      DELIVERY_ORDER_TEMPLATE_ENDPOINTS.setDefault(id)
    ),
}

// Supplier API
export interface Supplier {
  _id: string
  name: string
  email?: string
  phone?: string
  trn?: string
  address?: string
  createdAt: string
  updatedAt: string
}

export interface SupplierInput {
  name: string
  email?: string
  phone?: string
  trn?: string
  address?: string
}

export const SupplierAPI = {
  list: (params?: { q?: string }) =>
    apiClient.get<{ success: boolean; data: Supplier[] }>(SUPPLIER_ENDPOINTS.list, { params }),
  create: (payload: SupplierInput) =>
    apiClient.post<{ success: boolean; data: Supplier }>(SUPPLIER_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: Supplier }>(SUPPLIER_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<SupplierInput>) =>
    apiClient.put<{ success: boolean; data: Supplier }>(SUPPLIER_ENDPOINTS.update(id), payload),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(SUPPLIER_ENDPOINTS.delete(id)),
}

// Brand API
export interface Brand {
  _id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface BrandInput {
  name: string
  description?: string
}

export const BrandAPI = {
  list: (params?: { q?: string }) =>
    apiClient.get<{ success: boolean; data: Brand[] }>(BRAND_ENDPOINTS.list, { params }),
  create: (payload: BrandInput) =>
    apiClient.post<{ success: boolean; data: Brand }>(BRAND_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: Brand }>(BRAND_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<BrandInput>) =>
    apiClient.put<{ success: boolean; data: Brand }>(BRAND_ENDPOINTS.update(id), payload),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(BRAND_ENDPOINTS.delete(id)),
}

// Customer API
export interface Customer {
  _id: string
  name: string
  email?: string
  phone?: string
  trn?: string
  address?: string
  createdAt: string
  updatedAt: string
}

export interface CustomerInput {
  name: string
  email?: string
  phone?: string
  trn?: string
  address?: string
}

export const CustomerAPI = {
  list: (params?: { q?: string }) =>
    apiClient.get<{ success: boolean; data: Customer[] }>(CUSTOMER_ENDPOINTS.list, { params }),
  create: (payload: CustomerInput) =>
    apiClient.post<{ success: boolean; data: Customer }>(CUSTOMER_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: Customer }>(CUSTOMER_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<CustomerInput>) =>
    apiClient.put<{ success: boolean; data: Customer }>(CUSTOMER_ENDPOINTS.update(id), payload),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(CUSTOMER_ENDPOINTS.delete(id)),
}

// Expense Type API
export interface ExpenseType {
  _id: string
  name: string
  description?: string
  recurring?: boolean
  createdAt: string
  updatedAt: string
}

// ExpenseType API has been deprecated; existing types are kept for legacy data only.

// Unit API
export interface Unit {
  _id: string
  name: string
  symbol?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface UnitInput {
  name: string
  symbol?: string
  description?: string
}

export const UnitAPI = {
  list: (params?: { q?: string }) =>
    apiClient.get<{ success: boolean; data: Unit[] }>(UNIT_ENDPOINTS.list, { params }),
  create: (payload: UnitInput) =>
    apiClient.post<{ success: boolean; data: Unit }>(UNIT_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: Unit }>(UNIT_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<UnitInput>) =>
    apiClient.put<{ success: boolean; data: Unit }>(UNIT_ENDPOINTS.update(id), payload),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(UNIT_ENDPOINTS.delete(id)),
}

// Currency API
export interface Currency {
  _id: string
  code: string
  name: string
  symbol?: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CurrencyInput {
  code: string
  name: string
  symbol?: string
  isDefault?: boolean
  isActive?: boolean
}

export const CurrencyAPI = {
  list: (params?: { activeOnly?: boolean }) =>
    apiClient.get<{ success: boolean; data: Currency[] }>(CURRENCY_ENDPOINTS.list, { params }),
  create: (payload: CurrencyInput) =>
    apiClient.post<{ success: boolean; data: Currency }>(CURRENCY_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: Currency }>(CURRENCY_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<CurrencyInput>) =>
    apiClient.put<{ success: boolean; data: Currency }>(CURRENCY_ENDPOINTS.update(id), payload),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(CURRENCY_ENDPOINTS.delete(id)),
}

// Payment Method API
export interface PaymentMethod {
  _id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PaymentMethodInput {
  name: string
  description?: string
  isActive?: boolean
}

export const PaymentMethodAPI = {
  list: (params?: { activeOnly?: boolean }) =>
    apiClient.get<{ success: boolean; data: PaymentMethod[] }>(PAYMENT_METHOD_ENDPOINTS.list, { params }),
  create: (payload: PaymentMethodInput) =>
    apiClient.post<{ success: boolean; data: PaymentMethod }>(PAYMENT_METHOD_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: PaymentMethod }>(PAYMENT_METHOD_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<PaymentMethodInput>) =>
    apiClient.put<{ success: boolean; data: PaymentMethod }>(PAYMENT_METHOD_ENDPOINTS.update(id), payload),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(PAYMENT_METHOD_ENDPOINTS.delete(id)),
}

// Payment Status API
export interface PaymentStatus {
  _id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PaymentStatusInput {
  name: string
  description?: string
  isActive?: boolean
}

export const PaymentStatusAPI = {
  list: (params?: { activeOnly?: boolean }) =>
    apiClient.get<{ success: boolean; data: PaymentStatus[] }>(PAYMENT_STATUS_ENDPOINTS.list, { params }),
  create: (payload: PaymentStatusInput) =>
    apiClient.post<{ success: boolean; data: PaymentStatus }>(PAYMENT_STATUS_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: PaymentStatus }>(PAYMENT_STATUS_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<PaymentStatusInput>) =>
    apiClient.put<{ success: boolean; data: PaymentStatus }>(PAYMENT_STATUS_ENDPOINTS.update(id), payload),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(PAYMENT_STATUS_ENDPOINTS.delete(id)),
}

// Account API (Chart of Accounts)
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'

export type AccountSubType =
  | 'Current Asset'
  | 'Non-Current Asset'
  | 'Contra Asset'
  | 'Current Liability'
  | 'Non-Current Liability'
  | 'Owner Capital'
  | 'Retained Earnings'
  | 'Reserves'
  | 'Operating Revenue'
  | 'Non-Operating Revenue'
  | 'Operating Expense'
  | 'Non-Operating Expense'
  | 'COGS'

export interface Account {
  _id: string
  account_id: string
  account_name: string
  account_type: AccountType
  account_sub_type?: AccountSubType
  parent_account_id?: string | { _id: string; account_name: string }
  account_code?: string
  description?: string
  is_system_account: boolean
  is_active: boolean
  opening_balance: number
  current_balance: number
  currency: string
  createdAt: string
  updatedAt: string
}

export interface AccountInput {
  account_name: string
  account_type: AccountType
  account_sub_type?: AccountSubType
  parent_account_id?: string
  account_code?: string
  description?: string
  is_system_account?: boolean
  is_active?: boolean
  opening_balance?: number
  currency?: string
}

export const AccountAPI = {
  list: (params?: { q?: string; account_type?: AccountType; is_active?: boolean }) =>
    apiClient.get<{ success: boolean; data: Account[] }>(ACCOUNT_ENDPOINTS.list, { params }),
  create: (payload: AccountInput) =>
    apiClient.post<{ success: boolean; data: Account }>(ACCOUNT_ENDPOINTS.create, payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: Account }>(ACCOUNT_ENDPOINTS.byId(id)),
  getByAccountId: (accountId: string) =>
    apiClient.get<{ success: boolean; data: Account }>(ACCOUNT_ENDPOINTS.byAccountId(accountId)),
  update: (id: Id, payload: Partial<AccountInput>) =>
    apiClient.put<{ success: boolean; data: Account }>(ACCOUNT_ENDPOINTS.update(id), payload),
  updateOpeningBalance: (id: Id, opening_balance: number) =>
    apiClient.patch<{ success: boolean; data: Account }>(ACCOUNT_ENDPOINTS.updateOpeningBalance(id), { opening_balance }),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(ACCOUNT_ENDPOINTS.delete(id)),
}

// Ledger (Journal Entry) API
export interface JournalEntryLine {
  account_id: string
  account_name: string
  debit: number
  credit: number
  // Legacy fields for backward compatibility
  account?: string
  type?: 'debit' | 'credit'
  amount?: number
}

export interface JournalEntry {
  _id: string
  journal_id?: string
  date: string
  reference?: string
  description: string
  entries: JournalEntryLine[]
  createdBy: {
    _id: string
    name?: string
    email?: string
  }
  source_module?: 'sales_invoice' | 'purchase_invoice' | 'expense' | 'inventory' | 'payable' | 'receivable' | 'payroll' | 'manual'
  attachments?: string[]
  // Legacy fields
  referenceType?: 'Sales' | 'Purchase' | 'Expense' | 'Inventory' | 'Payable' | 'Receivable'
  referenceId?: string
  createdAt: string
  updatedAt: string
}

export interface JournalEntryInput {
  date: string
  reference?: string
  description: string
  entries: JournalEntryLine[]
  source_module?: 'sales_invoice' | 'purchase_invoice' | 'expense' | 'inventory' | 'payable' | 'receivable' | 'payroll' | 'manual'
  attachments?: string[]
  // Legacy fields
  referenceType?: 'Sales' | 'Purchase' | 'Expense' | 'Inventory' | 'Payable' | 'Receivable'
  referenceId?: string
}

export interface JournalEntryFilters {
  startDate?: string
  endDate?: string
  referenceType?: 'Sales' | 'Purchase' | 'Expense' | 'Inventory' | 'Payable' | 'Receivable'
  source_module?: 'sales_invoice' | 'purchase_invoice' | 'expense' | 'inventory' | 'payable' | 'receivable' | 'payroll' | 'manual'
  account?: string
  account_id?: string
}

export const LedgerAPI = {
  list: (params?: JournalEntryFilters) =>
    apiClient.get<{ success: boolean; data: JournalEntry[] }>(LEDGER_ENDPOINTS.list, { params }),
  create: (payload: JournalEntryInput) =>
    apiClient.post<{ success: boolean; data: JournalEntry }>(LEDGER_ENDPOINTS.create, payload),
  update: (id: Id, payload: Partial<JournalEntryInput>) =>
    apiClient.put<{ success: boolean; data: JournalEntry }>(LEDGER_ENDPOINTS.update(id), payload),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: JournalEntry }>(LEDGER_ENDPOINTS.byId(id)),
  getByReference: (referenceType: string, referenceId: string) =>
    apiClient.get<{ success: boolean; data: JournalEntry[] }>(
      LEDGER_ENDPOINTS.byReference(referenceType, referenceId)
    ),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(LEDGER_ENDPOINTS.delete(id)),
  bulkDelete: (ids: string[]) =>
    apiClient.post<{ success: boolean; message: string; data: { deletedCount: number; errors: string[] } }>(
      LEDGER_ENDPOINTS.bulkDelete,
      { ids }
    ),
  regenerate: () =>
    apiClient.post<{ success: boolean; message: string }>(LEDGER_ENDPOINTS.regenerate),
}

// General Ledger API
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'

export interface GeneralLedgerEntry {
  _id: string
  ledger_id?: string
  account_id: string
  account_name: string
  account_type?: AccountType
  account_sub_type?: AccountSubType
  date: string
  debit: number
  credit: number
  running_balance: number
  journal_reference: string
  journal_id?: string
  source_module?: string
  description?: string
  reference?: string
  createdAt: string
  updatedAt: string
}

export interface AccountLedgerSummary {
  account_id: string
  account_name: string
  account_type?: AccountType
  account_sub_type?: AccountSubType
  opening_balance: number
  total_debit: number
  total_credit: number
  closing_balance: number
  entries: GeneralLedgerEntry[]
}

export interface TrialBalanceItem {
  account_id: string
  account_name: string
  account_type?: AccountType
  account_sub_type?: AccountSubType
  debit_balance: number
  credit_balance: number
}

export interface TrialBalance {
  as_of_date: string
  accounts: TrialBalanceItem[]
  total_debit: number
  total_credit: number
  is_balanced: boolean
}

export interface DateRangeSummary {
  start_date: string
  end_date: string
  total_debit: number
  total_credit: number
  entries_count: number
  accounts_affected: number
  by_account_type: {
    [key in AccountType]?: {
      total_debit: number
      total_credit: number
      accounts_count: number
    }
  }
}

export interface LedgerFilters {
  account_id?: string
  account_name?: string
  account_type?: AccountType
  startDate?: string
  endDate?: string
  source_module?: string
}

export interface Account {
  account_id: string
  account_name: string
  account_type?: AccountType
}

export const GeneralLedgerAPI = {
  list: (params?: LedgerFilters) =>
    apiClient.get<{ success: boolean; data: GeneralLedgerEntry[] }>(GENERAL_LEDGER_ENDPOINTS.list, { params }),
  getAccounts: () =>
    apiClient.get<{ success: boolean; data: Account[] }>(GENERAL_LEDGER_ENDPOINTS.accounts),
  getTrialBalance: (asOfDate?: string) =>
    apiClient.get<{ success: boolean; data: TrialBalance }>(GENERAL_LEDGER_ENDPOINTS.trialBalance, {
      params: asOfDate ? { asOfDate } : undefined,
    }),
  getSummary: (startDate: string, endDate: string) =>
    apiClient.get<{ success: boolean; data: DateRangeSummary }>(GENERAL_LEDGER_ENDPOINTS.summary, {
      params: { startDate, endDate },
    }),
  getByAccount: (accountId: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ success: boolean; data: AccountLedgerSummary }>(
      GENERAL_LEDGER_ENDPOINTS.byAccount(accountId),
      { params }
    ),
  get: (id: Id) =>
    apiClient.get<{ success: boolean; data: GeneralLedgerEntry }>(GENERAL_LEDGER_ENDPOINTS.byId(id)),
  update: (id: Id, payload: Partial<GeneralLedgerEntry>) =>
    apiClient.put<{ success: boolean; data: GeneralLedgerEntry; message: string }>(
      GENERAL_LEDGER_ENDPOINTS.update(id),
      payload
    ),
  remove: (id: Id) =>
    apiClient.delete<{ success: boolean; message: string }>(GENERAL_LEDGER_ENDPOINTS.delete(id)),
  bulkDelete: (ids: string[]) =>
    apiClient.post<{ success: boolean; message: string; data: { deletedCount: number; errors: string[] } }>(
      GENERAL_LEDGER_ENDPOINTS.bulkDelete,
      { ids }
    ),
}

// Report API
export type ReportType =
  | 'sales_summary'
  | 'purchase_summary'
  | 'expense_breakdown'
  | 'inventory_valuation'
  | 'profit_loss'
  | 'ledger_summary'
  | 'tax_report'
  | 'ar_aging'
  | 'ap_aging'
  | 'stock_movements'
  | 'cashbook'
  | 'bankbook'
  | 'payment_report'
  | 'receipt_report'
  | 'cogs_report'
  | 'low_stock'

export type GroupBy = 'day' | 'week' | 'month' | 'year' | 'customer' | 'product' | 'supplier' | 'category'

export interface ReportFilters {
  from?: string
  to?: string
  groupBy?: GroupBy
  customer?: string
  supplier?: string
  product?: string
  category?: string
}

export interface ReportData {
  reportType: ReportType
  generatedAt: string
  filters: ReportFilters
  data: Array<{ label: string; [key: string]: any }>
  summary?: { [key: string]: number }
}

export const ReportAPI = {
  get: (type: ReportType, filters?: ReportFilters) => {
    const params: Record<string, string> = {}
    if (filters?.from) params.from = filters.from
    if (filters?.to) params.to = filters.to
    if (filters?.groupBy) params.groupBy = filters.groupBy
    if (filters?.customer) params.customer = filters.customer
    if (filters?.supplier) params.supplier = filters.supplier
    if (filters?.product) params.product = filters.product
    if (filters?.category) params.category = filters.category

    return apiClient.get<{ success: boolean; data: ReportData }>(REPORT_ENDPOINTS.get(type, params))
  },
}

// Financial Statements API
export interface IncomeStatementItem {
  account_id: string
  account_name: string
  amount: number
}

export interface IncomeStatementSection {
  items: IncomeStatementItem[]
  total: number
}

export interface RevenueDetailItem {
  invoice_number: string
  invoice_date: string
  amount: number
}

export interface CogsDetailItem {
  invoice_number: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  vat_amount?: number
}

export interface OperatingExpenseDetailItem {
  expense_id: string
  expense_date: string
  description: string
  category: string
  amount: number
}

export interface IncomeStatement {
  period: {
    start_date: string
    end_date: string
  }
  revenue: IncomeStatementSection
  revenue_detail?: RevenueDetailItem[]
  cogs: IncomeStatementSection
  cogs_detail?: CogsDetailItem[]
  cogs_vat?: number  // Sum of VAT on all goods sold (excluded from Total COGS)
  gross_profit: number
  operating_expenses: IncomeStatementSection
  operating_expenses_detail?: OperatingExpenseDetailItem[]
  operating_income: number
  other_income: IncomeStatementSection
  other_expenses: IncomeStatementSection
  net_income_before_tax: number
  corporate_tax: IncomeStatementSection
  net_income: number
}

export interface BalanceSheetItem {
  account_id: string
  account_name: string
  balance: number
}

export interface BalanceSheet {
  as_of_date: string
  assets: {
    current_assets: BalanceSheetItem[]
    non_current_assets: BalanceSheetItem[]
    contra_assets: BalanceSheetItem[]
    total_current: number
    total_non_current: number
    total_contra: number
    total: number
  }
  liabilities: {
    current_liabilities: BalanceSheetItem[]
    non_current_liabilities: BalanceSheetItem[]
    total_current: number
    total_non_current: number
    total: number
  }
  equity: {
    owner_capital: BalanceSheetItem[]
    retained_earnings: BalanceSheetItem[]
    reserves: BalanceSheetItem[]
    total_owner_capital: number
    total_retained_earnings: number
    total_reserves: number
    total: number
  }
  // Liquidity breakdown: cash/bank/AR/AP/VAT positions derived from current assets/liabilities
  payment_breakdown?: {
    cash_balance: number        // Sum of all cash accounts
    bank_balance: number        // Sum of all bank accounts
    accounts_receivable: number // Outstanding receivables (credit sales not yet collected)
    accounts_payable: number    // Outstanding payables
    vat_payable: number         // Net VAT due to FTA (output - input recoverable)
    net_working_capital: number // Current Assets - Current Liabilities
  }
  is_balanced: boolean
  difference: number
}

export interface CashFlowItem {
  account_id: string
  account_name: string
  amount: number
  description?: string
}

export interface CashFlowStatement {
  period: {
    start_date: string
    end_date: string
  }
  operating_activities: {
    items: CashFlowItem[]
    total: number
  }
  investing_activities: {
    items: CashFlowItem[]
    total: number
  }
  financing_activities: {
    items: CashFlowItem[]
    total: number
  }
  opening_cash: number
  net_cash_movement: number
  closing_cash: number
}

export interface EquityItem {
  account_id: string
  account_name: string
  opening_balance: number
  additions: number
  withdrawals: number
  closing_balance: number
}

export interface StatementOfEquity {
  period: {
    start_date: string
    end_date: string
  }
  opening_equity: number
  net_income: number
  owner_contributions: number
  withdrawals: number
  closing_equity: number
  items: EquityItem[]
}

// Onboarding API
export interface BusinessProfile {
  business_name: string
  country: string
  currency: string
  fiscal_year_start: string
  tax_registration_number?: string
  logo_url?: string
}

export interface OpeningBalance {
  account_id: string
  account_name: string
  balance: number
  account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
}

export interface TaxConfig {
  vat_rate?: number
  gst_rate?: number
  tax_rates: Array<{ name: string; rate: number; account_id?: string }>
  tax_inclusive: boolean
  default_tax_account_id?: string
}

export interface InventoryConfig {
  enabled: boolean
  valuation_method: 'FIFO' | 'Weighted Average'
  opening_stock?: Array<{
    product_name: string
    sku: string
    quantity: number
    unit_cost: number
  }>
}

export interface PaymentMethod {
  name: string
  type: 'cash' | 'bank' | 'mobile' | 'card' | 'other'
  account_id?: string
  is_default: boolean
}

export interface OnboardingStatus {
  business_name: string
  country: string
  currency: string
  fiscal_year_start: string
  chart_of_accounts_initialized: boolean
  opening_balances_set: boolean
  tax_configured: boolean
  inventory_setup: boolean
  payment_methods_setup: boolean
  users_setup: boolean
  integrations_setup: boolean
  is_completed: boolean
}

// Search API
export interface SearchResult {
  type: 'customer' | 'supplier' | 'inventory' | 'sales_invoice' | 'purchase_invoice' | 'expense' | 'receivable' | 'payable' | 'journal_entry'
  id: string
  title: string
  subtitle?: string
  description?: string
  url: string
  icon?: string
}

export const SearchAPI = {
  search: (query: string, limit?: number) =>
    apiClient.get<{ success: boolean; data: SearchResult[] }>(SEARCH_ENDPOINTS.search(query, limit)),
}

export const OnboardingAPI = {
  getStatus: () => apiClient.get<{ success: boolean; data: OnboardingStatus | null }>(ONBOARDING_ENDPOINTS.status),
  saveBusinessProfile: (profile: BusinessProfile) =>
    apiClient.post<{ success: boolean; data: OnboardingStatus }>(ONBOARDING_ENDPOINTS.businessProfile, profile),
  initializeChartOfAccounts: (customAccounts?: any[]) =>
    apiClient.post<{ success: boolean; data: any[] }>(ONBOARDING_ENDPOINTS.chartOfAccounts, { customAccounts }),
  setOpeningBalances: (openingBalances: OpeningBalance[]) =>
    apiClient.post<{ success: boolean; message: string }>(ONBOARDING_ENDPOINTS.openingBalances, { opening_balances: openingBalances }),
  configureTax: (taxConfig: TaxConfig) =>
    apiClient.post<{ success: boolean; message: string }>(ONBOARDING_ENDPOINTS.tax, taxConfig),
  setupInventory: (inventoryConfig: InventoryConfig) =>
    apiClient.post<{ success: boolean; message: string }>(ONBOARDING_ENDPOINTS.inventory, inventoryConfig),
  setupPaymentMethods: (paymentMethods: PaymentMethod[]) =>
    apiClient.post<{ success: boolean; message: string }>(ONBOARDING_ENDPOINTS.paymentMethods, { payment_methods: paymentMethods }),
  complete: () => apiClient.post<{ success: boolean; data: OnboardingStatus; message: string }>(ONBOARDING_ENDPOINTS.complete),
}

export const FinancialStatementsAPI = {
  getIncomeStatement: (startDate: string, endDate: string) =>
    apiClient.get<{ success: boolean; data: IncomeStatement }>(FINANCIAL_STATEMENTS_ENDPOINTS.income, {
      params: { startDate, endDate },
    }),
  getBalanceSheet: (startDate?: string, endDate?: string) =>
    apiClient.get<{ success: boolean; data: BalanceSheet }>(FINANCIAL_STATEMENTS_ENDPOINTS.balanceSheet, {
      params: {
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
    }),
  getCashFlowStatement: (startDate: string, endDate: string) =>
    apiClient.get<{ success: boolean; data: CashFlowStatement }>(FINANCIAL_STATEMENTS_ENDPOINTS.cashflow, {
      params: { startDate, endDate },
    }),
  getStatementOfEquity: (startDate: string, endDate: string) =>
    apiClient.get<{ success: boolean; data: StatementOfEquity }>(FINANCIAL_STATEMENTS_ENDPOINTS.equity, {
      params: { startDate, endDate },
    }),
  getTrialBalance: (asOfDate?: string) =>
    apiClient.get<{ success: boolean; data: TrialBalance }>(FINANCIAL_STATEMENTS_ENDPOINTS.trialBalance, {
      params: asOfDate ? { asOfDate } : undefined,
    }),
}

// Chatbot API
export interface ChatbotMessage {
  message: string
  link?: string
  linkText?: string
}

export const ChatbotAPI = {
  sendMessage: (message: string) =>
    apiClient.post<{ success: boolean; data: ChatbotMessage }>(CHATBOT_ENDPOINTS.sendMessage, { message }),
}


