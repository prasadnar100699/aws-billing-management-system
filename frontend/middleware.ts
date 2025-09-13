import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup'];

// Routes that require specific roles
const roleBasedRoutes = {
  '/users': ['Super Admin'],
  '/roles': ['Super Admin'],
  '/services': ['Super Admin', 'Client Manager'],
  '/usage-import': ['Super Admin', 'Client Manager'],
  '/documents': ['Super Admin', 'Client Manager', 'Auditor'],
  '/reports': ['Super Admin', 'Client Manager', 'Auditor'],
  '/notifications': ['Super Admin', 'Client Manager'],
  '/clients': ['Super Admin', 'Client Manager'],
  '/invoices': ['Super Admin', 'Client Manager', 'Auditor'],
  '/dashboard': ['Super Admin', 'Client Manager', 'Auditor']
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get('auth_token')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check role-based access
    const requiredRoles = roleBasedRoutes[pathname as keyof typeof roleBasedRoutes];
    if (requiredRoles && !requiredRoles.includes(decoded.role_name)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Invalid token, redirect to login
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};