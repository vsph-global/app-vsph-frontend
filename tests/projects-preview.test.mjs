import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFile(join(root,path),'utf8');
const sha=bytes=>createHash('sha1')
  .update(Buffer.concat([Buffer.from('blob '+bytes.length),Buffer.from([0])]))
  .update(bytes).digest('hex');

test('original projects sources and styles are byte-identical to frozen legacy',async()=>{
 const m=JSON.parse(await read('docs/reference/projects/manifest.json'));
 assert.equal(m.frozen,'3b3a1535873aa0517aea41da32a407f3d9680547');
 const files=Object.entries(m.files);assert.equal(files.length,6);
 for(const [file,digest] of files){
   assert.equal(sha(await readFile(join(root,file))),digest,'source changed: '+file);
 }
 for(const file of ['projects.css','project-detail-v2.css']){
   assert.equal(await read('src/app/(preview)/'+file),
     await read('docs/reference/projects/public/'+file),'active style mismatch: '+file);
 }
});

test('portfolio respects legacy columns, filters, pagination and preview-only opening',async()=>{
 const portfolio=await read('src/features/projects/ProjectPortfolio.tsx');
 for(const word of ['Project','Ownership','State','Priority','Progress','Due',
   'Search projects','Lifecycle','New project','Load more projects']){
   assert.ok(portfolio.includes(word), 'missing original portfolio control: '+word);
 }
 assert.match(portfolio,/setApplied\(\{q:query\.trim\(\),status\}\)/);
 assert.match(portfolio,/setPage\(page\+1\)/);
 assert.match(portfolio,/onOpen\(p\.id\)/);
 assert.match(portfolio,/completed\(p\)/);
 assert.match(portfolio,/type="button" disabled>New project/);
 assert.doesNotMatch(portfolio,/fetch\(|\/api\/|location\.assign|localStorage|sessionStorage/);
});

test('project details include eight original views with nonfunctional mutations',async()=>{
 const detail=await read('src/features/projects/ProjectDetails.tsx');
 for(const view of ['overview','tasks','milestones','team','applications','delivery',
  'engineering','activity']){
   assert.ok(detail.includes("'"+view+"'"),'missing project view '+view);
 }
 for(const section of ['Needs attention','Milestone roadmap','Risks & blockers',
  'Project resources','Weekly updates','Tasks', 'Project team',
  'Custom project applications','Deliverables and comments','Engineering delivery',
  'Activity history']){
  assert.ok(detail.includes(section),'missing project detail section '+section);
 }
 assert.match(detail,/setView\(v\)/);
 assert.match(detail,/setFilter\(value\)/);
 assert.match(detail,/checked=\{item\.done\} disabled/);
 for(const action of ['Assign a task','Create milestone','Add team member',
   'New custom application','Add deliverable','Connect repository']){
   assert.ok(detail.includes(action),'expected read-only action '+action);
 }
 assert.doesNotMatch(detail,/fetch\(|\/api\/|localStorage|sessionStorage|location\.assign/);
});

test('project sample records render only in dev preview and never grant real access',async()=>{
 const view=await read('src/features/workspace/WorkspacePreview.tsx');
 const source=await read('src/features/projects/ProjectFixtures.ts');
 const preview=await read('src/features/projects/ProjectsPreview.tsx');
 const real=(await Promise.all(['layout.tsx','dashboard/page.tsx','applications/page.tsx']
  .map(x=>read('src/app/(workspace)/'+x)))).join('\n');
 const route=await read('src/app/(preview)/%5F_preview/workspace/page.tsx');
 const layout=await read('src/app/(preview)/layout.tsx');
 assert.match(route,/if \(process\.env\.NODE_ENV !== 'development'\) notFound\(\)/);
 assert.match(view,/view === 'projects'/);
 assert.match(view,/<ProjectsPreview projects=\{roleProjects\}/);
 assert.match(view,/Synthetic data only/);
 assert.match(preview,/<ProjectPortfolio projects=\{projects\}/);
 assert.match(preview,/<ProjectDetails key=\{project\.id\}/);
 assert.match(source,/export const exampleProjects:ProjectModel\[\]/);
 assert.match(source,/example\.invalid/);
 assert.doesNotMatch(source+preview,/fetch\(|\/api\/|document\.cookie|localStorage|sessionStorage/);
 assert.doesNotMatch(real,/ProjectsPreview|ProjectFixtures|ProjectPortfolio|ProjectDetails/);
 assert.match(real,/portalApi\('\/api\/auth\/me'\)/);
 assert.match(layout,/projects\.css/);
 assert.match(layout,/project-detail-v2\.css/);
 assert.match(layout,/projects-preview\.css/);
});

test('original Next and React versions remain unchanged',async()=>{
 const packageJson=JSON.parse(await read('package.json'));
 assert.equal(packageJson.dependencies.next,'16.4.6');
 assert.equal(packageJson.dependencies.react,'19.3.0');
 assert.equal(packageJson.devDependencies.tailwindcss,'4.3.3');
 assert.match(packageJson.scripts.check,/verify:preview-route/);
});
