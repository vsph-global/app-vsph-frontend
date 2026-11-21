import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const project='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function contract(){
 const source=await read('src/features/operations/NotificationLiveContract.ts');
 const transpiled=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const context={exports:{}};vm.runInNewContext(transpiled,context,{timeout:1200});
 return context.exports;
}
test('notifications parser refuses invalid IDs and unrelated project rows',async()=>{
 const {parseNotificationInbox}=await contract();
 const row={id:15,project_id:project,project_name:'Project',
   event_type:'task.assigned',title:'New assignment',
   created_at:'2026-11-17T11:00:00Z',read_at:null};
 const good={queued:1,attention:0,notifications:[row]};
 assert.equal(parseNotificationInbox(good)?.notifications[0].id,'15');
 assert.equal(parseNotificationInbox({...good,notifications:[row,row]}),null);
 assert.equal(parseNotificationInbox({...good,notifications:[{...row,project_id:'bad'}]}),null);
 assert.equal(parseNotificationInbox({...good,notifications:[{...row,id:1.2}]}),null);
 assert.equal(parseNotificationInbox({...good,queued:-1}),null);
 assert.equal(parseNotificationInbox({...good,notifications:Array(101).fill(row)}),null);
});
test('only reviewed current-account inbox writes are accepted',async()=>{
 const {validNotificationAction,parseNotificationPreferences}=await contract();
 const prefs={assignments:true,delivery:false,overdue:true};
 assert.equal(parseNotificationPreferences(prefs)?.delivery,false);
 assert.equal(validNotificationAction('read',{notificationId:'15'})?.path,
   '/api/notifications/15/read');
 assert.equal(validNotificationAction('read',{notificationId:'1;DROP'}) ,null);
 assert.equal(validNotificationAction('preferences',prefs)?.path,
   '/api/notifications/preferences');
 assert.equal(validNotificationAction('preferences',{...prefs,admin:true}),null);
 assert.equal(validNotificationAction('retry',{})?.path,'/api/notifications/retry');
 assert.equal(validNotificationAction('retry',{target:'other-user'}),null);
});
test('inbox remains backend-authorized and uses CSRF guard for mutations',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const loader=await read('src/features/operations/notification-server.ts');
 const page=await read('src/app/(workspace)/notifications/page.tsx');
 const ui=await read('src/features/operations/LiveNotificationWorkspace.tsx');
 const proxy=await read('src/app/api/notification-action/[operation]/route.ts');
 const nav=await read('src/features/workspace/WorkspaceHeader.tsx');
 assert.match(api,/permittedNotifications/);
 assert.match(loader,/portalApi\('\/api\/notifications'\)/);
 assert.match(loader,/portalApi\('\/api\/notifications\/preferences'\)/);
 assert.match(page,/loadNotifications\(\)/);
 assert.match(ui,/mutate\('preferences',prefs\)/);
 assert.match(ui,/mutate\('read',\{notificationId:n.id\}\)/);
 assert.match(ui,/mutate\('retry',\{\}\)/);
 assert.match(proxy,/request.headers.get\('origin'\)!==publicOrigin/);
 assert.match(proxy,/validPortalSession\(sid\)/);
 assert.match(proxy,/validNotificationAction\(operation,data\)/);
 assert.ok(nav.includes("'/notifications'"));
 assert.doesNotMatch(loader+page+ui,/OperationsFixtures|exampleNotices|localStorage|sessionStorage/);
});
