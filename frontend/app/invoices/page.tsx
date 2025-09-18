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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Download,
  Send,
  Calendar as CalendarIcon,
  Filter,
  DollarSign,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface Invoice {
  invoice_id: number;
  invoice_number: string;
  client_id: number;
  client_name: string;
  invoice_date: string;
  due_date: string;
  billing_period_start: string;
  billing_period_end: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  currency: 'USD' | 'INR';
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  line_items_count: number;
  created_at: string;
}

interface Client {
  client_id: number;
  client_name: string;
  gst_registered: boolean;
  default_currency: 'USD' | 'INR';
}

interface User {
  role_name: string;
}

export default function InvoicesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    invoice_date: new Date(),
    due_date: new Date(),
    billing_period_start: new Date(),
    billing_period_end: new Date(),
    invoice_notes: ''
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
    setUser(parsedUser);

    loadInvoices();
    loadClients();
  }, [router]);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter, clientFilter]);

  const loadInvoices = async () => {
    // Mock data - replace with actual API call
    const mockInvoices: Invoice[] = [
      {
        invoice_id: 1,
        invoice_number: 'TejIT-001-202412-001',
        client_id: 1,
        client_name: 'TechCorp Inc',
        invoice_date: '2024-12-01',
        due_date: '2024-12-31',
        billing_period_start: '2024-11-01',
        billing_period_end: '2024-11-30',
        subtotal: 2500.00,
        gst_amount: 450.00,
        total_amount: 2950.00,
        currency: 'USD',
        status: 'sent',
        line_items_count: 5,
        created_at: '2024-12-01T10:30:00Z'
      },
      {
        invoice_id: 2,
        invoice_number: 'TejIT-002-202412-002',
        client_id: 2,
        client_name: 'DataFlow Ltd',
        invoice_date: '2024-12-05',
        due_date: '2025-01-05',
        billing_period_start: '2024-11-01',
        billing_period_end: '2024-11-30',
        subtotal: 1800.00,
        gst_amount: 0.00,
        total_amount: 1800.00,
        currency: 'USD',
        status: 'paid',
        line_items_count: 3,
        created_at: '2024-12-05T14:15:00Z'
      },
      {
        invoice_id: 3,
        invoice_number: 'TejIT-003-202412-003',
        client_id: 3,
        client_name: 'CloudTech Solutions',
        invoice_date: '2024-12-10',
        due_date: '2025-01-10',
        billing_period_start: '2024-11-01',
        billing_period_end: '2024-11-30',
        subtotal: 125000.00,
        gst_amount: 22500.00,
        total_amount: 147500.00,
        currency: 'INR',
        status: 'approved',
        line_items_count: 8,
        created_at: '2024-12-10T09:45:00Z'
      },
      {
        invoice_id: 4,
        invoice_number: 'TejIT-001-202412-004',
        client_id: 1,
        client_name: 'TechCorp Inc',
        invoice_date: '2024-12-15',
        due_date: '2024-12-20',
        billing_period_start: '2024-12-01',
        billing_period_end: '2024-12-15',
        subtotal: 850.00,
        gst_amount: 153.00,
        total_amount: 1003.00,
        currency: 'USD',
        status: 'overdue',
        line_items_count: 2,
        created_at: '2024-12-15T16:20:00Z'
      },
      {
        invoice_id: 5,
        invoice_number: 'TejIT-004-202412-005',
        client_id: 4,
        client_name: 'StartupXYZ',
        invoice_date: '2024-12-12',
        due_date: '2025-01-12',
        billing_period_start: '2024-11-01',
        billing_period_end: '2024-11-30',
        subtotal: 650.00,
        gst_amount: 0.00,
        total_amount: 650.00,
        currency: 'USD',
        status: 'draft',
        line_items_count: 1,
        created_at: '2024-12-12T11:30:00Z'
      }
    ];
    setInvoices(mockInvoices);
  };

  const loadClients = async () => {
    // Mock data - replace with actual API call
    const mockClients: Client[] = [
      { client_id: 1, client_name: 'TechCorp Inc', gst_registered: true, default_currency: 'USD' },
      { client_id: 2, client_name: 'DataFlow Ltd', gst_registered: false, default_currency: 'USD' },
      { client_id: 3, client_name: 'CloudTech Solutions', gst_registered: true, default_currency: 'INR' },
      { client_id: 4, client_name: 'StartupXYZ', gst_registered: false, default_currency: 'USD' }
    ];
    setClients(mockClients);
  };

  const filterInvoices = () => {
    let filtered = invoices;

    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    if (clientFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.client_id.toString() === clientFilter);
    }

    setFilteredInvoices(filtered);
  };

  const handleCreateInvoice = async () => {
    try {
      // Validate form
      if (!formData.client_id) {
        toast.error('Please select a client');
        return;
      }

      // Mock API call - replace with actual implementation
      const client = clients.find(c => c.client_id.toString() === formData.client_id);
      const newInvoice: Invoice = {
        invoice_id: invoices.length + 1,
        invoice_number: `TejIT-${formData.client_id.padStart(3, '0')}-${format(formData.invoice_date, 'yyyyMM')}-${(invoices.length + 1).toString().padStart(3, '0')}`,
        client_id: parseInt(formData.client_id),
        client_name: client?.client_name || '',
        invoice_date: format(formData.invoice_date, 'yyyy-MM-dd'),
        due_date: format(formData.due_date, 'yyyy-MM-dd'),
        billing_period_start: format(formData.billing_period_start, 'yyyy-MM-dd'),
        billing_period_end: format(formData.billing_period_end, 'yyyy-MM-dd'),
        subtotal: 0,
        gst_amount: 0,
        total_amount: 0,
        currency: client?.default_currency || 'USD',
        status: 'draft',
        line_items_count: 0,
        created_at: new Date().toISOString()
      };

      setInvoices([...invoices, newInvoice]);
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Invoice created successfully');
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };

  const handleStatusChange = async (invoiceId: number, newStatus: string) => {
    try {
      // Mock API call - replace with actual implementation
      setInvoices(invoices.map(invoice => 
        invoice.invoice_id === invoiceId 
          ? { ...invoice, status: newStatus as any }
          : invoice
      ));
      toast.success(`Invoice status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update invoice status');
    }
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      // Mock API call - replace with actual implementation
      setInvoices(invoices.filter(invoice => invoice.invoice_id !== invoiceId));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  const resetForm = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    
    setFormData({
      client_id: '',
      invoice_date: today,
      due_date: nextMonth,
      billing_period_start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      billing_period_end: new Date(today.getFullYear(), today.getMonth(), 0),
      invoice_notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Edit },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      sent: { color: 'bg-purple-100 text-purple-800', icon: Send },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const canModify = user.role_name !== 'Auditor';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Invoice Management" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
                <p className="text-gray-600 mt-1">Manage client invoices and billing</p>
              </div>
              {canModify && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Invoice</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="client_id">Client *</Label>
                        <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.client_id} value={client.client_id.toString()}>
                                {client.client_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Invoice Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(formData.invoice_date, 'PPP')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.invoice_date}
                              onSelect={(date) => date && setFormData({...formData, invoice_date: date})}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Due Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(formData.due_date, 'PPP')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.due_date}
                              onSelect={(date) => date && setFormData({...formData, due_date: date})}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Billing Period Start *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(formData.billing_period_start, 'PPP')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.billing_period_start}
                              onSelect={(date) => date && setFormData({...formData, billing_period_start: date})}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Billing Period End *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(formData.billing_period_end, 'PPP')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.billing_period_end}
                              onSelect={(date) => date && setFormData({...formData, billing_period_end: date})}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="invoice_notes">Invoice Notes</Label>
                        <Textarea
                          id="invoice_notes"
                          value={formData.invoice_notes}
                          onChange={(e) => setFormData({...formData, invoice_notes: e.target.value})}
                          placeholder="Enter any additional notes for this invoice"
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateInvoice}>
                        Create Invoice
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Invoices</p>
                      <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {invoices.filter(i => i.status === 'pending_approval').length}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">
                        {invoices.filter(i => i.status === 'overdue').length}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.currency === 'USD' ? i.total_amount : i.total_amount / 83), 0).toFixed(0)}K
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-48">
                      <Building2 className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.client_id} value={client.client_id.toString()}>
                          {client.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Invoices Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Invoices ({filteredInvoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Invoice #</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Client</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Due Date</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-900">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.invoice_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                              <p className="text-sm text-gray-600">{invoice.line_items_count} items</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-medium text-gray-900">{invoice.client_name}</p>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div>
                              <p className="font-medium text-gray-900">
                                {formatCurrency(invoice.total_amount, invoice.currency)}
                              </p>
                              {invoice.gst_amount > 0 && (
                                <p className="text-sm text-gray-600">
                                  +{formatCurrency(invoice.gst_amount, invoice.currency)} GST
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                              {canModify && (
                                <>
                                  {invoice.status === 'approved' && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleStatusChange(invoice.invoice_id, 'sent')}
                                    >
                                      <Send className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  {invoice.status === 'draft' && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDeleteInvoice(invoice.invoice_id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredInvoices.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm || statusFilter !== 'all' || clientFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'Get started by creating your first invoice'
                      }
                    </p>
                    {canModify && !searchTerm && statusFilter === 'all' && clientFilter === 'all' && (
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Invoice
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}