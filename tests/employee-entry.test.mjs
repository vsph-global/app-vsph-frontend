import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const load = async (path) => readFile(new URL(path, root), 'utf8');
const gitSha = (bytes) => createHash('sha1')
  .update(Buffer.concat([Buffer.from('blob ' + bytes.length), Buffer.from([0])]))
  .update(bytes).digest('hex');

test('frozen employee setup HTML and controller files remain exact', async () => {
  const originals = [
    ['docs/reference/employee-entry/employee-enrollment.html', 'c86824f9853f326faf844eb480ca2cb919b8322d'],
    ['docs/reference/employee-entry/employee-password.html', '826c7b536b9baa9acefce73133bc6b5419011a4f'],
    ['docs/reference/employee-entry/employee-enrollment.js', '33b26d07a4cbe4881e90fcb7bcaebe6da817c9b0'],
    ['docs/reference/employee-entry/employee-password.js', '086d8e8dc791c6250d7dba76a812c19b011897c7'],
  ];
  for (const [path, expected] of originals) {
    assert.equal(gitSha(await readFile(new URL(path, root))), expected, path);
  }
});

test('employee enrollment scrubs private fragment and never bypasses inspection', async () => {
  const page = await load('src/features/employee-entry/EmployeeEnrollmentPage.tsx');
  const route = await load('src/app/(invite)/employee-enrollment/page.tsx');
  const css = await load('src/app/(invite)/invite.css');
  assert.match(page, /location\.hash\.slice\(1\)/);
  for (const key of ['enrollment_id', "params.get('token')", "previous" ]) {
    assert.ok(page.includes(key) || (key === 'previous' && page.includes('earlier ??')));
  }
  assert.match(page, /history\.replaceState\(null, '', window\.location\.pathname\)/);
  assert.match(page, /credentials: 'omit'/);
  assert.match(page, /cache: 'no-store'/);
  assert.match(page, /employeeEnrollmentRequest\('inspect', proof\)/);
  assert.match(page, /employeeEnrollmentRequest\('accept', proof/);
  assert.match(page, /typeof data\.name !== 'string'/);
  assert.match(page, /result\.message !== 'Your employee account is ready\./);
  assert.match(page, /'PASSWORD_REJECTED'/);
  assert.match(page, /id="enrollmentConsent"/);
  assert.match(page, /minLength=\{8\}/);
  assert.match(page, /id="enrollmentStrengthFill"/);
  assert.doesNotMatch(page, /localStorage\.|sessionStorage\./);
  assert.match(css, /\.employee-enrollment-page \.invite-card/);
  assert.match(route, /referrer: 'no-referrer'/);
  assert.match(route, /robots: \{ index: false, follow: false \}/);
});

test('temporary password setup checks server session before changing account', async () => {
  const page = await load('src/features/employee-entry/EmployeePasswordPage.tsx');
  const route = await load('src/app/(invite)/employee-password/page.tsx');
  assert.match(page, /credentials: 'same-origin'/);
  assert.match(page, /cache: 'no-store'/);
  assert.match(page, /credentialRequest\('status'\)/);
  assert.match(page, /credentialRequest\('replace'/);
  assert.match(page, /'Your personal password is set\. Sign in again/);
  assert.match(page, /'CREDENTIAL_RECOVERY_REQUIRED'/);
  assert.match(page, /'PASSWORD_REJECTED'/);
  assert.match(page, /id="personalPasswordConsent"/);
  assert.match(page, /minLength=\{12\}/);
  assert.match(page, /\/api\/auth\/logout/);
  assert.match(page, /if \(!response\.ok\) throw new Error\('Sign-out failed\. Retry\.'\)/);
  assert.match(route, /referrer: 'no-referrer'/);
  const p = JSON.parse(await load('package.json'));
  assert.equal(p.dependencies.next, '16.4.6');
  assert.equal(p.dependencies.react, '19.3.0');
  assert.equal(p.devDependencies.tailwindcss, '4.3.3');
});
