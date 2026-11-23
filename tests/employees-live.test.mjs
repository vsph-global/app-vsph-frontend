import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function parser(){
 const source=await read('src/features/operations/EmployeeLiveContract.ts');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,
   target:ts.ScriptTarget.ES2022}}).outputText;
 const context={exports:{}};
 vm.runInNewContext(js,context,{timeout:1000});
 return context.exports.parseEmployeeRoster;
}
test('employee directory parses authorized roster and rejects invalid rows',async()=>{
 const parse=await parser();
 const employee={id:user,full_name:'Engineer One',email:'engineer@example.invalid',
   department:'Engineering',job_title:'Developer',employment_type:'full_time',
   start_date:'2026-11-01',status:'active',version:2,is_hr:false};
 const counts={total:1,active:1,onboarding:0,onLeave:0,inactive:0,hrManagers:0};
 const response={role:'owner',canManageHr:true,employees:[employee],counts,
   departments:[{department:'Engineering',members:1}],hrManagers:[]};
 assert.equal(parse(response)?.employees[0].fullName,'Engineer One');
 assert.equal(parse({...response,employees:[employee,employee]}),null);
 assert.equal(parse({...response,employees:[{...employee,id:'not-a-uuid'}]}),null);
 assert.equal(parse({...response,employees:[{...employee,version:0}]}),null);
 assert.equal(parse({...response,role:'hr',canManageHr:true}),null);
 assert.equal(parse({...response,counts:{...counts,active:-1}}),null);
 assert.equal(parse({...response,departments:[{department:'Engineering',members:-1}]}),null);
 assert.equal(parse({...response,employees:Array.from({length:52},()=>employee)}),null);
});
test('employee live screen is backed by server-only API with bounded filters',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const loader=await read('src/features/operations/employee-server.ts');
 const page=await read('src/app/(workspace)/employees/page.tsx');
 const header=await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(api,/const employeePath/);
 assert.match(api,/permittedEmployees/);
 assert.match(loader,/portalApi\('\/api\/employees\?'\+params\.toString\(\)\)/);
 assert.match(loader,/redirect\('\/login'\)/);
 assert.match(page,/loadEmployeeRoster/);
 assert.match(page,/employeeUrl\(search,status,roster.nextCursor\)/);
 assert.match(page,/roster\.counts\.total/);
  const allowedNavigation = header.split('\n').find(line => line.includes('const activePages = new Set('));
  assert.ok(allowedNavigation, 'active routes are registered');
  for (const route of ['/dashboard','/applications','/projects','/employees','/hr','/admin/customers','/admin/finance']) {
    assert.ok(allowedNavigation.includes("'"+route+"'"), 'missing route '+route);
  }
 assert.doesNotMatch(loader+page,/OperationsFixtures|exampleEmployees|localStorage|sessionStorage|fetch\(/);
});
