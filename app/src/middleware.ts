import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client with cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // This is needed for production deployments
          req.cookies.set({
            name,
            value,
            ...options,
          });
          // This is needed for the headers to be set
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // This is needed for production deployments
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          // This is needed for the headers to be set
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
  
  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession();
  
  // Check if the request is for a protected route
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') || 
                          req.nextUrl.pathname.startsWith('/projects') || 
                          req.nextUrl.pathname.startsWith('/account');
  
  // Check if the request is for an auth route
  const isAuthRoute = req.nextUrl.pathname.startsWith('/signin') || 
                     req.nextUrl.pathname.startsWith('/signup') || 
                     req.nextUrl.pathname.startsWith('/reset-password');
  
  // If accessing a protected route without a session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/signin', req.url);
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // If accessing auth routes with a session, redirect to dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // For role-based access control
  if (session) {
    // Get user metadata to check roles
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = user?.user_metadata?.role || 'user';
    
    // Example: Admin-only routes
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
    if (isAdminRoute && userRole !== 'admin') {
      // Redirect non-admin users attempting to access admin routes
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  return res;
}

// Match all routes except for static files, api routes, and public assets
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|public).*)'],
};
