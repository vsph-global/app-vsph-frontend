/**
 * Full-stack acceptance with native PostgreSQL, the real legacy Express routes,
 * backend project_command SQL, and the actual production Next.js gateway/UI.
 *
 * The CI job exclusively creates an empty disposable loopback database named
 * vsph_test. This script refuses any other database address and never consumes
 * hosted credentials or user production data.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

const backendRequire = createRequire(new URL('../.acceptance-backend/package.json', import.meta.url));
const { Pool } = backendRequire('pg');
const { hashToken } = backendRequire('./tokens.js');
const {chromium,expect} = backendRequire('@playwright/test');
const input = process.env.TEST_DATABASE_URL;
assert.ok(input, 'TEST_DATABASE_URL required for isolated acceptance');
const database = new URL(input);
assert.ok(['localhost','127.0.0.1','[::1]'].includes(database.hostname) &&
  database.pathname === '/vsph_test' && ['postgres:','postgresql:'].includes(database.protocol) &&
  !database.search && !database.hash,
  'Refusing non-loopback or non-vsph_test database');
const api = 'http://127.0.0.1:47045';
const admin='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const viewer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const outsider='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const pool=new Pool({connectionString:input, max:4});
const tokens={};
const show={checks:0};
let browser;
let adminPage;
let viewerPage;

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const check=(condition,message)=>{assert.ok(condition,message); show.checks++};
async function call(path,{method='GET',token,origin=api,body}={}) {
  const headers={};
  if(token) headers.Cookie='vsph.portal.sid='+token;
  if(method!=='GET') {
    headers.Origin=origin;
    headers['Content-Type']='application/json';
    headers['Sec-Fetch-Site']='same-origin';
  }
  const response=await fetch(api+path,{
    method, headers, redirect:'manual', cache:'no-store',
    body:body===undefined?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(12000),
  });
  const raw=await response.text();
  let data;
  try {data=JSON.parse(raw);} catch {data=raw;}
  return {status:response.status,data,raw,headers:response.headers};
}
async function version(id) {
  const result=await pool.query('select version from public.projects where id=$1',[id]);
  check(result.rowCount===1,'Expected exactly one persisted project');
  return result.rows[0].version;
}
async function expectStatus(path,options,status,description) {
  const result=await call(path,options);
  assert.equal(result.status,status,description+': '+String(result.raw).slice(0,320));
  show.checks++;
  return result;
}

try {
  const initialized=await pool.query("select to_regclass('public.portal_sessions') session, to_regclass('public.projects') projects");
  check(Boolean(initialized.rows[0].session && initialized.rows[0].projects),
    'Backend fixture schema not installed');
  console.log('Acceptance stage 1: schema verified, generating disposable sessions');
  // These are real production-format, random sessions, inserted ONLY into disposable vsph_test.
  for(const [label,id] of [['admin',admin],['viewer',viewer],['outsider',outsider]]) {
    const token=randomBytes(32).toString('base64url');
    tokens[label]=token;
    await pool.query(
      "insert into public.portal_sessions(token_hash,user_id,expires_at) values($1,$2,now()+ interval '90 minutes')",
      [hashToken(token),id]
    );
  }
  const key='ACCEPT-'+randomBytes(4).toString('hex').toUpperCase();
  const name='Integration acceptance '+key;
  const create={key,name,description:'Disposable integration fixture',kind:'internal',
    priority:'normal',startsOn:'',dueOn:''};
  await expectStatus('/api/projects',{method:'POST',body:create},401,'Missing session');
  await expectStatus('/api/projects',{method:'POST',token:tokens.admin,
    origin:'https://evil.invalid',body:create},403,'CSRF cross-origin');
  await expectStatus('/api/projects',{method:'POST',token:tokens.viewer,body:create},
    403,'Ordinary employee cannot create projects');
  await expectStatus('/api/projects',{method:'POST',token:tokens.outsider,body:create},
    403,'Outsider cannot create projects');
  console.log('Acceptance stage 2: anonymous and non-admin creation denials confirmed');
  const created=await expectStatus('/api/projects',{
    method:'POST',token:tokens.admin,body:create,
  },201,'Admin creates real internal project');
  const id=created.data?.id;
  check(typeof id==='string'&&uuid.test(id),'Real backend must return project UUID');
  const stored=await pool.query('select key,name,version from public.projects where id=$1',[id]);
  check(stored.rows[0].key===key&&stored.rows[0].name===name&&stored.rows[0].version===1,
    'Project must be committed to native PostgreSQL');
  // Next.js 16 streams an initial Suspense shell; verify the visible page after hydration.
  await expectStatus('/projects',{token:tokens.admin},200,'Authorized portfolio response');
  await expectStatus('/projects/'+id,{token:tokens.admin},200,'Authorized project response');
  browser=await chromium.launch({headless:true});
  async function browserPage(token) {
    const context=await browser.newContext({baseURL:api});
    await context.addCookies([{name:'vsph.portal.sid',value:token,url:api,
      httpOnly:true,sameSite:'Lax'}]);
    return context.newPage();
  }
  adminPage=await browserPage(tokens.admin);
  await adminPage.goto('/projects',{waitUntil:'domcontentloaded'});
  await adminPage.getByRole('heading',{name:'Projects',exact:true}).waitFor({timeout:18000});
  await adminPage.goto('/projects/'+id,{waitUntil:'domcontentloaded'});
  try {
    await adminPage.getByRole('heading',{name,exact:true}).waitFor({timeout:12000});
  } catch(error) {
    const visible=await adminPage.locator('body').innerText().catch(()=>'(unavailable)');
    console.error('Authenticated browser diagnostic',JSON.stringify({
      pageUrl:adminPage.url(),visible:visible.slice(0,2400),
      documentTitle:await adminPage.title().catch(()=>null),
      statusText:await adminPage.getByRole('status').allTextContents().catch(()=>[]),
    }));
    throw error;
  }
  await adminPage.getByRole('button',{name:'Add task',exact:true}).waitFor({timeout:18000});
  await adminPage.getByRole('button',{name:'Add milestone',exact:true}).waitFor({timeout:18000});
  check(true,'Admin sees database-backed manager controls in Chromium');
  const outsiderPage=await browserPage(tokens.outsider);
  await outsiderPage.goto('/projects/'+id,{waitUntil:'domcontentloaded'});
  await outsiderPage.getByText('Project details unavailable.',{exact:false}).waitFor({timeout:18000});
  check(await outsiderPage.getByRole('heading',{name,exact:true}).count()===0,
    'Outsider project detail remains inaccessible in browser');

  console.log('Acceptance stage 3: creation persisted and role-scoped project pages loaded');
  // Add a viewer directly to this disposable DB to prove the backend enforces role restrictions.
  await pool.query("insert into public.project_memberships(project_id,user_id,role,status) values($1,$2,'viewer','active')",[id,viewer]);
  viewerPage=await browserPage(tokens.viewer);
  await viewerPage.goto('/projects/'+id,{waitUntil:'domcontentloaded'});
  await viewerPage.getByRole('heading',{name,exact:true}).waitFor({timeout:18000});
  check(await viewerPage.getByRole('button',{name:'Add task',exact:true}).count()===0,
    'Viewer cannot see manager task controls');
  await expectStatus('/api/projects/'+id+'/tasks',{
    method:'POST',token:tokens.viewer,
    body:{version:1,title:'Unauthorized',description:'',priority:'normal',dueOn:''},
  },403,'Viewer cannot create task');

  const edited=await expectStatus('/api/projects/'+id,{
    method:'PATCH',token:tokens.admin,
    body:{version:1,name:name+' edited',description:'Version verified',priority:'high',dueOn:''},
  },200,'Manager edits project metadata');
  check(edited.data.updated===true && await version(id)===2,'Metadata must persist and increment version');
  await expectStatus('/api/projects/'+id,{
    method:'PATCH',token:tokens.admin,
    body:{version:1,name:'Stale edit',description:'',priority:'low',dueOn:''},
  },409,'Stale metadata edit cannot overwrite');
  console.log('Acceptance stage 4: role permissions and stale version rejection verified');
  // Two simultaneous manager edits against the SAME current version must serialize safely.
  const attempts=await Promise.all([
    call('/api/projects/'+id,{method:'PATCH',token:tokens.admin,
      body:{version:2,name:'Concurrent A '+key,description:'',priority:'normal',dueOn:''}}),
    call('/api/projects/'+id,{method:'PATCH',token:tokens.admin,
      body:{version:2,name:'Concurrent B '+key,description:'',priority:'normal',dueOn:''}}),
  ]);
  check(attempts.filter(x=>x.status===200).length===1 &&
    attempts.filter(x=>x.status===409).length===1,
    'Concurrent writes must yield exactly one success and one HTTP 409');
  check(await version(id)===3,'Concurrent updates must increment version exactly once');

  console.log('Acceptance stage 5: concurrent writes serialized safely');
  const milestone=await expectStatus('/api/projects/'+id+'/milestones',{
    method:'POST',token:tokens.admin,body:{version:3,title:'Acceptance milestone',dueOn:''},
  },200,'Manager creates milestone');
  const milestoneId=milestone.data?.id;
  check(uuid.test(milestoneId)&&milestone.data.version===4,
    'Milestone creation returns actual ID and version 4');
  const task=await expectStatus('/api/projects/'+id+'/tasks',{
    method:'POST',token:tokens.admin,
    body:{version:4,title:'Acceptance task',description:'Persisted task',
      priority:'high',dueOn:''},
  },200,'Manager creates task');
  const taskId=task.data?.id;
  check(uuid.test(taskId)&&task.data.version===5,'Task creation persisted with version 5');
  await expectStatus('/api/projects/'+id+'/tasks/'+taskId,{
    method:'PATCH',token:tokens.admin,body:{version:4,status:'in_progress'},
  },409,'Task stale version must conflict');
  await expectStatus('/api/projects/'+id+'/tasks/'+taskId,{
    method:'PATCH',token:tokens.viewer,body:{version:5,status:'in_progress'},
  },403,'Viewer status updates blocked');
  for(const [status,current] of [['in_progress',5],['in_review',6],['done',7]]) {
    const reply=await expectStatus('/api/projects/'+id+'/tasks/'+taskId,{
      method:'PATCH',token:tokens.admin,body:{version:current,status},
    },200,'Manager task lifecycle '+status);
    check(reply.data.version===current+1&&reply.data.id===taskId,
      'Task lifecycle has verified entity and next version');
  }
  for(const [status,current] of [['active',8],['done',9]]) {
    const reply=await expectStatus('/api/projects/'+id+'/milestones/'+milestoneId,{
      method:'PATCH',token:tokens.admin,body:{version:current,status},
    },200,'Manager milestone lifecycle '+status);
    check(reply.data.version===current+1&&reply.data.id===milestoneId,
      'Milestone lifecycle has verified entity and next version');
  }
  console.log('Acceptance stage 6: task and milestone transitions completed');
  const persisted=await pool.query(
    'select p.version,t.status task_status,m.status milestone_status from public.projects p '+
    'join public.project_tasks t on t.project_id=p.id and t.id=$2 '+
    'join public.project_milestones m on m.project_id=p.id and m.id=$3 where p.id=$1',
    [id,taskId,milestoneId]
  );
  check(persisted.rowCount===1&&persisted.rows[0].version===10 &&
    persisted.rows[0].task_status==='done'&&persisted.rows[0].milestone_status==='done',
    'Task and milestone lifecycle persisted in native PostgreSQL');
  await adminPage.reload({waitUntil:'domcontentloaded'});
  await adminPage.locator('#tasks').getByText('Acceptance task',{exact:true}).waitFor({timeout:18000});
  await adminPage.locator('#milestones').getByText('Acceptance milestone',{exact:true}).waitFor({timeout:18000});
  check(true,'Browser reload shows persisted task and milestone');

  // Exercise actual client-side forms against real Express and native PostgreSQL,
  // not only manually constructed HTTP calls.
  await adminPage.getByRole('button',{name:'Add private comment',exact:true}).click();
  await adminPage.getByRole('textbox',{name:'Comment',exact:true}).fill('Private acceptance note');
  await adminPage.getByRole('button',{name:'Post private comment',exact:true}).click();
  // The textarea may contain the submitted text before the POST commits.
  // Wait for the form to close and the parent version to refresh instead.
  await adminPage.getByRole('button',{name:'Add private comment',exact:true})
    .waitFor({timeout:18000});
  await adminPage.locator('#delivery').getByText('Private acceptance note',{exact:true})
    .waitFor({timeout:18000});
  await expect(adminPage.getByRole('button',{name:'Add evidence link',exact:true}))
    .toBeEnabled({timeout:18000});
  check(await version(id)===11,'Comment UI write must commit as version 11');
  await adminPage.getByRole('button',{name:'Add evidence link',exact:true}).click();
  await adminPage.getByRole('textbox',{name:'Evidence title',exact:true})
    .fill('Acceptance evidence link');
  await adminPage.getByRole('textbox',{name:'HTTPS evidence URL',exact:true})
    .fill('https://example.com/build-report');
  await adminPage.getByRole('button',{name:'Save evidence link',exact:true}).click();
  await adminPage.getByRole('button',{name:'Add evidence link',exact:true})
    .waitFor({timeout:18000});
  await adminPage.locator('#delivery').getByText('Acceptance evidence link',{exact:true})
    .waitFor({timeout:18000});
  const deliveryStored=await pool.query(
    'select p.version,c.body,c.shared comment_shared,d.title,d.url,d.shared delivery_shared '+
    'from public.projects p join public.project_comments c on c.project_id=p.id '+
    'join public.project_deliverables d on d.project_id=p.id where p.id=$1',
    [id]
  );
  check(deliveryStored.rowCount===1&&deliveryStored.rows[0].version===12 &&
    deliveryStored.rows[0].body==='Private acceptance note' &&
    deliveryStored.rows[0].comment_shared===false &&
    deliveryStored.rows[0].title==='Acceptance evidence link' &&
    deliveryStored.rows[0].url==='https://example.com/build-report' &&
    deliveryStored.rows[0].delivery_shared===false,
    'Real browser comments and evidence remain private and persist with version 12');
  await expectStatus('/api/projects/'+id+'/comments',{
    method:'POST',token:tokens.viewer,body:{version:12,body:'Denied comment'},
  },403,'Viewer cannot post project comment');
  await expectStatus('/api/projects/'+id+'/deliverables',{
    method:'POST',token:tokens.viewer,
    body:{version:12,title:'Denied evidence',url:'https://example.com/denied'},
  },403,'Viewer cannot create delivery evidence');
  await expectStatus('/api/projects/'+id+'/comments',{
    method:'POST',token:tokens.outsider,body:{version:12,body:'Denied outsider comment'},
  },403,'Outsider cannot post project comment');
  await expectStatus('/api/projects/'+id+'/deliverables',{
    method:'POST',token:tokens.admin,
    body:{version:11,title:'Stale evidence',url:'https://example.com/stale'},
  },409,'Stale delivery evidence version conflicts');

  console.log('Acceptance stage 7: browser-posted private comment and HTTPS evidence persisted securely');



  // Stage 8: real internal employee assignment and task-threading against a
  // linked HRMS fixture identity; neither hosted accounts nor production records.
  const staffIdentity=await pool.query(
    "select id from public.profiles where email='staff-desktop@fixture.test'");
  check(staffIdentity.rowCount===1,'Disposable HRMS fixture must have linked employee');
  const staffId=staffIdentity.rows[0].id;
  const staffToken=randomBytes(32).toString('base64url');
  tokens.staff=staffToken;
  await pool.query(
    "insert into public.portal_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '90 minutes')",
    [hashToken(staffToken),staffId]
  );
  const staffDirectory=await expectStatus('/api/projects/'+id+'/workforce', {
    token:tokens.admin
  },404,'Only server-side workforce reads are allowed; no public GET proxy');
  // Browser-rendered directory is obtained using portalApi on the server.
  await adminPage.reload({waitUntil:'domcontentloaded'});
  try {
    await adminPage.getByRole('heading',{name:'Add or update a project contributor',exact:true})
      .waitFor({timeout:12000});
  } catch(error) {
    const response=await fetch('http://127.0.0.1:3100/api/projects/'+id+'/workforce',{
      headers:{Cookie:'vsph.portal.sid='+tokens.admin}
    });
    const workforceJson=await response.json().catch(()=>null);
    const {parseProjectWorkforce}=await import('../src/features/projects/ProjectWorkforceContract.ts');
    console.error('Workforce hydration diagnostic',JSON.stringify({
      backendStatus:response.status,
      parsed:parseProjectWorkforce(workforceJson)!==null,
      responseKeys:workforceJson&&typeof workforceJson==='object'?Object.keys(workforceJson):[],
      staffSamples:workforceJson?.staff?.slice(0,2),
      visible:(await adminPage.locator('#team').innerText().catch(()=>'')).
        slice(0,1200),
    }));
    throw error;
  }
  await adminPage.getByLabel('Eligible employee').selectOption(staffId);
  await adminPage.locator('.project-workforce .project-live-form select').nth(1)
    .selectOption('contributor');
  await adminPage.getByLabel('Team (optional)').fill('Platform');
  await adminPage.getByRole('button',{name:'Save employee access',exact:true}).click();
  await adminPage.locator('.project-workforce-member').getByText('staff desktop',{exact:false})
    .first().waitFor({timeout:18000});
  check(await version(id)===13,'Browser staff assignment increments persisted project version');
  const assignedRow=await pool.query(
    'select role,team,status from public.project_memberships where project_id=$1 and user_id=$2',
    [id,staffId]);
  check(assignedRow.rows[0].role==='contributor'&&assignedRow.rows[0].team==='Platform'&&
    assignedRow.rows[0].status==='active','Browser team assignment persisted');
  await expectStatus('/api/projects/'+id+'/workforce/assign',{
    method:'POST',token:tokens.staff,
    body:{version:13,userId:staffId,role:'contributor',team:'Platform'},
  },403,'Contributor cannot change team assignments');
  await expectStatus('/api/projects/'+id+'/workforce/assign',{
    method:'POST',token:tokens.admin,
    body:{version:13,userId:staffId,role:'manager',team:'Platform'},
  },400,'Browser gateway cannot grant managers via ordinary assignment');

  const delegated=await expectStatus('/api/projects/'+id+'/tasks',{
    method:'POST',token:tokens.admin,
    body:{version:13,title:'Delegated acceptance task',description:'Assigned work',
      priority:'normal',dueOn:''},
  },200,'Manager creates a new assignable task');
  check(delegated.data.version===14&&uuid.test(delegated.data.id),
    'Assignability test task created in PostgreSQL');
  const delegatedId=delegated.data.id;
  await expectStatus('/api/projects/'+id+'/tasks/'+delegatedId+'/assignment',{
    method:'PATCH',token:tokens.outsider,
    body:{version:14,assigneeId:staffId},
  },403,'Outsider cannot assign project task');
  const delegatedAssign=await expectStatus('/api/projects/'+id+'/tasks/'+delegatedId+'/assignment',{
    method:'PATCH',token:tokens.admin,
    body:{version:14,assigneeId:staffId},
  },200,'Manager assigns real task to linked contributor');
  check(delegatedAssign.data.version===15&&delegatedAssign.data.id===delegatedId,
    'Task assignment produces versioned real task');
  const taskRow=await pool.query('select assignee_id from public.project_tasks where id=$1',[delegatedId]);
  check(taskRow.rows[0].assignee_id===staffId,'Task assignee persisted in PostgreSQL');

  const staffPage=await browserPage(staffToken);
  await staffPage.goto('/projects/'+id,{waitUntil:'domcontentloaded'});
  try {
    await staffPage.locator('#projectTitle').waitFor({timeout:12000});
    const actualHeading=await staffPage.locator('#projectTitle').textContent();
    check(typeof actualHeading==='string' && actualHeading.startsWith('Concurrent '),
      'Assigned contributor sees persisted, currently renamed project');
  }catch(error){
    const permission=await pool.query(
      'select public.project_permission($1,$2) role',[staffId,id]);
    const direct=await fetch('http://127.0.0.1:3100/api/projects/'+id,{
      headers:{Cookie:'vsph.portal.sid='+staffToken}
    });
    const detail=await direct.json().catch(()=>null);
    const {parseProjectDetail}=await import('../src/features/projects/ProjectDetailContract.ts');
    console.error('Contributor access diagnostic',JSON.stringify({
      roleInSql:permission.rows[0]?.role,backendStatus:direct.status,
      responseRole:detail?.role,
      decoderValid:parseProjectDetail(detail,id)!==null,
      pageTitle:await staffPage.title(),
      pageText:(await staffPage.locator('body').innerText()).slice(-1000),
      memberships:await pool.query('select role,status from project_memberships where project_id=$1 and user_id=$2',[id,staffId]).then(r=>r.rows),
      links:await pool.query('select status from internal_employee_identity_links where user_id=$1',[staffId]).then(r=>r.rows)
    }));
    throw error;
  }
  await staffPage.getByText('Delegated acceptance task',{exact:true}).first().waitFor({timeout:18000});
  check(await staffPage.getByRole('button',{name:'Save employee access'}).count()===0,
    'Contributor does not see project staffing privileges');

  const backendOtherTask=await pool.query(
    "select t.id from public.project_tasks t where t.project_id<>$1 limit 1",[id]);
  check(backendOtherTask.rowCount===1,'Pre-existing unrelated fixture task required');
  await expectStatus('/api/projects/'+id+'/tasks/'+backendOtherTask.rows[0].id+'/comments',{
    method:'POST',token:tokens.admin,body:{version:15,body:'Cross-project injection'},
  },403,'Task comment gateway prevents cross-project task references');
  // Backend itself must enforce task/project identity. Frontend-only filtering
  // cannot protect direct callers of the existing Express API.
  for(const [segment,body] of [
    ['comments',{version:15,body:'Foreign task direct backend test',
      taskId:backendOtherTask.rows[0].id}],
    ['deliverables',{version:15,title:'Foreign evidence',
      url:'https://example.com/report',taskId:backendOtherTask.rows[0].id}],
  ]) {
    const backendReply=await fetch('http://127.0.0.1:3100/api/projects/'+id+'/'+segment,{
      method:'POST',headers:{
        Cookie:'vsph.portal.sid='+tokens.admin,Origin:api,'Content-Type':'application/json'
      },
      body:JSON.stringify(body),
    });
    check(backendReply.status===403,
      'Direct backend must block cross-project '+segment+' task references');
  }
  check(await version(id)===15,
    'Rejected direct backend cross-project references must not advance project version');

  const commentReply=await expectStatus('/api/projects/'+id+'/tasks/'+delegatedId+'/comments',{
    method:'POST',token:tokens.staff,
    body:{version:15,body:'Contributed private task note'},
  },200,'Assigned contributor posts real private task comment');
  check(commentReply.data.version===16,'Task discussion increments project version');
  const dbComment=await pool.query(
    "select task_id,shared,body from public.project_comments where project_id=$1 and body='Contributed private task note'",
    [id]);
  check(dbComment.rowCount===1&&dbComment.rows[0].task_id===delegatedId&&
    dbComment.rows[0].shared===false,'Task comment persisted only on the proper task, private');

  const contributed=await expectStatus('/api/projects/'+id+'/tasks/'+delegatedId,{
    method:'PATCH',token:tokens.staff,
    body:{version:16,status:'in_progress'},
  },200,'Contributor may change the status of their own assigned task');
  check(contributed.data.version===17,'Assigned contributor task status persisted');
  await expectStatus('/api/projects/'+id+'/workforce/manager-grant',{
    method:'POST',token:tokens.staff,body:{version:17,userId:staffId},
  },403,'Project contributor cannot grant manager authority');
  const granted=await expectStatus('/api/projects/'+id+'/workforce/manager-grant',{
    method:'POST',token:tokens.admin,body:{version:17,userId:staffId},
  },200,'Platform owner appoints manager');
  check(granted.data.version===18,'Owner manager grant committed');
  const revokedManager=await expectStatus('/api/projects/'+id+'/workforce/manager-revoke',{
    method:'POST',token:tokens.admin,body:{version:18,userId:staffId},
  },200,'Platform owner revokes manager authority');
  check(revokedManager.data.version===19,'Manager revoke committed');
  await expectStatus('/api/projects/'+id+'/workforce/remove',{
    method:'POST',token:tokens.admin,body:{version:19,userId:staffId},
  },400,'Cannot remove member who owns unfinished tasks');
  const unassigned=await expectStatus('/api/projects/'+id+'/tasks/'+delegatedId+'/assignment',{
    method:'PATCH',token:tokens.admin,body:{version:19,assigneeId:null},
  },200,'Manager first unassigns unfinished work');
  check(unassigned.data.version===20,'Unassignment increments version');
  const removed=await expectStatus('/api/projects/'+id+'/workforce/remove',{
    method:'POST',token:tokens.admin,body:{version:20,userId:staffId},
  },200,'Manager revokes linked employee access after task reassignment');
  check(removed.data.version===21,'Member removal persisted');
  const revokedStaff=await pool.query(
    'select status from public.project_memberships where project_id=$1 and user_id=$2',
    [id,staffId]);
  check(revokedStaff.rows[0].status==='revoked','Workforce revocation persisted in PostgreSQL');
  await staffPage.reload({waitUntil:'domcontentloaded'});
  await staffPage.getByText('Project details unavailable.',{exact:false})
    .waitFor({timeout:18000});
  await expectStatus('/api/projects/'+id+'/tasks/'+delegatedId+'/comments',{
    method:'POST',token:tokens.staff,body:{version:21,body:'No access now'},
  },403,'Revoked contributor immediately loses task discussion permissions');
  console.log('Acceptance stage 8: browser staff assignment, task delegation/threading and owner manager governance persisted');

  await pool.query("update public.project_memberships set status='revoked' where project_id=$1 and user_id=$2",[id,viewer]);
  await viewerPage.reload({waitUntil:'domcontentloaded'});
  await viewerPage.getByText('Project details unavailable.',{exact:false}).waitFor({timeout:18000});
  check(await viewerPage.getByRole('heading',{name,exact:true}).count()===0,
    'Revoked member immediately loses access in browser');
  await expectStatus('/api/projects/'+id+'/tasks',{
    method:'POST',token:tokens.viewer,
    body:{version:12,title:'After revocation',description:'',priority:'normal',dueOn:''},
  },403,'Revoked member cannot mutate');

  console.log('NATIVE POSTGRESQL FULL-STACK ACCEPTANCE PASSED',JSON.stringify({
    checks:show.checks,projectId:id,taskId,milestoneId,
    evidence:'real Express routes + service RPC + PostgreSQL + Next.js',
    liveServicesUsed:false,realSupabaseAuthTested:false,
  }));
} finally {
  if(browser) await browser.close();
  await pool.end();
}
