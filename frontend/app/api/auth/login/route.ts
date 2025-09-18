import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

/**
 * Login API Route - Proxy to backend authentication
 * Handles user login and returns user data with permissions
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email and password are required' 
        },
        { status: 400 }
      );
    }

    // Forward request to Express backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.ip || '',
        'User-Agent': request.headers.get('User-Agent') || ''
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json();

    if (backendResponse.ok && data.success) {
      // Return successful login response
      return NextResponse.json({
        success: true,
        message: data.message,
        user: data.data.user,
        permissions: data.data.permissions
      }, { status: 200 });
    } else {
      // Return error response
      return NextResponse.json(
        { 
          success: false,
          error: data.error || 'Login failed' 
        },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}