import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Proxy the request to Node.js backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'X-Forwarded-For': request.ip || '',
        'User-Agent': request.headers.get('User-Agent') || ''
      },
    });

    const data = await backendResponse.json();

    if (backendResponse.ok) {
      // Ensure we return the correct data structure
      return NextResponse.json(data, { status: 200 });
    } else {
      // Clear invalid session cookie
      const response = NextResponse.json(
        { error: data.error || 'Session invalid' },
        { status: backendResponse.status }
      );
      
      if (backendResponse.status === 401) {
        response.cookies.delete('session_id');
      }
      
      return response;
    }
  } catch (error) {
    console.error('Auth me proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}