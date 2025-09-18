import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.10.50.93:5002';

/**
 * Logout API Route - Proxy to backend logout
 * Handles user logout and clears any stored data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Forward request to Express backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.ip || '',
        'User-Agent': request.headers.get('User-Agent') || ''
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();

    // Return response regardless of backend status
    return NextResponse.json({
      success: true,
      message: data.message || 'Logged out successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Logout proxy error:', error);
    
    // Even if backend fails, return success for logout
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, { status: 200 });
  }
}