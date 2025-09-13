import { NextRequest, NextResponse } from 'next/server';

// Mock users database - replace with actual database
const users = [
  {
    user_id: 1,
    username: 'admin',
    email: 'admin@tejit.com',
    password: 'password',
    role_id: 1,
    role_name: 'Super Admin',
    status: 'active'
  },
  {
    user_id: 2,
    username: 'manager',
    email: 'manager@tejit.com',
    password: 'password',
    role_id: 2,
    role_name: 'Client Manager',
    status: 'active'
  },
  {
    user_id: 3,
    username: 'auditor',
    email: 'auditor@tejit.com',
    password: 'password',
    role_id: 3,
    role_name: 'Auditor',
    status: 'active'
  }
];

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user in mock database
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      return NextResponse.json({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role_name,
        role_id: user.role_id,
        status: user.status
      }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}