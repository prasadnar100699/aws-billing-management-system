import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.10.50.93:5002';

/**
 * Login API Route - Proxy to backend authentication
 * Handles user login with session cookies
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
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.ip || '',
        'User-Agent': request.headers.get('User-Agent') || '',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json();

    if (backendResponse.ok && data.success) {
      // Create response with session cookie
      const response = NextResponse.json({
        success: true,
        message: data.message,
        user: data.data.user,
        permissions: data.permissions,
        session_id: data.session_id
      }, { status: 200 });

      // Forward session cookie from backend
      const setCookieHeader = backendResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        response.headers.set('Set-Cookie', setCookieHeader);
      }

      return response;
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