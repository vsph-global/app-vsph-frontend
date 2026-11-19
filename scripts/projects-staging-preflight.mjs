#!/usr/bin/env node
/**
 * Read-only hosted staging preflight. Never sends mutations, refuses production.
 *
 * STAGING_FRONTEND_ORIGIN=https://staging.example.com
 * STAGING_HOST_APPROVED=staging.example.com
 * Optional STAGING_PROJECT_ID plus STAGING_PORTAL_SESSION (ephemeral).
 */
import assert from 'node:assert/strict';
const origin=process.env.STAGING_FRONTEND_ORIGIN;
const host=process.env.STAGING_HOST_APPROVED;
assert.ok(origin && host,'Supply both staging origin and approved host.');
const url=new URL(origin);
assert.equal(url.protocol,'https:','Staging must use HTTPS');
assert.equal(url.origin,origin,'Exact origin required, with no path or query');
assert.equal(url.username,'');
assert.equal(url.password,'');
assert.equal(url.hostname,host,'Approved host mismatch');
assert.match(url.hostname,/(?:^|[.-])(staging|preview|sandbox|test)(?:[.-]|$)/i);
assert.ok(!/(?:^|[.-])(?:prod|production)(?:[.-]|$)/i.test(url.hostname));
const id=process.env.STAGING_PROJECT_ID, sid=process.env.STAGING_PORTAL_SESSION;
assert.equal(Boolean(id),Boolean(sid),'Provide both project ID and cookie, or neither.');
if(id)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
if(sid)assert.match(sid,/^[A-Za-z0-9_-]{32,128}$/);
async function get(path,session){
 const r=await fetch(origin+path,{
   method:'GET',redirect:'manual',cache:'no-store',
   headers:session?{Cookie:'vsph.portal.sid='+session}:{},
   signal:AbortSignal.timeout(12000),
 });
 return {status:r.status,location:r.headers.get('location')||''};
}
assert.equal((await get('/login')).status,200,'Staging login unavailable');
const anonymous=await get('/projects');
assert.ok([301,302,303,307,308].includes(anonymous.status)&&
  /\/login(?:$|[?#])/.test(anonymous.location),'Unauthenticated Projects must redirect to login');
assert.equal((await get('/__preview/workspace')).status,404,'Preview route must remain isolated');
if(id)assert.equal((await get('/projects/'+id,sid)).status,200,
 'Authenticated project route HTTP status must be 200 (does not prove hydration)');
console.log('READ-ONLY STAGING HTTP PREFLIGHT PASSED',JSON.stringify({
 host:url.hostname,login:true,anonymousRedirect:true,preview404:true,
 authenticatedRouteStatusOnly:Boolean(id),mutations:0,
 limitations:'Real data, roles, hydration, transactions and hosted Supabase remain unverified.',
}));
