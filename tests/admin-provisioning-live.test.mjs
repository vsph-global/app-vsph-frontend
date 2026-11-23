import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
async function loadContract(path){
  const source=await read(path);
  const compiled=ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
  }}).outputText;
  const context={exports:{}};vm.runInNewContext(compiled,context,{timeout:1500});
  return context.exports;
}
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const invitation='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const organization='cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('owner overview uses exact backend totals, with no fixture fallback',async()=>{
  const {parseAdminOverview}=await loadContract('src/features/operations/AdminLiveContract.ts');
  const good={organizations:5,users:15,applications:3,activeSubscriptions:2,
    enabledAppAccess:4};
  assert.equal(parseAdminOverview(good)?.organizations,5);
  assert.equal(parseAdminOverview({...good,organizations:-1}),null);
  assert.equal(parseAdminOverview({...good,users:'15'}),null);
  assert.equal(parseAdminOverview({...good,activeSubscriptions:1.2}),null);
});
test('audit view caps events and omits raw sensitive details',async()=>{
  const {parseAdminAudit}=await loadContract('src/features/operations/AdminLiveContract.ts');
  const row={id:uuid,actor_user_id:invitation,organization_id:organization,
    action:'invitation.reissued',target_type:'invitation',target_id:invitation,
    actor_name:'Administrator',organization_name:'Example',details:{secret:'do-not-show'},
    created_at:'2026-11-17T10:00:00Z'};
  const projected=parseAdminAudit({logs:[row]});
  assert.equal(projected?.[0].action,'invitation.reissued');
  assert.equal('details' in projected[0],false);
  assert.equal(parseAdminAudit({logs:[row,row]}),null);
  assert.equal(parseAdminAudit({logs:Array(201).fill(row)}),null);
  assert.equal(parseAdminAudit({logs:[{...row,created_at:'invalid'}]}),null);
});
test('provisioning queue accepts only generation-fenced invitation records',async()=>{
  const {parseProvisioningJobs,permittedRecoveryActions}=await loadContract(
    'src/features/operations/ProvisioningLiveContract.ts');
  const row={id:uuid,organization_id:organization,state:'requires_attention',
    created_at:'2026-11-17T10:00:00Z',invitation_id:invitation,
    email:'admin@example.invalid',invitation_state:'requires_attention',
    generation:2,expires_at:'2026-11-19T12:00:00Z',attempts:3,failure_code:'worker_error'};
  const jobs=parseProvisioningJobs([row]);
  assert.equal(jobs?.[0].generation,2);
  assert.ok(permittedRecoveryActions(jobs[0]).includes('recover'));
  assert.equal(parseProvisioningJobs([{...row,generation:0}]),null);
  assert.equal(parseProvisioningJobs([{...row,invitation_id:'bad'}]),null);
  assert.equal(parseProvisioningJobs([row,row]),null);
  assert.equal(parseProvisioningJobs(Array(101).fill(row)),null);
  assert.equal(permittedRecoveryActions({...jobs[0],invitationState:'accepted'}).length,0);
});
test('dangerous recovery requires matching action, generation and explicit reconciliation',async()=>{
  const {parseRecoveryCommand}=await loadContract(
    'src/features/operations/ProvisioningLiveContract.ts');
  assert.equal(parseRecoveryCommand('recover',{generation:4,reconciled:true})?.generation,4);
  assert.equal(parseRecoveryCommand('recover',{generation:4,reconciled:false}),null);
  assert.equal(parseRecoveryCommand('revoke',{generation:4,reconciled:false})?.generation,4);
  assert.equal(parseRecoveryCommand('retry',{generation:0,reconciled:false}),null);
  assert.equal(parseRecoveryCommand('reissue',{generation:2,reconciled:true}),null);
  assert.equal(parseRecoveryCommand('unknown',{generation:2,reconciled:false}),null);
  assert.equal(parseRecoveryCommand('reissue',{generation:2,reconciled:false,owner:'other'}),null);
});
test('admin and provisioning server routes preserve active owner and CSRF boundary',async()=>{
  const api=await read('src/features/workspace/server-api.ts');
  const admin=await read('src/features/operations/admin-server.ts');
  const provision=await read('src/features/operations/provisioning-server.ts');
  const mutation=await read('src/app/api/admin-provisioning/[id]/[action]/route.ts');
  const screen=await read('src/features/operations/ProvisioningRecoveryWorkspace.tsx');
  const nav=await read('src/features/workspace/WorkspaceHeader.tsx');
  const adminPage=await read('src/app/(workspace)/admin/page.tsx');
  assert.match(api,/permittedAdminOverview/);
  assert.match(api,/permittedAdminAudit/);
  assert.match(api,/permittedProvisioningList/);
  assert.match(admin,/platformRole!=='super_admin'/);
  assert.match(admin,/parseAdminAudit/);
  assert.match(provision,/platformRole!=='super_admin'/);
  assert.match(provision,/parseProvisioningJobs/);
  assert.match(mutation,/request.headers.get\('origin'\)!==origin/);
  assert.match(mutation,/validPortalSession\(session\)/);
  assert.match(mutation,/parseRecoveryCommand\(action,raw\)/);
  assert.match(mutation,/validProvisioningId\(id\)/);
  assert.match(mutation,/response.status===409/);
  assert.match(screen,/phrase.trim\(\)===required/);
  assert.match(screen,/pending\?\.action!=='recover'\|\|reconciled/);
  assert.match(screen,/generation:job.generation/);
  assert.match(adminPage,/raw audit payloads are deliberately omitted/);
  for(const route of ['/admin','/admin/provisioning'])assert.ok(nav.includes("'"+route+"'"));
  assert.doesNotMatch(admin+provision+screen,/OperationsFixtures|exampleJobs|localStorage|sessionStorage|window.confirm\(/);
});
