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
import { toast } from 'sonner';
import {
  Settings,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Server,
  Database,
  Cloud,
  Shield,
  Network,
  Monitor,
  Filter,
  DollarSign
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface ServiceCategory {
  category_id: number;
  category_name: string;
  aws_service_group: string;
  description: string;
  service_count: number;
}

interface Service {
  service_id: number;
  service_name: string;
  service_category_id: number;
  category_name: string;
  aws_service_code: string;
  description: string;
  status: 'active' | 'deprecated';
  pricing_components: PricingComponent[];
  created_at: string;
}

interface PricingComponent {
  component_id: number;
  service_id: number;
  component_name: string;
  metric_type: 'HOUR' | 'GB' | 'REQUEST' | 'FIXED';
  unit: string;
  rate: number;
  currency: 'USD' | 'INR';
  effective_from: string;
}

interface User {
  role_name: string;
}

const getCategoryIcon = (awsServiceGroup: string) => {
  switch (awsServiceGroup) {
    case 'Compute':
      return Server;
    case 'Storage':
      return Database;
    case 'Database':
      return Database;
    case 'Networking':
      return Network;
    case 'Management':
      return Monitor;
    case 'Security':
      return Shield;
    default:
      return Cloud;
  }
};

export default function ServicesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateServiceDialogOpen, setIsCreateServiceDialogOpen] = useState(false);
  const [isEditServiceDialogOpen, setIsEditServiceDialogOpen] = useState(false);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    service_name: '',
    service_category_id: '',
    aws_service_code: '',
    description: '',
    status: 'active' as const
  });
  const [pricingFormData, setPricingFormData] = useState({
    component_name: '',
    metric_type: 'HOUR' as const,
    unit: '',
    rate: '',
    currency: 'USD' as const
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

    loadCategories();
    loadServices();
  }, [router]);

  useEffect(() => {
    filterServices();
  }, [services, searchTerm, categoryFilter, statusFilter]);

  const loadCategories = async () => {
    // Mock data - replace with actual API call
    const mockCategories: ServiceCategory[] = [
      {
        category_id: 1,
        category_name: 'Compute Services',
        aws_service_group: 'Compute',
        description: 'EC2, Lambda, ECS, EKS and other compute services',
        service_count: 3
      },
      {
        category_id: 2,
        category_name: 'Storage Services',
        aws_service_group: 'Storage',
        description: 'S3, EBS, EFS, Glacier and other storage services',
        service_count: 2
      },
      {
        category_id: 3,
        category_name: 'Database Services',
        aws_service_group: 'Database',
        description: 'RDS, DynamoDB, ElastiCache and other database services',
        service_count: 1
      },
      {
        category_id: 4,
        category_name: 'Networking Services',
        aws_service_group: 'Networking',
        description: 'CloudFront, Route53, VPC, Load Balancers',
        service_count: 1
      }
    ];
    setCategories(mockCategories);
  };

  const loadServices = async () => {
    // Mock data - replace with actual API call
    const mockServices: Service[] = [
      {
        service_id: 1,
        service_name: 'Amazon EC2',
        service_category_id: 1,
        category_name: 'Compute Services',
        aws_service_code: 'AmazonEC2',
        description: 'Elastic Compute Cloud - Virtual servers in the cloud',
        status: 'active',
        pricing_components: [
          {
            component_id: 1,
            service_id: 1,
            component_name: 'EC2 Instance Hours',
            metric_type: 'HOUR',
            unit: 'hour',
            rate: 0.0464,
            currency: 'USD',
            effective_from: '2024-01-01'
          },
          {
            component_id: 2,
            service_id: 1,
            component_name: 'EBS Storage',
            metric_type: 'GB',
            unit: 'GB-month',
            rate: 0.10,
            currency: 'USD',
            effective_from: '2024-01-01'
          }
        ],
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        service_id: 2,
        service_name: 'Amazon S3',
        service_category_id: 2,
        category_name: 'Storage Services',
        aws_service_code: 'AmazonS3',
        description: 'Simple Storage Service - Object storage service',
        status: 'active',
        pricing_components: [
          {
            component_id: 3,
            service_id: 2,
            component_name: 'S3 Standard Storage',
            metric_type: 'GB',
            unit: 'GB-month',
            rate: 0.023,
            currency: 'USD',
            effective_from: '2024-01-01'
          },
          {
            component_id: 4,
            service_id: 2,
            component_name: 'S3 Requests',
            metric_type: 'REQUEST',
            unit: '1000-requests',
            rate: 0.0004,
            currency: 'USD',
            effective_from: '2024-01-01'
          }
        ],
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        service_id: 3,
        service_name: 'Amazon RDS',
        service_category_id: 3,
        category_name: 'Database Services',
        aws_service_code: 'AmazonRDS',
        description: 'Relational Database Service - Managed database service',
        status: 'active',
        pricing_components: [
          {
            component_id: 5,
            service_id: 3,
            component_name: 'RDS Instance Hours',
            metric_type: 'HOUR',
            unit: 'hour',
            rate: 0.017,
            currency: 'USD',
            effective_from: '2024-01-01'
          }
        ],
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        service_id: 4,
        service_name: 'Amazon CloudFront',
        service_category_id: 4,
        category_name: 'Networking Services',
        aws_service_code: 'AmazonCloudFront',
        description: 'Content Delivery Network service',
        status: 'active',
        pricing_components: [
          {
            component_id: 6,
            service_id: 4,
            component_name: 'CloudFront Data Transfer',
            metric_type: 'GB',
            unit: 'GB',
            rate: 0.085,
            currency: 'USD',
            effective_from: '2024-01-01'
          }
        ],
        created_at: '2024-01-01T00:00:00Z'
      }
    ];
    setServices(mockServices);
  };

  const filterServices = () => {
    let filtered = services;

    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.aws_service_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(service => service.service_category_id.toString() === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => service.status === statusFilter);
    }

    setFilteredServices(filtered);
  };

  const handleCreateService = async () => {
    try {
      // Validate form
      if (!serviceFormData.service_name || !serviceFormData.service_category_id || !serviceFormData.aws_service_code) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Mock API call - replace with actual implementation
      const category = categories.find(c => c.category_id.toString() === serviceFormData.service_category_id);
      const newService: Service = {
        service_id: services.length + 1,
        service_name: serviceFormData.service_name,
        service_category_id: parseInt(serviceFormData.service_category_id),
        category_name: category?.category_name || '',
        aws_service_code: serviceFormData.aws_service_code,
        description: serviceFormData.description,
        status: serviceFormData.status,
        pricing_components: [],
        created_at: new Date().toISOString()
      };

      setServices([...services, newService]);
      setIsCreateServiceDialogOpen(false);
      resetServiceForm();
      toast.success('Service created successfully');
    } catch (error) {
      toast.error('Failed to create service');
    }
  };

  const handleEditService = async () => {
    if (!selectedService) return;

    try {
      // Mock API call - replace with actual implementation
      const category = categories.find(c => c.category_id.toString() === serviceFormData.service_category_id);
      const updatedService: Service = {
        ...selectedService,
        service_name: serviceFormData.service_name,
        service_category_id: parseInt(serviceFormData.service_category_id),
        category_name: category?.category_name || selectedService.category_name,
        aws_service_code: serviceFormData.aws_service_code,
        description: serviceFormData.description,
        status: serviceFormData.status
      };

      setServices(services.map(service => 
        service.service_id === selectedService.service_id ? updatedService : service
      ));
      setIsEditServiceDialogOpen(false);
      setSelectedService(null);
      resetServiceForm();
      toast.success('Service updated successfully');
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      // Mock API call - replace with actual implementation
      setServices(services.filter(service => service.service_id !== serviceId));
      toast.success('Service deleted successfully');
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleAddPricingComponent = async () => {
    if (!selectedService) return;

    try {
      // Validate form
      if (!pricingFormData.component_name || !pricingFormData.unit || !pricingFormData.rate) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Mock API call - replace with actual implementation
      const newComponent: PricingComponent = {
        component_id: Date.now(), // Mock ID
        service_id: selectedService.service_id,
        component_name: pricingFormData.component_name,
        metric_type: pricingFormData.metric_type,
        unit: pricingFormData.unit,
        rate: parseFloat(pricingFormData.rate),
        currency: pricingFormData.currency,
        effective_from: new Date().toISOString().split('T')[0]
      };

      const updatedService = {
        ...selectedService,
        pricing_components: [...selectedService.pricing_components, newComponent]
      };

      setServices(services.map(service => 
        service.service_id === selectedService.service_id ? updatedService : service
      ));
      setSelectedService(updatedService);
      resetPricingForm();
      toast.success('Pricing component added successfully');
    } catch (error) {
      toast.error('Failed to add pricing component');
    }
  };

  const resetServiceForm = () => {
    setServiceFormData({
      service_name: '',
      service_category_id: '',
      aws_service_code: '',
      description: '',
      status: 'active'
    });
  };

  const resetPricingForm = () => {
    setPricingFormData({
      component_name: '',
      metric_type: 'HOUR',
      unit: '',
      rate: '',
      currency: 'USD'
    });
  };

  const openEditServiceDialog = (service: Service) => {
    setSelectedService(service);
    setServiceFormData({
      service_name: service.service_name,
      service_category_id: service.service_category_id.toString(),
      aws_service_code: service.aws_service_code,
      description: service.description,
      status: service.status
    });
    setIsEditServiceDialogOpen(true);
  };

  const openPricingDialog = (service: Service) => {
    setSelectedService(service);
    setIsPricingDialogOpen(true);
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const canModify = user.role_name === 'Super Admin';

  return (
    <ProtectedRoute requiredPermission={{ module: 'services', action: 'view' }}>
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Service Catalog" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AWS Service Catalog</h2>
                <p className="text-gray-600 mt-1">Manage AWS services and their pricing components</p>
              </div>
              {canModify && (
                <Dialog open={isCreateServiceDialogOpen} onOpenChange={setIsCreateServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Service</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="service_name">Service Name *</Label>
                        <Input
                          id="service_name"
                          value={serviceFormData.service_name}
                          onChange={(e) => setServiceFormData({...serviceFormData, service_name: e.target.value})}
                          placeholder="e.g., Amazon EC2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service_category_id">Category *</Label>
                        <Select value={serviceFormData.service_category_id} onValueChange={(value) => setServiceFormData({...serviceFormData, service_category_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.category_id} value={category.category_id.toString()}>
                                {category.category_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="aws_service_code">AWS Service Code *</Label>
                        <Input
                          id="aws_service_code"
                          value={serviceFormData.aws_service_code}
                          onChange={(e) => setServiceFormData({...serviceFormData, aws_service_code: e.target.value})}
                          placeholder="e.g., AmazonEC2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={serviceFormData.description}
                          onChange={(e) => setServiceFormData({...serviceFormData, description: e.target.value})}
                          placeholder="Enter service description"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={serviceFormData.status} onValueChange={(value: any) => setServiceFormData({...serviceFormData, status: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="deprecated">Deprecated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateServiceDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateService}>
                        Create Service
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Service Categories Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category) => {
                const IconComponent = getCategoryIcon(category.aws_service_group);
                return (
                  <Card key={category.category_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{category.category_name}</p>
                          <p className="text-sm text-gray-600">{category.service_count} services</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.category_id} value={category.category_id.toString()}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => {
                const IconComponent = getCategoryIcon(categories.find(c => c.category_id === service.service_category_id)?.aws_service_group || '');
                return (
                  <Card key={service.service_id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{service.service_name}</CardTitle>
                            <p className="text-sm text-gray-600">{service.aws_service_code}</p>
                          </div>
                        </div>
                        <Badge className={service.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {service.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">{service.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">Category:</p>
                          <Badge className="bg-blue-100 text-blue-800">
                            {service.category_name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">Pricing Components:</p>
                          <span className="text-sm text-gray-600">
                            {service.pricing_components.length} component{service.pricing_components.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Pricing Components Preview */}
                      {service.pricing_components.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-900">Pricing:</p>
                          <div className="space-y-1">
                            {service.pricing_components.slice(0, 2).map((component) => (
                              <div key={component.component_id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{component.component_name}</span>
                                <span className="font-medium">
                                  ${component.rate.toFixed(4)}/{component.unit}
                                </span>
                              </div>
                            ))}
                            {service.pricing_components.length > 2 && (
                              <p className="text-xs text-gray-500">
                                +{service.pricing_components.length - 2} more...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex justify-end space-x-2 pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => openPricingDialog(service)}>
                          <DollarSign className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canModify && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEditServiceDialog(service)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteService(service.service_id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredServices.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Get started by adding your first AWS service'
                    }
                  </p>
                  {canModify && !searchTerm && categoryFilter === 'all' && statusFilter === 'all' && (
                    <Button onClick={() => setIsCreateServiceDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Edit Service Dialog */}
      <Dialog open={isEditServiceDialogOpen} onOpenChange={setIsEditServiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_service_name">Service Name *</Label>
              <Input
                id="edit_service_name"
                value={serviceFormData.service_name}
                onChange={(e) => setServiceFormData({...serviceFormData, service_name: e.target.value})}
                placeholder="e.g., Amazon EC2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_service_category_id">Category *</Label>
              <Select value={serviceFormData.service_category_id} onValueChange={(value) => setServiceFormData({...serviceFormData, service_category_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.category_id} value={category.category_id.toString()}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_aws_service_code">AWS Service Code *</Label>
              <Input
                id="edit_aws_service_code"
                value={serviceFormData.aws_service_code}
                onChange={(e) => setServiceFormData({...serviceFormData, aws_service_code: e.target.value})}
                placeholder="e.g., AmazonEC2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={serviceFormData.description}
                onChange={(e) => setServiceFormData({...serviceFormData, description: e.target.value})}
                placeholder="Enter service description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select value={serviceFormData.status} onValueChange={(value: any) => setServiceFormData({...serviceFormData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditServiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditService}>
              Update Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Components Dialog */}
      <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pricing Components - {selectedService?.service_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Add New Component Form */}
            {canModify && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Pricing Component</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="component_name">Component Name *</Label>
                      <Input
                        id="component_name"
                        value={pricingFormData.component_name}
                        onChange={(e) => setPricingFormData({...pricingFormData, component_name: e.target.value})}
                        placeholder="e.g., Instance Hours"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metric_type">Metric Type *</Label>
                      <Select value={pricingFormData.metric_type} onValueChange={(value: any) => setPricingFormData({...pricingFormData, metric_type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOUR">Hour</SelectItem>
                          <SelectItem value="GB">GB</SelectItem>
                          <SelectItem value="REQUEST">Request</SelectItem>
                          <SelectItem value="FIXED">Fixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit *</Label>
                      <Input
                        id="unit"
                        value={pricingFormData.unit}
                        onChange={(e) => setPricingFormData({...pricingFormData, unit: e.target.value})}
                        placeholder="e.g., hour, GB-month"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rate">Rate *</Label>
                      <Input
                        id="rate"
                        type="number"
                        step="0.0001"
                        value={pricingFormData.rate}
                        onChange={(e) => setPricingFormData({...pricingFormData, rate: e.target.value})}
                        placeholder="0.0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={pricingFormData.currency} onValueChange={(value: any) => setPricingFormData({...pricingFormData, currency: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddPricingComponent} className="w-full">
                        Add Component
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Components */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Pricing Components</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedService?.pricing_components.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pricing components defined</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Component</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Unit</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Rate</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Currency</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Effective From</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedService?.pricing_components.map((component) => (
                          <tr key={component.component_id} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium text-gray-900">{component.component_name}</td>
                            <td className="py-3 px-4 text-gray-600">{component.metric_type}</td>
                            <td className="py-3 px-4 text-gray-600">{component.unit}</td>
                            <td className="py-3 px-4 text-right font-medium">{component.rate.toFixed(4)}</td>
                            <td className="py-3 px-4 text-gray-600">{component.currency}</td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(component.effective_from).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsPricingDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  );
}