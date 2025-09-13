import { NextRequest, NextResponse } from 'next/server';

// Mock users database
const users = [
  {
    user_id: 1,
    username: 'admin',
    email: 'admin@tejit.com',
    role_name: 'Super Admin',
    status: 'active'
  },
  {
    user_id: 2,
    username: 'manager',
    email: 'manager@tejit.com',
    role_name: 'Client Manager',
    status: 'active'
  },
  {
    user_id: 3,
    username: 'auditor',
    email: 'auditor@tejit.com',
    role_name: 'Auditor',
    status: 'active'
  }
];

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('X-User-Email');
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 401 }
      );
    }

    // Find user in mock database
    const user = users.find(u => u.email === userEmail);

    if (user) {
      // Mock permissions based on role
      const permissions = getRolePermissions(user.role_name);
      
      return NextResponse.json({
        user: user,
        permissions: permissions
      }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Auth me proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getRolePermissions(roleName: string) {
  const permissions: any = {
    'Super Admin': {
      dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      clients: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      users: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      roles: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      services: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      invoices: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      usage_import: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      documents: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      reports: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      notifications: { can_view: true, can_create: true, can_edit: true, can_delete: true }
    },
    'Client Manager': {
      dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      clients: { can_view: true, can_create: true, can_edit: true, can_delete: false },
      services: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      invoices: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      usage_import: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      documents: { can_view: true, can_create: true, can_edit: true, can_delete: true },
      reports: { can_view: true, can_create: true, can_edit: false, can_delete: false },
      notifications: { can_view: true, can_create: false, can_edit: false, can_delete: false }
    },
    'Auditor': {
      dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      clients: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      services: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      invoices: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      usage_import: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      documents: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      reports: { can_view: true, can_create: true, can_edit: false, can_delete: false },
      notifications: { can_view: true, can_create: false, can_edit: false, can_delete: false }
    }
  };
  
  return permissions[roleName] || {};
}