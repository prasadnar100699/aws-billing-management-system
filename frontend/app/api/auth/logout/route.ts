import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.10.50.93:5002';

/**
 * Logout API Route - Proxy to backend logout
 * Handles user logout and clears session cookies
 */
export async function POST(request: NextRequest) {
  try {

    // Forward request to Express backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || ''
      },
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, { status: 200 });

    // Clear session cookie
    response.cookies.delete('session_id');

    return response;

  } catch (error) {
    console.error('Logout proxy error:', error);
    
    // Clear cookie even if backend fails
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, { status: 200 });

    response.cookies.delete('session_id');
    return response;
  }
}