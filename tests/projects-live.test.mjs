import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');

test('authenticated Projects list is server-only and does not use preview fixtures', async () => {
  const api = await read('src/features/workspace/server-api.ts');
  const loader = await read('src/features/projects/project-server.ts');
  const route = await read('src/app/(workspace)/projects/page.tsx');
  const header = await read('src/features/workspace/WorkspaceHeader.tsx');
  assert.match(api, /projectListPath/);
  assert.match(api, /cache: 'no-store'/);
  assert.match(loader, /portalApi\('\/api\/projects\?' \+ params\.toString\(\)\)/);
  assert.match(loader, /redirect\('\/login'\)/);
  assert.match(route, /loadLiveProjects/);
  assert.match(header, /activePages = new Set\(\['\/dashboard', '\/applications', '\/projects'/);
  for (const path of ['/reports','/employees','/account/security']) {
    assert.ok(header.includes("'"+path+"'"), 'live operations route missing: '+path);
  }
  assert.doesNotMatch(loader + route, /ProjectFixtures|exampleProjects|OperationsFixtures|localStorage|sessionStorage|fetch\(/);
});

test('real list rejects invalid and duplicated backend records', async () => {
  const model = await read('src/features/projects/ProjectListContract.ts');
  for (const phrase of ['value.projects.length > 50', 'ids.has(candidate.id)',
    'completed_tasks', 'total_tasks', 'due_on', 'value.canCreate']) {
    assert.ok(model.includes(phrase), phrase);
  }
});
