import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/error',
    '/api/auth',
  ]
  
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  // Allow public routes and API routes
  if (isPublicRoute || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }
  
  // Redirect to signin if not authenticated
  if (!req.auth) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
}