import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('preview navigation does not stretch the overview link across the desktop bar', async () => {
 const css = await read('src/app/(preview)/operations-preview.css');
 const preview = await read('src/features/workspace/WorkspacePreview.tsx');
 const header = await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(css, /\.portal-navigation > \.portal-preview-link \{/);
 assert.match(css, /flex:0 0 auto;width:auto/);
 assert.match(css, /@media\(max-width:950px\)/);
 assert.match(preview, /previewActiveHref=\{activePreviewHref\}/);
 assert.match(header, /accountRef = useRef<HTMLDetailsElement>/);
 assert.match(header, /navigationRef\.current\?\.querySelectorAll\('details'\)/);
 assert.match(header, /aria-current=\{pathname === href \? 'page' : undefined\}/);
});

test('no real application opens a nonexistent launch destination', async () => {
 const library = await read('src/features/workspace/ApplicationsLibrary.tsx');
 const css = await read('src/app/(workspace)/workspace-overrides.css');
 assert.doesNotMatch(library, /href=\{launchPath/);
 assert.match(library, /Launch not connected/);
 assert.match(library, /Launch pending/);
 assert.match(css, /\.app-open\.app-open-unavailable/);
});

test('authenticated projects has independent UI polish and keyboard-scrollable table', async () => {
 const page = await read('src/app/(workspace)/projects/page.tsx');
 const css = await read('src/app/(workspace)/projects-live.css');
 assert.match(page, /projects-live\.css/);
 assert.match(page, /aria-label="Project portfolio table, horizontally scrollable" tabIndex=\{0\}/);
 assert.match(page, /project-live-more/);
 assert.match(css, /project-live-refresh/);
});

test('operations selections and mobile preview controls remain in sync', async () => {
 const people = await read('src/features/operations/PeopleDirectory.tsx');
 const organizations = await read('src/features/operations/OrganizationsPreview.tsx');
 const hr = await read('src/features/operations/HrPreview.tsx');
 const previewCss = await read('src/app/(preview)/preview.css');
 assert.match(people, /setSelected\(null\);\}\}/);
 assert.match(organizations, /setPanel\('overview'\);setMemberPage\(0\)/);
 assert.match(hr, /No employees match your search/);
 assert.match(previewCss, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('administration navigation opens the requested preview subtab', async () => {
 const workspace = await read('src/features/workspace/WorkspacePreview.tsx');
 const admin = await read('src/features/operations/AdminPreview.tsx');
  assert.ok(workspace.includes("'/admin/permissions': 'admin'"));
  assert.ok(workspace.includes("'/admin?tab=permissions': 'admin'"));
  assert.ok(workspace.includes("href === '/admin/permissions' || href.includes('tab=permissions')"));
 assert.match(workspace, /href\.includes\('tab=audit'\)/);
 assert.match(workspace, /key=\{view \+ adminTab\} initialTab=\{adminTab\}/);
 assert.match(admin, /const \[tab,setTab\]=useState<Tab>\(initialTab\)/);
});

test('Outreach navigation renders the outreach panel, not the Music chooser', async () => {
 const preview = await read('src/features/workspace/WorkspacePreview.tsx');
 const access = await read('src/features/operations/AccessPreview.tsx');
 assert.match(preview, /view === 'outreach-access' \|\| view === 'employee-identity'/);
 assert.match(access, /type Mode='outreach-access'\|'employee-identity'\|'music-launch'/);
 assert.match(access, /mode==='outreach-access'\?<section className="ops-access-shell">/);
});

test('preview exposes rendered visual role and screen for hydration-aware checks', async () => {
 const preview = await read('src/features/workspace/WorkspacePreview.tsx');
 const browser = await read('scripts/preview-visual-smoke.mjs');
 assert.match(preview, /data-preview-role=\{role\} data-preview-view=\{view\}/);
 assert.match(browser, /getAttribute\('data-preview-role'\)/);
 assert.match(browser, /getAttribute\('data-preview-view'\)/);
});

test('long employee identity text wraps without creating horizontal page overflow', async () => {
 const css = await read('src/app/(preview)/operations-preview.css');
 assert.match(css, /\.identity-dashboard-hero > div:last-child/);
 assert.match(css, /overflow-wrap:anywhere/);
 assert.match(css, /@media\(max-width:360px\)/);
});
