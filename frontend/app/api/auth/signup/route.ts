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
    const { username, email, password, role_id } = await request.json();

    // Validate required fields
    if (!username || !email || !password || !role_id) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (users.find(u => u.email === email || u.username === username)) {
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
      username,
      email,
      password,
      role_id: parseInt(role_id),
      role_name: roleNames[role_id as keyof typeof roleNames] || 'User',
      status: 'active'
    };

    users.push(newUser);

    return NextResponse.json({
      user_id: newUser.user_id,
      username: newUser.username,
      email: newUser.email,
      role_name: newUser.role_name,
      role_id: newUser.role_id
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}