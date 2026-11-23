import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
async function contract(){
 const source=await read('src/features/operations/ClientOnboardingContract.ts');
 const js=ts.transpileModule(source,{compilerOptions:{
   module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const c={exports:{}};vm.runInNewContext(js,c,{timeout:1200});return c.exports;
}
const appId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const orgId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('customer onboarding permits organization-only and validates product subscriptions',async()=>{
 const {parseClientOnboarding}=await contract();
 const now=Date.now();
 const future=new Date(now+86400000*30).toISOString().slice(0,10)+'T23:59:59.000Z';
 const base={organizationName:'Example Corp',slug:'example-corp',adminName:'Customer Owner',
   adminEmail:'owner@example.invalid',products:[]};
 assert.equal(parseClientOnboarding(base,now)?.slug,'example-corp');
 const plan={applicationId:appId,planCode:'starter',status:'trial',endsAt:future};
 assert.equal(parseClientOnboarding({...base,products:[plan]},now)?.products[0].status,'trial');
 assert.equal(parseClientOnboarding({...base,products:[{...plan,endsAt:null}]},now),null);
 assert.equal(parseClientOnboarding({...base,products:[plan,plan]},now),null);
 assert.equal(parseClientOnboarding({...base,products:[{...plan,endsAt:'2021-01-01T00:00:00.000Z'}]},now),null);
 assert.equal(parseClientOnboarding({...base,adminRole:'super_admin'},now),null);
 assert.equal(parseClientOnboarding({...base,slug:'BAD Slug'},now),null);
 assert.equal(parseClientOnboarding({...base,adminEmail:'not-email'},now),null);
});
test('only active catalog products are exposed to customer onboarding',async()=>{
 const {parseOnboardingCatalog}=await contract();
 const active={id:appId,name:'CRM',code:'CRM',status:'active'};
 assert.equal(parseOnboardingCatalog({applications:[active]})?.[0].code,'CRM');
 assert.equal(parseOnboardingCatalog({applications:[active,active]}),null);
 assert.equal(parseOnboardingCatalog({applications:[{...active,status:'disabled'}]}),null);
});
test('request recovery never re-creates a customer on ambiguous outcomes',async()=>{
 const {parseExistingOnboardingRequest}=await contract();
 assert.equal(parseExistingOnboardingRequest({found:false})?.found,false);
 assert.equal(parseExistingOnboardingRequest({found:true,id:orgId,
   organizationName:'Example Corp',slug:'example-corp',state:'queued'})?.id,orgId);
 assert.equal(parseExistingOnboardingRequest({found:true,id:'bad',
   organizationName:'Example Corp',slug:'example-corp',state:'queued'}),null);
 const ui=await read('src/features/operations/ClientOnboardingWorkspace.tsx');
 assert.match(ui,/const original=useRef<Original\|null>\(null\)/);
 assert.match(ui,/crypto.randomUUID\(\)/);
 assert.match(ui,/Idempotency-Key':request.key/);
 assert.match(ui,/setStage\('uncertain'\)/);
 assert.match(ui,/checkOriginal\(\)/);
 assert.match(ui,/original.current=null/);
 assert.match(ui,/setOriginalMissing\(true\)/);
 assert.match(ui,/Invitation delivery has not been confirmed|delivery has not been confirmed/);
});
test('owner onboarding proxy forwards original request key only to known backend routes',async()=>{
 const proxy=await read('src/app/api/admin-onboarding/route.ts');
 const recovery=await read('src/app/api/admin-onboarding/request/[key]/route.ts');
 const server=await read('src/features/operations/client-onboarding-server.ts');
 const page=await read('src/app/(workspace)/admin/onboarding/page.tsx');
 const api=await read('src/features/workspace/server-api.ts');
 const nav=await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(proxy,/request.headers.get\('origin'\)!==publicOrigin/);
 assert.match(proxy,/validPortalSession\(sid\)/);
 assert.match(proxy,/validOnboardingKey\(key\)/);
 assert.match(proxy,/parseClientOnboarding\(raw\)/);
 assert.match(proxy,/response.status!==202/);
 assert.match(recovery,/validOnboardingKey\(key\)/);
 assert.match(recovery,/parseExistingOnboardingRequest\(value\)/);
 assert.match(server,/platformRole!=='super_admin'/);
 assert.match(server,/parseOnboardingCatalog\(result.value\)/);
 assert.match(page,/loadClientOnboardingCatalog\(\)/);
 assert.match(api,/permittedOnboardingLookups/);
 assert.ok(nav.includes("'/admin/onboarding'"));
 assert.doesNotMatch(proxy+recovery+server,/OperationsFixtures|exampleCustomers|localStorage|sessionStorage/);
});
