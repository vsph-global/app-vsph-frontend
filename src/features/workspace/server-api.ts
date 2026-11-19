import { cookies } from 'next/headers';

/**
 * Trusted, server-only API access. Never build backend URLs from client
 * Host headers, query strings, or arbitrary database-supplied destinations.
 */
type ApiResult =
  | { kind: 'ok'; value: unknown }
  | { kind: 'unauthorized' }
  | { kind: 'unavailable' };

export function approvedInternalOrigin(): string | null {
  const raw = process.env.VSPH_INTERNAL_API_ORIGIN;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (url.origin !== raw || url.username || url.password || url.hash ||
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function portalApi(path: string): Promise<ApiResult> {
  // Never allow arbitrary paths to turn this helper into a public proxy.
  const establishedRead = /^\/api\/(?:auth\/me|hrms\/access|apps|workspaces|apps\/[A-Z][A-Z0-9_]{1,39}\/contexts)$/.test(path);
  // Explicitly limited to the existing, authenticated read-only project list.
  const projectListPath = /^\/api\/projects\?([^#]*)$/.exec(path);
  let permittedProjects = false;
  if (projectListPath) {
    const params = new URLSearchParams(projectListPath[1]);
    const keys = [...params.keys()];
    const q = params.get('q');
    const status = params.get('status');
    const cursor = params.get('cursor');
    permittedProjects = keys.length >= 2 && keys.length <= 3 &&
      new Set(keys).size === keys.length &&
      keys.every(key => ['q', 'status', 'cursor'].includes(key)) &&
      q !== null && q.length <= 100 && !/[\u0000-\u001f\u007f]/.test(q) &&
      status !== null && ['', 'planned', 'active', 'paused', 'completed', 'archived'].includes(status) &&
      (cursor === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor));
  }
  if (!establishedRead && !permittedProjects) return { kind: 'unavailable' };
  const portalCookie = (await cookies()).get('vsph.portal.sid')?.value;
  if (!portalCookie || !/^[A-Za-z0-9_-]{32,128}$/.test(portalCookie)) {
    return { kind: 'unauthorized' };
  }
  const origin = approvedInternalOrigin();
  if (!origin) return { kind: 'unavailable' };

  try {
    const response = await fetch(origin + path, {
      method: 'GET',
      headers: {
        Cookie: 'vsph.portal.sid=' + portalCookie,
        Accept: 'application/json',
      },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401) return { kind: 'unauthorized' };
    if (response.status !== 200) return { kind: 'unavailable' };
    const value: unknown = await response.json();
    return { kind: 'ok', value };
  } catch {
    return { kind: 'unavailable' };
  }
}
