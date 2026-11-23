import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const employee='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
async function load(path,prelude=''){
 const source=(await read(path)).replace(
   "import {employeeUuid} from './EmployeeEditContract';",'');
 const js=ts.transpileModule(prelude+source,{
   compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
 const ctx={exports:{}};vm.runInNewContext(js,ctx,{timeout:1000});return ctx.exports;
}
test('HR list projections reject untrusted and duplicated leave/attendance rows',async()=>{
 const {parseLeavePage,parseAttendancePage}=await load('src/features/operations/HrLiveContract.ts');
 const leave={id,employee_id:employee,employee_name:'Employee',start_on:'2026-11-18',
   end_on:'2026-11-20',kind:'annual',reason:'Holiday',status:'pending',
   version:1,requested_at:'2026-11-17T10:00:00Z',decision_note:''};
 const attendance={id,employee_id:employee,employee_name:'Employee',work_day:'2026-11-17',
   checked_in_at:'2026-11-17T04:00:00Z',checked_out_at:null,status:'open',
   version:1,recovery_note:null};
 const page=row=>({role:'hr',items:[row],nextId:null});
 assert.equal(parseLeavePage(page(leave))?.items[0].kind,'annual');
 assert.equal(parseAttendancePage(page(attendance))?.items[0].status,'open');
 assert.equal(parseLeavePage({...page(leave),items:[leave,leave]}),null);
 assert.equal(parseAttendancePage({...page(attendance),items:[attendance,attendance]}),null);
 assert.equal(parseLeavePage(page({...leave,status:'unknown'})),null);
 assert.equal(parseAttendancePage(page({...attendance,version:0})),null);
 assert.equal(parseLeavePage({...page(leave),nextId:employee}),null);
});
test('HR mutation only allows audited backend actions and confirms versions',async()=>{
 const {hrMutation}=await load('src/features/operations/HrMutationContract.ts',
   "const employeeUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n");
 const review={version:1,decision:'approved',note:'Reviewed',confirmed:true};
 assert.equal(hrMutation('leave-review',id,review)?.path,
   '/api/hrms/leave/'+id+'/review');
 assert.equal(hrMutation('leave-review',id,{...review,confirmed:false}),null);
 assert.equal(hrMutation('leave-review',id,{...review,decision:'cancelled'}),null);
 assert.equal(hrMutation('attendance-incomplete',id,{
   version:2,note:'Missed checkout',confirmed:true})?.path,
   '/api/hrms/attendance/'+id+'/incomplete');
 assert.equal(hrMutation('attendance-incomplete',id,{
   version:2,note:'short',confirmed:true}),null);
 assert.equal(hrMutation('other',id,review),null);
});
test('HR workspace protects both live reads and audited changes',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const loader=await read('src/features/operations/hr-server.ts');
 const page=await read('src/app/(workspace)/hr/page.tsx');
 const ui=await read('src/features/operations/HrReviewWorkspace.tsx');
 const proxy=await read('src/app/api/hr-actions/[kind]/[id]/route.ts');
 const header=await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(api,/const hrPath/);
 assert.match(api,/permittedHrList/);
 assert.match(loader,/portalApi\('\/api\/hrms\/leave\?'\+leave\.toString\(\)\)/);
 assert.match(loader,/portalApi\('\/api\/hrms\/attendance\?'\+attendance\.toString\(\)\)/);
 assert.match(page,/loadHrWorkspace/);
 assert.match(ui,/saveHr\('leave-review'/);
 assert.match(ui,/saveHr\('attendance-incomplete'/);
 assert.match(ui,/confirmed:true/);
 assert.match(proxy,/request.headers.get\('origin'\)!==origin/);
 assert.match(proxy,/validPortalSession\(session\)/);
 assert.match(proxy,/hrMutation\(kind,id,data\)/);
  const allowedNavigation = header.split('\n').find(line => line.includes('const activePages = new Set('));
  assert.ok(allowedNavigation, 'active routes are registered');
  for (const route of ['/dashboard','/applications','/projects','/employees','/hr','/admin/customers','/admin/finance']) {
    assert.ok(allowedNavigation.includes("'"+route+"'"), 'missing route '+route);
  }
 assert.doesNotMatch(ui+page+loader,/OperationsFixtures|exampleLeaves|localStorage|sessionStorage/);
});
