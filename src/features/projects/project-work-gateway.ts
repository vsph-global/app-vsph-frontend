import { type NextRequest, NextResponse } from 'next/server';
import { approvedInternalOrigin, portalApi } from '@/features/workspace/server-api';
import { parseWorkAction, type WorkAction } from './ProjectWorkContract';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sidPattern = /^[A-Za-z0-9_-]{32,128}$/;
const LIMIT = 8192;
const response = (status: number, message: string) =>
  NextResponse.json({ message }, {status,headers:{'Cache-Control':'no-store'}});

function publicOrigin(): string | null {
  const raw = process.env.VSPH_PUBLIC_ORIGIN;
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const local = ['127.0.0.1','localhost','[::1]'].includes(parsed.hostname);
    return parsed.origin === raw && !parsed.username && !parsed.password &&
      (parsed.protocol === 'https:' || (local && parsed.protocol === 'http:'))
      ? raw : null;
  } catch { return null; }
}

const suffix: Record<WorkAction,string> = {
  'task-create':'/tasks',
  'milestone-create':'/milestones',
  'task-status':'/tasks',
  'milestone-status':'/milestones',
  'comment-create':'/comments',
  'deliverable-create':'/deliverables',
  'task-comment-create':'/comments',
  'task-assign':'/tasks',
};

/** Same-origin browser writes, fixed upstream path, and no client-specified
 * access roles or forwarding headers. Backend project_command checks RBAC,
 * assignment, tenant scope, allowed state transitions, and optimistic version.
 */
export async function projectWorkWrite(request: NextRequest, action: WorkAction,
  projectId: string, entityId?: string): Promise<NextResponse> {
  const origin = publicOrigin();
  const backend = approvedInternalOrigin();
  if (!origin || !backend) return response(503,'Project changes are not configured.');
  if (request.headers.get('origin') !== origin ||
      ![null,'same-origin'].includes(request.headers.get('sec-fetch-site')))
    return response(403,'Request origin not permitted.');
  if (request.nextUrl.search || request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    return response(400,'Invalid work item request.');
  const needsEntity = action.endsWith('-status') || action === 'task-assign' || action === 'task-comment-create';
  if (!uuid.test(projectId) || (needsEntity && (!entityId || !uuid.test(entityId))) ||
      (!needsEntity && entityId !== undefined))
    return response(400,'Invalid project or work item identifier.');
  const token = request.cookies.get('vsph.portal.sid')?.value;
  if (!token || !sidPattern.test(token)) return response(401,'Sign in to continue.');
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > LIMIT))
    return response(413,'Work item request is too large.');
  let body: string;
  try { body = await request.text(); }
  catch { return response(400,'Invalid work item request.'); }
  if (new TextEncoder().encode(body).byteLength > LIMIT) return response(413,'Work item request is too large.');
  let submitted: unknown;
  try { submitted = JSON.parse(body); } catch { return response(400,'Invalid JSON request.'); }
  // Entity ownership is checked server-side before passing a task-thread comment.
  // The legacy SQL does not reject cross-project foreign task IDs on comment inserts.
  let submission = submitted;
  if (action === 'task-comment-create') {
    const detail = await portalApi('/api/projects/' + projectId);
    if (detail.kind === 'unauthorized') return response(401,'Sign in to continue.');
    if (detail.kind === 'forbidden') return response(403,'Task is not available in this project.');
    if (detail.kind !== 'ok' || !detail.value ||
        typeof detail.value !== 'object' || Array.isArray(detail.value) ||
        !('tasks' in detail.value) || !Array.isArray(detail.value.tasks))
      return response(503,'Cannot verify project task membership.');
    if (!detail.value.tasks.some((item:unknown)=>
      item !== null && typeof item === 'object' && 'id' in item &&
      typeof item.id === 'string' && item.id.toLowerCase() === entityId!.toLowerCase()))
      return response(403,'Task is not visible in this project.');
    if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted))
      return response(400,'Invalid task comment.');
    // No caller-supplied taskId; the route validated the entity path.
    if ('taskId' in submitted) return response(400,'Invalid task comment.');
    submission = {...submitted,taskId:entityId};
  }
  const parsed = parseWorkAction(action,submission);
  if (!parsed.ok) return response(400,parsed.error);
  const method = action.endsWith('-create') ? 'POST' : 'PATCH';
  const path = '/api/projects/' + projectId + suffix[action] +
    (method === 'PATCH' ? '/' + entityId : '');
  try {
    const result = await fetch(backend + path, {
      method, cache:'no-store', redirect:'manual', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type':'application/json', Accept:'application/json',
        Origin:origin, Cookie:'vsph.portal.sid=' + token },
      body: JSON.stringify(parsed.data),
    });
    if (result.status === 401) return response(401,'Session expired. Sign in again.');
    if (result.status === 403) return response(403,'You do not have permission to change this work item.');
    if (result.status === 404) return response(404,'Work item unavailable.');
    if (result.status === 409) return response(409,'Project changed. Reload and reconcile before retrying.');
    if (result.status === 400) return response(400,'The backend rejected this work item change.');
    if (result.status !== 200) return response(503,'Work item change could not be confirmed.');
    const data: unknown = await result.json();
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        !('id' in data) || typeof data.id !== 'string' || !uuid.test(data.id) ||
        (method === 'PATCH' && data.id.toLowerCase() !== entityId?.toLowerCase()) ||
        !('version' in data) || data.version !== parsed.data.version + 1)
      return response(502,'Unable to verify work item change. Reload before retrying.');
    return NextResponse.json({id:data.id,version:data.version},
      {status:200,headers:{'Cache-Control':'no-store'}});
  } catch {
    return response(503,'Work item outcome is uncertain. Reload the project before retrying.');
  }
}
