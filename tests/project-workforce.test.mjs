import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseProjectWorkforce,parseWorkforceAction} from '../src/features/projects/ProjectWorkforceContract.ts';
import {parseWorkAction} from '../src/features/projects/ProjectWorkContract.ts';

const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const project='11111111-1111-4111-8111-111111111111';
const person='22222222-2222-4222-8222-222222222222';
const sample=()=>({canGovernManagers:false,canAssign:true,staff:[{
  user_id:person,full_name:'Example Engineer',department:'Engineering',
  job_title:'Developer',project_role:'contributor',membership_status:'active',
  team:'Platform',open_tasks:0,
}]});

test('directory accepts bounded backend-linked active staff but rejects malformed or duplicate rows',()=>{
  assert.equal(parseProjectWorkforce(sample())?.staff[0].userId,person);
  assert.equal(parseProjectWorkforce({...sample(),staff:[...sample().staff,...sample().staff]}),null);
  assert.equal(parseProjectWorkforce({...sample(),staff:[{...sample().staff[0],open_tasks:-1}]}),null);
  assert.equal(parseProjectWorkforce({...sample(),staff:[{...sample().staff[0],project_role:'super_admin'}]}),null);
  assert.equal(parseProjectWorkforce({...sample(),staff:[{...sample().staff[0],user_id:'no'}]}),null);
  assert.equal(parseProjectWorkforce({...sample(),canAssign:'yes'}),null);
  assert.equal(parseProjectWorkforce({staff:[]}),null);
});

test('staff changes cannot become implicit manager appointments or arbitrary authorization writes',()=>{
  const assign={version:4,userId:person,role:'contributor',team:'Product'};
  assert.deepEqual(parseWorkforceAction('assign',assign),{ok:true,data:assign});
  for(const value of [
    {...assign,role:'manager'}, {...assign,role:'client'},
    {...assign,platformRole:'super_admin'},
    {...assign,team:'x'.repeat(101)},
    {...assign,version:0},{...assign,userId:'anything'},
    {...assign,status:'active'}
  ])assert.equal(parseWorkforceAction('assign',value).ok,false);
  for(const action of ['remove','manager-grant','manager-revoke']){
    assert.deepEqual(parseWorkforceAction(action,{version:4,userId:person}),
      {ok:true,data:{version:4,userId:person}});
    assert.equal(parseWorkforceAction(action,{version:4,userId:person,role:'manager'}).ok,false);
  }
});
test('task assignments and task discussion reject dangerous or cross-scope client fields',()=>{
  const assigned={version:8,assigneeId:person};
  const unassigned={version:8,assigneeId:null};
  assert.deepEqual(parseWorkAction('task-assign',assigned),{ok:true,data:assigned});
  assert.deepEqual(parseWorkAction('task-assign',unassigned),{ok:true,data:unassigned});
  assert.equal(parseWorkAction('task-assign',{version:8,assigneeId:'other'}).ok,false);
  assert.equal(parseWorkAction('task-assign',{...assigned,shared:true}).ok,false);
  assert.equal(parseWorkAction('task-assign',{version:8}).ok,false);
  const comment={version:8,body:'Reviewed implementation',taskId:project};
  assert.deepEqual(parseWorkAction('task-comment-create',comment),{ok:true,data:comment});
  assert.equal(parseWorkAction('task-comment-create',{...comment,taskId:'../escape'}).ok,false);
  assert.equal(parseWorkAction('task-comment-create',{...comment,shared:true}).ok,false);
});
test('actual Next routes enforce selected task entity and owner-governance actions',async()=>{
  const workforceRoute=await read('src/app/api/projects/[id]/workforce/[action]/route.ts');
  const workforceGateway=await read('src/features/projects/project-workforce-gateway.ts');
  const commentRoute=await read('src/app/api/projects/[id]/tasks/[entity]/comments/route.ts');
  const taskRoute=await read('src/app/api/projects/[id]/tasks/[entity]/assignment/route.ts');
  const workGateway=await read('src/features/projects/project-work-gateway.ts');
  const details=await read('src/app/(workspace)/projects/[id]/page.tsx');
  const server=await read('src/features/workspace/server-api.ts');
  assert.match(workforceRoute,/new Set<WorkforceAction>/);
  assert.match(workforceRoute,/projectWorkforceWrite/);
  assert.match(workforceGateway,/parseWorkforceAction/);
  assert.match(workforceGateway,/response|status===409/);
  assert.match(workforceGateway,/request\.headers\.get\('origin'\)/);
  assert.match(commentRoute,/'task-comment-create'/);
  assert.match(taskRoute,/'task-assign'/);
  assert.match(workGateway,/Cannot verify project task membership/);
  assert.match(workGateway,/if \('taskId' in submitted\)/);
  assert.match(details,/ProjectWorkforcePanel/);
  assert.match(details,/TaskAssignmentForm/);
  assert.match(details,/TaskCommentForm/);
  assert.match(server,/permittedWorkforce/);
  assert.match(server,/response\.status === 403\) return \{ kind: 'forbidden' \}/);
  assert.match(server,/isProjectId\(workforcePath\[1\]\)/);
  assert.doesNotMatch(server,/\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$\/i\.test\(workforcePath/);
  assert.doesNotMatch(workforceGateway,/NEXT_PUBLIC_|DATABASE_URL|localStorage|eval\(/);
});
