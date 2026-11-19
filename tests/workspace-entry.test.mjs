import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const load = async (path) => readFile(new URL(path, root), 'utf8');
const gitSha = (bytes) => createHash('sha1')
  .update(Buffer.concat([Buffer.from('blob ' + bytes.length), Buffer.from([0])]))
  .update(bytes).digest('hex');

test('workspace source reference is immutable and asset CSS changes are font-only', async () => {
  const manifest = JSON.parse(await load('docs/reference/workspace/manifest.json'));
  assert.equal(manifest.frozenCommit, '3b3a1535873aa0517aea41da32a407f3d9680547');
  const items = Object.entries(manifest.files);
  assert.equal(items.length, 9);
  for (const [path, sha] of items) {
    assert.equal(gitSha(await readFile(new URL(path, root))), sha, path + ' diverged');
  }
  for (const name of ['dashboard.css', 'portal-navigation.css', 'crm-workspace.css']) {
    const frozen = await load('docs/reference/workspace/' + name);
    const active = await load('src/app/(workspace)/' + name);
    const fontImport = "@import url('/fonts.css');\n";
    assert.equal(active, frozen.startsWith(fontImport) ? frozen.slice(fontImport.length) : frozen,
      name + ' contains an unreviewed change');
  }
  assert.equal(await load('public/portal-icons.svg'),
    await load('docs/reference/workspace/portal-icons.html'));
});

test('workspace routes are private, backend-verified and fail closed by default', async () => {
  const layout = await load('src/app/(workspace)/layout.tsx');
  const api = await load('src/features/workspace/server-api.ts');
  const header = await load('src/features/workspace/WorkspaceHeader.tsx');
  const dashboard = await load('src/app/(workspace)/dashboard/page.tsx');
  const apps = await load('src/app/(workspace)/applications/page.tsx');
  const data = await load('src/features/workspace/server-data.ts');

  assert.match(layout, /portalApi\('\/api\/auth\/me'\)/);
  assert.match(layout, /portalIdentity\(session\.value\)/);
  assert.match(layout, /redirect\('\/login'\)/);
  assert.match(layout, /if \(!user\)/);
  assert.match(layout, /<Suspense fallback=/);
  assert.match(layout, /portalApi\('\/api\/hrms\/access'\)/);
  assert.match(api, /VSPH_INTERNAL_API_ORIGIN/);
  assert.match(api, /cache: 'no-store'/);
  assert.match(api, /redirect: 'manual'/);
  assert.match(api, /status === 401/);
  assert.match(api, /return \{ kind: 'unauthorized' \}/);
  assert.match(api, /return \{ kind: 'unavailable' \}/);
  assert.match(api, /Cookie: 'vsph\.portal\.sid='/);
  assert.doesNotMatch(api, /NEXT_PUBLIC_|process\.env\.DATABASE_URL|localStorage/);

  assert.match(header, /platformRole === 'super_admin'/);
  assert.match(header, /flags\?\.employee === true/);
  assert.match(header, /flags\?\.management === true/);
  assert.match(header, /<nav ref=\{navigationRef\} id="workspaceNavigation"/);
  assert.match(header, /disabled.*Search/);
  assert.match(header, /fetch\('\/api\/auth\/logout'/);
  assert.match(dashboard, /loadAuthorizedApps\(/);
  assert.match(dashboard, /loadWorkspaceCount\(/);
  assert.match(dashboard, /loadProductAccess\(/);
  assert.match(apps, /loadAuthorizedApps\(/);
  assert.match(data, /portalApi\('\/api\/apps'\)/);
  assert.match(data, /portalApi\('\/api\/workspaces'\)/);
  assert.match(data, /redirect\('\/login'\)/);
});

test('organization Next/React/Tailwind stack and login routes remain intact', async () => {
  const pkg = JSON.parse(await load('package.json'));
  assert.equal(pkg.dependencies.next, '16.4.6');
  assert.equal(pkg.dependencies.react, '19.3.0');
  assert.equal(pkg.devDependencies.tailwindcss, '4.3.3');
  assert.match(await load('src/app/(auth)/page.tsx'), /<AuthPage/);
  assert.match(await load('src/app/(auth)/login/page.tsx'), /<AuthPage/);
  assert.match(await load('src/app/(workspace)/layout.tsx'), /href="\/fonts\.css"/);
  assert.match(await load('src/app/(workspace)/workspace-overrides.css'), /data-mobile-open="true"/);
});
