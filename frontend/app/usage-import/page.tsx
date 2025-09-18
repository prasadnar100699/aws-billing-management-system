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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload,
  Plus,
  Search,
  Eye,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';

interface UsageImport {
  import_id: number;
  client_id: number;
  client_name: string;
  import_source: 'CSV' | 'API' | 'MANUAL';
  file_name?: string;
  aws_account_ids: string[];
  billing_period_start: string;
  billing_period_end: string;
  total_records: number;
  processed_records: number;
  failed_records: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_log?: string;
  imported_by: string;
  created_at: string;
  completed_at?: string;
}

interface Client {
  client_id: number;
  client_name: string;
  aws_account_ids: string[];
}

interface User {
  role_name: string;
}

export default function UsageImportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [imports, setImports] = useState<UsageImport[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredImports, setFilteredImports] = useState<UsageImport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    import_source: 'CSV' as const,
    billing_period_start: '',
    billing_period_end: ''
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

    // Check permissions
    if (parsedUser.role_name === 'Auditor') {
      toast.error('Access denied. Auditors have read-only access.');
    }

    loadImports();
    loadClients();
  }, [router]);

  useEffect(() => {
    filterImports();
  }, [imports, searchTerm, statusFilter, clientFilter]);

  const loadImports = async () => {
    // Mock data - replace with actual API call
    const mockImports: UsageImport[] = [
      {
        import_id: 1,
        client_id: 1,
        client_name: 'TechCorp Inc',
        import_source: 'CSV',
        file_name: 'techcorp-nov-2024-usage.csv',
        aws_account_ids: ['123456789012', '123456789013'],
        billing_period_start: '2024-11-01',
        billing_period_end: '2024-11-30',
        total_records: 15420,
        processed_records: 15420,
        failed_records: 0,
        status: 'completed',
        imported_by: 'admin',
        created_at: '2024-12-01T10:30:00Z',
        completed_at: '2024-12-01T10:45:00Z'
      },
      {
        import_id: 2,
        client_id: 2,
        client_name: 'DataFlow Ltd',
        import_source: 'CSV',
        file_name: 'dataflow-nov-2024-usage.csv',
        aws_account_ids: ['123456789014'],
        billing_period_start: '2024-11-01',
        billing_period_end: '2024-11-30',
        total_records: 8750,
        processed_records: 8750,
        failed_records: 0,
        status: 'completed',
        imported_by: 'manager',
        created_at: '2024-12-05T14:15:00Z',
        completed_at: '2024-12-05T14:28:00Z'
      },
      {
        import_id: 3,
        client_id: 3,
        client_name: 'CloudTech Solutions',
        import_source: 'API',
        aws_account_ids: ['123456789015', '123456789016', '123456789017'],
        billing_period_start: '2024-11-01',
        billing_period_end: '2024-11-30',
        total_records: 32150,
        processed_records: 28900,
        failed_records: 3250,
        status: 'processing',
        imported_by: 'admin',
        created_at: '2024-12-10T09:45:00Z'
      },
      {
        import_id: 4,
        client_id: 1,
        client_name: 'TechCorp Inc',
        import_source: 'CSV',
        file_name: 'techcorp-dec-2024-partial.csv',
        aws_account_ids: ['123456789012'],
        billing_period_start: '2024-12-01',
        billing_period_end: '2024-12-15',
        total_records: 5200,
        processed_records: 0,
        failed_records: 5200,
        status: 'failed',
        error_log: 'Invalid CSV format: Missing required columns [UsageType, Cost]',
        imported_by: 'manager',
        created_at: '2024-12-15T16:20:00Z'
      },
      {
        import_id: 5,
        client_id: 4,
        client_name: 'StartupXYZ',
        import_source: 'CSV',
        file_name: 'startupxyz-nov-2024-usage.csv',
        aws_account_ids: ['123456789018'],
        billing_period_start: '2024-11-01',
        billing_period_end: '2024-11-30',
        total_records: 2800,
        processed_records: 0,
        failed_records: 0,
        status: 'pending',
        imported_by: 'manager',
        created_at: '2024-12-12T11:30:00Z'
      }
    ];
    setImports(mockImports);
  };

  const loadClients = async () => {
    // Mock data - replace with actual API call
    const mockClients: Client[] = [
      { client_id: 1, client_name: 'TechCorp Inc', aws_account_ids: ['123456789012', '123456789013'] },
      { client_id: 2, client_name: 'DataFlow Ltd', aws_account_ids: ['123456789014'] },
      { client_id: 3, client_name: 'CloudTech Solutions', aws_account_ids: ['123456789015', '123456789016', '123456789017'] },
      { client_id: 4, client_name: 'StartupXYZ', aws_account_ids: ['123456789018'] }
    ];
    setClients(mockClients);
  };

  const filterImports = () => {
    let filtered = imports;

    if (searchTerm) {
      filtered = filtered.filter(importItem =>
        importItem.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        importItem.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        importItem.aws_account_ids.some(id => id.includes(searchTerm))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(importItem => importItem.status === statusFilter);
    }

    if (clientFilter !== 'all') {
      filtered = filtered.filter(importItem => importItem.client_id.toString() === clientFilter);
    }

    setFilteredImports(filtered);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    try {
      // Validate form
      if (!formData.client_id) {
        toast.error('Please select a client');
        return;
      }

      if (formData.import_source === 'CSV' && !selectedFile) {
        toast.error('Please select a CSV file');
        return;
      }

      if (!formData.billing_period_start || !formData.billing_period_end) {
        toast.error('Please select billing period dates');
        return;
      }

      // Mock API call - replace with actual implementation
      const client = clients.find(c => c.client_id.toString() === formData.client_id);
      const newImport: UsageImport = {
        import_id: imports.length + 1,
        client_id: parseInt(formData.client_id),
        client_name: client?.client_name || '',
        import_source: formData.import_source,
        file_name: selectedFile?.name,
        aws_account_ids: client?.aws_account_ids || [],
        billing_period_start: formData.billing_period_start,
        billing_period_end: formData.billing_period_end,
        total_records: Math.floor(Math.random() * 10000) + 1000,
        processed_records: 0,
        failed_records: 0,
        status: 'pending',
        imported_by: user?.role_name || 'unknown',
        created_at: new Date().toISOString()
      };

      setImports([newImport, ...imports]);
      setIsImportDialogOpen(false);
      resetForm();
      toast.success('Import started successfully');

      // Simulate processing
      setTimeout(() => {
        setImports(prev => prev.map(imp => 
          imp.import_id === newImport.import_id 
            ? { ...imp, status: 'processing' as const }
            : imp
        ));
      }, 2000);

      setTimeout(() => {
        setImports(prev => prev.map(imp => 
          imp.import_id === newImport.import_id 
            ? { 
                ...imp, 
                status: 'completed' as const,
                processed_records: imp.total_records,
                completed_at: new Date().toISOString()
              }
            : imp
        ));
        toast.success('Import completed successfully');
      }, 8000);

    } catch (error) {
      toast.error('Failed to start import');
    }
  };

  const handleRetryImport = async (importId: number) => {
    try {
      // Mock API call - replace with actual implementation
      setImports(imports.map(imp => 
        imp.import_id === importId 
          ? { ...imp, status: 'pending', failed_records: 0, error_log: undefined }
          : imp
      ));
      toast.success('Import retry initiated');
    } catch (error) {
      toast.error('Failed to retry import');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      import_source: 'CSV',
      billing_period_start: '',
      billing_period_end: ''
    });
    setSelectedFile(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getProgressPercentage = (importItem: UsageImport) => {
    if (importItem.status === 'completed') return 100;
    if (importItem.status === 'failed') return 0;
    if (importItem.status === 'pending') return 0;
    return Math.round((importItem.processed_records / importItem.total_records) * 100);
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const canModify = user.role_name !== 'Auditor';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Usage Import" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AWS Usage Import</h2>
                <p className="text-gray-600 mt-1">Import AWS usage data from CSV files or API</p>
              </div>
              {canModify && (
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      New Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import AWS Usage Data</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
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
                          <Label htmlFor="import_source">Import Source</Label>
                          <Select value={formData.import_source} onValueChange={(value: any) => setFormData({...formData, import_source: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CSV">CSV File</SelectItem>
                              <SelectItem value="API">AWS API</SelectItem>
                              <SelectItem value="MANUAL">Manual Entry</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {formData.import_source === 'CSV' && (
                        <div className="space-y-2">
                          <Label htmlFor="file">CSV File *</Label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-2">
                              {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-xs text-gray-500 mb-4">CSV files up to 50MB</p>
                            <Input
                              type="file"
                              accept=".csv"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="file-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('file-upload')?.click()}
                            >
                              Choose File
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="billing_period_start">Billing Period Start *</Label>
                          <Input
                            id="billing_period_start"
                            type="date"
                            value={formData.billing_period_start}
                            onChange={(e) => setFormData({...formData, billing_period_start: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="billing_period_end">Billing Period End *</Label>
                          <Input
                            id="billing_period_end"
                            type="date"
                            value={formData.billing_period_end}
                            onChange={(e) => setFormData({...formData, billing_period_end: e.target.value})}
                          />
                        </div>
                      </div>

                      {formData.client_id && (
                        <div className="space-y-2">
                          <Label>AWS Accounts for Selected Client</Label>
                          <div className="flex flex-wrap gap-2">
                            {clients.find(c => c.client_id.toString() === formData.client_id)?.aws_account_ids.map((accountId) => (
                              <Badge key={accountId} className="bg-blue-100 text-blue-800">
                                {accountId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleImport}>
                        Start Import
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
                      <p className="text-sm text-gray-600">Total Imports</p>
                      <p className="text-2xl font-bold text-gray-900">{imports.length}</p>
                    </div>
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Processing</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {imports.filter(i => i.status === 'processing').length}
                      </p>
                    </div>
                    <RefreshCw className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {imports.filter(i => i.status === 'completed').length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Failed</p>
                      <p className="text-2xl font-bold text-red-600">
                        {imports.filter(i => i.status === 'failed').length}
                      </p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-600" />
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
                      placeholder="Search imports..."
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
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

            {/* Imports List */}
            <div className="space-y-4">
              {filteredImports.map((importItem) => (
                <Card key={importItem.import_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Upload className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{importItem.client_name}</h3>
                          <p className="text-sm text-gray-600">
                            {importItem.file_name || `${importItem.import_source} Import`}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(importItem.billing_period_start).toLocaleDateString()} - {new Date(importItem.billing_period_end).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Building2 className="w-4 h-4 mr-1" />
                              {importItem.aws_account_ids.length} AWS Account{importItem.aws_account_ids.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(importItem.status)}
                        <Badge className="bg-gray-100 text-gray-800">
                          {importItem.import_source}
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {importItem.status === 'processing' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Processing records...</span>
                          <span>{importItem.processed_records.toLocaleString()} / {importItem.total_records.toLocaleString()}</span>
                        </div>
                        <Progress value={getProgressPercentage(importItem)} className="h-2" />
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{importItem.total_records.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Total Records</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{importItem.processed_records.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Processed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{importItem.failed_records.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Failed</p>
                      </div>
                    </div>

                    {/* Error Log */}
                    {importItem.error_log && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start">
                          <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Import Error</p>
                            <p className="text-sm text-red-700 mt-1">{importItem.error_log}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AWS Accounts */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">AWS Accounts:</p>
                      <div className="flex flex-wrap gap-2">
                        {importItem.aws_account_ids.map((accountId) => (
                          <Badge key={accountId} className="bg-blue-100 text-blue-800">
                            {accountId}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-500">
                        <span>Imported by {importItem.imported_by} • </span>
                        <span>{new Date(importItem.created_at).toLocaleString()}</span>
                        {importItem.completed_at && (
                          <span> • Completed {new Date(importItem.completed_at).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {importItem.status === 'completed' && (
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {canModify && importItem.status === 'failed' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRetryImport(importItem.import_id)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredImports.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No imports found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || statusFilter !== 'all' || clientFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Get started by importing your first AWS usage data'
                    }
                  </p>
                  {canModify && !searchTerm && statusFilter === 'all' && clientFilter === 'all' && (
                    <Button onClick={() => setIsImportDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Import
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}