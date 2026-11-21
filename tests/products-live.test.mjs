import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function contract(){
 const source=await read('src/features/operations/ProductRegistryContract.ts');
 const code=ts.transpileModule(source,{compilerOptions:{
   module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const ctx={exports:{},URL};
 vm.runInNewContext(code,ctx,{timeout:1000});
 return ctx.exports;
}
const readiness={state:'configured',configured:true,verified:false,
 reachable:null,scope:'reviewed local adapter',
 reason:'Configuration exists; reachability not verified.'};
const row={id,code:'CRM',name:'Customer Management',login_path:'/apps/crm/login',
 status:'active',version:2,description:'CRM service',owner_id:null,
 owner_name:null,support_email:null,docs_url:null,visibility:'listed',
 integration_mode:'adapter',latest_health:null,health_observed_at:null,readiness};
const draft={code:'CRM',name:'Customer Management',loginPath:'/apps/crm/login',
 status:'active',visibility:'listed',integrationMode:'adapter',
 description:'CRM service',ownerId:'',supportEmail:'',docsUrl:''};

test('product registry accepts only correctly ordered and unique owner-only records',async()=>{
 const {parseProduct,parseProducts}=await contract();
 assert.equal(parseProduct(row)?.code,'CRM');
 assert.equal(parseProduct(row)?.readiness.verified,false);
 assert.equal(parseProducts([row])?.items[0].name,'Customer Management');
 assert.equal(parseProducts([row,row]),null);
 assert.equal(parseProducts([{...row,code:'MUSIC',login_path:'/apps/music/login'},row]),null);
 assert.equal(parseProduct({...row,readiness:{...readiness,verified:true}}),null);
 assert.equal(parseProduct({...row,code:'bad'}),null);
 assert.equal(parseProduct({...row,id:'not-uuid'}),null);
 assert.equal(parseProduct({...row,latest_health:{state:'verified'}}),null);
 assert.equal(parseProducts(Array(101).fill(row)),null);
});
test('create and update commands reject secrets, stale versions, and unsafe metadata',async()=>{
 const {parseProductCommand}=await contract();
 assert.equal(parseProductCommand(draft,'create')?.code,'CRM');
 assert.equal(parseProductCommand({...draft,version:2},'update')?.version,2);
 assert.equal(parseProductCommand({...draft,version:0},'update'),null);
 assert.equal(parseProductCommand({...draft,secret:'private'},'create'),null);
 assert.equal(parseProductCommand({...draft,code:'CRM',integrationMode:'portal_only'},'create'),null);
 assert.equal(parseProductCommand({...draft,docsUrl:'https://example.com/docs?token=x'},'create'),null);
 assert.equal(parseProductCommand({...draft,docsUrl:'http://example.com/docs'},'create'),null);
 assert.equal(parseProductCommand({...draft,ownerId:'random'},'create'),null);
 assert.equal(parseProductCommand({...draft,code:'bad'},'create'),null);
});
test('product registry routes use fixed owner-protected reads and audited commands',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const load=await read('src/features/operations/product-registry-server.ts');
 const route=await read('src/app/api/product-command/[action]/[id]/route.ts');
 const ui=await read('src/features/operations/ProductRegistryEditor.tsx');
 const page=await read('src/app/(workspace)/admin/products/page.tsx');
 const detail=await read('src/app/(workspace)/admin/products/[id]/page.tsx');
 const create=await read('src/app/(workspace)/admin/products/new/page.tsx');
 const nav=await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(api,/permittedProductList/);
 assert.match(api,/permittedProductItem/);
 assert.match(load,/platformRole==='super_admin'/);
 assert.match(load,/parseProducts\(result.value\)/);
 assert.match(load,/parseProduct\(response.value\)/);
 assert.match(route,/request.headers.get\('origin'\)!==origin/);
 assert.match(route,/validPortalSession\(session\)/);
 assert.match(route,/parseProductCommand\(value,action as/);
 assert.match(route,/\['create','update','check'\]/);
 assert.match(ui,/destructive&&!lifecycleConfirmed/);
 assert.match(ui,/product\?\.status==='retired'/);
 assert.match(ui,/crypto.randomUUID\(\)/);
 assert.match(ui,/pending.current.signature!==signature/);
 assert.match(ui,/Local adapter checks never claim/);
 assert.match(page,/loadProductDirectory\(afterCode\|\|null\)/);
 assert.match(detail,/loadProductDetail\(id\)/);
 assert.match(create,/loadProductDirectory\(null\)/);
 assert.ok(nav.includes("'/admin/products'"));
 assert.doesNotMatch(load+route+ui,/OperationsFixtures|exampleProducts|localStorage|sessionStorage/);
});
