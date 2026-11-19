/**
 * Isolated production HTTP smoke for the Projects write gateway.
 * In-process fake backend + production Next.js server; no real credentials,
 * live databases or external services.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

const appPort = 47045;
const publicOrigin = 'http://127.0.0.1:' + appPort;
const id = '11111111-1111-4111-8111-111111111111';
const taskId = '22222222-2222-4222-8222-222222222222';
const milestoneId = '33333333-3333-4333-8333-333333333333';
const commentId = '44444444-4444-4444-8444-444444444444';
const deliverableId = '55555555-5555-4555-8555-555555555555';
const fakeSid = 'a'.repeat(48);
const requests = [];
const backend = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  const parsed = raw ? JSON.parse(raw) : null;
  requests.push({ path: req.url, method: req.method, origin: req.headers.origin,
    cookie: req.headers.cookie, body: parsed });
  const respond = (status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  if (req.headers.origin !== publicOrigin || req.headers.cookie !== 'vsph.portal.sid=' + fakeSid) {
    respond(403, { message: 'Mock rejected origin/session' });
  } else if (req.url === '/api/projects' && req.method === 'POST') {
    respond(201, { id, key: parsed.key });
  } else if (req.url === '/api/projects/' + id && req.method === 'PATCH') {
    respond(parsed.version === 3 ? 409 : 200,
      parsed.version === 3 ? { message: 'Conflict' } : { id });
  } else if (req.url === '/api/projects/' + id + '/tasks' && req.method === 'POST') {
    respond(200, parsed.title === 'bad-backend-result' ?
      {id:'not-a-uuid',version:parsed.version+1} : {id:taskId,version:parsed.version+1});
  } else if (req.url === '/api/projects/' + id + '/milestones' && req.method === 'POST') {
    respond(200, {id:milestoneId,version:parsed.version+1});
  } else if (req.url === '/api/projects/' + id + '/comments' && req.method === 'POST') {
    respond(200, {id:commentId,version:parsed.version+1});
  } else if (req.url === '/api/projects/' + id + '/deliverables' && req.method === 'POST') {
    respond(200, {id:deliverableId,version:parsed.version+1});
  } else if (req.url === '/api/projects/' + id + '/tasks/' + taskId && req.method === 'PATCH') {
    respond(parsed.version === 3 ? 409 : 200,
      parsed.version === 3 ? {message:'Conflict'} : {id:taskId,version:parsed.version+1});
  } else if (req.url === '/api/projects/' + id + '/milestones/' + milestoneId && req.method === 'PATCH') {
    respond(parsed.version === 3 ? 409 : 200,
      parsed.version === 3 ? {message:'Conflict'} : {id:milestoneId,version:parsed.version+1});
  } else respond(404, { message: 'Unknown mock route' });
});
await new Promise((resolve, reject) => {
  backend.once('error', reject);
  backend.listen(0, '127.0.0.1', resolve);
});
const address = backend.address();
assert.ok(address && typeof address !== 'string');
const backendOrigin = 'http://127.0.0.1:' + address.port;
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(appPort)], {
  env: { ...process.env, NODE_ENV: 'production', VSPH_PUBLIC_ORIGIN: publicOrigin,
    VSPH_INTERNAL_API_ORIGIN: backendOrigin },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
next.stdout.on('data', b => { output += b.toString(); });
next.stderr.on('data', b => { output += b.toString(); });

async function request(path, { method = 'GET', origin = publicOrigin, body, cookie = fakeSid } = {}) {
  const headers = {};
  if (method !== 'GET') {
    headers.Origin = origin;
    headers['Content-Type'] = 'application/json';
    headers['Sec-Fetch-Site'] = 'same-origin';
    if (cookie) headers.Cookie = 'vsph.portal.sid=' + cookie;
  }
  const response = await fetch(publicOrigin + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual',
  });
  const text = await response.text();
  let parsed = null;
  if (text) { try { parsed = JSON.parse(text); } catch { parsed = text; } }
  return { status: response.status, headers: response.headers, body: parsed };
}
const create = { key: 'TEST-PROJECT', name: 'Sample', description: '',
  kind: 'internal', priority: 'normal', startsOn: '', dueOn: '' };
const edit = { version: 4, name: 'Renamed', description: '', priority: 'normal', dueOn: '' };
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (next.exitCode !== null) throw Error('Next exited: ' + output);
    try {
      const check = await fetch(publicOrigin + '/login');
      if (check.status === 200) { ready = true; break; }
    } catch { /* Next not listening yet */ }
    await sleep(200);
  }
  assert.ok(ready, 'Next did not start: ' + output);
  assert.equal((await request('/__preview/workspace')).status, 404);

  // The client cannot create with a missing session, wrong Origin, invalid shape or oversized body.
  assert.equal((await request('/api/projects', { method: 'POST', body: create, cookie: null })).status, 401);
  assert.equal((await request('/api/projects', { method: 'POST', body: create,
    origin: 'https://attacker.invalid' })).status, 403);
  assert.equal((await request('/api/projects', { method: 'POST', body: { ...create,
    customerOrganizationId: id } })).status, 400);
  assert.equal((await request('/api/projects', { method: 'POST', body: { ...create,
    description: 'x'.repeat(10000) } })).status, 413);
  assert.equal(requests.length, 0, 'Rejected requests must not reach upstream');

  const made = await request('/api/projects', { method: 'POST', body: create });
  assert.equal(made.status, 201);
  assert.deepEqual(made.body, { id });
  assert.match(made.headers.get('cache-control') || '', /no-store/);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], { path: '/api/projects', method: 'POST',
    origin: publicOrigin, cookie: 'vsph.portal.sid=' + fakeSid, body: create });

  assert.equal((await request('/api/projects/' + id, { method: 'PATCH',
    body: { ...edit, ownerId: id } })).status, 400);
  assert.equal((await request('/api/projects/' + id, { method: 'PATCH',
    body: { ...edit, version: 3 } })).status, 409);
  const edited = await request('/api/projects/' + id, { method: 'PATCH', body: edit });
  assert.equal(edited.status, 200);
  assert.deepEqual(edited.body, { updated: true });
  assert.equal(requests.length, 3);
  assert.equal(requests[2].body.version, 4);
  const task = {version:4,title:'Implement billing',description:'Internal only',
    priority:'normal',dueOn:''};
  const milestone = {version:4,title:'MVP ready',dueOn:'2026-12-05'};
  const status = {version:4,status:'in_progress'};
  const beforeWork = requests.length;
  assert.equal((await request('/api/projects/'+id+'/tasks', {
    method:'POST',body:task,cookie:null,
  })).status,401);
  assert.equal((await request('/api/projects/'+id+'/tasks', {
    method:'POST',body:task,origin:'https://outside.invalid',
  })).status,403);
  assert.equal((await request('/api/projects/'+id+'/tasks', {
    method:'POST',body:{...task,shared:true},
  })).status,400);
  assert.equal((await request('/api/projects/'+id+'/tasks', {
    method:'POST',body:{...task,description:'x'.repeat(10000)},
  })).status,413);
  assert.equal((await request('/api/projects/'+id+'/tasks/invalid', {
    method:'PATCH',body:status,
  })).status,400);
  assert.equal(requests.length,beforeWork,'Invalid work mutations must not reach the backend');
  const addedTask=await request('/api/projects/'+id+'/tasks',{method:'POST',body:task});
  assert.equal(addedTask.status,200);
  assert.deepEqual(addedTask.body,{id:taskId,version:5});
  assert.deepEqual(requests[beforeWork],{
    path:'/api/projects/'+id+'/tasks',method:'POST',origin:publicOrigin,
    cookie:'vsph.portal.sid='+fakeSid,body:task,
  });
  const addedMilestone=await request('/api/projects/'+id+'/milestones',{
    method:'POST',body:milestone,
  });
  assert.equal(addedMilestone.status,200);
  assert.deepEqual(addedMilestone.body,{id:milestoneId,version:5});
  assert.equal((await request('/api/projects/'+id+'/tasks/'+taskId,{
    method:'PATCH',body:{version:3,status:'done'},
  })).status,409);
  const movedTask=await request('/api/projects/'+id+'/tasks/'+taskId,{
    method:'PATCH',body:status,
  });
  assert.equal(movedTask.status,200);
  assert.deepEqual(movedTask.body,{id:taskId,version:5});
  assert.equal((await request('/api/projects/'+id+'/milestones/'+milestoneId,{
    method:'PATCH',body:{version:4,status:'blocked'},
  })).status,400);
  const movedMilestone=await request('/api/projects/'+id+'/milestones/'+milestoneId,{
    method:'PATCH',body:{version:4,status:'active'},
  });
  assert.equal(movedMilestone.status,200);
  assert.deepEqual(movedMilestone.body,{id:milestoneId,version:5});
  const brokenBackend=await request('/api/projects/'+id+'/tasks',{
    method:'POST',body:{...task,title:'bad-backend-result'},
  });
  assert.equal(brokenBackend.status,502,'Malformed upstream success must not be reported as success');
  assert.equal(requests.length,beforeWork+6);
  const commentsPath='/api/projects/'+id+'/comments';
  const deliverablesPath='/api/projects/'+id+'/deliverables';
  const comment={version:4,body:'Private delivery approval'};
  const evidence={version:5,title:'Build report',url:'https://example.com/report'};
  for(const [path,body] of [[commentsPath,comment],[deliverablesPath,evidence]]) {
    assert.equal((await request(path,{method:'POST',body,cookie:null})).status,401);
    assert.equal((await request(path,{method:'POST',body,
      origin:'https://attacker.invalid'})).status,403);
    assert.equal((await request(path,{method:'POST',body:{...body,shared:true}})).status,400);
  }
  assert.equal((await request(deliverablesPath,{method:'POST',body:{
    ...evidence,url:'http://untrusted.invalid'}})).status,400);
  assert.equal((await request(commentsPath,{method:'POST',body:{
    ...comment,body:'x'.repeat(10000)}})).status,413);
  assert.equal(requests.length,beforeWork+6,'Denied delivery requests must not reach backend');
  const privateComment=await request(commentsPath,{method:'POST',body:comment});
  assert.equal(privateComment.status,200);
  assert.deepEqual(privateComment.body,{id:commentId,version:5});
  assert.deepEqual(requests.at(-1),{
    path:'/api/projects/'+id+'/comments',method:'POST',origin:publicOrigin,
    cookie:'vsph.portal.sid='+fakeSid,body:comment,
  });
  const deliveryEvidence=await request(deliverablesPath,{method:'POST',body:evidence});
  assert.equal(deliveryEvidence.status,200);
  assert.deepEqual(deliveryEvidence.body,{id:deliverableId,version:6});
  assert.deepEqual(requests.at(-1),{
    path:'/api/projects/'+id+'/deliverables',method:'POST',origin:publicOrigin,
    cookie:'vsph.portal.sid='+fakeSid,body:evidence,
  });
  console.log('Private comment/evidence gateway smoke passed (401/403/400/413/200).');
  console.log('Projects write gateway production HTTP smoke passed (origin, cookie, schema, size, 201/409/200).');
  console.log('Task/milestone gateway HTTP smoke passed (200/400/401/403/409/413/502 and version guard).');
} finally {
  next.kill('SIGTERM');
  backend.close();
  if (next.exitCode === null) {
    await Promise.race([once(next, 'exit').catch(() => {}), sleep(3000)]);
    if (next.exitCode === null) next.kill('SIGKILL');
  }
}
