import { NextRequest, NextResponse } from 'next/server';

// Mock database - Replace with actual database connection
let users = [
  {
    user_id: 1,
    username: 'admin',
    email: 'admin@tejit.com',
    password: 'password',
    role_id: 1,
    role_name: 'Super Admin',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    user_id: 2,
    username: 'manager',
    email: 'manager@tejit.com',
    password: 'password',
    role_id: 2,
    role_name: 'Client Manager',
    status: 'active',
    created_at: '2024-01-15T09:30:00Z'
  },
  {
    user_id: 3,
    username: 'auditor',
    email: 'auditor@tejit.com',
    password: 'password',
    role_id: 3,
    role_name: 'Auditor',
    status: 'active',
    created_at: '2024-02-01T11:15:00Z'
  }
];

function getCurrentUser(request: NextRequest) {
  const userEmail = request.headers.get('X-User-Email');
  
  if (!userEmail) {
    return null;
  }

  return users.find(u => u.email === userEmail);
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin can list users
    if (currentUser.role_name !== 'Super Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role_id');
    const statusFilter = searchParams.get('status');

    let filteredUsers = users;

    // Apply search filter
    if (search) {
      filteredUsers = filteredUsers.filter(user =>
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter && roleFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.role_id.toString() === roleFilter);
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Remove passwords from response
    const safeUsers = paginatedUsers.map(({ password, ...user }) => user);

    return NextResponse.json({
      users: safeUsers,
      total: filteredUsers.length,
      pages: Math.ceil(filteredUsers.length / limit),
      current_page: page,
      per_page: limit
    });

  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin can create users
    if (currentUser.role_name !== 'Super Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userData = await request.json();

    // Validate required fields
    if (!userData.username || !userData.email || !userData.password || !userData.role_id) {
      return NextResponse.json(
        { error: 'Username, email, password, and role are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (users.some(user => user.email === userData.email || user.username === userData.username)) {
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }

    // Get role name
    const roleNames = {
      1: 'Super Admin',
      2: 'Client Manager',
      3: 'Auditor'
    };

    // Create new user
    const newUser = {
      user_id: Math.max(...users.map(u => u.user_id)) + 1,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role_id: parseInt(userData.role_id),
      role_name: roleNames[userData.role_id as keyof typeof roleNames] || 'User',
      status: userData.status || 'active',
      created_at: new Date().toISOString()
    };

    users.push(newUser);

    // Remove password from response
    const { password: _, ...safeUser } = newUser;

    return NextResponse.json({
      message: 'User created successfully',
      user: safeUser
    }, { status: 201 });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}