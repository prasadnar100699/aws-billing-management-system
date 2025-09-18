import { NextRequest, NextResponse } from 'next/server';

// Mock roles data
const roles = [
  {
    role_id: 1,
    role_name: 'Super Admin',
    description: 'Full system access with all permissions',
    permissions: {
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
    }
  },
  {
    role_id: 2,
    role_name: 'Client Manager',
    description: 'Can manage assigned clients and generate invoices',
    permissions: {
      dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      clients: { can_view: true, can_create: true, can_edit: true, can_delete: false },
      services: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      invoices: { can_view: true, can_create: true, can_edit: true, can_delete: false },
      usage_import: { can_view: true, can_create: true, can_edit: false, can_delete: false },
      documents: { can_view: true, can_create: true, can_edit: false, can_delete: false },
      reports: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      notifications: { can_view: true, can_create: false, can_edit: false, can_delete: false }
    }
  },
  {
    role_id: 3,
    role_name: 'Auditor',
    description: 'Read-only access for reports and analytics',
    permissions: {
      dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      clients: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      invoices: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      documents: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      reports: { can_view: true, can_create: false, can_edit: false, can_delete: false }
    }
  }
];

function getCurrentUser(request: NextRequest) {
  const userEmail = request.headers.get('X-User-Email');
  
  if (!userEmail) {
    return null;
  }

  // Mock user lookup
  const users = [
    { email: 'admin@tejit.com', role_name: 'Super Admin' },
    { email: 'manager@tejit.com', role_name: 'Client Manager' },
    { email: 'auditor@tejit.com', role_name: 'Auditor' }
  ];
  
  return users.find(u => u.email === userEmail);
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ roles });

  } catch (error) {
    console.error('List roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}