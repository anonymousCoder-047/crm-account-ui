import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from 'react-error-boundary'
import { App as AntApp } from 'antd'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SafeRoute from './components/SafeRoute'
import ErrorFallback from './components/ErrorFallback'
import DashboardLayout from './components/layout/DashboardLayout'
import Settings from './pages/Settings'
import InventoryManage from './pages/inventory/InventoryManage'
import InventoryCreate from './pages/inventory/InventoryCreate'
import InventoryView from './pages/inventory/InventoryView'
import InventoryEdit from './pages/inventory/InventoryEdit'
import InventoryTransactions from './pages/inventory/InventoryTransactions'
import ExpensesManage from './pages/expenses/ExpensesManage'
import ExpensesCreate from './pages/expenses/ExpensesCreate'
import ExpensesView from './pages/expenses/ExpensesView'
import ExpensesEdit from './pages/expenses/ExpensesEdit'
import ReceivablesManage from './pages/receivables/ReceivablesManage'
import ReceivablesCreate from './pages/receivables/ReceivablesCreate'
import ReceivablesView from './pages/receivables/ReceivablesView'
import ReceivablesEdit from './pages/receivables/ReceivablesEdit'
import PayablesManage from './pages/payables/PayablesManage'
import PayablesCreate from './pages/payables/PayablesCreate'
import PayablesView from './pages/payables/PayablesView'
import PayablesEdit from './pages/payables/PayablesEdit'
import DeliveryOrdersManage from './pages/delivery/DeliveryOrdersManage'
import DeliveryOrdersCreate from './pages/delivery/DeliveryOrdersCreate'
import DeliveryOrderTemplatesManage from './pages/delivery/TemplatesManage'
import SalesDashboard from './pages/sales/SalesDashboard'
import SalesInvoicesManage from './pages/sales/SalesInvoicesManage'
import SalesInvoicesCreate from './pages/sales/SalesInvoicesCreate'
import SalesInvoicesView from './pages/sales/SalesInvoicesView'
import SalesInvoicesEdit from './pages/sales/SalesInvoicesEdit'
import SalesTemplatesManage from './pages/sales/TemplatesManage'
import SalesTemplateView from './pages/sales/SalesTemplateView'
import SalesInvoiceShare from './pages/sales/SalesInvoiceShare'
import PurchaseInvoicesManage from './pages/purchase/PurchaseInvoicesManage'
import PurchaseInvoicesCreate from './pages/purchase/PurchaseInvoicesCreate'
import PurchaseInvoicesView from './pages/purchase/PurchaseInvoicesView'
import PurchaseInvoicesEdit from './pages/purchase/PurchaseInvoicesEdit'
import PurchaseTemplatesManage from './pages/purchase/TemplatesManage'
import PurchaseTemplateView from './pages/purchase/PurchaseTemplateView'
import PurchaseInvoiceShare from './pages/purchase/PurchaseInvoiceShare'
import DeliveryOrdersView from './pages/delivery/DeliveryOrdersView'
import DeliveryOrdersEdit from './pages/delivery/DeliveryOrdersEdit'
import LedgerManage from './pages/ledger/LedgerManage'
import JournalEntryCreate from './pages/ledger/JournalEntryCreate'
import GeneralLedgerManage from './pages/ledger/GeneralLedgerManage'
import AccountLedger from './pages/ledger/AccountLedger'
import TrialBalance from './pages/ledger/TrialBalance'
import IncomeStatement from './pages/financial-statements/IncomeStatement'
import BalanceSheet from './pages/financial-statements/BalanceSheet'
import CashFlowStatement from './pages/financial-statements/CashFlowStatement'
import StatementOfEquity from './pages/financial-statements/StatementOfEquity'
import VAT201ReturnDashboard from './pages/financial-statements/VAT201ReturnDashboard'
import OnboardingWizard from './pages/onboarding/OnboardingWizard'
import SuppliersManage from './pages/crm-settings/SuppliersManage'
import CustomersManage from './pages/crm-settings/CustomersManage'
import UnitsManage from './pages/crm-settings/UnitsManage'
import BrandsManage from './pages/crm-settings/BrandsManage'
import PaymentMethodsManage from './pages/crm-settings/PaymentMethodsManage'
import PaymentStatusesManage from './pages/crm-settings/PaymentStatusesManage'
import ChartOfAccountsManage from './pages/crm-settings/ChartOfAccountsManage'
import OpeningBalanceManage from './pages/crm-settings/OpeningBalanceManage'
import UsersManage from './pages/admin/UsersManage'
import UserForm from './pages/admin/UserForm'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
import ServerError from './pages/ServerError'
import Unauthorized from './pages/Unauthorized'

function App() {
  const location = useLocation()

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('App-level error:', error, errorInfo)
        // Log to error reporting service
      }}
    >
      <AntApp>
        <AuthProvider>
          <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <SafeRoute>
                  <Login />
                </SafeRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <SafeRoute>
                  <ForgotPassword />
                </SafeRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <SafeRoute>
                  <ResetPassword />
                </SafeRoute>
              }
            />
            <Route
              path="/onboarding"
              element={<OnboardingWizard />}
            />

            {/* Error pages */}
            <Route
              path="/unauthorized"
              element={
                <SafeRoute>
                  <Unauthorized />
                </SafeRoute>
              }
            />
            <Route
              path="/server-error"
              element={
                <SafeRoute>
                  <ServerError />
                </SafeRoute>
              }
            />

            {/* Public share routes */}
            <Route
              path="/share/sales-invoice/:token"
              element={
                <SafeRoute>
                  <SalesInvoiceShare />
                </SafeRoute>
              }
            />
            <Route
              path="/share/purchase-invoice/:token"
              element={
                <SafeRoute>
                  <PurchaseInvoiceShare />
                </SafeRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <SafeRoute>
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                </SafeRoute>
              }
            >
              <Route
                index
                element={<Navigate to="/dashboard/sales" replace />}
              />
              <Route
                path="settings"
                element={
                  <SafeRoute>
                    <Settings />
                  </SafeRoute>
                }
              />
              {/* Admin - User Management (admin & superadmin only) */}
              <Route
                path="admin/users"
                element={
                  <SafeRoute>
                    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                      <UsersManage />
                    </ProtectedRoute>
                  </SafeRoute>
                }
              />
              <Route
                path="admin/users/create"
                element={
                  <SafeRoute>
                    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                      <UserForm />
                    </ProtectedRoute>
                  </SafeRoute>
                }
              />
              <Route
                path="admin/users/edit/:id"
                element={
                  <SafeRoute>
                    <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                      <UserForm />
                    </ProtectedRoute>
                  </SafeRoute>
                }
              />
              {/* Inventory */}
              <Route
                path="inventory/manage"
                element={
                  <SafeRoute>
                    <InventoryManage />
                  </SafeRoute>
                }
              />
              <Route
                path="inventory/create"
                element={
                  <SafeRoute>
                    <InventoryCreate />
                  </SafeRoute>
                }
              />
              <Route
                path="inventory/view/:id"
                element={
                  <SafeRoute>
                    <InventoryView />
                  </SafeRoute>
                }
              />
              <Route
                path="inventory/edit/:id"
                element={
                  <SafeRoute>
                    <InventoryEdit />
                  </SafeRoute>
                }
              />
              <Route
                path="inventory/transactions"
                element={
                  <SafeRoute>
                    <InventoryTransactions />
                  </SafeRoute>
                }
              />
              {/* Expenses */}
              <Route
                path="expenses/manage"
                element={
                  <SafeRoute>
                    <ExpensesManage />
                  </SafeRoute>
                }
              />
              <Route
                path="expenses/create"
                element={
                  <SafeRoute>
                    <ExpensesCreate />
                  </SafeRoute>
                }
              />
              <Route
                path="expenses/view/:id"
                element={
                  <SafeRoute>
                    <ExpensesView />
                  </SafeRoute>
                }
              />
              <Route
                path="expenses/edit/:id"
                element={
                  <SafeRoute>
                    <ExpensesEdit />
                  </SafeRoute>
                }
              />
              {/* Receivables */}
              <Route
                path="receivables/manage"
                element={
                  <SafeRoute>
                    <ReceivablesManage />
                  </SafeRoute>
                }
              />
              <Route
                path="receivables/create"
                element={
                  <SafeRoute>
                    <ReceivablesCreate />
                  </SafeRoute>
                }
              />
              <Route
                path="receivables/view/:id"
                element={
                  <SafeRoute>
                    <ReceivablesView />
                  </SafeRoute>
                }
              />
              <Route
                path="receivables/edit/:id"
                element={
                  <SafeRoute>
                    <ReceivablesEdit />
                  </SafeRoute>
                }
              />
              {/* Payables (Payment Out) */}
              <Route
                path="payables/manage"
                element={
                  <SafeRoute>
                    <PayablesManage />
                  </SafeRoute>
                }
              />
              <Route
                path="payables/create"
                element={
                  <SafeRoute>
                    <PayablesCreate />
                  </SafeRoute>
                }
              />
              <Route
                path="payables/view/:id"
                element={
                  <SafeRoute>
                    <PayablesView />
                  </SafeRoute>
                }
              />
              <Route
                path="payables/edit/:id"
                element={
                  <SafeRoute>
                    <PayablesEdit />
                  </SafeRoute>
                }
              />
              {/* Delivery Orders */}
              <Route
                path="delivery-orders/manage"
                element={
                  <SafeRoute>
                    <DeliveryOrdersManage />
                  </SafeRoute>
                }
              />
              <Route
                path="delivery-orders/create"
                element={
                  <SafeRoute>
                    <DeliveryOrdersCreate />
                  </SafeRoute>
                }
              />
              <Route
                path="delivery-orders/view/:id"
                element={
                  <SafeRoute>
                    <DeliveryOrdersView />
                  </SafeRoute>
                }
              />
              <Route
                path="delivery-orders/edit/:id"
                element={
                  <SafeRoute>
                    <DeliveryOrdersEdit />
                  </SafeRoute>
                }
              />
              <Route
                path="delivery-order-templates/manage"
                element={
                  <SafeRoute>
                    <DeliveryOrderTemplatesManage />
                  </SafeRoute>
                }
              />
              {/* Sales Dashboard */}
              <Route
                path="dashboard/sales"
                element={
                  <SafeRoute>
                    <SalesDashboard />
                  </SafeRoute>
                }
              />
              {/* Sales Invoices */}
              <Route
                path="sales-invoices"
                element={<Navigate to="/sales-invoices/manage" replace />}
              />
              <Route
                path="sales-invoices/manage"
                element={
                  <SafeRoute>
                    <SalesInvoicesManage />
                  </SafeRoute>
                }
              />
              <Route
                path="sales-invoices/create"
                element={
                  <SafeRoute>
                    <SalesInvoicesCreate />
                  </SafeRoute>
                }
              />
              <Route
                path="sales-invoices/view/:id"
                element={
                  <SafeRoute>
                    <SalesInvoicesView />
                  </SafeRoute>
                }
              />
              <Route
                path="sales-invoices/edit/:id"
                element={
                  <SafeRoute>
                    <SalesInvoicesEdit />
                  </SafeRoute>
                }
              />
              <Route
                path="sales-invoice-templates/manage"
                element={
                  <SafeRoute>
                    <SalesTemplatesManage />
                  </SafeRoute>
                }
              />
              <Route
                path="sales-invoice-templates/view/:id"
                element={
                  <SafeRoute>
                    <SalesTemplateView />
                  </SafeRoute>
                }
              />
              {/* Purchase Invoices */}
              <Route
                path="purchase-invoices"
                element={<Navigate to="/purchase-invoices/manage" replace />}
              />
              <Route
                path="purchase-invoices/manage"
                element={
                  <SafeRoute>
                    <PurchaseInvoicesManage />
                  </SafeRoute>
                }
              />
              <Route
                path="purchase-invoices/create"
                element={
                  <SafeRoute>
                    <PurchaseInvoicesCreate />
                  </SafeRoute>
                }
              />
              <Route
                path="purchase-invoices/view/:id"
                element={
                  <SafeRoute>
                    <PurchaseInvoicesView />
                  </SafeRoute>
                }
              />
              <Route
                path="purchase-invoices/edit/:id"
                element={
                  <SafeRoute>
                    <PurchaseInvoicesEdit />
                  </SafeRoute>
                }
              />
              <Route
                path="purchase-invoice-templates/manage"
                element={
                  <SafeRoute>
                    <PurchaseTemplatesManage />
                  </SafeRoute>
                }
              />
              <Route
                path="purchase-invoice-templates/view/:id"
                element={
                  <SafeRoute>
                    <PurchaseTemplateView />
                  </SafeRoute>
                }
              />
              <Route
                path="delivery-orders/create"
                element={
                  <SafeRoute>
                    <DeliveryOrdersCreate />
                  </SafeRoute>
                }
              />
              {/* Ledger */}
              <Route
                path="ledger/manage"
                element={
                  <SafeRoute>
                    <LedgerManage />
                  </SafeRoute>
                }
              />
              <Route
                path="ledger/create"
                element={
                  <SafeRoute>
                    <JournalEntryCreate />
                  </SafeRoute>
                }
              />
              <Route
                path="ledger/edit/:id"
                element={
                  <SafeRoute>
                    <JournalEntryCreate />
                  </SafeRoute>
                }
              />
              <Route
                path="general-ledger/manage"
                element={
                  <SafeRoute>
                    <GeneralLedgerManage />
                  </SafeRoute>
                }
              />
              <Route
                path="general-ledger/account/:accountId"
                element={
                  <SafeRoute>
                    <AccountLedger />
                  </SafeRoute>
                }
              />
              <Route
                path="trial-balance"
                element={
                  <SafeRoute>
                    <TrialBalance />
                  </SafeRoute>
                }
              />
              {/* Financial Statements */}
              <Route
                path="statements/income"
                element={
                  <SafeRoute>
                    <IncomeStatement />
                  </SafeRoute>
                }
              />
              <Route
                path="statements/balance-sheet"
                element={
                  <SafeRoute>
                    <BalanceSheet />
                  </SafeRoute>
                }
              />
              <Route
                path="financial-statements/balance-sheet"
                element={
                  <SafeRoute>
                    <BalanceSheet />
                  </SafeRoute>
                }
              />
              <Route
                path="statements/cashflow"
                element={
                  <SafeRoute>
                    <CashFlowStatement />
                  </SafeRoute>
                }
              />
              <Route
                path="statements/equity"
                element={
                  <SafeRoute>
                    <StatementOfEquity />
                  </SafeRoute>
                }
              />
              <Route
                path="statements/vat201"
                element={
                  <SafeRoute>
                    <VAT201ReturnDashboard />
                  </SafeRoute>
                }
              />
              {/* CRM Settings */}
              <Route
                path="crm-settings/suppliers"
                element={
                  <SafeRoute>
                    <SuppliersManage />
                  </SafeRoute>
                }
              />
              <Route
                path="crm-settings/customers"
                element={
                  <SafeRoute>
                    <CustomersManage />
                  </SafeRoute>
                }
              />
              <Route
                path="crm-settings/units"
                element={
                  <SafeRoute>
                    <UnitsManage />
                  </SafeRoute>
                }
              />
              <Route
                path="crm-settings/brands"
                element={
                  <SafeRoute>
                    <BrandsManage />
                  </SafeRoute>
                }
              />
              <Route
                path="crm-settings/payment-methods"
                element={
                  <SafeRoute>
                    <PaymentMethodsManage />
                  </SafeRoute>
                }
              />
              <Route
                path="crm-settings/payment-statuses"
                element={
                  <SafeRoute>
                    <PaymentStatusesManage />
                  </SafeRoute>
                }
              />
              <Route
                path="crm-settings/chart-of-accounts"
                element={
                  <SafeRoute>
                    <ChartOfAccountsManage />
                  </SafeRoute>
                }
              />
              <Route
                path="crm-settings/opening-balances"
                element={
                  <SafeRoute>
                    <OpeningBalanceManage />
                  </SafeRoute>
                }
              />
            </Route>

            {/* 404 - Catch all route */}
            <Route
              path="*"
              element={
                <SafeRoute>
                  <NotFound />
                </SafeRoute>
              }
            />
          </Routes>
        </AnimatePresence>
        </AuthProvider>
      </AntApp>
    </ErrorBoundary>
  )
}

export default App

