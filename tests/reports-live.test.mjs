import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function contract(){
 const code=await read('src/features/operations/ProjectReportLiveContract.ts');
 const out=ts.transpileModule(code,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const c={exports:{},URLSearchParams};vm.runInNewContext(out,c,{timeout:1000});
 return c.exports;
}
test('report contract enforces first-100 authorized rows and safe filters',async()=>{
 const {parseProjectReport,validReportFilters,reportApiPath}=await contract();
 const filters={status:'active',from:'2026-11-01',to:'2026-11-17'};
 assert.equal(validReportFilters(filters),true);
 assert.equal(reportApiPath(filters),'/api/project-reports?status=active&from=2026-11-01&to=2026-11-17');
 assert.equal(validReportFilters({...filters,to:'2026-10-31'}),false);
 assert.equal(validReportFilters({...filters,ownerId:uuid}),false);
 const row={id:uuid,key:'PROJECT-1',name:'Example',status:'active',owner_id:uuid,
   customer_organization_id:null,due_on:null,owner_name:'Project Owner',organization_name:null,
   completed_tasks:1,total_tasks:3,assigned_to_me:1,overdue_tasks:0,
   completed_milestones:0,pending_milestones:1,open_prs:1,
   prs_awaiting_requested_review:0,failed_build_records:0,
   last_sync_at:null,last_activity_at:null};
 const result={generatedAt:'2026-11-17T10:00:00Z',deploymentStatus:'unconfigured',
   projects:[row]};
 assert.equal(parseProjectReport(result)?.projects[0].completedTasks,1);
 assert.equal(parseProjectReport({...result,projects:[row,row]}),null);
 assert.equal(parseProjectReport({...result,projects:[{...row,overdue_tasks:-1}]}),null);
 assert.equal(parseProjectReport({...result,projects:[{...row,organization_name:[]}]}),null);
 assert.equal(parseProjectReport({...result,projects:Array(101).fill(row)}),null);
});
test('report view and CSV export keep backend tenant authorization and 100-row cap',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const loader=await read('src/features/operations/project-report-server.ts');
 const page=await read('src/app/(workspace)/reports/page.tsx');
 const proxy=await read('src/app/api/project-report/export/route.ts');
 const backendRoute=await read('src/features/operations/ProjectReportLiveContract.ts');
 const nav=await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(api,/permittedProjectReport/);
 assert.match(loader,/portalApi\(reportApiPath\(filters\)\)/);
 assert.match(page,/loadProjectReport\(filters\)/);
 assert.match(page,/report.limitReached/);
 assert.match(page,/reportExportHref\(filters\)/);
 assert.match(proxy,/validPortalSession\(session\)/);
 assert.match(proxy,/request.headers.get\('sec-fetch-site'\)==='cross-site'/);
 assert.match(proxy,/response.status===403/);
 assert.match(proxy,/text\/csv/);
 assert.match(proxy,/first-100-authorized-matching-projects/);
 assert.match(backendRoute,/value.projects.length>100/);
 assert.ok(nav.includes("'/reports'"));
 assert.doesNotMatch(page+loader+proxy,/OperationsFixtures|exampleProjects|localStorage|sessionStorage|method:'POST'/);
});
