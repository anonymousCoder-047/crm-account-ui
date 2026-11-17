import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ChevronRight, ChevronLeft, Check, Building2, BookOpen, DollarSign, Percent, Package, CreditCard, Users, Settings } from 'lucide-react'
import { OnboardingAPI, type BusinessProfile, type OpeningBalance, type TaxConfig, type InventoryConfig, type PaymentMethod } from '@/services/api'
import { message } from 'antd'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const STEPS = [
  { id: 1, title: 'Business Profile', icon: Building2 },
  { id: 2, title: 'Chart of Accounts', icon: BookOpen },
  { id: 3, title: 'Opening Balances', icon: DollarSign },
  { id: 4, title: 'Tax Configuration', icon: Percent },
  { id: 5, title: 'Inventory Setup', icon: Package },
  { id: 6, title: 'Payment Methods', icon: CreditCard },
  { id: 7, title: 'Users & Permissions', icon: Users },
  { id: 8, title: 'Complete', icon: Check },
]

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState<any>(null)

  // Step 1: Business Profile
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    business_name: '',
    country: 'AE',
    currency: 'AED',
    fiscal_year_start: dayjs().startOf('year').format('YYYY-MM-DD'),
    tax_registration_number: '',
  })

  // Step 2: Chart of Accounts
  const [customAccounts, setCustomAccounts] = useState<Array<{
    account_name: string
    account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
    account_code?: string
    description?: string
  }>>([])

  // Step 3: Opening Balances
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([])

  // Step 4: Tax Configuration
  const [taxConfig, setTaxConfig] = useState<TaxConfig>({
    vat_rate: 5,
    tax_rates: [{ name: 'Standard VAT', rate: 5 }],
    tax_inclusive: false,
  })

  // Step 5: Inventory
  const [inventoryConfig, setInventoryConfig] = useState<InventoryConfig>({
    enabled: true,
    valuation_method: 'FIFO',
    opening_stock: [],
  })

  // Step 6: Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { name: 'Cash', type: 'cash', is_default: true },
    { name: 'Bank Transfer', type: 'bank', is_default: false },
  ])

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const res = await OnboardingAPI.getStatus()
      if (res.data.data && res.data.data.is_completed) {
        navigate('/')
        return
      }
      if (res.data.data) {
        setOnboardingStatus(res.data.data)
        // Determine which step to show based on completion status
        if (res.data.data.chart_of_accounts_initialized) setCurrentStep(3)
        if (res.data.data.opening_balances_set) setCurrentStep(4)
        if (res.data.data.tax_configured) setCurrentStep(5)
        if (res.data.data.inventory_setup) setCurrentStep(6)
        if (res.data.data.payment_methods_setup) setCurrentStep(7)
      }
    } catch (error: any) {
      console.error('Error checking onboarding status:', error)
    }
  }

  const handleNext = async () => {
    setLoading(true)
    try {
      switch (currentStep) {
        case 1:
          await OnboardingAPI.saveBusinessProfile(businessProfile)
          message.success('Business profile saved')
          break
        case 2:
          await OnboardingAPI.initializeChartOfAccounts(customAccounts.length > 0 ? customAccounts : undefined)
          message.success('Chart of Accounts initialized')
          break
        case 3:
          await OnboardingAPI.setOpeningBalances(openingBalances)
          message.success('Opening balances set')
          break
        case 4:
          await OnboardingAPI.configureTax(taxConfig)
          message.success('Tax configuration saved')
          break
        case 5:
          await OnboardingAPI.setupInventory(inventoryConfig)
          message.success('Inventory setup completed')
          break
        case 6:
          await OnboardingAPI.setupPaymentMethods(paymentMethods)
          message.success('Payment methods setup completed')
          break
        case 7:
          // Users setup - can be skipped for now
          message.success('Users setup completed')
          break
        case 8:
          await OnboardingAPI.complete()
          message.success('Onboarding completed!')
          navigate('/')
          return
      }
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    } catch (error: any) {
      message.error(error.message || 'Failed to save step')
    } finally {
      setLoading(false)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSkip = async () => {
    // If skipping chart of accounts step, initialize with default accounts
    if (currentStep === 2) {
      setLoading(true)
      try {
        await OnboardingAPI.initializeChartOfAccounts(undefined) // undefined means use defaults only
        message.success('Default Chart of Accounts initialized')
      } catch (error: any) {
        message.error(error.message || 'Failed to initialize chart of accounts')
        return // Don't proceed if initialization fails
      } finally {
        setLoading(false)
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl"
      >
        <Card className="border-border shadow-xl">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">Accounting Setup</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Configure your accounting system</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Step {currentStep} of {STEPS.length}</div>
                <Progress value={progress} className="w-32 mt-2" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center
                          transition-all duration-200
                          ${isActive ? 'bg-primary text-white scale-110' : ''}
                          ${isCompleted ? 'bg-green-500/100 text-white' : ''}
                          ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                        `}
                      >
                        {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                      </div>
                      <span className={`text-xs mt-2 text-center ${isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500/100' : 'bg-muted'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 || loading}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex gap-2">
                {currentStep < STEPS.length && (
                  <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                    Skip
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {currentStep === STEPS.length ? 'Complete' : 'Next'}
                  {currentStep < STEPS.length && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )

  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return <BusinessProfileStep profile={businessProfile} setProfile={setBusinessProfile} />
      case 2:
        return <ChartOfAccountsStep customAccounts={customAccounts} setCustomAccounts={setCustomAccounts} />
      case 3:
        return <OpeningBalancesStep balances={openingBalances} setBalances={setOpeningBalances} />
      case 4:
        return <TaxConfigStep config={taxConfig} setConfig={setTaxConfig} />
      case 5:
        return <InventorySetupStep config={inventoryConfig} setConfig={setInventoryConfig} />
      case 6:
        return <PaymentMethodsStep methods={paymentMethods} setMethods={setPaymentMethods} />
      case 7:
        return <UsersSetupStep />
      case 8:
        return <CompleteStep />
      default:
        return null
    }
  }
}

// Step Components
function BusinessProfileStep({
  profile,
  setProfile,
}: {
  profile: BusinessProfile
  setProfile: (profile: BusinessProfile) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              value={profile.business_name}
              onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
              placeholder="Enter business name"
            />
          </div>
          <div>
            <Label htmlFor="country">Country *</Label>
            <Select value={profile.country} onValueChange={(value) => setProfile({ ...profile, country: value })}>
              <SelectTrigger id="country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AE">United Arab Emirates</SelectItem>
                <SelectItem value="SA">Saudi Arabia</SelectItem>
                <SelectItem value="KW">Kuwait</SelectItem>
                <SelectItem value="QA">Qatar</SelectItem>
                <SelectItem value="BH">Bahrain</SelectItem>
                <SelectItem value="OM">Oman</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Currency *</Label>
            <Select value={profile.currency} onValueChange={(value) => setProfile({ ...profile, currency: value })}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                <SelectItem value="KWD">KWD - Kuwaiti Dinar</SelectItem>
                <SelectItem value="QAR">QAR - Qatari Riyal</SelectItem>
                <SelectItem value="BHD">BHD - Bahraini Dinar</SelectItem>
                <SelectItem value="OMR">OMR - Omani Rial</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fiscal_year_start">Fiscal Year Start *</Label>
            <Input
              id="fiscal_year_start"
              type="date"
              value={profile.fiscal_year_start}
              onChange={(e) => setProfile({ ...profile, fiscal_year_start: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="tax_registration_number">Tax Registration Number</Label>
            <Input
              id="tax_registration_number"
              value={profile.tax_registration_number || ''}
              onChange={(e) => setProfile({ ...profile, tax_registration_number: e.target.value })}
              placeholder="Optional"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartOfAccountsStep({
  customAccounts,
  setCustomAccounts,
}: {
  customAccounts: Array<{ account_name: string; account_type: any; account_code?: string; description?: string }>
  setCustomAccounts: (accounts: any) => void
}) {
  const [newAccount, setNewAccount] = useState({ account_name: '', account_type: 'Asset' as any, account_code: '', description: '' })

  const addAccount = () => {
    if (newAccount.account_name) {
      setCustomAccounts([...customAccounts, { ...newAccount }])
      setNewAccount({ account_name: '', account_type: 'Asset', account_code: '', description: '' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Default Chart of Accounts</h3>
        <p className="text-sm text-muted-foreground mb-4">
          A default Chart of Accounts will be created with standard accounts. You can add custom accounts below.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-300">
            Default accounts include: Cash, Bank, Accounts Receivable, Inventory, Accounts Payable, Owner Equity, Sales Income, COGS, and common expense accounts.
          </p>
        </div>
      </div>
      <div>
        <h4 className="text-md font-semibold text-foreground mb-4">Add Custom Accounts (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label>Account Name</Label>
            <Input
              value={newAccount.account_name}
              onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
              placeholder="Account name"
            />
          </div>
          <div>
            <Label>Account Type</Label>
            <Select value={newAccount.account_type} onValueChange={(value) => setNewAccount({ ...newAccount, account_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asset">Asset</SelectItem>
                <SelectItem value="Liability">Liability</SelectItem>
                <SelectItem value="Equity">Equity</SelectItem>
                <SelectItem value="Revenue">Revenue</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Account Code (Optional)</Label>
            <Input
              value={newAccount.account_code}
              onChange={(e) => setNewAccount({ ...newAccount, account_code: e.target.value })}
              placeholder="e.g., 1001"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addAccount} className="w-full">Add Account</Button>
          </div>
        </div>
        {customAccounts.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <h5 className="font-semibold mb-2">Custom Accounts ({customAccounts.length})</h5>
            <div className="space-y-2">
              {customAccounts.map((acc, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">{acc.account_name} ({acc.account_type})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomAccounts(customAccounts.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OpeningBalancesStep({
  balances,
  setBalances,
}: {
  balances: OpeningBalance[]
  setBalances: (balances: OpeningBalance[]) => void
}) {
  const [newBalance, setNewBalance] = useState<OpeningBalance>({
    account_id: '',
    account_name: '',
    balance: 0,
    account_type: 'Asset',
  })

  const addBalance = () => {
    if (newBalance.account_name && newBalance.balance > 0) {
      setBalances([...balances, { ...newBalance }])
      setNewBalance({ account_id: '', account_name: '', balance: 0, account_type: 'Asset' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Opening Balances (Optional)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Enter opening balances for your accounts. This step can be skipped and done later.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <Label>Account Name</Label>
          <Input
            value={newBalance.account_name}
            onChange={(e) => setNewBalance({ ...newBalance, account_name: e.target.value })}
            placeholder="e.g., Cash"
          />
        </div>
        <div>
          <Label>Account Type</Label>
          <Select
            value={newBalance.account_type}
            onValueChange={(value: any) => setNewBalance({ ...newBalance, account_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asset">Asset</SelectItem>
              <SelectItem value="Liability">Liability</SelectItem>
              <SelectItem value="Equity">Equity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Opening Balance</Label>
          <Input
            type="number"
            value={newBalance.balance}
            onChange={(e) => setNewBalance({ ...newBalance, balance: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>
        <div className="flex items-end">
          <Button onClick={addBalance} className="w-full">Add Balance</Button>
        </div>
      </div>
      {balances.length > 0 && (
        <div className="border border-border rounded-lg p-4">
          <h5 className="font-semibold mb-2">Opening Balances ({balances.length})</h5>
          <div className="space-y-2">
            {balances.map((bal, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">
                  {bal.account_name} ({bal.account_type}): {bal.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBalances(balances.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TaxConfigStep({
  config,
  setConfig,
}: {
  config: TaxConfig
  setConfig: (config: TaxConfig) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Tax Configuration</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure your tax settings</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="vat_rate">VAT Rate (%)</Label>
          <Input
            id="vat_rate"
            type="number"
            value={config.vat_rate || 0}
            onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) || 0 })}
            placeholder="5"
          />
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <Checkbox
            id="tax_inclusive"
            checked={config.tax_inclusive}
            onCheckedChange={(checked) => setConfig({ ...config, tax_inclusive: checked as boolean })}
          />
          <Label htmlFor="tax_inclusive">Tax Inclusive Pricing</Label>
        </div>
      </div>
    </div>
  )
}

function InventorySetupStep({
  config,
  setConfig,
}: {
  config: InventoryConfig
  setConfig: (config: InventoryConfig) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Inventory Setup</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure inventory management</p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="inventory_enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked as boolean })}
          />
          <Label htmlFor="inventory_enabled">Enable Inventory Management</Label>
        </div>
        {config.enabled && (
          <div>
            <Label htmlFor="valuation_method">Valuation Method</Label>
            <Select
              value={config.valuation_method}
              onValueChange={(value: 'FIFO' | 'Weighted Average') => setConfig({ ...config, valuation_method: value })}
            >
              <SelectTrigger id="valuation_method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                <SelectItem value="Weighted Average">Weighted Average</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}

function PaymentMethodsStep({
  methods,
  setMethods,
}: {
  methods: PaymentMethod[]
  setMethods: (methods: PaymentMethod[]) => void
}) {
  const [newMethod, setNewMethod] = useState({ name: '', type: 'cash' as any, is_default: false })

  const addMethod = () => {
    if (newMethod.name) {
      setMethods([...methods, { ...newMethod }])
      setNewMethod({ name: '', type: 'cash', is_default: false })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Payment Methods</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure accepted payment methods</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label>Method Name</Label>
          <Input
            value={newMethod.name}
            onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
            placeholder="e.g., Credit Card"
          />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={newMethod.type} onValueChange={(value: any) => setNewMethod({ ...newMethod, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank">Bank Transfer</SelectItem>
              <SelectItem value="mobile">Mobile Payment</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={addMethod} className="w-full">Add Method</Button>
        </div>
      </div>
      {methods.length > 0 && (
        <div className="border border-border rounded-lg p-4">
          <h5 className="font-semibold mb-2">Payment Methods ({methods.length})</h5>
          <div className="space-y-2">
            {methods.map((method, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">
                  {method.name} ({method.type}) {method.is_default && '(Default)'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMethods(methods.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UsersSetupStep() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Users & Permissions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          User roles and permissions can be configured later from the Settings page.
        </p>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            Default roles available: Admin, Manager, Accountant, Sales User, Purchase User
          </p>
        </div>
      </div>
    </div>
  )
}

function CompleteStep() {
  return (
    <div className="space-y-6 text-center py-8">
      <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="h-12 w-12 text-green-400" />
      </div>
      <h3 className="text-2xl font-bold text-foreground">Setup Complete!</h3>
      <p className="text-muted-foreground">
        Your accounting system is now configured and ready to use. You can start creating invoices, recording expenses, and managing your finances.
      </p>
    </div>
  )
}

