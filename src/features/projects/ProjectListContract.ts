/**
 * Original VSPH GET /api/projects listing projection.
 * Unknown/invalid backend responses fail closed; no fixture fallbacks.
 */
export type ProjectRow = {
  id: string; key: string; name: string;
  kind: 'internal' | 'customer';
  status: 'planned' | 'active' | 'paused' | 'completed' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  completed_tasks: number; total_tasks: number; due_on: string | null;
};
export type ProjectPage = { projects: ProjectRow[]; canCreate: boolean };
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kinds = new Set(['internal', 'customer']);
const statuses = new Set(['planned', 'active', 'paused', 'completed', 'archived']);
const priorities = new Set(['low', 'normal', 'high', 'urgent']);
function record(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
export function parseProjectPage(value: unknown): ProjectPage | null {
  if (!record(value) || !Array.isArray(value.projects) ||
      value.projects.length > 50 || typeof value.canCreate !== 'boolean') return null;
  const projects: ProjectRow[] = [];
  const ids = new Set<string>();
  for (const candidate of value.projects) {
    if (!record(candidate) || typeof candidate.id !== 'string' ||
        !validUuid.test(candidate.id) || ids.has(candidate.id) ||
        typeof candidate.key !== 'string' || !/^[A-Z][A-Z0-9-]{1,19}$/.test(candidate.key) ||
        typeof candidate.name !== 'string' || !candidate.name.trim() || candidate.name.length > 150 ||
        typeof candidate.kind !== 'string' || !kinds.has(candidate.kind) ||
        typeof candidate.status !== 'string' || !statuses.has(candidate.status) ||
        typeof candidate.priority !== 'string' || !priorities.has(candidate.priority) ||
        !Number.isSafeInteger(candidate.completed_tasks) ||
        !Number.isSafeInteger(candidate.total_tasks) ||
        (candidate.completed_tasks as number) < 0 ||
        (candidate.total_tasks as number) < (candidate.completed_tasks as number) ||
        !(candidate.due_on === null ||
          (typeof candidate.due_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(candidate.due_on)))) {
      return null;
    }
    ids.add(candidate.id);
    projects.push({
      id: candidate.id, key: candidate.key, name: candidate.name,
      kind: candidate.kind as ProjectRow['kind'],
      status: candidate.status as ProjectRow['status'],
      priority: candidate.priority as ProjectRow['priority'],
      completed_tasks: candidate.completed_tasks as number,
      total_tasks: candidate.total_tasks as number,
      due_on: candidate.due_on,
    });
  }
  return { projects, canCreate: value.canCreate };
}
