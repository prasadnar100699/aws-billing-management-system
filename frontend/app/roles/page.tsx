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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  UserCog,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Shield,
  Users,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface Role {
  role_id: number;
  role_name: string;
  description: string;
  user_count: number;
  created_at: string;
}

interface ModuleAccess {
  access_id: number;
  role_id: number;
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface CurrentUser {
  role_name: string;
}

const AVAILABLE_MODULES = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'clients', label: 'Client Management' },
  { name: 'users', label: 'User Management' },
  { name: 'roles', label: 'Role Management' },
  { name: 'services', label: 'Service Catalog' },
  { name: 'invoices', label: 'Invoice Management' },
  { name: 'usage_import', label: 'Usage Import' },
  { name: 'documents', label: 'Documents' },
  { name: 'reports', label: 'Reports' },
  { name: 'notifications', label: 'Notifications' }
];

export default function RolesPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    role_name: '',
    description: ''
  });
  const [permissions, setPermissions] = useState<{[key: string]: {view: boolean, create: boolean, edit: boolean, delete: boolean}}>({});
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

    // Check permissions - only Super Admin can access role management
    if (parsedUser.role_name !== 'Super Admin') {
      toast.error('Access denied. Only Super Admins can manage roles.');
      router.push('/dashboard');
      return;
    }

    loadRoles();
    loadModuleAccess();
  }, [router]);

  useEffect(() => {
    filterRoles();
  }, [roles, searchTerm]);

  const loadRoles = async () => {
    // Mock data - replace with actual API call
    const mockRoles: Role[] = [
      {
        role_id: 1,
        role_name: 'Super Admin',
        description: 'Full system access with all permissions',
        user_count: 1,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        role_id: 2,
        role_name: 'Client Manager',
        description: 'Can manage assigned clients and generate invoices',
        user_count: 2,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        role_id: 3,
        role_name: 'Auditor',
        description: 'Read-only access for reports and analytics',
        user_count: 1,
        created_at: '2024-01-01T00:00:00Z'
      }
    ];
    setRoles(mockRoles);
  };

  const loadModuleAccess = async () => {
    // Mock data - replace with actual API call
    const mockModuleAccess: ModuleAccess[] = [
      // Super Admin permissions
      { access_id: 1, role_id: 1, module_name: 'dashboard', can_view: true, can_create: true, can_edit: true, can_delete: true },
      { access_id: 2, role_id: 1, module_name: 'clients', can_view: true, can_create: true, can_edit: true, can_delete: true },
      { access_id: 3, role_id: 1, module_name: 'users', can_view: true, can_create: true, can_edit: true, can_delete: true },
      { access_id: 4, role_id: 1, module_name: 'roles', can_view: true, can_create: true, can_edit: true, can_delete: true },
      { access_id: 5, role_id: 1, module_name: 'services', can_view: true, can_create: true, can_edit: true, can_delete: true },
      { access_id: 6, role_id: 1, module_name: 'invoices', can_view: true, can_create: true, can_edit: true, can_delete: true },
      { access_id: 7, role_id: 1, module_name: 'usage_import', can_view: true, can_create: true, can_edit: true, can_delete: true },
      { access_id: 8, role_id: 1, module_name: 'documents', can_view: true, can_create: true, can_edit: true, can_delete: true },
      { access_id: 9, role_id: 1, module_name: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
      { access_id: 10, role_id: 1, module_name: 'notifications', can_view: true, can_create: true, can_edit: true, can_delete: true },
      
      // Client Manager permissions
      { access_id: 11, role_id: 2, module_name: 'dashboard', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { access_id: 12, role_id: 2, module_name: 'clients', can_view: true, can_create: true, can_edit: true, can_delete: false },
      { access_id: 13, role_id: 2, module_name: 'services', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { access_id: 14, role_id: 2, module_name: 'invoices', can_view: true, can_create: true, can_edit: true, can_delete: false },
      { access_id: 15, role_id: 2, module_name: 'usage_import', can_view: true, can_create: true, can_edit: false, can_delete: false },
      { access_id: 16, role_id: 2, module_name: 'documents', can_view: true, can_create: true, can_edit: false, can_delete: false },
      { access_id: 17, role_id: 2, module_name: 'reports', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { access_id: 18, role_id: 2, module_name: 'notifications', can_view: true, can_create: false, can_edit: false, can_delete: false },
      
      // Auditor permissions
      { access_id: 19, role_id: 3, module_name: 'dashboard', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { access_id: 20, role_id: 3, module_name: 'clients', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { access_id: 21, role_id: 3, module_name: 'invoices', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { access_id: 22, role_id: 3, module_name: 'documents', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { access_id: 23, role_id: 3, module_name: 'reports', can_view: true, can_create: false, can_edit: false, can_delete: false }
    ];
    setModuleAccess(mockModuleAccess);
  };

  const filterRoles = () => {
    let filtered = roles;

    if (searchTerm) {
      filtered = filtered.filter(role =>
        role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRoles(filtered);
  };

  const handleCreateRole = async () => {
    try {
      // Validate form
      if (!formData.role_name || !formData.description) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Check if role name already exists
      if (roles.some(role => role.role_name === formData.role_name)) {
        toast.error('Role name already exists');
        return;
      }

      // Mock API call - replace with actual implementation
      const newRole: Role = {
        role_id: roles.length + 1,
        role_name: formData.role_name,
        description: formData.description,
        user_count: 0,
        created_at: new Date().toISOString()
      };

      setRoles([...roles, newRole]);
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Role created successfully');
    } catch (error) {
      toast.error('Failed to create role');
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;

    try {
      // Mock API call - replace with actual implementation
      const updatedRole: Role = {
        ...selectedRole,
        role_name: formData.role_name,
        description: formData.description
      };

      setRoles(roles.map(role => 
        role.role_id === selectedRole.role_id ? updatedRole : role
      ));
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      resetForm();
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    const role = roles.find(r => r.role_id === roleId);
    if (role && role.user_count > 0) {
      toast.error('Cannot delete role with assigned users');
      return;
    }

    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      // Mock API call - replace with actual implementation
      setRoles(roles.filter(role => role.role_id !== roleId));
      setModuleAccess(moduleAccess.filter(access => access.role_id !== roleId));
      toast.success('Role deleted successfully');
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  const resetForm = () => {
    setFormData({
      role_name: '',
      description: ''
    });
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      role_name: role.role_name,
      description: role.description
    });
    setIsEditDialogOpen(true);
  };

  const openPermissionsDialog = (role: Role) => {
    setSelectedRole(role);
    
    // Initialize permissions state
    const rolePermissions: {[key: string]: {view: boolean, create: boolean, edit: boolean, delete: boolean}} = {};
    
    AVAILABLE_MODULES.forEach(module => {
      const access = moduleAccess.find(a => a.role_id === role.role_id && a.module_name === module.name);
      rolePermissions[module.name] = {
        view: access?.can_view || false,
        create: access?.can_create || false,
        edit: access?.can_edit || false,
        delete: access?.can_delete || false
      };
    });
    
    setPermissions(rolePermissions);
    setIsPermissionsDialogOpen(true);
  };

  const handlePermissionChange = (moduleName: string, permission: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        [permission]: value
      }
    }));
  };

  const savePermissions = async () => {
    if (!selectedRole) return;

    try {
      // Mock API call - replace with actual implementation
      // Remove existing permissions for this role
      const updatedModuleAccess = moduleAccess.filter(access => access.role_id !== selectedRole.role_id);
      
      // Add new permissions
      let accessId = Math.max(...moduleAccess.map(a => a.access_id)) + 1;
      Object.entries(permissions).forEach(([moduleName, perms]) => {
        if (perms.view || perms.create || perms.edit || perms.delete) {
          updatedModuleAccess.push({
            access_id: accessId++,
            role_id: selectedRole.role_id,
            module_name: moduleName,
            can_view: perms.view,
            can_create: perms.create,
            can_edit: perms.edit,
            can_delete: perms.delete
          });
        }
      });

      setModuleAccess(updatedModuleAccess);
      setIsPermissionsDialogOpen(false);
      setSelectedRole(null);
      toast.success('Permissions updated successfully');
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'Super Admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Client Manager':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Auditor':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
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
        <Header title="Role Management" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2>
                <p className="text-gray-600 mt-1">Manage system roles and their module access permissions</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="role_name">Role Name *</Label>
                      <Input
                        id="role_name"
                        value={formData.role_name}
                        onChange={(e) => setFormData({...formData, role_name: e.target.value})}
                        placeholder="Enter role name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Enter role description"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRole}>
                      Create Role
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search roles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoles.map((role) => (
                <Card key={role.role_id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{role.role_name}</CardTitle>
                          <Badge className={getRoleBadgeColor(role.role_name)}>
                            {role.role_name}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">{role.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                      </div>
                      <div className="text-gray-500">
                        Created {new Date(role.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Module Access Summary */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">Module Access:</p>
                      <div className="flex flex-wrap gap-1">
                        {AVAILABLE_MODULES.map(module => {
                          const access = moduleAccess.find(a => a.role_id === role.role_id && a.module_name === module.name);
                          const hasAccess = access && (access.can_view || access.can_create || access.can_edit || access.can_delete);
                          
                          return (
                            <Badge 
                              key={module.name}
                              className={hasAccess 
                                ? 'bg-green-100 text-green-800 text-xs' 
                                : 'bg-gray-100 text-gray-500 text-xs'
                              }
                            >
                              {module.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex justify-end space-x-2 pt-2 border-t">
                      <Button variant="ghost" size="sm" onClick={() => openPermissionsDialog(role)}>
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(role)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      {role.user_count === 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteRole(role.role_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredRoles.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm 
                      ? 'Try adjusting your search criteria'
                      : 'Get started by adding your first custom role'
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Role
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_role_name">Role Name *</Label>
              <Input
                id="edit_role_name"
                value={formData.role_name}
                onChange={(e) => setFormData({...formData, role_name: e.target.value})}
                placeholder="Enter role name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description *</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter role description"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole}>
              Update Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Permissions - {selectedRole?.role_name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Module</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">View</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Create</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Edit</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {AVAILABLE_MODULES.map((module) => (
                    <tr key={module.name} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium text-gray-900">{module.label}</td>
                      <td className="py-3 px-4 text-center">
                        <Switch
                          checked={permissions[module.name]?.view || false}
                          onCheckedChange={(checked) => handlePermissionChange(module.name, 'view', checked)}
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Switch
                          checked={permissions[module.name]?.create || false}
                          onCheckedChange={(checked) => handlePermissionChange(module.name, 'create', checked)}
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Switch
                          checked={permissions[module.name]?.edit || false}
                          onCheckedChange={(checked) => handlePermissionChange(module.name, 'edit', checked)}
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Switch
                          checked={permissions[module.name]?.delete || false}
                          onCheckedChange={(checked) => handlePermissionChange(module.name, 'delete', checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePermissions}>
              Save Permissions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  );
}