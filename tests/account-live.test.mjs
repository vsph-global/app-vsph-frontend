import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
async function contract(){
 const s=await read('src/features/operations/AccountSelfServiceContract.ts');
 const code=ts.transpileModule(s,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const ctx={exports:{},Intl};vm.runInNewContext(code,ctx,{timeout:1000});
 return ctx.exports;
}
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const id2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const profile={displayName:'Example User',email:'user@example.invalid',
 platformRole:'user',bio:'A short profile',timeZone:'Asia/Kolkata',
 avatarTone:'navy',version:0,updatedAt:'2026-11-18T07:00:00Z'};
test('current-user profile validator rejects identity/role mutation and invalid time zones',async()=>{
 const {parseOwnProfile,parseProfileChange}=await contract();
 assert.equal(parseOwnProfile(profile)?.displayName,'Example User');
 const input={displayName:'New Name',bio:'Hello\nworld',
   timeZone:'Asia/Kolkata',avatarTone:'blue',version:0};
 assert.equal(parseProfileChange(input)?.avatarTone,'blue');
 assert.equal(parseProfileChange({...input,platformRole:'super_admin'}),null);
 assert.equal(parseProfileChange({...input,email:'another@example.invalid'}),null);
 assert.equal(parseProfileChange({...input,timeZone:'Not/A_Zone'}),null);
 assert.equal(parseProfileChange({...input,version:-1}),null);
 assert.equal(parseOwnProfile({...profile,avatarTone:'random'}),null);
});
test('own session list rejects missing current, duplicate IDs, or foreign credential fields',async()=>{
 const {parseOwnSessions}=await contract();
 const current={id,created_at:'2026-11-17T10:00:00Z',
   expires_at:'2026-11-20T10:00:00Z',current_session:true};
 const other={...current,id:id2,current_session:false};
 assert.equal(parseOwnSessions({sessions:[current,other]})?.[0].current,true);
 assert.equal(parseOwnSessions({sessions:[other]}),null);
 assert.equal(parseOwnSessions({sessions:[current,current]}),null);
 assert.equal(parseOwnSessions({sessions:[{...current,id:'bad'}]}),null);
 assert.equal(parseOwnSessions({sessions:Array(101).fill(current)}),null);
});
test('current-user profile and session pages enforce exact write shape and origin',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const server=await read('src/features/operations/account-server.ts');
 const patch=await read('src/app/api/account-profile/route.ts');
 const revoke=await read('src/app/api/account-sessions/[operation]/route.ts');
 const ui=await read('src/features/operations/ProfileWorkspace.tsx');
 const sessions=await read('src/features/operations/SessionWorkspace.tsx');
 const nav=await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(api,/permittedAccountSelfService/);
 assert.match(server,/portalApi\('\/api\/account\/profile'\)/);
 assert.match(server,/portalApi\('\/api\/account\/sessions'\)/);
 assert.match(patch,/request.headers.get\('origin'\)!==origin/);
 assert.match(patch,/validPortalSession\(session\)/);
 assert.match(patch,/parseProfileChange\(input\)/);
 assert.match(revoke,/request.headers.get\('origin'\)!==origin/);
 assert.match(revoke,/validPortalSession\(sid\)/);
 assert.match(revoke,/Object.keys\(input\).length!==0/);
 assert.match(revoke,/validSessionId\(operation\)/);
 assert.match(ui,/profile.version/);
 assert.match(ui,/Account email immutable/);
 assert.match(sessions,/sessions.filter\(s=>!s.current\)/);
 assert.match(sessions,/if\(busy\|\|!confirmation\)return/);
 assert.ok(nav.includes('href="/account/profile"'));
 assert.ok(nav.includes('href="/account/security"'));
 assert.doesNotMatch(patch+revoke+ui+sessions,/OperationsFixtures|exampleSessions|localStorage|sessionStorage/);
});
