"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Eye, 
  EyeOff, 
  Building2, 
  Shield, 
  Users, 
  BarChart3,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle,
  Cloud,
  DollarSign
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth data
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data));
        
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Connection failed. Please check if the backend is running on port 5002.');
    } finally {
      setIsLoading(false);
    }
  };

  const demoCredentials = [
    {
      role: 'Super Admin',
      email: 'admin@tejit.com',
      password: 'Admin@123',
      description: 'Full system access',
      icon: Shield,
      color: 'bg-blue-500'
    },
    {
      role: 'Client Manager',
      email: 'manager@tejit.com',
      password: 'Manager@123',
      description: 'Manage clients & invoices',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      role: 'Auditor',
      email: 'auditor@tejit.com',
      password: 'Auditor@123',
      description: 'Reports & analytics',
      icon: BarChart3,
      color: 'bg-purple-500'
    }
  ];

  const features = [
    {
      icon: Building2,
      title: 'Client Management',
      description: 'Manage AWS clients with multi-account support'
    },
    {
      icon: DollarSign,
      title: 'Invoice Generation',
      description: 'Automated billing with GST compliance'
    },
    {
      icon: Cloud,
      title: 'AWS Integration',
      description: 'Direct AWS usage import and cost tracking'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Comprehensive business insights'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative flex min-h-screen">
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-12 text-white">
          <div className="flex flex-col justify-between w-full">
            {/* Header */}
            <div>
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Tej IT Solutions</h1>
                  <p className="text-blue-100">AWS Billing Management</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-bold mb-4 leading-tight">
                    Streamline Your<br />
                    <span className="text-blue-200">AWS Billing</span>
                  </h2>
                  <p className="text-xl text-blue-100 leading-relaxed">
                    Comprehensive client billing and management system designed specifically for AWS service providers.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {features.map((feature, index) => (
                    <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <feature.icon className="w-8 h-8 text-blue-200 mb-3" />
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-blue-100">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center space-x-4 text-blue-100">
              <CheckCircle className="w-5 h-5" />
              <span>Trusted by 100+ AWS service providers</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile Header */}
            <div className="lg:hidden text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Tej IT Solutions</h1>
                  <p className="text-sm text-gray-600">AWS Billing Management</p>
                </div>
              </div>
            </div>

            {/* Login Card */}
            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold text-center text-gray-900">
                  Welcome Back
                </CardTitle>
                <p className="text-center text-gray-600">
                  Sign in to access your AWS billing dashboard
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </form>

                {/* Demo Credentials */}
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Demo Credentials</span>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {demoCredentials.map((cred, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setEmail(cred.email);
                          setPassword(cred.password);
                        }}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all duration-200 group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 ${cred.color} rounded-lg flex items-center justify-center`}>
                            <cred.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{cred.role}</p>
                            <p className="text-xs text-gray-600">{cred.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Click any role above to auto-fill credentials
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Backend: localhost:5002</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Frontend: localhost:3002</span>
              </div>
              <p className="text-xs text-gray-500">
                © 2024 Tej IT Solutions. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}