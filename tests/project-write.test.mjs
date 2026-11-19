import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCreateInternal, parseEditProject } from '../src/features/projects/ProjectWriteContract.ts';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const create = () => ({
  key: 'PLATFORM-26', name: 'Build internal console', description: 'Internal work',
  kind: 'internal', priority: 'normal', startsOn: '', dueOn: '',
});
const edit = () => ({
  version: 3, name: 'Console update', description: '', priority: 'high', dueOn: '',
});
test('real internal project creation validates shape, dates, and normalizes name', () => {
  assert.deepEqual(parseCreateInternal({ ...create(), name: ' Console ' }),
    { ok: true, data: { ...create(), name: 'Console' } });
  assert.equal(parseCreateInternal({ ...create(), kind: 'customer' }).ok, false);
  assert.equal(parseCreateInternal({ ...create(), ownerId: 'admin' }).ok, false);
  assert.equal(parseCreateInternal({ ...create(), key: '../../escape' }).ok, false);
  assert.equal(parseCreateInternal({ ...create(), description: 'x'.repeat(5001) }).ok, false);
  assert.equal(parseCreateInternal({ ...create(), startsOn: '2026-02-30' }).ok, false);
  assert.equal(parseCreateInternal({ ...create(), startsOn: '2026-11-21', dueOn: '2026-11-20' }).ok, false);
  assert.equal(parseCreateInternal(null).ok, false);
});
test('versioned project updates reject role grants, invalid data, and stale version formats', () => {
  assert.deepEqual(parseEditProject(edit()), { ok: true, data: edit() });
  assert.equal(parseEditProject({ ...edit(), version: 0 }).ok, false);
  assert.equal(parseEditProject({ ...edit(), version: '3' }).ok, false);
  assert.equal(parseEditProject({ ...edit(), version: 9999999999 }).ok, false);
  assert.equal(parseEditProject({ ...edit(), ownerId: 'admin' }).ok, false);
  assert.equal(parseEditProject({ ...edit(), status: 'archived' }).ok, false);
  assert.equal(parseEditProject({ ...edit(), dueOn: '2026-13-01' }).ok, false);
  assert.equal(parseEditProject([]).ok, false);
});
test('same-origin project write gateway never accepts arbitrary upstream paths or caller grants', async () => {
  const gate = await read('src/features/projects/project-write-gateway.ts');
  const createRoute = await read('src/app/api/projects/route.ts');
  const editRoute = await read('src/app/api/projects/[id]/route.ts');
  const list = await read('src/app/(workspace)/projects/page.tsx');
  const detail = await read('src/app/(workspace)/projects/[id]/page.tsx');
  const newPage = await read('src/app/(workspace)/projects/new/page.tsx');
  for (const fragment of [
    "request.headers.get('origin') !== publicOrigin",
    "request.cookies.get('vsph.portal.sid')",
    "response.status === 401",
    "response.status === 403",
    "response.status === 409",
    "redirect: 'manual'",
    "cache: 'no-store'",
    "Origin: publicOrigin",
    "BODY_LIMIT = 8192",
    "parseCreateInternal(submitted)",
    "parseEditProject(submitted)",
  ]) assert.ok(gate.includes(fragment), fragment);
  assert.match(createRoute, /projectWrite\(request, 'create'\)/);
  assert.match(editRoute, /projectWrite\(request, 'edit', id\)/);
  assert.match(list, /href="\/projects\/new"/);
  assert.match(detail, /role === 'manager' && p\.status !== 'archived'/);
  assert.match(newPage, /access\?\.canCreate === true/);
  assert.doesNotMatch(gate, /NEXT_PUBLIC_|process\.env\.DATABASE_URL|localStorage|sessionStorage|requireAdmin/);
});
test('project detail parser requires a usable current project version before any edit affordance', async () => {
  const contract = await read('src/features/projects/ProjectDetailContract.ts');
  const editor = await read('src/features/projects/ProjectEditForm.tsx');
  assert.match(contract, /Number\.isSafeInteger\(p\.version\)/);
  assert.match(editor, /version: project\.version/);
  assert.match(editor, /response\.status === 401/);
  assert.match(editor, /router\.refresh\(\)/);
  assert.match(editor, /Project changed|Update failed|Could not verify/);
});
