import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const user='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const app='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
async function contract(){
 const input=await read('src/features/operations/PermissionLiveContract.ts');
 const code=ts.transpileModule(input,{compilerOptions:{
   module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const context={exports:{}};vm.runInNewContext(code,context,{timeout:1000});
 return context.exports;
}
const organization={id:org,name:'Client example',status:'active'};
const member={user_id:user,full_name:'Customer Admin',email:'user@example.invalid',
 status:'active',account_status:'active',role:'admin',version:3};
const product={id:app,code:'CRM',name:'CRM',status:'active',access_status:'enabled',
 roles:['super_admin','admin','manager','user','viewer']};
const grant={user_id:user,application_id:app,role_code:'viewer'};
test('product permission projection rejects duplicates, cross-linked IDs and invalid state',async()=>{
 const {parsePermissionContext}=await contract();
 const data={organization,members:[member],products:[product],roles:[grant]};
 assert.equal(parsePermissionContext(data)?.grants[0].role,'viewer');
 assert.equal(parsePermissionContext({...data,members:[member,member]}),null);
 assert.equal(parsePermissionContext({...data,roles:[grant,grant]}),null);
 assert.equal(parsePermissionContext({...data,products:[{...product,roles:['invalid?']}]}),null);
 assert.equal(parsePermissionContext({...data,products:[{...product,roles:null}]})?.products[0].supportedRoles.length,0);
 assert.equal(parsePermissionContext({...data,organization:{...organization,id:'bad'}}),null);
 assert.equal(parsePermissionContext({...data,members:Array(201).fill(member)}),null);
});
test('granted and revoked roles require an exact active membership version',async()=>{
 const {parseRoleChange}=await contract();
 const assign={userId:user,applicationId:app,version:3,role:'admin'};
 assert.equal(parseRoleChange(assign)?.role,'admin');
 assert.equal(parseRoleChange({...assign,role:''})?.role,'');
 assert.equal(parseRoleChange({...assign,role:'platform_owner'}),null);
 assert.equal(parseRoleChange({...assign,version:0}),null);
 assert.equal(parseRoleChange({...assign,otherTenantId:org}),null);
 assert.equal(parseRoleChange({...assign,userId:'bad'}),null);
});
test('permission role mutation uses fixed backend route with backend-enforced tenant scope',async()=>{
 const loader=await read('src/features/operations/permission-server.ts');
 const page=await read('src/app/(workspace)/admin/permissions/page.tsx');
 const proxy=await read('src/app/api/product-role/[organizationId]/route.ts');
 const ui=await read('src/features/operations/PermissionWorkspace.tsx');
 const nav=await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(loader,/loadCustomerList\(afterId\)/);
 assert.match(loader,/portalApi\('\/api\/admin-management\/customers\/'\+organizationId\)/);
 assert.match(loader,/parsePermissionContext\(detail.value\)/);
 assert.match(page,/loadPermissionDirectory\(afterId\|\|null,id\|\|null\)/);
 assert.match(proxy,/request.headers.get\('origin'\)!==origin/);
 assert.match(proxy,/validPortalSession\(session\)/);
 assert.match(proxy,/parseRoleChange\(raw\)/);
 assert.match(proxy,/organizationId\+'\/role'/);
 assert.match(proxy,/response.status===409/);
 assert.match(ui,/organization.status==='active'/);
 assert.match(ui,/p.status==='active'/);
 assert.match(ui,/p.accessStatus==='enabled'/);
 assert.match(ui,/selectedMember.version/);
 assert.match(ui,/role===''\?\s*'Remove product role'/);
 assert.match(ui,/confirmed&&available/);
 assert.ok(nav.includes("'/admin/permissions'"));
 assert.doesNotMatch(ui+loader,/OperationsFixtures|exampleGrants|localStorage|sessionStorage/);
});
