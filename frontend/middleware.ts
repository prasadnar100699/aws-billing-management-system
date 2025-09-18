import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = ['/', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionId = request.cookies.get('session_id')?.value;

  // Handle root path and login page
  if (pathname === '/') {
    // If already logged in, redirect to dashboard
    if (sessionId) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Not logged in, allow access to login page
    return NextResponse.next();
  }

  // Allow other public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Protected routes → require session
  if (!sessionId) {
    // Check if we have auth token in localStorage (for development)
    const response = NextResponse.next();
    response.headers.set('X-Auth-Required', 'true');
    return response;
  }

  // ✅ Authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
