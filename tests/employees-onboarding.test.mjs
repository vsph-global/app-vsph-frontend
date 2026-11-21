import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
async function validator(){
 const source=(await read('src/features/operations/EmployeeCreateContract.ts'))
   .replace("import { departments } from './OperationsModels';",'')
   .replace("import type { EmployeeType } from './EmployeeLiveContract';",'');
 const js=ts.transpileModule("const departments=['Engineering','Marketing','Human Resources',"+
   "'Finance','Customer Support','Sales & Business Development'];\n"+source,{
     compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
   }).outputText;
 const context={exports:{}};vm.runInNewContext(js,context,{timeout:1000});
 return context.exports.parseEmployeeCreate;
}
test('onboarding contract enforces exact fields, canonical department and work email',async()=>{
 const validate=await validator();
 const row={fullName:'Engineer',email:'e@example.invalid',department:'Engineering',
   jobTitle:'Developer',employmentType:'intern',startDate:'2026-11-17'};
 assert.equal(validate(row)?.email,'e@example.invalid');
 assert.equal(validate({...row,department:'Other'}),null);
 assert.equal(validate({...row,email:'not-an-email'}),null);
 assert.equal(validate({...row,status:'active'}),null);
 assert.equal(validate({...row,startDate:'2026-02-30'}),null);
 assert.equal(validate({...row,employmentType:'vendor'}),null);
});
test('onboarding proxy preserves UUID retry keys and authenticated origin',async()=>{
 const api=await read('src/app/api/employee-onboard/route.ts');
 const form=await read('src/features/operations/EmployeeOnboardForm.tsx');
 const page=await read('src/app/(workspace)/employees/new/page.tsx');
 const directory=await read('src/app/(workspace)/employees/page.tsx');
 assert.match(api,/request.headers.get\('origin'\)!==origin/);
 assert.match(api,/validPortalSession\(session\)/);
 assert.match(api,/request.headers.get\('Idempotency-Key'\)/);
 assert.match(api,/employeeUuid.test\(key\)/);
 assert.match(api,/parseEmployeeCreate\(raw\)/);
 assert.match(api,/response.status===409/);
 assert.match(form,/request=useRef/);
 assert.match(form,/crypto.randomUUID\(\)/);
 assert.match(form,/request.current.signature!==signature/);
 assert.match(form,/Idempotency-Key':request.current.id/);
 assert.match(form,/did not create a login account or send an invitation/);
 assert.match(page,/portalApi\('\/api\/employees\/access'\)/);
 assert.match(directory,/href="\/employees\/new"/);
 assert.doesNotMatch(form+page,/OperationsFixtures|exampleEmployees|localStorage|sessionStorage/);
});
