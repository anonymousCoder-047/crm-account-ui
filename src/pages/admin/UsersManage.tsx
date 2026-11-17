import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UsersAPI, type UserProfile } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2 } from 'lucide-react'

export default function UsersManage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const { toast } = useToast()
  const navigate = useNavigate()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await UsersAPI.list({
        q: search || undefined,
        role: roleFilter as any,
        isActive:
          statusFilter === undefined
            ? undefined
            : statusFilter === 'active'
            ? true
            : statusFilter === 'inactive'
            ? false
            : undefined,
      })
      setUsers(response.data.data)
    } catch (error: any) {
      toast({
        title: 'Failed to load users',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (user: UserProfile) => {
    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
    try {
      await UsersAPI.delete(user._id)
      toast({ title: 'User deleted', description: `${user.name} has been removed.` })
      fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Failed to delete user',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage system users, roles, and access.
          </p>
        </div>
        <Button onClick={() => navigate('/admin/users/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <Input
          placeholder="Search by name, email, department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:max-w-sm"
        />
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="md:w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="superadmin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="md:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={fetchUsers}
          disabled={loading}
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Apply
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-foreground">Name</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Email</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Role</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Department</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Position</th>
              <th className="px-4 py-2 text-right font-medium text-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <Loader2 className="w-5 h-5 mr-2 inline-block animate-spin" />
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found. Try adjusting your filters or{' '}
                  <button
                    className="text-primary underline"
                    onClick={() => navigate('/admin/users/create')}
                  >
                    create a new user
                  </button>
                  .
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="border-t">
                  <td className="px-4 py-2 font-medium">{user.name}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{user.department || '-'}</td>
                  <td className="px-4 py-2">{user.position || '-'}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => navigate(`/admin/users/edit/${user._id}`)}
                    >
                      <span className="sr-only">Edit</span>
                      ✏️
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(user)}
                    >
                      <span className="sr-only">Delete</span>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}