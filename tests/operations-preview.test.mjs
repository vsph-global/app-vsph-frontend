import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFile(join(root,path),'utf8');
const blob=bytes=>createHash('sha1')
 .update(Buffer.concat([Buffer.from('blob '+bytes.length),Buffer.from([0])]))
 .update(bytes).digest('hex');

test('32 legacy workforce, organization, finance and admin source snapshots remain immutable',async()=>{
 const m=JSON.parse(await read('docs/reference/operations/manifest.json'));
 assert.equal(m.frozen,'3b3a1535873aa0517aea41da32a407f3d9680547');
 const items=Object.entries(m.files);
 assert.equal(items.length,32);
 for(const [path,sha] of items){
  assert.equal(blob(await readFile(join(root,path))),sha,'source changed: '+path);
 }
 for(const file of ['employees.css','finance.css','project-utilities.css']){
  assert.equal(await read('src/app/(preview)/'+file),
   await read('docs/reference/operations/public/'+file),'CSS drift: '+file);
 }
 assert.equal(await read('src/app/(preview)/account-profile.css'),
  (await read('docs/reference/operations/public/account-profile.css'))
   .replace(/^@import url\('\/fonts\.css'\);\s*/,''));
 assert.equal(await read('src/app/(preview)/hrms.css'),
  (await read('docs/reference/operations/public/hrms.css'))
   .replace(/^@import url\('\/account-profile\.css'\);\s*/,''));
});

test('People and HR UI preserve the six departments, directory and governance surfaces',async()=>{
 const model=await read('src/features/operations/OperationsModels.ts');
 const people=await read('src/features/operations/PeopleDirectory.tsx');
 const hr=await read('src/features/operations/HrPreview.tsx');
 for(const dep of ['Engineering','Marketing','Human Resources','Finance',
  'Customer Support','Sales & Business Development']){
  assert.ok(model.includes(dep),'missing original department '+dep);
 }
 for(const label of ['Employee management','Department allocation','Staff directory',
  'Archived employees','Employee details','Onboard employee']){
  assert.ok(people.includes(label),'missing employee UI '+label);
 }
 for(const label of ['HR access governance','HR workspace','Leave review',
  'Attendance records','Employee onboarding','Complete onboarding']){
  assert.ok(hr.includes(label),'missing HR UI '+label);
 }
 for(const action of ['Save employee changes','Onboard employee']){
  assert.match(people,new RegExp(action));
 }
 assert.match(hr,/disabled>Complete onboarding/);
 assert.match(people,/useMemo\(/);
 assert.match(hr,/setStatus\(e\.target\.value/);
});

test('customers, account and finance keep explicit independent access boundaries',async()=>{
 const org=await read('src/features/operations/OrganizationsPreview.tsx');
 const acct=await read('src/features/operations/AccountPreview.tsx');
 const finance=await read('src/features/operations/FinancePreview.tsx');
 for(const s of ['Customer workspace','My organizations','Subscribed products',
  'Members and access','Recent','invitations','lifecycle']){
  assert.ok(org.toLowerCase().includes(s.toLowerCase()),'missing organization UI '+s);
 }
 assert.match(org,/disabled>\s*Review and save entitlement/);
 assert.match(acct,/Security & sessions/);
 assert.match(acct,/Revoking a session also terminates linked product sessions/);
 assert.match(acct,/disabled>Revoke other sessions/);
 assert.match(acct,/disabled>Save profile/);
 for(const label of ['Finance ledger','Finance journal','Create invoice record',
  'Record cash receipt','Recent invoices','Recent receipts and corrections',
  'Apply filters']){
  assert.ok(finance.includes(label),'missing finance UI '+label);
 }
 assert.match(finance,/disabled>Record receipt/);
 assert.match(finance,/disabled>Save invoice/);
});

test('platform, search, reports and notifications are read-only presentation components',async()=>{
 const admin=await read('src/features/operations/AdminPreview.tsx');
 const utils=await read('src/features/operations/WorkUtilitiesPreview.tsx');
 const search=await read('src/features/operations/SearchPreview.tsx');
 for(const label of ['Platform administration','Product catalog','Audit logs',
  'Workforce roles &','Create or update subscription','Provisioning recovery',
  'Project leadership directory','Review and create']){
  assert.ok(admin.includes(label),'missing admin UI '+label);
 }
 assert.match(admin,/disabled>\{children\}/);
 assert.match(utils,/Download project summary CSV/);
 assert.match(utils,/disabled>Retry failed in-app delivery/);
 assert.match(utils,/disabled>Save notification preferences/);
 assert.match(search,/Find project work/);
 assert.match(search,/setSubmitted\(/);
});

test('role switch never retains privileged visual screens and demo fixtures stay dev-only',async()=>{
 const preview=await read('src/features/workspace/WorkspacePreview.tsx');
 const header=await read('src/features/workspace/WorkspaceHeader.tsx');
 const fixtures=await read('src/features/operations/OperationsFixtures.ts');
 const route=await read('src/app/(preview)/%5F_preview/workspace/page.tsx');
 const real=(await Promise.all(['layout.tsx','dashboard/page.tsx','applications/page.tsx']
   .map(p=>read('src/app/(workspace)/'+p)))).join('\n');
 assert.match(preview,/setView\('role-dashboard'\);/);
 assert.match(preview,/const available = screens\.filter\(x => x\.roles\.includes\(role\)\)/);
 assert.match(preview,/screens\.some\(s => s\.id === target && s\.roles\.includes\(role\)\)/);
 assert.match(preview,/roles: ownerOnly/);
 assert.match(preview,/roles: internal/);
 for(const label of ['PeopleDirectory','HrPreview','OrganizationsPreview','AdminPreview',
  'FinancePreview','ReportsPreview','NotificationsPreview','AccountPreview','SearchPreview']){
  assert.ok(preview.includes('<'+label),'preview missing '+label);
 }
 assert.match(header,/if \(logoutBusy \|\| previewMode\) return/);
 assert.match(header,/if \(previewMode && onPreviewNavigate && canPreviewNavigate/);
 assert.match(route,/if \(process\.env\.NODE_ENV !== 'development'\) notFound\(\)/);
 assert.match(preview,/Synthetic data only/);
 assert.match(preview,/const roleProjects = role === 'customer'/);
 assert.match(preview,/const roleOrganizations = role === 'customer'/);
 assert.match(fixtures,/example\.invalid/);
 assert.doesNotMatch(fixtures+preview,/fetch\(|document\.cookie|localStorage|sessionStorage|\/api\//);
 assert.doesNotMatch(real,/OperationsFixtures|PeopleDirectory|AdminPreview|FinancePreview|exampleEmployees/);
 assert.match(real,/portalApi\('\/api\/auth\/me'\)/);
});

test('all active UI CSS imports and original stack remain intact',async()=>{
 const layout=await read('src/app/(preview)/layout.tsx');
 for(const file of ['employees.css','finance.css','account-profile.css','hrms.css',
  'project-utilities.css','operations-preview.css']){
  assert.ok(layout.includes("'./"+file+"'"),'missing CSS: '+file);
 }
 const pkg=JSON.parse(await read('package.json'));
 assert.equal(pkg.dependencies.next,'16.4.6');
 assert.equal(pkg.dependencies.react,'19.3.0');
 assert.equal(pkg.devDependencies.tailwindcss,'4.3.3');
 assert.match(pkg.scripts.check,/verify:preview-route/);
 assert.match(pkg.scripts['test:migration'],/tests\/projects-preview\.test\.mjs/);
});

test('Outreach, employee identity and launch previews never create access or credentials',async()=>{
 const snapshot=JSON.parse(await read('docs/reference/operations-extra/manifest.json'));
 assert.equal(snapshot.frozen,'3b3a1535873aa0517aea41da32a407f3d9680547');
 const entries=Object.entries(snapshot.files);
 assert.equal(entries.length,12);
 for(const [path,sha] of entries){
  assert.equal(blob(await readFile(join(root,path))),sha,'extra source changed: '+path);
 }
 assert.equal(await read('src/app/(preview)/employee-identity.css'),
   await read('docs/reference/operations-extra/public/employee-identity.css'));
 const access=await read('src/features/operations/AccessPreview.tsx');
 const preview=await read('src/features/workspace/WorkspacePreview.tsx');
 for(const s of ['Outreach Access','Grant employee access','Existing grants',
   'Employee account &','Access readiness','Open Music','Continue to Music']){
  assert.ok(access.includes(s),'missing access/launch section '+s);
 }
 assert.match(access,/disabled>Grant access/);
 assert.match(access,/disabled>Continue to Music/);
 assert.match(access,/disabled>Request account link/);
 assert.match(preview,/id: 'outreach-access'/);
 assert.match(preview,/id: 'employee-identity'/);
 assert.match(preview,/id: 'music-launch'/);
 assert.match(preview,/<AccessPreview mode=\{view\}/);
 assert.doesNotMatch(access,/fetch\(|\/api\/|document\.cookie|localStorage|sessionStorage/);
});
