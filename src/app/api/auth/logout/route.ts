import { type NextRequest, NextResponse } from 'next/server';
import { approvedInternalOrigin } from '@/features/workspace/server-api';

// This route is a narrowly scoped, same-origin CSRF-protected proxy for the
// original POST /api/auth/logout contract. It never accepts an arbitrary URL.
function publicOrigin(): string | null {
  const raw = process.env.VSPH_PUBLIC_ORIGIN;
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (parsed.origin !== raw || parsed.username || parsed.password ||
        parsed.pathname !== '/' || parsed.search || parsed.hash ||
        (parsed.protocol !== 'https:' && !(loopback && parsed.protocol === 'http:'))) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const publicUrl = publicOrigin();
  const upstream = approvedInternalOrigin();
  const headers = { 'Cache-Control': 'no-store' };
  if (!publicUrl || !upstream) {
    return NextResponse.json({ message: 'Sign out is unavailable.' }, { status: 503, headers });
  }
  // Never trust a cross-site POST, an omitted Origin, or a caller-supplied
  // forwarding header as proof of same-origin browser navigation.
  if (request.headers.get('origin') !== publicUrl ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ message: 'Origin not permitted.' }, { status: 403, headers });
  }

  // Forward only reviewed cookie names and opaque token formats. The
  // application cookies are cleared locally, not relayed to arbitrary hosts.
  const cookiePattern = /^vsph\.[a-z][a-z0-9_]{1,39}\.sid$/;
  const allowedCookies = request.cookies.getAll().filter(c =>
    c.name === 'vsph.portal.sid' || c.name === 'vsph.employee.setup' ||
    cookiePattern.test(c.name));
  if (allowedCookies.some(c => !/^[A-Za-z0-9_-]{32,128}$/.test(c.value))) {
    return NextResponse.json({ message: 'Invalid session cookie.' }, { status: 400, headers });
  }
  const cookieHeader = allowedCookies.slice(0, 102).map(c => c.name + '=' + c.value).join('; ');
  try {
    const response = await fetch(upstream + '/api/auth/logout', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: publicUrl,
        Cookie: cookieHeader,
      },
      body: '{}',
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    // Only a confirmed backend revocation can produce a success response.
    if (response.status !== 200) throw new Error('Backend revocation failed');
    const signedOut = NextResponse.json({ message: 'Signed out.' }, { headers });
    for (const cookie of allowedCookies) {
      signedOut.cookies.set({
        name: cookie.name,
        value: '',
        path: '/',
        expires: new Date(0),
        secure: publicUrl.startsWith('https:'),
        httpOnly: true,
        sameSite: 'lax',
      });
    }
    return signedOut;
  } catch {
    return NextResponse.json({ message: 'Sign out failed. Please retry.' },
      { status: 503, headers });
  }
}
