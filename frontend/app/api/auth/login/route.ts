import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Proxy the request to Express backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      // Forward session cookies from backend
      const response = NextResponse.json(data.data, { status: 200 });
      
      // Copy session cookies from backend response
      const setCookieHeader = backendResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        response.headers.set('set-cookie', setCookieHeader);
      }
      
      return response;
    } else {
      return NextResponse.json(
        { error: data.error || 'Login failed' },
        { status: backendResponse.status }
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