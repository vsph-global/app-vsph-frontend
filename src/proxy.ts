import { type NextRequest, NextResponse } from 'next/server';

/**
 * Fast deny-only gate for protected navigation.
 *
 * This deliberately checks only whether a syntactically valid portal cookie
 * exists. A matching cookie does NOT grant access: the (workspace) layout
 * still verifies /api/auth/me against the trusted backend on every request.
 * Reject missing/obviously invalid cookies before a streamed Next.js shell
 * can return HTTP 200 with a client-side redirect.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get('vsph.portal.sid')?.value;
  if (!token || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/login';
    destination.search = '';
    destination.hash = '';
    return NextResponse.redirect(destination);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/applications/:path*', '/projects/:path*'],
};
