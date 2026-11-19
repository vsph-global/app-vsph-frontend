import { type NextRequest, NextResponse } from 'next/server';
import { approvedInternalOrigin } from '@/features/workspace/server-api';
import { parseCreateInternal, parseEditProject } from './ProjectWriteContract';

const json = (status: number, message: string) =>
  NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{32,128}$/;
const BODY_LIMIT = 8192;

function approvedPublicOrigin(): string | null {
  const raw = process.env.VSPH_PUBLIC_ORIGIN;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const loopback = ['localhost','127.0.0.1','[::1]'].includes(u.hostname);
    return u.origin === raw && !u.username && !u.password &&
      (u.protocol === 'https:' || (loopback && u.protocol === 'http:')) ? raw : null;
  } catch { return null; }
}

/** Bounded, strictly same-origin write gateway; the upstream rechecks session, RBAC, tenant
 * membership and project versions. No user-supplied URLs, headers or arbitrary paths.
 */
export async function projectWrite(request: NextRequest, action: 'create' | 'edit',
  projectId?: string): Promise<NextResponse> {
  const publicOrigin = approvedPublicOrigin();
  const backendOrigin = approvedInternalOrigin();
  if (!publicOrigin || !backendOrigin) return json(503, 'Project changes are not configured.');
  if (request.headers.get('origin') !== publicOrigin ||
      ![null, 'same-origin'].includes(request.headers.get('sec-fetch-site')))
    return json(403, 'Request origin not permitted.');
  if (request.nextUrl.search || request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    return json(400, 'Invalid project request.');
  const token = request.cookies.get('vsph.portal.sid')?.value;
  if (!token || !tokenPattern.test(token)) return json(401, 'Sign in to continue.');
  if (action === 'edit' && (!projectId || !uuid.test(projectId)))
    return json(400, 'Invalid project identifier.');
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT))
    return json(413, 'Project request is too large.');
  let raw: string;
  try {
    raw = await request.text();
  } catch { return json(400, 'Invalid project request.'); }
  if (new TextEncoder().encode(raw).byteLength > BODY_LIMIT) return json(413, 'Project request is too large.');
  let submitted: unknown;
  try { submitted = JSON.parse(raw); }
  catch { return json(400, 'Invalid JSON request.'); }
  const parsed = action === 'create' ? parseCreateInternal(submitted) : parseEditProject(submitted);
  if (!parsed.ok) return json(400, parsed.error);
  const method = action === 'create' ? 'POST' : 'PATCH';
  const path = action === 'create' ? '/api/projects' : '/api/projects/' + projectId;
  try {
    const response = await fetch(backendOrigin + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: publicOrigin,
        Cookie: 'vsph.portal.sid=' + token,
      },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401) return json(401, 'Session expired. Sign in again.');
    if (response.status === 403) return json(403, 'You do not have permission to change this project.');
    if (response.status === 409) return json(409, 'Project changed. Reload and reconcile before trying again.');
    if (response.status === 400) return json(400, 'The backend rejected these project changes.');
    if (response.status !== (action === 'create' ? 201 : 200))
      return json(503, 'Project change could not be confirmed.');
    // Creation must return the real project UUID; never fabricate a redirect destination.
    if (action === 'create') {
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || Array.isArray(result) ||
          !('id' in result) || typeof result.id !== 'string' || !uuid.test(result.id))
        return json(502, 'Project creation response could not be verified.');
      return NextResponse.json({ id: result.id }, { status: 201,
        headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ updated: true }, { status: 200,
      headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return json(503, 'Project changes are unavailable. Please retry after checking current state.');
  }
}
