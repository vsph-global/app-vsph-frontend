import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');

test('logout proxy enforces a trusted public origin and verifies backend revocation', async () => {
  const route = await read('src/app/api/auth/logout/route.ts');
  const api = await read('src/features/workspace/server-api.ts');
  const nav = await read('src/features/workspace/WorkspaceHeader.tsx');
  for (const token of ["VSPH_PUBLIC_ORIGIN", "request.headers.get('origin')",
    "'sec-fetch-site'", "'/api/auth/logout'", "response.status !== 200",
    "'Cache-Control': 'no-store'", "redirect: 'manual'", "AbortSignal.timeout(8000)"]) {
    assert.ok(route.includes(token), 'missing logout safeguard: '+token);
  }
  assert.match(route, /approvedInternalOrigin\(\)/);
  assert.match(api, /export function approvedInternalOrigin\(/);
  assert.match(nav, /fetch\('\/api\/auth\/logout'/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_|localStorage|sessionStorage|window\./);
});

test('logout only clears reviewed session cookies after upstream success', async () => {
  const route = await read('src/app/api/auth/logout/route.ts');
  assert.match(route, /vsph\.portal\.sid/);
  assert.match(route, /vsph\.employee\.setup/);
  assert.match(route, /cookiePattern/);
  assert.match(route, /signedOut\.cookies\.set/);
  assert.ok(route.indexOf("response.status !== 200") <
    route.indexOf('signedOut.cookies.set'));
});
