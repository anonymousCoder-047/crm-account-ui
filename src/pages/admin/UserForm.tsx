import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  type CreateUserProfileInput,
  type UpdateUserProfileInput,
  UsersAPI,
  type UserProfile,
} from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Copy } from 'lucide-react'

function generateStrongPassword() {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-='
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export default function UserForm() {
  const { id } = useParams()
  const isEditMode = !!id
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditMode)
  const [form, setForm] = useState<CreateUserProfileInput>({
    name: '',
    email: '',
    role: 'user',
    isActive: true,
    username: '',
    password: '',
  })
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isEditMode) {
      const pwd = generateStrongPassword()
      setForm((prev) => ({ ...prev, password: pwd }))
      return
    }

    const loadUser = async () => {
      try {
        setInitialLoading(true)
        const response = await UsersAPI.get(id!)
        const user = response.data.data as UserProfile
        setForm({
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          employeeId: user.employeeId,
          department: user.department,
          position: user.position,
          phone: user.phone,
        })
        setAutoGeneratePassword(false)
      } catch (error: any) {
        toast({
          title: 'Failed to load user',
          description: error.message || 'Please try again.',
          variant: 'destructive',
        })
        navigate('/admin/users')
      } finally {
        setInitialLoading(false)
      }
    }

    loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleChange = (field: keyof CreateUserProfileInput, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(form.password || '')
      toast({ title: 'Password copied', description: 'Temporary password copied to clipboard.' })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy password. Please copy it manually.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEditMode) {
        const payload: UpdateUserProfileInput = {
          name: form.name,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
          employeeId: form.employeeId,
          department: form.department,
          position: form.position,
          phone: form.phone,
        }
        await UsersAPI.update(id!, payload)
        toast({ title: 'User updated', description: 'User details have been saved.' })
      } else {
        const payload: CreateUserProfileInput = {
          ...form,
          password: autoGeneratePassword ? form.password : form.password || undefined,
        }
        await UsersAPI.create(payload)
        toast({
          title: 'User created',
          description:
            'Login instructions have been emailed to the user. Share the temporary password securely.',
        })
      }
      navigate('/admin/users')
    } catch (error: any) {
      toast({
        title: isEditMode ? 'Failed to update user' : 'Failed to create user',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const generatedPassword = useMemo(() => form.password, [form.password])

  if (initialLoading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        Loading user...
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEditMode ? 'Edit User' : 'Add User'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? 'Update user details and role.'
            : 'Create a new user, assign a role, and optionally auto-generate a secure password.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(value) => handleChange('role', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="superadmin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 flex items-center justify-between border rounded-md px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive users cannot log in.
              </p>
            </div>
            <Checkbox
              id="isActive"
              checked={!!form.isActive}
              onCheckedChange={(checked) => handleChange('isActive', !!checked)}
            />
          </div>
        </div>

        {!isEditMode && (
          <div className="space-y-3 border rounded-md p-4 bg-muted/40">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label>Password</Label>
                <p className="text-xs text-muted-foreground">
                  Auto-generate a secure temporary password and copy it to share with the user.
                  A welcome email with login instructions will be sent automatically.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={autoGeneratePassword}
                  onCheckedChange={(checked) => {
                    const value = !!checked
                    setAutoGeneratePassword(value)
                    if (value) {
                      const pwd = generateStrongPassword()
                      handleChange('password', pwd)
                    } else {
                      handleChange('password', '')
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">Auto-generate</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Input
                type="text"
                value={generatedPassword || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                disabled={autoGeneratePassword}
                className="font-mono text-sm"
                placeholder="Enter password"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyPassword}
                disabled={!generatedPassword}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1">
              For security reasons, the password will not be included in the email. Share it over a
              secure channel.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/users')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditMode ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </form>
    </div>
  )
}

