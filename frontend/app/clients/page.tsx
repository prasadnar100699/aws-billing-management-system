"use client";

import { useEffect, useState } from 'react';
import { usePaginatedApi, useApi } from '@/lib/hooks/useApi';
import { clientsApi } from '@/lib/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Filter
} from 'lucide-react';

export default function ClientsPage() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [userId, setUserId] = useState<string>(''); // New state for user_id input
  const [formData, setFormData] = useState({
    client_name: '',
    contact_person: '',
    email: '',
    phone: '',
    aws_account_ids: '',
    gst_registered: false,
    gst_number: '',
    billing_address: '',
    invoice_preferences: 'monthly' as const,
    default_currency: 'USD' as const,
    status: 'active' as const
  });

  // API hooks
  const {
    data: clients,
    loading: clientsLoading,
    fetchData: fetchClients,
    updateParams
  } = usePaginatedApi(clientsApi.listClients, { page: 1, limit: 20 });

  const { execute: createClient, loading: createLoading } = useApi(clientsApi.create, {
    showSuccessToast: true,
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      resetForm();
      fetchClients();
    }
  });

  const { execute: updateClient, loading: updateLoading } = useApi(clientsApi.update, {
    showSuccessToast: true,
    onSuccess: () => {
      setIsEditDialogOpen(false);
      setSelectedClient(null);
      resetForm();
      fetchClients();
    }
  });

  const { execute: deleteClient } = useApi(clientsApi.delete, {
    showSuccessToast: true,
    onSuccess: () => fetchClients()
  });

  useEffect(() => {
    fetchClients(); // No user check, as authentication is removed
  }, []);

  // Update search and filters
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      updateParams({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: 1
      });
      fetchClients();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, statusFilter]);

  const handleCreateClient = async () => {
    try {
      // Validate form
      if (!formData.client_name || !formData.email || !formData.contact_person) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (formData.gst_registered && !formData.gst_number) {
        toast.error('GST number is required for GST registered clients');
        return;
      }

      if (!userId) {
        toast.error('Please provide a User ID');
        return;
      }

      const clientData = {
        ...formData,
        aws_account_ids: formData.aws_account_ids.split(',').map(id => id.trim()).filter(id => id),
        user_id: parseInt(userId) // Include user_id for audit logging
      };

      await createClient(clientData);
    } catch (error) {
      // Error handled by useApi hook
    }
  };

  const handleEditClient = async () => {
    if (!selectedClient) return;

    try {
      if (!userId) {
        toast.error('Please provide a User ID');
        return;
      }

      const clientData = {
        ...formData,
        aws_account_ids: formData.aws_account_ids.split(',').map(id => id.trim()).filter(id => id),
        user_id: parseInt(userId) // Include user_id for audit logging
      };

      await updateClient(selectedClient.client_id, clientData);
    } catch (error) {
      // Error handled by useApi hook
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      if (!userId) {
        toast.error('Please provide a User ID');
        return;
      }

      await deleteClient(clientId, { user_id: parseInt(userId) });
    } catch (error) {
      // Error handled by useApi hook
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      contact_person: '',
      email: '',
      phone: '',
      aws_account_ids: '',
      gst_registered: false,
      gst_number: '',
      billing_address: '',
      invoice_preferences: 'monthly',
      default_currency: 'USD',
      status: 'active'
    });
  };

  const openEditDialog = (client: any) => {
    setSelectedClient(client);
    setFormData({
      client_name: client.client_name,
      contact_person: client.contact_person,
      email: client.email,
      phone: client.phone,
      aws_account_ids: client.aws_account_ids.join(', '),
      gst_registered: client.gst_registered,
      gst_number: client.gst_number || '',
      billing_address: client.billing_address,
      invoice_preferences: client.invoice_preferences,
      default_currency: client.default_currency,
      status: client.status
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Client Management" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* User ID Input */}
            <div className="flex items-center space-x-4">
              <Label htmlFor="user_id">User ID *</Label>
              <Input
                id="user_id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your User ID"
                className="w-40"
              />
            </div>

            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
                <p className="text-gray-600 mt-1">Manage your AWS clients and their account details</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Client</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="client_name">Client Name *</Label>
                      <Input
                        id="client_name"
                        value={formData.client_name}
                        onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                        placeholder="Enter client name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person *</Label>
                      <Input
                        id="contact_person"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                        placeholder="Enter contact person"
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
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="aws_account_ids">AWS Account IDs</Label>
                      <Input
                        id="aws_account_ids"
                        value={formData.aws_account_ids}
                        onChange={(e) => setFormData({...formData, aws_account_ids: e.target.value})}
                        placeholder="Enter AWS account IDs (comma separated)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoice_preferences">Invoice Frequency</Label>
                      <Select value={formData.invoice_preferences} onValueChange={(value: any) => setFormData({...formData, invoice_preferences: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default_currency">Default Currency</Label>
                      <Select value={formData.default_currency} onValueChange={(value: any) => setFormData({...formData, default_currency: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="gst_registered"
                          checked={formData.gst_registered}
                          onCheckedChange={(checked) => setFormData({...formData, gst_registered: checked})}
                        />
                        <Label htmlFor="gst_registered">GST Registered</Label>
                      </div>
                    </div>
                    {formData.gst_registered && (
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="gst_number">GST Number *</Label>
                        <Input
                          id="gst_number"
                          value={formData.gst_number}
                          onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                          placeholder="Enter GST number"
                        />
                      </div>
                    )}
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="billing_address">Billing Address</Label>
                      <Textarea
                        id="billing_address"
                        value={formData.billing_address}
                        onChange={(e) => setFormData({...formData, billing_address: e.target.value})}
                        placeholder="Enter billing address"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateClient} disabled={createLoading}>
                      {createLoading ? 'Creating...' : 'Create Client'}
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
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Clients Grid */}
            {clientsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-32 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((client: any) => (
                  <Card key={client.client_id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{client.client_name}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{client.contact_person}</p>
                        </div>
                        <Badge className={client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {client.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        {client.email}
                      </div>
                      {client.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {client.phone}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 mr-2" />
                        {client.default_currency} • {client.invoice_preferences}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="w-4 h-4 mr-2" />
                        {client.aws_account_ids.length} AWS Account{client.aws_account_ids.length !== 1 ? 's' : ''}
                      </div>
                      {client.gst_registered && (
                        <div className="text-sm">
                          <Badge className="bg-blue-100 text-blue-800">GST Registered</Badge>
                        </div>
                      )}
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        Created {new Date(client.created_at).toLocaleDateString()}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex justify-end space-x-2 pt-2 border-t">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(client)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteClient(client.client_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!clientsLoading && clients.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Get started by adding your first client'
                    }
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Client
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_client_name">Client Name *</Label>
              <Input
                id="edit_client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                placeholder="Enter client name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_contact_person">Contact Person *</Label>
              <Input
                id="edit_contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                placeholder="Enter contact person"
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
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit_aws_account_ids">AWS Account IDs</Label>
              <Input
                id="edit_aws_account_ids"
                value={formData.aws_account_ids}
                onChange={(e) => setFormData({...formData, aws_account_ids: e.target.value})}
                placeholder="Enter AWS account IDs (comma separated)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_invoice_preferences">Invoice Frequency</Label>
              <Select value={formData.invoice_preferences} onValueChange={(value: any) => setFormData({...formData, invoice_preferences: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_default_currency">Default Currency</Label>
              <Select value={formData.default_currency} onValueChange={(value: any) => setFormData({...formData, default_currency: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
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
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_gst_registered"
                  checked={formData.gst_registered}
                  onCheckedChange={(checked) => setFormData({...formData, gst_registered: checked})}
                />
                <Label htmlFor="edit_gst_registered">GST Registered</Label>
              </div>
            </div>
            {formData.gst_registered && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit_gst_number">GST Number *</Label>
                <Input
                  id="edit_gst_number"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                  placeholder="Enter GST number"
                />
              </div>
            )}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit_billing_address">Billing Address</Label>
              <Textarea
                id="edit_billing_address"
                value={formData.billing_address}
                onChange={(e) => setFormData({...formData, billing_address: e.target.value})}
                placeholder="Enter billing address"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditClient} disabled={updateLoading}>
              {updateLoading ? 'Updating...' : 'Update Client'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}