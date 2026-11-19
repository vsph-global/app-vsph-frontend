/** Strict projection of GET /api/projects/:id from the legacy, backend-authorized RPC.
 * A malformed or mismatched response is never displayed as a valid project.
 */
export type ProjectDetail = {
  project: {
    id: string; key: string; name: string; description: string; version: number; owner_id: string;
    kind: 'internal' | 'customer';
    status: 'planned' | 'active' | 'paused' | 'completed' | 'archived';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    due_on: string | null; starts_on: string | null;
  };
  role: 'manager' | 'contributor' | 'viewer' | 'client';
  tasks: { id: string; title: string; description: string; status: string; priority: string; due_on: string | null; assignee_id: string | null }[];
  milestones: { id: string; title: string; status: string; due_on: string | null }[];
  members: { user_id: string; full_name: string; role: string; status: string }[];
  products: { id: string; name: string }[];
  deliverables: { id: string; title: string }[];
  comments: { id: string; body: string; task_id: string | null }[];
  activity: { summary: string; created_at: string }[];
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Canonical runtime UUID guard shared with route validation. */
export const isProjectId = (value: string): boolean => uuid.test(value);
const projectStatus = ['planned','active','paused','completed','archived'];
const taskStatus = ['todo','in_progress','blocked','in_review','done','cancelled'];
const milestoneStatus = ['planned','active','done','cancelled'];
const priority = ['low','normal','high','urgent'];
const roles = ['manager','contributor','viewer','client'];
const membershipStatus = ['active','revoked'];
function object(value: unknown): value is Record<string,unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function short(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}
function named(value: unknown, max: number): value is string {
  return short(value, max) && value.trim().length > 0;
}
function date(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
function rows(value: unknown, max: number): Record<string,unknown>[] | null {
  return Array.isArray(value) && value.length <= max && value.every(object) ? value : null;
}
function unique(records: Record<string, unknown>[]): boolean {
  const ids = records.map(row => row.id);
  return ids.every(id => typeof id === 'string' && uuid.test(id)) &&
    new Set(ids.map(id => (id as string).toLowerCase())).size === ids.length;
}
export function parseProjectDetail(value: unknown, requestedId: string): ProjectDetail | null {
  if (!uuid.test(requestedId) || !object(value) || !object(value.project) ||
      !roles.includes(value.role as string)) return null;
  const p = value.project;
  if (typeof p.id !== 'string' || !uuid.test(p.id) ||
      p.id.toLowerCase() !== requestedId.toLowerCase() ||
      typeof p.key !== 'string' || !/^[A-Z][A-Z0-9-]{1,19}$/.test(p.key) ||
      !named(p.name, 150) || !short(p.description, 5000) ||
      !['internal','customer'].includes(p.kind as string) ||
      !projectStatus.includes(p.status as string) ||
      !priority.includes(p.priority as string) ||
      !date(p.due_on) || !date(p.starts_on) || typeof p.owner_id !== 'string' ||
      !uuid.test(p.owner_id) || !Number.isSafeInteger(p.version) ||
      (p.version as number) < 1 || (p.version as number) > 999999999) return null;
  const tasks = rows(value.tasks, 3000);
  const milestones = rows(value.milestones, 1000);
  const members = rows(value.members, 2000);
  const products = rows(value.products, 1000);
  const deliverables = rows(value.deliverables, 200);
  const comments = rows(value.comments, 200);
  const activity = rows(value.activity, 200);
  if (!tasks || !milestones || !members || !products || !deliverables || !comments || !activity ||
      ![tasks,milestones,products,deliverables,comments].every(unique)) return null;
  if (tasks.some(t => !named(t.title, 200) || !short(t.description, 5000) ||
      !taskStatus.includes(t.status as string) || !priority.includes(t.priority as string) ||
      !date(t.due_on) || !(t.assignee_id === null ||
       (typeof t.assignee_id === 'string' && uuid.test(t.assignee_id))))) return null;
  if (milestones.some(m => !named(m.title, 200) ||
      !milestoneStatus.includes(m.status as string) || !date(m.due_on))) return null;
  if (members.some(m => typeof m.user_id !== 'string' || !uuid.test(m.user_id) ||
      !short(m.full_name, 200) || !roles.includes(m.role as string) ||
      !membershipStatus.includes(m.status as string))) return null;
  if (products.some(item => !named(item.name, 200)) ||
      deliverables.some(item => !named(item.title, 200)) ||
      comments.some(item => !named(item.body, 4000) ||
        !(item.task_id === null || (typeof item.task_id === 'string' && uuid.test(item.task_id))) ||
        (item.task_id !== null && !tasks.some(t => t.id === item.task_id))) ||
      activity.some(item => !named(item.summary, 2000) ||
        !short(item.created_at, 60))) return null;
  return {
    project: {
      id: p.id as string, key: p.key as string, version: p.version as number,
      owner_id: p.owner_id as string,
      name: p.name as string, description: p.description as string,
      kind: p.kind as ProjectDetail['project']['kind'],
      status: p.status as ProjectDetail['project']['status'],
      priority: p.priority as ProjectDetail['project']['priority'],
      due_on: p.due_on as string | null, starts_on: p.starts_on as string | null,
    },
    role: value.role as ProjectDetail['role'],
    tasks: tasks as ProjectDetail['tasks'],
    milestones: milestones as ProjectDetail['milestones'],
    members: members as ProjectDetail['members'],
    products: products as ProjectDetail['products'],
    deliverables: deliverables as ProjectDetail['deliverables'],
    comments: comments as ProjectDetail['comments'],
    activity: activity as ProjectDetail['activity'],
  };
}
