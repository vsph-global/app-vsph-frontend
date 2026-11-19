/** A deliberately small, versioned subset of the VSPH project_command API.
 * Never accept client-selected project roles, assignees, visibility, owners,
 * permissions, entity IDs or arbitrary backend paths.
 */
export type WorkAction = 'task-create' | 'milestone-create' | 'task-status' | 'milestone-status' | 'comment-create' | 'deliverable-create' | 'task-comment-create' | 'task-assign';
export type WorkBody = {
  version: number;
  title?: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueOn?: string;
  status?: string;
  body?: string;
  url?: string;
  taskId?: string;
  assigneeId?: string | null;
};
export type WorkParseResult = { ok: true; data: WorkBody } |
  { ok: false; error: string };

const allowed: Record<WorkAction, ReadonlySet<string>> = {
  'task-create': new Set(['version','title','description','priority','dueOn']),
  'milestone-create': new Set(['version','title','dueOn']),
  'task-status': new Set(['version','status']),
  'milestone-status': new Set(['version','status']),
  'comment-create': new Set(['version','body']),
  'deliverable-create': new Set(['version','title','url']),
  'task-comment-create': new Set(['version','body','taskId']),
  'task-assign': new Set(['version','assigneeId']),
};
const priorities = new Set(['low','normal','high','urgent']);
const taskStatuses = new Set(['todo','in_progress','blocked','in_review','done','cancelled']);
const milestoneStatuses = new Set(['planned','active','done','cancelled']);

function record(value: unknown): value is Record<string,unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function date(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
const bad = (): WorkParseResult => ({ ok:false, error:'Check the work item fields and reload if the project changed.' });

/** Strict, exact-key decoding; the trusted backend separately enforces authorization
 * and permitted lifecycle state transitions under the project lock.
 */
export function parseWorkAction(action: WorkAction, value: unknown): WorkParseResult {
  if (!record(value) || Object.keys(value).some(key => !allowed[action].has(key)) ||
      !Number.isSafeInteger(value.version) || (value.version as number) < 1 ||
      (value.version as number) > 999999998) return bad();

  const version = value.version as number;
  if (action === 'task-create') {
    if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 200 ||
        typeof value.description !== 'string' || value.description.length > 5000 ||
        !priorities.has(value.priority as string) || !date(value.dueOn)) return bad();
    return { ok:true, data: { version, title:value.title.trim(), description:value.description,
      priority:value.priority as WorkBody['priority'], dueOn:value.dueOn as string } };
  }
  if (action === 'milestone-create') {
    if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 200 ||
        !date(value.dueOn)) return bad();
    return { ok:true, data:{version, title:value.title.trim(), dueOn:value.dueOn as string} };
  }
  if (action === 'task-assign') {
    if (value.assigneeId !== null &&
      (typeof value.assigneeId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.assigneeId))) return bad();
    return {ok:true,data:{version,assigneeId:value.assigneeId as string | null}};
  }
  if (action === 'task-comment-create' &&
      (typeof value.taskId !== 'string' ||
       !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.taskId))) return bad();
  if (action === 'comment-create' || action === 'task-comment-create') {
    if (typeof value.body !== 'string' || !value.body.trim() ||
        value.body.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.body))
      return bad();
    return {ok:true,data:action === 'task-comment-create'
      ? {version,body:value.body.trim(),taskId:value.taskId as string}
      : {version,body:value.body.trim()}};
  }
  if (action === 'deliverable-create') {
    if (typeof value.title !== 'string' || !value.title.trim() ||
        value.title.length > 200 || typeof value.url !== 'string' ||
        value.url.length > 1800) return bad();
    try {
      const target = new URL(value.url);
      if (target.protocol !== 'https:' || target.username || target.password ||
          target.hostname.length > 253 || !/^[a-z0-9.-]+$/i.test(target.hostname) ||
          target.search || target.hash || target.port) return bad();
    } catch { return bad(); }
    return {ok:true,data:{version,title:value.title.trim(),url:value.url}};
  }
  const statuses = action === 'task-status' ? taskStatuses : milestoneStatuses;
  if (typeof value.status !== 'string' || !statuses.has(value.status)) return bad();
  return { ok:true, data:{version, status:value.status} };
}

/** Pure UI aid, not authorization: server checks all transitions again. */
export function allowedNextStatuses(
  action: 'task-status' | 'milestone-status', current: string,
): string[] {
  if (action === 'milestone-status') {
    const flow: Record<string,string[]> = {
      planned:['active','cancelled'], active:['planned','done','cancelled'],
      done:['active'], cancelled:['planned'],
    };
    return flow[current] ?? [];
  }
  const flow: Record<string,string[]> = {
    todo:['in_progress','cancelled'], in_progress:['todo','blocked','in_review'],
    blocked:['todo','in_progress','cancelled'], in_review:['in_progress','done'],
    done:['todo'], cancelled:['todo'],
  };
  return flow[current] ?? [];
}
