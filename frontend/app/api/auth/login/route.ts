import { NextRequest, NextResponse } from 'next/server';

// Define User interface (from demo.d.ts or inline)
interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  role_id: number;
  status: string;
  token?: string;
  expires_in?: number;
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5002';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Proxy the request to Python backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ error: 'Login failed' }));
      return NextResponse.json(
        { error: errorData.error || 'Invalid email or password' },
        { status: backendResponse.status }
      );
    }

    const data: User & { token: string; expires_in: number } = await backendResponse.json();

    // Return the backend response directly (token, user data, etc.)
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}