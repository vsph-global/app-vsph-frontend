import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');

test('protected entry routes deny absent or malformed cookies early', async () => {
 const source = await read('src/proxy.ts');
 for (const route of ['/dashboard/:path*','/applications/:path*','/projects/:path*']) {
  assert.ok(source.includes(route), 'protected page missing: '+route);
 }
 assert.match(source, /request\.cookies\.get\('vsph\.portal\.sid'\)/);
 assert.match(source, /NextResponse\.redirect\(destination\)/);
 assert.match(source, /destination\.search = ''/);
 assert.match(source, /return NextResponse\.next\(\)/);
});

test('the backend remains the only actual session/tenant authorization boundary', async () => {
 const layout = await read('src/app/(workspace)/layout.tsx');
 const api = await read('src/features/workspace/server-api.ts');
 const proxy = await read('src/proxy.ts');
 assert.match(layout, /portalApi\('\/api\/auth\/me'\)/);
 assert.match(layout, /portalIdentity\(session\.value\)/);
 assert.match(api, /VSPH_INTERNAL_API_ORIGIN/);
 assert.doesNotMatch(proxy, /portalIdentity|platformRole|NEXT_PUBLIC_|ProjectFixtures|fetch\(/);
});
