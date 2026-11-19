import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve literal filesystem names instead of interpreting %5F as a URL escape.
// Using new URL(relativePath, root) decodes %5F_preview into __preview.
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFile(join(root, path), 'utf8');

test('local preview uses URL-encoded underscore route segment, not a private directory', async () => {
  // Next.js excludes folders whose names START with '_'. To serve /__preview,
  // encode the first underscore as %5F, then retain the second literal '_'.
  const entries = await readdir(join(root, 'src/app/(preview)/'));
  assert.ok(entries.includes('%5F_preview'), 'encoded /__preview route segment missing');
  assert.ok(!entries.includes('__preview'), 'private-folder route is ignored by Next.js');
  // Regression: the reader must preserve the physical %5F directory name.
  const page = await read('src/app/(preview)/%5F_preview/workspace/page.tsx');
  assert.match(page, /export default function PreviewWorkspacePage/);
});

test('local preview has an explicit production 404 guard', async () => {
  const page = await read('src/app/(preview)/%5F_preview/workspace/page.tsx');
  assert.match(page, /if \(process\.env\.NODE_ENV !== 'development'\) notFound\(\)/);
  assert.match(page, /return <WorkspacePreview \/>/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  const previewLayout = await read('src/app/(preview)/layout.tsx');
  assert.match(previewLayout, /dashboard\.css/);
  assert.match(previewLayout, /portal-navigation\.css/);
  assert.match(previewLayout, /crm-workspace\.css/);
  assert.match(previewLayout, /href="\/fonts\.css"/);
});

test('preview uses only synthetic UI fixtures with no credentials or backend APIs', async () => {
  const preview = await read('src/features/workspace/WorkspacePreview.tsx');
  for (const item of ['sample-crm', 'sample-outreach', 'sample-music',
    'Preview Owner', 'Preview Employee', 'Preview Customer',
    'Example Workspace', 'Development preview', 'Synthetic data only']) {
    assert.ok(preview.includes(item), 'expected synthetic preview fixture: ' + item);
  }
  assert.match(preview, /<WorkspaceHeader[^>]*previewMode/);
  assert.match(preview, /<DashboardSummary[\s\S]*previewMode/);
  assert.match(preview, /<ApplicationsLibrary apps=\{roleApps\} previewMode/);
  assert.doesNotMatch(preview, /fetch\(|localStorage|sessionStorage|\/api\/|document\.cookie/);
  const header = await read('src/features/workspace/WorkspaceHeader.tsx');
  assert.match(header, /if \(logoutBusy \|\| previewMode\) return/);
  assert.match(header, /previewMode \|\| !activePages\.has\(href\)/);
  assert.match(header, /Sign out unavailable in preview/);
  assert.match(header, /previewMode=\{previewMode\}/);
  const applications = await read('src/features/workspace/ApplicationsLibrary.tsx');
  assert.match(applications, /previewMode = false/);
  assert.match(applications, /Preview only/);
  const dashboardSummary = await read('src/features/workspace/DashboardSummary.tsx');
  assert.match(dashboardSummary, /previewMode = false/);
  assert.match(dashboardSummary, /<AccessOverview entries=\{access\} previewMode=\{previewMode\}/);
  assert.match(dashboardSummary, /aria-disabled="true">View applications/);
});

test('real dashboard stays on trusted session APIs and shared UI, never preview data', async () => {
  const layout = await read('src/app/(workspace)/layout.tsx');
  const dashboard = await read('src/app/(workspace)/dashboard/page.tsx');
  const appPage = await read('src/app/(workspace)/applications/page.tsx');
  assert.match(layout, /portalApi\('\/api\/auth\/me'\)/);
  assert.match(layout, /redirect\('\/login'\)/);
  assert.match(dashboard, /loadAuthorizedApps\(\)/);
  assert.match(dashboard, /<DashboardSummary appCount=\{apps\.length\}/);
  assert.match(appPage, /loadAuthorizedApps\(\)/);
  assert.doesNotMatch(layout + dashboard + appPage,
    /WorkspacePreview|sample-owner|sample-crm|process\.env\.NODE_ENV/);
});

test('frontend framework and production build scripts are unchanged', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.dependencies.next, '16.4.6');
  assert.equal(pkg.dependencies.react, '19.3.0');
  assert.equal(pkg.devDependencies.tailwindcss, '4.3.3');
  assert.match(pkg.scripts.check, /npm run test:migration/);
  assert.match(pkg.scripts.build, /clean-next-route-types.mjs && next build/);
});
