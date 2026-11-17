import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFile(join(root,path),'utf8');
const gitSha=bytes=>createHash('sha1')
  .update(Buffer.concat([Buffer.from('blob '+bytes.length),Buffer.from([0])]))
  .update(bytes).digest('hex');

test('role dashboard CSS and legacy controllers are source-identical to frozen VSPH',async()=>{
  const manifest=JSON.parse(await read('docs/reference/role-dashboards/manifest.json'));
  assert.equal(manifest.frozen,'3b3a1535873aa0517aea41da32a407f3d9680547');
  const files=Object.entries(manifest.files);
  assert.equal(files.length,7);
  for(const [path,sha] of files){
    assert.equal(gitSha(await readFile(join(root,path))),sha,'frozen source changed: '+path);
  }
  for(const name of ['owner-overview.css','employee-bento.css','work-activity.css','calendar.css']){
    assert.equal(await read('src/app/(preview)/'+name),
      await read('docs/reference/role-dashboards/'+name),name+' CSS drift');
  }
});

test('owner preview ports the nine original bento panels and cash period control',async()=>{
  const owner=await read('src/features/workspace/OwnerDashboard.tsx');
  for(const name of ['owner-hero','owner-products','owner-completion',
    'owner-trend','owner-workload','owner-attention','owner-people',
    'owner-projects','owner-activity']){
    assert.match(owner,new RegExp('className="owner-tile '+name+'"'));
  }
  for(const title of ['Company overview','Product portfolio','Task completion',
    'Cash collections','Work distribution','Needs attention','Your team',
    'Active projects','Recent project activity']){
    assert.ok(owner.includes(title),'missing owner heading '+title);
  }
  assert.match(owner,/setPeriod\(value\)/);
  assert.match(owner,/setMonth\(i\)/);
  assert.match(owner,/ownerCashChart/);
  assert.match(owner,/role-disabled-link/);
  assert.doesNotMatch(owner,/fetch\(|\/api\/|localStorage|sessionStorage/);
});

test('employee preview ports original tasks, attendance, leave, heatmap and calendar',async()=>{
  const employee=await read('src/features/workspace/EmployeeDashboard.tsx');
  for(const name of ['employee-dashboard','work-activity-card','employee-work-tasks',
    'employee-work-attendance','employee-work-leave','employee-calendar',
    'calendar-month','calendar-list']){
    assert.ok(employee.includes(name),'missing employee component '+name);
  }
  for(const title of ['Work activity','Assigned tasks','Attendance',
    'Leave requests','Calendar','Notifications','Attendance history']){
    assert.ok(employee.includes(title),'missing employee module '+title);
  }
  assert.match(employee,/setTaskFilter\(value\)/);
  assert.match(employee,/setMode\(value\)/);
  assert.match(employee,/setCategory\(e\.target\.value\)/);
  assert.match(employee,/setQuery\(e\.target\.value\)/);
  assert.match(employee,/disabled>Request leave/);
  assert.match(employee,/disabled title="Event creation needs the backend">New event/);
  assert.doesNotMatch(employee,/fetch\(|\/api\/|localStorage|sessionStorage/);
});

test('role sample fixtures are isolated from the protected dashboard routes',async()=>{
  const sample=await read('src/features/workspace/RoleDashboardFixtures.ts');
  const preview=await read('src/features/workspace/WorkspacePreview.tsx');
  const layout=await read('src/app/(preview)/layout.tsx');
  const real=(await Promise.all(['layout.tsx','dashboard/page.tsx','applications/page.tsx']
    .map(x=>read('src/app/(workspace)/'+x)))).join('\n');
  assert.match(sample,/ownerPreviewData/);
  assert.match(sample,/employeePreviewData/);
  assert.match(preview,/<OwnerDashboard data=\{ownerPreviewData\} \/>/);
  assert.match(preview,/<EmployeeDashboard data=\{employeePreviewData\} \/>/);
  assert.match(preview,/setView\('role-dashboard'\)/);
  assert.match(preview,/Synthetic data only/);
  assert.match(preview,/role === 'owner'/);
  assert.doesNotMatch(real,/RoleDashboardFixtures|OwnerDashboard|EmployeeDashboard|WorkspacePreview/);
  assert.match(real,/portalApi\('\/api\/auth\/me'\)/);
  assert.match(layout,/owner-overview\.css/);
  assert.match(layout,/employee-bento\.css/);
  assert.match(layout,/work-activity\.css/);
  assert.match(layout,/calendar\.css/);
  assert.doesNotMatch(sample+preview,/fetch\(|\/api\/|document\.cookie|localStorage|sessionStorage/);
});
