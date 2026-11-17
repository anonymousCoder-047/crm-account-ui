import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SettingsAPI } from '@/services/api'
import type { SettingsPayload } from '@/services/api'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsPayload>({
    businessInformation: {},
    companyAddress: {},
    taxInformation: {},
    themeColors: {},
    emailSettings: {},
    notificationSettings: {},
  })

  useEffect(() => {
    let mounted = true
    SettingsAPI.get()
      .then((res) => {
        if (!mounted) return
        const data = res.data?.data || {}
        setSettings({
          businessInformation: data.businessInformation || {},
          companyAddress: data.companyAddress || {},
          taxInformation: data.taxInformation || {},
          themeColors: data.themeColors || {},
          emailSettings: data.emailSettings || {},
          notificationSettings: data.notificationSettings || {},
        })
      })
      .finally(() => setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  const handleChange = (path: string, value: any) => {
    setSettings((prev) => {
      const copy: any = { ...prev }
      const parts = path.split('.')
      let ref = copy
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i]
        ref[p] = ref[p] ?? {}
        ref = ref[p]
      }
      ref[parts[parts.length - 1]] = value
      return copy
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await SettingsAPI.update(settings)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading settings...</div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs.Root defaultValue="business" className="w-full">
            <Tabs.List className="mb-4 flex flex-wrap gap-2 border-b border-border pb-2">
              {[
                { v: 'business', l: 'Business' },
                { v: 'address', l: 'Address' },
                { v: 'tax', l: 'Tax (UAE)' },
                { v: 'theme', l: 'Theme' },
                { v: 'email', l: 'Email' },
                { v: 'notifications', l: 'Notifications' },
              ].map((t) => (
                <Tabs.Trigger
                  key={t.v}
                  value={t.v}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  {t.l}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content value="business" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Company Name</label>
                  <Input
                    value={settings.businessInformation?.companyName || ''}
                    onChange={(e) => handleChange('businessInformation.companyName', e.target.value)}
                    placeholder="Company Name"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Registration Number</label>
                  <Input
                    value={settings.businessInformation?.registrationNumber || ''}
                    onChange={(e) =>
                      handleChange('businessInformation.registrationNumber', e.target.value)
                    }
                    placeholder="Registration Number"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Website</label>
                  <Input
                    value={settings.businessInformation?.website || ''}
                    onChange={(e) => handleChange('businessInformation.website', e.target.value)}
                    placeholder="https://example.com"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Phone</label>
                  <Input
                    value={settings.businessInformation?.phone || ''}
                    onChange={(e) => handleChange('businessInformation.phone', e.target.value)}
                    placeholder="+971 50 000 0000"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Support Email</label>
                  <Input
                    type="email"
                    value={settings.businessInformation?.supportEmail || ''}
                    onChange={(e) =>
                      handleChange('businessInformation.supportEmail', e.target.value)
                    }
                    placeholder="support@company.com"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Logo URL</label>
                  <Input
                    value={settings.businessInformation?.logoUrl || ''}
                    onChange={(e) => handleChange('businessInformation.logoUrl', e.target.value)}
                    placeholder="https://cdn.company.com/logo.png"
                    className="rounded-lg"
                  />
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="address" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Address Line 1</label>
                  <Input
                    value={settings.companyAddress?.addressLine1 || ''}
                    onChange={(e) => handleChange('companyAddress.addressLine1', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Address Line 2</label>
                  <Input
                    value={settings.companyAddress?.addressLine2 || ''}
                    onChange={(e) => handleChange('companyAddress.addressLine2', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">City</label>
                  <Input
                    value={settings.companyAddress?.city || ''}
                    onChange={(e) => handleChange('companyAddress.city', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">State</label>
                  <Input
                    value={settings.companyAddress?.state || ''}
                    onChange={(e) => handleChange('companyAddress.state', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Postal Code</label>
                  <Input
                    value={settings.companyAddress?.postalCode || ''}
                    onChange={(e) => handleChange('companyAddress.postalCode', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Country</label>
                  <Input
                    value={settings.companyAddress?.country || ''}
                    onChange={(e) => handleChange('companyAddress.country', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="tax" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">TRN (Tax Registration Number)</label>
                  <Input
                    value={settings.taxInformation?.trn || ''}
                    onChange={(e) => handleChange('taxInformation.trn', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">VAT Number (optional)</label>
                  <Input
                    value={settings.taxInformation?.vatNumber || ''}
                    onChange={(e) => handleChange('taxInformation.vatNumber', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="theme" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Primary</label>
                  <input
                    type="color"
                    value={settings.themeColors?.primary || '#10b981'}
                    onChange={(e) => handleChange('themeColors.primary', e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background p-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Secondary</label>
                  <input
                    type="color"
                    value={settings.themeColors?.secondary || '#E21C1C'}
                    onChange={(e) => handleChange('themeColors.secondary', e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background p-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Accent</label>
                  <input
                    type="color"
                    value={settings.themeColors?.accent || '#cccccc'}
                    onChange={(e) => handleChange('themeColors.accent', e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background p-0"
                  />
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="email" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">SMTP Host</label>
                  <Input
                    value={settings.emailSettings?.smtpHost || ''}
                    onChange={(e) => handleChange('emailSettings.smtpHost', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">SMTP Port</label>
                  <Input
                    type="number"
                    value={settings.emailSettings?.smtpPort ?? ''}
                    onChange={(e) => handleChange('emailSettings.smtpPort', Number(e.target.value))}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">SMTP User</label>
                  <Input
                    value={settings.emailSettings?.smtpUser || ''}
                    onChange={(e) => handleChange('emailSettings.smtpUser', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">From Email</label>
                  <Input
                    value={settings.emailSettings?.smtpFrom || ''}
                    onChange={(e) => handleChange('emailSettings.smtpFrom', e.target.value)}
                    className="rounded-lg"
                  />
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="notifications" className="space-y-4">
              <div className="flex flex-col gap-4">
                <label className="inline-flex items-center gap-3 text-sm text-foreground">
                  <input
                    id="emailEnabled"
                    type="checkbox"
                    checked={!!settings.notificationSettings?.emailEnabled}
                    onChange={(e) =>
                      handleChange('notificationSettings.emailEnabled', e.target.checked)
                    }
                  />
                  Email notifications
                </label>
                <label className="inline-flex items-center gap-3 text-sm text-foreground">
                  <input
                    id="pushEnabled"
                    type="checkbox"
                    checked={!!settings.notificationSettings?.pushEnabled}
                    onChange={(e) =>
                      handleChange('notificationSettings.pushEnabled', e.target.checked)
                    }
                  />
                  Push notifications
                </label>
              </div>
            </Tabs.Content>
          </Tabs.Root>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="rounded-lg">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}


