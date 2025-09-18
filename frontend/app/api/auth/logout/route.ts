import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;

    // Proxy the request to Node.js backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId || '',
        'X-Forwarded-For': request.ip || '',
        'User-Agent': request.headers.get('User-Agent') || ''
      },
      credentials: 'include'
    });

    const data = await backendResponse.json();

    // Create response and clear session cookie
    const response = NextResponse.json(data, { 
      status: backendResponse.ok ? 200 : backendResponse.status 
    });
    
    // Clear session cookie
    response.cookies.delete('session_id');
    
    // Set additional headers to ensure cookie is cleared
    response.cookies.set('session_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      expires: new Date(0)
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if backend fails, clear the cookie
    const response = NextResponse.json(
      { success: true, message: 'Logged out' },
      { status: 200 }
    );
    response.cookies.delete('session_id');
    
    return response;
  }
}