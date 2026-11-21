import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
async function validator(){
 const source=(await read('src/features/operations/EmployeeEditContract.ts'))
   .replace("import { departments } from './OperationsModels';",'')
   .replace("import type { EmployeeStatus, EmployeeType } from './EmployeeLiveContract';",'');
 const js=ts.transpileModule("const departments=['Engineering','Marketing','Human Resources',"+
   "'Finance','Customer Support','Sales & Business Development'];\n"+source,{
     compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
   }).outputText;
 const context={exports:{}};vm.runInNewContext(js,context,{timeout:1000});
 return context.exports.parseEmployeeUpdate;
}
test('employee edits use canonical departments, version and explicit confirmation',async()=>{
 const validate=await validator();
 const form={fullName:'Developer One',department:'Engineering',jobTitle:'Engineer',
   employmentType:'full_time',startDate:'2026-11-10',version:2,status:'active',confirmed:true};
 assert.equal(validate(form)?.version,2);
 assert.equal(validate({...form,version:0}),null);
 assert.equal(validate({...form,confirmed:false}),null);
 assert.equal(validate({...form,department:'Other'}),null);
 assert.equal(validate({...form,status:'archived'}),null);
 assert.equal(validate({...form,email:'external@example.invalid'}),null);
 assert.equal(validate({...form,startDate:'2026-02-30'}),null);
});
test('employee update proxy and editor cannot bypass audited backend authorization',async()=>{
 const proxy=await read('src/app/api/employee-update/[id]/route.ts');
 const table=await read('src/features/operations/LiveEmployeeTable.tsx');
 const page=await read('src/app/(workspace)/employees/page.tsx');
 assert.match(proxy,/request.headers.get\('origin'\)!==origin/);
 assert.match(proxy,/request.cookies.get\('vsph.portal.sid'\)/);
 assert.match(proxy,/parseEmployeeUpdate\(payload\)/);
 assert.match(proxy,/approvedInternalOrigin\(\)/);
 assert.match(proxy,/employeeUuid.test\(id\)/);
 assert.match(proxy,/response.status===409/);
 assert.match(table,/role==='owner'\|\|!employee.isHr/);
 assert.match(table,/!confirmed\|\|saving/);
 assert.match(table,/window.location.reload\(\)/);
 assert.match(page,/<LiveEmployeeTable employees=\{roster.employees\}/);
 assert.doesNotMatch(table+proxy,/OperationsFixtures|exampleEmployees|localStorage|sessionStorage/);
});
