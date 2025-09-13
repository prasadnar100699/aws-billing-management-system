import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

export async function POST(request: NextRequest) {
  try {
    // Proxy the request to Express backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || ''
      },
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      // Forward session cookies from backend (should clear session)
      const response = NextResponse.json(data, { status: 200 });
      
      const setCookieHeader = backendResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        response.headers.set('set-cookie', setCookieHeader);
      }
      
      return response;
    } else {
      return NextResponse.json(
        { error: data.error || 'Logout failed' },
        { status: backendResponse.status }
      );
    }
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}