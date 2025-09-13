import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Mock database - Replace with actual database connection
let users = [
  {
    user_id: 1,
    username: 'admin',
    email: 'admin@tejit.com',
    password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role_id: 1,
    role_name: 'Super Admin',
    status: 'active'
  },
  {
    user_id: 2,
    username: 'manager',
    email: 'manager@tejit.com',
    password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role_id: 2,
    role_name: 'Client Manager',
    status: 'active'
  },
  {
    user_id: 3,
    username: 'auditor',
    email: 'auditor@tejit.com',
    password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
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

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

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
      password_hash,
      role_id: parseInt(role_id),
      role_name: roleNames[role_id as keyof typeof roleNames] || 'User',
      status: 'active'
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: newUser.user_id,
        email: newUser.email,
        role_name: newUser.role_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      user_id: newUser.user_id,
      username: newUser.username,
      email: newUser.email,
      role_name: newUser.role_name,
      role_id: newUser.role_id,
      token,
      expires_in: 86400
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}