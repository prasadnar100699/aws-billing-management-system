"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Mail,
  Calendar,
  Shield,
  UserCog,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  created_at: string;
}

interface Role {
  role_id: number;
  role_name: string;
}

interface CurrentUser {
  role_name: string;
}

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: '',
    status: 'active' as const
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setCurrentUser(parsedUser);

    // Check permissions - only Super Admin can access user management
    if (parsedUser.role_name !== 'Super Admin') {
      toast.error('Access denied. Only Super Admins can manage users.');
      router.push('/dashboard');
      return;
    }

    loadUsers();
    loadRoles();
  }, [router]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    // Mock data - replace with actual API call
    const mockUsers: User[] = [
      {
        user_id: 1,
        username: 'admin',
        email: 'admin@tejit.com',
        role_name: 'Super Admin',
        status: 'active',
        last_login: '2024-12-15T10:30:00Z',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        user_id: 2,
        username: 'manager',
        email: 'manager@tejit.com',
        role_name: 'Client Manager',
        status: 'active',
        last_login: '2024-12-14T16:45:00Z',
        created_at: '2024-01-15T09:30:00Z'
      },
      {
        user_id: 3,
        username: 'auditor',
        email: 'auditor@tejit.com',
        role_name: 'Auditor',
        status: 'active',
        last_login: '2024-12-13T14:20:00Z',
        created_at: '2024-02-01T11:15:00Z'
      },
      {
        user_id: 4,
        username: 'john.smith',
        email: 'john.smith@tejit.com',
        role_name: 'Client Manager',
        status: 'inactive',
        last_login: '2024-11-28T09:15:00Z',
        created_at: '2024-03-10T13:45:00Z'
      }
    ];
    setUsers(mockUsers);
  };

  const loadRoles = async () => {
    // Mock data - replace with actual API call
    const mockRoles: Role[] = [
      { role_id: 1, role_name: 'Super Admin' },
      { role_id: 2, role_name: 'Client Manager' },
      { role_id: 3, role_name: 'Auditor' }
    ];
    setRoles(mockRoles);
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role_name === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async () => {
    try {
      // Validate form
      if (!formData.username || !formData.email || !formData.password || !formData.role_id) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Check if email already exists
      if (users.some(user => user.email === formData.email)) {
        toast.error('Email already exists');
        return;
      }

      // Mock API call - replace with actual implementation
      const selectedRole = roles.find(role => role.role_id.toString() === formData.role_id);
      const newUser: User = {
        user_id: users.length + 1,
        username: formData.username,
        email: formData.email,
        role_name: selectedRole?.role_name || '',
        status: formData.status,
        created_at: new Date().toISOString()
      };

      setUsers([...users, newUser]);
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('User created successfully');
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      // Mock API call - replace with actual implementation
      const selectedRole = roles.find(role => role.role_id.toString() === formData.role_id);
      const updatedUser: User = {
        ...selectedUser,
        username: formData.username,
        email: formData.email,
        role_name: selectedRole?.role_name || selectedUser.role_name,
        status: formData.status
      };

      setUsers(users.map(user => 
        user.user_id === selectedUser.user_id ? updatedUser : user
      ));
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      toast.success('User updated successfully');
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      // Mock API call - replace with actual implementation
      setUsers(users.filter(user => user.user_id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role_id: '',
      status: 'active'
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    const userRole = roles.find(role => role.role_name === user.role_name);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role_id: userRole?.role_id.toString() || '',
      status: user.status
    });
    setIsEditDialogOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Client Manager':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Auditor':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <ProtectedRoute requiredRole={['Super Admin']}>
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="User Management" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Users</h2>
                <p className="text-gray-600 mt-1">Manage system users and their access permissions</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        placeholder="Enter username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Enter password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role_id">Role *</Label>
                      <Select value={formData.role_id} onValueChange={(value) => setFormData({...formData, role_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.role_id} value={role.role_id.toString()}>
                              {role.role_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser}>
                      Create User
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-48">
                      <UserCog className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.role_id} value={role.role_name}>
                          {role.role_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  System Users ({filteredUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Last Login</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-semibold">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.username}</p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={getRoleBadgeColor(user.role_name)}>
                              {user.role_name}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={getStatusBadgeColor(user.status)}>
                              {user.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteUser(user.user_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'Get started by adding your first user'
                      }
                    </p>
                    {!searchTerm && roleFilter === 'all' && statusFilter === 'all' && (
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_username">Username *</Label>
              <Input
                id="edit_username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_password">New Password (leave blank to keep current)</Label>
              <Input
                id="edit_password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_role_id">Role *</Label>
              <Select value={formData.role_id} onValueChange={(value) => setFormData({...formData, role_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.role_id} value={role.role_id.toString()}>
                      {role.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>
              Update User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  );
}