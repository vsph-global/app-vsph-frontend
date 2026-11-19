import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseWorkAction,allowedNextStatuses} from '../src/features/projects/ProjectWorkContract.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const task=()=>({version:4,title:'Implement dashboard',description:'Internal task',priority:'high',dueOn:''});
const milestone=()=>({version:4,title:'First launch',dueOn:'2026-12-05'});

test('strict task and milestone creation schemas reject access-control fields',()=>{
  assert.deepEqual(parseWorkAction('task-create',task()),
    {ok:true,data:task()});
  assert.deepEqual(parseWorkAction('milestone-create',milestone()),
    {ok:true,data:milestone()});
  for(const extra of [{shared:true},{assigneeId:'11111111-1111-4111-8111-111111111111'},
    {milestoneId:'11111111-1111-4111-8111-111111111111'},{ownerId:'1'},{team:'admin'}]){
    assert.equal(parseWorkAction('task-create',{...task(),...extra}).ok,false);
    assert.equal(parseWorkAction('milestone-create',{...milestone(),...extra}).ok,false);
  }
  assert.equal(parseWorkAction('task-create',{...task(),title:''}).ok,false);
  assert.equal(parseWorkAction('task-create',{...task(),title:'x'.repeat(201)}).ok,false);
  assert.equal(parseWorkAction('task-create',{...task(),description:'x'.repeat(5001)}).ok,false);
  assert.equal(parseWorkAction('task-create',{...task(),dueOn:'2026-02-30'}).ok,false);
  assert.equal(parseWorkAction('milestone-create',{...milestone(),dueOn:'2026-13-20'}).ok,false);
  assert.equal(parseWorkAction('milestone-create',{...milestone(),version:'4'}).ok,false);
  assert.equal(parseWorkAction('milestone-create',{...milestone(),version:0}).ok,false);
  assert.equal(parseWorkAction('task-create',[]).ok,false);
  assert.equal(parseWorkAction('task-create',null).ok,false);
});

test('status-only operations require exact schema and safe project version',()=>{
  assert.deepEqual(parseWorkAction('task-status',{version:4,status:'in_review'}),
    {ok:true,data:{version:4,status:'in_review'}});
  assert.deepEqual(parseWorkAction('milestone-status',{version:4,status:'done'}),
    {ok:true,data:{version:4,status:'done'}});
  for(const invalid of [
    {version:4,status:'administrator'},
    {version:4,status:'done',title:'Overwrite'},
    {version:4,status:'done',shared:true},
    {version:4,status:'done',assigneeId:'x'},
    {version:0,status:'done'},
    {version:999999999,status:'done'},
    {version:4.5,status:'done'},
  ]) assert.equal(parseWorkAction('task-status',invalid).ok,false);
  assert.equal(parseWorkAction('milestone-status',{version:4,status:'blocked'}).ok,false);
});

test('manager UI status options match the backend project lifecycle transition table',()=>{
  assert.deepEqual(allowedNextStatuses('task-status','todo'),['in_progress','cancelled']);
  assert.deepEqual(allowedNextStatuses('task-status','in_progress'),['todo','blocked','in_review']);
  assert.deepEqual(allowedNextStatuses('task-status','blocked'),['todo','in_progress','cancelled']);
  assert.deepEqual(allowedNextStatuses('task-status','in_review'),['in_progress','done']);
  assert.deepEqual(allowedNextStatuses('task-status','done'),['todo']);
  assert.deepEqual(allowedNextStatuses('milestone-status','planned'),['active','cancelled']);
  assert.deepEqual(allowedNextStatuses('milestone-status','active'),['planned','done','cancelled']);
  assert.deepEqual(allowedNextStatuses('milestone-status','done'),['active']);
  assert.deepEqual(allowedNextStatuses('milestone-status','cancelled'),['planned']);
  assert.deepEqual(allowedNextStatuses('task-status','unrecognized'),[]);
});

test('task and milestone routes only accept fixed project and entity UUID paths',async()=>{
  const gateway=await read('src/features/projects/project-work-gateway.ts');
  const page=await read('src/app/(workspace)/projects/[id]/page.tsx');
  const controls=await read('src/features/projects/ProjectWorkControls.tsx');
  const paths=[
    ['src/app/api/projects/[id]/tasks/route.ts',"'task-create'"],
    ['src/app/api/projects/[id]/milestones/route.ts',"'milestone-create'"],
    ['src/app/api/projects/[id]/tasks/[entity]/route.ts',"'task-status'"],
    ['src/app/api/projects/[id]/milestones/[entity]/route.ts',"'milestone-status'"],
  ];
  for(const [p,action] of paths) {
    const code=await read(p);
    assert.ok(code.includes('projectWorkWrite'),p);
    assert.ok(code.includes(action),p);
  }
  for(const text of [
    "request.headers.get('origin') !== origin",
    "request.cookies.get('vsph.portal.sid')",
    "parseWorkAction(action,submission)",
    "result.status === 409",
    "redirect:'manual'",
    "data.version !== parsed.data.version + 1",
    "result.status !== 200",
    "'Cache-Control':'no-store'",
  ]) assert.ok(gateway.includes(text),'missing gateway guard '+text);
  assert.match(page,/canManageWork = role === 'manager' && p\.status !== 'completed' && p\.status !== 'archived'/);
  for(const tag of ['TaskCreateForm','MilestoneCreateForm','TaskStatusForm','MilestoneStatusForm'])
    assert.match(page,new RegExp('<'+tag));
  assert.match(controls,/router\.refresh\(\)/);
  assert.doesNotMatch(gateway,/NEXT_PUBLIC_|localStorage|sessionStorage|DATABASE_URL|eval\(/);
  assert.doesNotMatch(page,/ProjectFixtures|exampleProjects|OperationsFixtures/);
});


test('private comment and evidence link schemas accept only project-level writes',async()=>{
  const comment={version:10,body:'Internal release approval'};
  const evidence={version:11,title:'Build report',url:'https://example.com/build'};
  assert.deepEqual(parseWorkAction('comment-create',comment),{ok:true,data:comment});
  assert.deepEqual(parseWorkAction('deliverable-create',evidence),{ok:true,data:evidence});
  assert.deepEqual(parseWorkAction('comment-create',{...comment,body:'  work done  '}),
    {ok:true,data:{version:10,body:'work done'}});
  assert.deepEqual(parseWorkAction('deliverable-create',{...evidence,title:'  Evidence  '}),
    {ok:true,data:{...evidence,title:'Evidence'}});
  for(const extra of [
    {shared:true},{taskId:'33333333-3333-4333-8333-333333333333'},
    {ownerId:'33333333-3333-4333-8333-333333333333'},
    {visibility:'client'},{projectId:'33333333-3333-4333-8333-333333333333'},
  ]) {
    assert.equal(parseWorkAction('comment-create',{...comment,...extra}).ok,false);
    assert.equal(parseWorkAction('deliverable-create',{...evidence,...extra}).ok,false);
  }
  for(const body of ['','   ','x'.repeat(4001),'\u0000hidden']) {
    assert.equal(parseWorkAction('comment-create',{...comment,body}).ok,false);
  }
  for(const url of ['http://example.com/build','https://user:pass@example.com/build',
    'https://example.com/report?token=secret','https://example.com/report#private',
    'https://example.com:8443/build','https://example.com/'+'a'.repeat(1800)]) {
    assert.equal(parseWorkAction('deliverable-create',{...evidence,url}).ok,false);
  }
  assert.equal(parseWorkAction('deliverable-create',{...evidence,title:''}).ok,false);
  assert.equal(parseWorkAction('deliverable-create',{...evidence,version:0}).ok,false);
  for(const [path,action] of [
    ['src/app/api/projects/[id]/comments/route.ts',"'comment-create'"],
    ['src/app/api/projects/[id]/deliverables/route.ts',"'deliverable-create'"],
  ]) {
    const content=await read(path);
    assert.ok(content.includes('projectWorkWrite')&&content.includes(action),path);
  }
  const gateway=await read('src/features/projects/project-work-gateway.ts');
  assert.ok(gateway.includes("'comment-create':'/comments'"));
  assert.ok(gateway.includes("'deliverable-create':'/deliverables'"));
  const page=await read('src/app/(workspace)/projects/[id]/page.tsx');
  assert.match(page,/canComment = \(role === 'manager' \|\| role === 'contributor'\)/);
  assert.match(page,/canManageWork && <ProjectDeliverableForm/);
  assert.match(page,/canComment && <ProjectCommentForm/);
});
