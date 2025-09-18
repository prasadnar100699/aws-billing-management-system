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
  FolderOpen,
  Plus,
  Search,
  Eye,
  Download,
  Trash2,
  FileText,
  Upload,
  Building2,
  Calendar,
  Filter,
  File,
  Image,
  Archive
} from 'lucide-react';

interface Document {
  document_id: number;
  document_name: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  document_type: 'invoice' | 'usage_report' | 'contract' | 'certificate' | 'other';
  entity_type: 'client' | 'invoice' | 'import' | 'system';
  entity_id?: number;
  entity_name?: string;
  uploaded_by: string;
  is_public: boolean;
  created_at: string;
}

interface Client {
  client_id: number;
  client_name: string;
}

interface User {
  role_name: string;
}

export default function DocumentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    document_name: '',
    document_type: 'other' as const,
    entity_type: 'system' as const,
    entity_id: '',
    is_public: false
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

    loadDocuments();
    loadClients();
  }, [router]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, typeFilter, entityFilter]);

  const loadDocuments = async () => {
    // Mock data - replace with actual API call
    const mockDocuments: Document[] = [
      {
        document_id: 1,
        document_name: 'TechCorp Service Agreement',
        original_filename: 'techcorp-service-agreement-2024.pdf',
        file_size: 2048576, // 2MB
        mime_type: 'application/pdf',
        document_type: 'contract',
        entity_type: 'client',
        entity_id: 1,
        entity_name: 'TechCorp Inc',
        uploaded_by: 'admin',
        is_public: false,
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        document_id: 2,
        document_name: 'November 2024 Usage Report',
        original_filename: 'techcorp-nov-2024-usage.csv',
        file_size: 5242880, // 5MB
        mime_type: 'text/csv',
        document_type: 'usage_report',
        entity_type: 'client',
        entity_id: 1,
        entity_name: 'TechCorp Inc',
        uploaded_by: 'manager',
        is_public: false,
        created_at: '2024-12-01T14:15:00Z'
      },
      {
        document_id: 3,
        document_name: 'Invoice TejIT-001-202412-001',
        original_filename: 'invoice-TejIT-001-202412-001.pdf',
        file_size: 1048576, // 1MB
        mime_type: 'application/pdf',
        document_type: 'invoice',
        entity_type: 'invoice',
        entity_id: 1,
        entity_name: 'TejIT-001-202412-001',
        uploaded_by: 'system',
        is_public: false,
        created_at: '2024-12-01T16:45:00Z'
      },
      {
        document_id: 4,
        document_name: 'DataFlow SOC2 Certificate',
        original_filename: 'dataflow-soc2-certificate.pdf',
        file_size: 3145728, // 3MB
        mime_type: 'application/pdf',
        document_type: 'certificate',
        entity_type: 'client',
        entity_id: 2,
        entity_name: 'DataFlow Ltd',
        uploaded_by: 'admin',
        is_public: true,
        created_at: '2024-02-20T09:30:00Z'
      },
      {
        document_id: 5,
        document_name: 'CloudTech Usage Import Log',
        original_filename: 'cloudtech-import-log-dec2024.txt',
        file_size: 524288, // 512KB
        mime_type: 'text/plain',
        document_type: 'other',
        entity_type: 'import',
        entity_id: 3,
        entity_name: 'Import #3',
        uploaded_by: 'admin',
        is_public: false,
        created_at: '2024-12-10T11:20:00Z'
      },
      {
        document_id: 6,
        document_name: 'System Backup Configuration',
        original_filename: 'backup-config-2024.json',
        file_size: 102400, // 100KB
        mime_type: 'application/json',
        document_type: 'other',
        entity_type: 'system',
        uploaded_by: 'admin',
        is_public: false,
        created_at: '2024-01-01T00:00:00Z'
      }
    ];
    setDocuments(mockDocuments);
  };

  const loadClients = async () => {
    // Mock data - replace with actual API call
    const mockClients: Client[] = [
      { client_id: 1, client_name: 'TechCorp Inc' },
      { client_id: 2, client_name: 'DataFlow Ltd' },
      { client_id: 3, client_name: 'CloudTech Solutions' },
      { client_id: 4, client_name: 'StartupXYZ' }
    ];
    setClients(mockClients);
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.entity_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === typeFilter);
    }

    if (entityFilter !== 'all') {
      filtered = filtered.filter(doc => doc.entity_type === entityFilter);
    }

    setFilteredDocuments(filtered);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      if (!formData.document_name) {
        setFormData({...formData, document_name: file.name});
      }
    }
  };

  const handleUpload = async () => {
    try {
      // Validate form
      if (!selectedFile) {
        toast.error('Please select a file');
        return;
      }

      if (!formData.document_name) {
        toast.error('Please enter a document name');
        return;
      }

      if (formData.entity_type !== 'system' && !formData.entity_id) {
        toast.error('Please select an entity');
        return;
      }

      // Mock API call - replace with actual implementation
      let entityName = '';
      if (formData.entity_type === 'client') {
        const client = clients.find(c => c.client_id.toString() === formData.entity_id);
        entityName = client?.client_name || '';
      } else if (formData.entity_type === 'invoice') {
        entityName = `Invoice #${formData.entity_id}`;
      } else if (formData.entity_type === 'import') {
        entityName = `Import #${formData.entity_id}`;
      }

      const newDocument: Document = {
        document_id: documents.length + 1,
        document_name: formData.document_name,
        original_filename: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.type || 'application/octet-stream',
        document_type: formData.document_type,
        entity_type: formData.entity_type,
        entity_id: formData.entity_type === 'system' ? undefined : parseInt(formData.entity_id),
        entity_name: formData.entity_type === 'system' ? undefined : entityName,
        uploaded_by: user?.role_name || 'unknown',
        is_public: formData.is_public,
        created_at: new Date().toISOString()
      };

      setDocuments([newDocument, ...documents]);
      setIsUploadDialogOpen(false);
      resetForm();
      toast.success('Document uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload document');
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Mock API call - replace with actual implementation
      setDocuments(documents.filter(doc => doc.document_id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const resetForm = () => {
    setFormData({
      document_name: '',
      document_type: 'other',
      entity_type: 'system',
      entity_id: '',
      is_public: false
    });
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType === 'application/pdf') return FileText;
    if (mimeType.includes('csv') || mimeType.includes('excel')) return Archive;
    return File;
  };

  const getDocumentTypeBadge = (type: string) => {
    const typeConfig = {
      invoice: { color: 'bg-blue-100 text-blue-800', label: 'Invoice' },
      usage_report: { color: 'bg-green-100 text-green-800', label: 'Usage Report' },
      contract: { color: 'bg-purple-100 text-purple-800', label: 'Contract' },
      certificate: { color: 'bg-yellow-100 text-yellow-800', label: 'Certificate' },
      other: { color: 'bg-gray-100 text-gray-800', label: 'Other' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.other;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getEntityTypeBadge = (type: string) => {
    const typeConfig = {
      client: { color: 'bg-blue-100 text-blue-800', label: 'Client' },
      invoice: { color: 'bg-green-100 text-green-800', label: 'Invoice' },
      import: { color: 'bg-purple-100 text-purple-800', label: 'Import' },
      system: { color: 'bg-gray-100 text-gray-800', label: 'System' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.system;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const canModify = user.role_name !== 'Auditor';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Document Management" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
                <p className="text-gray-600 mt-1">Manage files and documents for clients, invoices, and system</p>
              </div>
              {canModify && (
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Upload New Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* File Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="file">File *</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 mb-2">
                            {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                          </p>
                          <p className="text-xs text-gray-500 mb-4">Files up to 50MB</p>
                          <Input
                            type="file"
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="document_name">Document Name *</Label>
                          <Input
                            id="document_name"
                            value={formData.document_name}
                            onChange={(e) => setFormData({...formData, document_name: e.target.value})}
                            placeholder="Enter document name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="document_type">Document Type</Label>
                          <Select value={formData.document_type} onValueChange={(value: any) => setFormData({...formData, document_type: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="invoice">Invoice</SelectItem>
                              <SelectItem value="usage_report">Usage Report</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="certificate">Certificate</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="entity_type">Associate With</Label>
                          <Select value={formData.entity_type} onValueChange={(value: any) => setFormData({...formData, entity_type: value, entity_id: ''})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client">Client</SelectItem>
                              <SelectItem value="invoice">Invoice</SelectItem>
                              <SelectItem value="import">Import</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.entity_type !== 'system' && (
                          <div className="space-y-2">
                            <Label htmlFor="entity_id">
                              {formData.entity_type === 'client' ? 'Client' : 
                               formData.entity_type === 'invoice' ? 'Invoice ID' : 'Import ID'} *
                            </Label>
                            {formData.entity_type === 'client' ? (
                              <Select value={formData.entity_id} onValueChange={(value) => setFormData({...formData, entity_id: value})}>
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
                            ) : (
                              <Input
                                id="entity_id"
                                value={formData.entity_id}
                                onChange={(e) => setFormData({...formData, entity_id: e.target.value})}
                                placeholder={`Enter ${formData.entity_type} ID`}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_public"
                          checked={formData.is_public}
                          onChange={(e) => setFormData({...formData, is_public: e.target.checked})}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="is_public">Make this document publicly accessible</Label>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpload}>
                        Upload Document
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
                      <p className="text-sm text-gray-600">Total Documents</p>
                      <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                    </div>
                    <FolderOpen className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Invoices</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {documents.filter(d => d.document_type === 'invoice').length}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Usage Reports</p>
                      <p className="text-2xl font-bold text-green-600">
                        {documents.filter(d => d.document_type === 'usage_report').length}
                      </p>
                    </div>
                    <Archive className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Size</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatFileSize(documents.reduce((sum, doc) => sum + doc.file_size, 0))}
                      </p>
                    </div>
                    <Building2 className="w-8 h-8 text-purple-600" />
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
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="usage_report">Usage Report</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-48">
                      <Building2 className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entities</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="import">Import</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((document) => {
                const FileIcon = getFileIcon(document.mime_type);
                return (
                  <Card key={document.document_id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4 mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{document.document_name}</h3>
                          <p className="text-sm text-gray-600 truncate">{document.original_filename}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Type:</span>
                          {getDocumentTypeBadge(document.document_type)}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Entity:</span>
                          <div className="flex items-center space-x-2">
                            {getEntityTypeBadge(document.entity_type)}
                            {document.is_public && (
                              <Badge className="bg-green-100 text-green-800 text-xs">Public</Badge>
                            )}
                          </div>
                        </div>

                        {document.entity_name && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Associated:</span>
                            <span className="text-sm font-medium text-gray-900 truncate max-w-32">
                              {document.entity_name}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Size:</span>
                          <span className="text-sm text-gray-900">{formatFileSize(document.file_size)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Uploaded:</span>
                          <span className="text-sm text-gray-900">
                            {new Date(document.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500">
                          By {document.uploaded_by}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 mt-4">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        {canModify && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteDocument(document.document_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredDocuments.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || typeFilter !== 'all' || entityFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Get started by uploading your first document'
                    }
                  </p>
                  {canModify && !searchTerm && typeFilter === 'all' && entityFilter === 'all' && (
                    <Button onClick={() => setIsUploadDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Document
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