/** Strict, deliberately limited write schemas for the legacy Projects API.
 * Client-supplied grants, roles, owners and product access are NEVER proxied.
 * The trusted backend remains the source of authorization and conflict checks.
 */
export type CreateInternalProject = {
  key: string; name: string; description: string; kind: 'internal';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  startsOn: string; dueOn: string;
};
export type EditProject = {
  version: number; name: string; description: string;
  priority: CreateInternalProject['priority']; dueOn: string;
};
export type ParsedWrite<T> = { ok: true; data: T } | { ok: false; error: string };
const priorities = new Set(['low', 'normal', 'high', 'urgent']);
const createKeys = new Set(['key','name','description','kind','priority','startsOn','dueOn']);
const editKeys = new Set(['version','name','description','priority','dueOn']);
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
function exactKeys(data: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(data).every(key => allowed.has(key));
}
function date(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}
function text(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length <= max && value.trim().length >= min;
}
const invalid = <T>(): ParsedWrite<T> => ({ ok: false, error: 'Check the project fields and try again.' });
export function parseCreateInternal(value: unknown): ParsedWrite<CreateInternalProject> {
  if (!record(value) || !exactKeys(value, createKeys)) return invalid();
  const { key, name, description, kind, priority, startsOn, dueOn } = value;
  if (kind !== 'internal' || typeof key !== 'string' ||
      !/^[A-Z][A-Z0-9-]{1,19}$/.test(key) ||
      !text(name, 1, 150) || !text(description, 0, 5000) ||
      !priorities.has(priority as string) || !date(startsOn) || !date(dueOn) ||
      (startsOn !== '' && dueOn !== '' && (dueOn as string) < (startsOn as string))) return invalid();
  return { ok: true, data: { key, name: name.trim(), description,
    kind: 'internal', priority: priority as CreateInternalProject['priority'],
    startsOn: startsOn as string, dueOn: dueOn as string } };
}
export function parseEditProject(value: unknown): ParsedWrite<EditProject> {
  if (!record(value) || !exactKeys(value, editKeys)) return invalid();
  const { version, name, description, priority, dueOn } = value;
  if (!Number.isSafeInteger(version) || (version as number) < 1 ||
      (version as number) > 999999999 || !text(name, 1, 150) ||
      !text(description, 0, 5000) || !priorities.has(priority as string) ||
      !date(dueOn)) return invalid();
  return { ok: true, data: { version: version as number, name: name.trim(),
    description, priority: priority as EditProject['priority'],
    dueOn: dueOn as string } };
}
