import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const employee='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
async function load(path,prelude=''){
 const source=(await read(path)).replace(
   "import {employeeUuid} from './EmployeeEditContract';",'');
 const js=ts.transpileModule(prelude+source,{
   compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
 const context={exports:{}};vm.runInNewContext(js,context,{timeout:1000});
 return context.exports;
}
test('customer list/detail require valid unique organization and member IDs',async()=>{
 const {parseCustomerList,parseCustomerDetail}=await load('src/features/operations/CustomerLiveContract.ts');
 const row={id:org,name:'Acme',slug:'acme',status:'active'};
 const member={user_id:employee,full_name:'Example',email:'member@example.invalid',
   role:'member',status:'active',account_status:'active',version:1};
 const product={id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   code:'CRM',name:'CRM',status:'active',access_status:'enabled',
   plan_code:null,subscription_status:null};
 assert.equal(parseCustomerList([row])?.rows[0].name,'Acme');
 assert.equal(parseCustomerList([row,row]),null);
 assert.equal(parseCustomerDetail({organization:row,members:[member],
   products:[product],invitations:[]})?.members[0].role,'member');
 assert.equal(parseCustomerDetail({organization:row,members:[member,member],
   products:[product],invitations:[]}),null);
 assert.equal(parseCustomerDetail({organization:row,members:[member],
   products:[product],invitations:null}),null);
});
test('member mutation accepts only exact versioned role and status fields',async()=>{
 const {parseCustomerMemberChange}=await load('src/features/operations/CustomerMemberContract.ts',
   "const employeeUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n");
 const input={userId:employee,version:2,role:'viewer',status:'active'};
 assert.equal(parseCustomerMemberChange(input)?.role,'viewer');
 assert.equal(parseCustomerMemberChange({...input,status:'invited'}),null);
 assert.equal(parseCustomerMemberChange({...input,role:'super_admin'}),null);
 assert.equal(parseCustomerMemberChange({...input,version:0}),null);
 assert.equal(parseCustomerMemberChange({...input,organizationId:org}),null);
});
test('customer routes are owner-authorized and cannot proxy arbitrary tenants',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const server=await read('src/features/operations/customer-server.ts');
 const proxy=await read('src/app/api/customer-member/[id]/route.ts');
 const ui=await read('src/features/operations/CustomerMemberWorkspace.tsx');
 const nav=await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(api,/permittedCustomers/);
 assert.match(api,/permittedCustomerDetail/);
 assert.match(server,/portalApi\('\/api\/admin-management\/customers\?'\+params\.toString\(\)\)/);
 assert.match(server,/portalApi\('\/api\/admin-management\/customers\/'\+id\)/);
 assert.match(proxy,/request.headers.get\('origin'\)!==origin/);
 assert.match(proxy,/validPortalSession\(session\)/);
 assert.match(proxy,/parseCustomerMemberChange\(raw\)/);
 assert.match(ui,/!confirmed/);
 assert.match(ui,/window.location.reload\(\)/);
  const allowedNavigation = nav.split('\n').find(line => line.includes('const activePages = new Set('));
  assert.ok(allowedNavigation, 'active routes are registered');
  for (const route of ['/dashboard','/applications','/projects','/employees','/hr','/admin/customers','/admin/finance']) {
    assert.ok(allowedNavigation.includes("'"+route+"'"), 'missing route '+route);
  }
 assert.doesNotMatch(server+ui,/OperationsFixtures|exampleOrganizations|localStorage|sessionStorage/);
});
