import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

// Match Next dev's hostname. Cross-origin /_next/ asset requests block hydration.
const origin = 'http://localhost:3100';
const server = spawn('npm', ['run', 'dev', '--', '-p', '3100', '-H', 'localhost'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
let browser;
const errors = [];
async function ready() {
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null) throw Error('Next dev server exited before the browser test.');
    try {
      const response = await fetch(origin + '/__preview/workspace');
      if (response.status === 200) return;
    } catch { /* server not listening yet */ }
    await sleep(1000);
  }
  throw Error('Next dev preview never became available.');
}

const screens = {
  owner: ['role-dashboard', 'projects', 'people', 'admin', 'finance', 'profile'],
  hr: ['role-dashboard', 'hr-workspace', 'employee-onboarding', 'people'],
  employee: ['role-dashboard', 'projects', 'employee-identity'],
  customer: ['role-dashboard', 'applications', 'organizations', 'music-launch'],
};
const viewports = [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
try {
  await ready();
  await mkdir('artifacts/ui', { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(viewport.width + ': ' + error.message));
    await page.goto(origin + '/__preview/workspace', { waitUntil: 'domcontentloaded' });
    await page.locator('#previewRole').waitFor({ timeout: 30000 });
    await page.getByText('Synthetic data only').first().waitFor();
    // A visible SSR select is not proof React has hydrated. Require a
    // handled click before exercising controlled stateful inputs.
    await page.getByRole('button', { name: 'Applications', exact: true }).click();
    await page.waitForFunction(() =>
      document.querySelector('[data-development-preview]')?.getAttribute('data-preview-view') === 'applications');
    for (const [role, views] of Object.entries(screens)) {
      await page.selectOption('#previewRole', role);
      await page.waitForFunction((expected) =>
        document.querySelector('[data-development-preview]')?.getAttribute('data-preview-role') === expected,
        role);
      for (const view of views) {
        await page.selectOption('#previewScreen', view);
        await page.waitForFunction((expected) =>
          document.querySelector('[data-development-preview]')?.getAttribute('data-preview-view') === expected,
          view);
        await page.locator('main#mainContent').first().waitFor();
        const overflow = await page.evaluate(() =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            document.documentElement.clientWidth);
        if (overflow > 2) {
          const offenders = await page.evaluate(() =>
            [...document.querySelectorAll('body *')].map(element => {
              const rect = element.getBoundingClientRect();
              return { tag: element.tagName.toLowerCase(),
                className: typeof element.className === 'string' ? element.className.slice(0, 100) : '',
                left: Math.round(rect.left), right: Math.round(rect.right) };
            }).filter(row => row.right > innerWidth + 2 || row.left < -2).slice(0, 12));
          await page.screenshot({
            path: `artifacts/ui/overflow-${viewport.width}-${role}-${view}.png`,
            fullPage: true,
          });
          throw new Error(`Horizontal page overflow at ${viewport.width}px, role ${role},
            view ${view}: ${overflow}px. Offenders: ${JSON.stringify(offenders)}`);
        }
        if ([320, 390, 1440].includes(viewport.width)) {
          await page.screenshot({
            path: `artifacts/ui/${viewport.width}-${role}-${view}.png`,
            fullPage: true,
            animations: 'disabled',
          });
        }
      }
      if (role === 'customer') {
        const options = await page.locator('#previewScreen option').allTextContents();
        assert.ok(!options.includes('Platform administration'),
          'Customer visual role includes owner-only preview screen');
      }
    }
    if (viewport.width === 1440) {
      await page.selectOption('#previewRole', 'owner');
      await page.waitForFunction(() =>
        document.querySelector('[data-development-preview]')?.getAttribute('data-preview-role') === 'owner');
      await page.locator('#workspaceNavigation').getByText('Administration', { exact: true }).click();
      await page.locator('#workspaceNavigation').getByRole('button',
        { name: 'Roles & permissions', exact: true }).click();
      await page.getByRole('heading', { name: 'Workforce roles & permissions' }).waitFor();
      await page.screenshot({ path: 'artifacts/ui/1440-admin-deep-link.png', fullPage: true });
    }
    await page.close();
    console.log(`Chromium UI preview passed at ${viewport.width}px.`);
  }
  assert.deepEqual(errors, [], 'Uncaught browser errors in the development preview');
  console.log('All synthetic-role and responsive smoke checks passed.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
