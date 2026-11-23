/** Owner-only durable provisioning queue, with generation-fenced actions. */
export type ProvisioningJob=Readonly<{
  id:string;organizationId:string;state:string;createdAt:string;
  invitationId:string;email:string;invitationState:string;
  generation:number;expiresAt:string;attempts:number;failureCode:string|null;
}>;
export type RecoveryAction='retry'|'revoke'|'recover'|'reissue';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(x:unknown):x is Record<string,unknown>=>
  x!==null&&typeof x==='object'&&!Array.isArray(x);
const validStamp=(x:unknown):x is string=>
 typeof x==='string'&&x.length<=60&&!Number.isNaN(Date.parse(x));
const state=(x:unknown):x is string=>
 typeof x==='string'&&/^[a-z][a-z_]{0,39}$/.test(x);
export function parseProvisioningJobs(input:unknown):ProvisioningJob[]|null{
 if(!Array.isArray(input)||input.length>100)return null;
 const jobs:ProvisioningJob[]=[],ids=new Set<string>();
 for(const row of input){
   if(!obj(row)||typeof row.id!=='string'||!UUID.test(row.id)||
     typeof row.organization_id!=='string'||!UUID.test(row.organization_id)||
     typeof row.invitation_id!=='string'||!UUID.test(row.invitation_id)||
     ids.has(row.invitation_id.toLowerCase())||
     !state(row.state)||!state(row.invitation_state)||
     !validStamp(row.created_at)||!validStamp(row.expires_at)||
     typeof row.email!=='string'||row.email.length>190||
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)||
     !Number.isSafeInteger(row.generation)||(row.generation as number)<1||
     !Number.isSafeInteger(row.attempts)||(row.attempts as number)<0||
     !(row.failure_code===null||
       (typeof row.failure_code==='string'&&/^[a-z0-9._-]{1,100}$/i.test(row.failure_code))))
     return null;
   ids.add(row.invitation_id.toLowerCase());
   jobs.push({
     id:row.id,organizationId:row.organization_id,
     state:row.state,createdAt:row.created_at,
     invitationId:row.invitation_id,email:row.email,
     invitationState:row.invitation_state,
     generation:row.generation as number,expiresAt:row.expires_at,
     attempts:row.attempts as number,failureCode:row.failure_code as string|null
   });
 }
 return jobs;
}
/** Pure UX guidance; database state and permission checks remain authoritative. */
export function permittedRecoveryActions(job:ProvisioningJob,at=Date.now()):RecoveryAction[]{
 if(['accepted'].includes(job.invitationState))return [];
 const available:RecoveryAction[]=[];
 const expired=Date.parse(job.expiresAt)<=at;
 if(job.invitationState==='pending_delivery'&&!expired)available.push('retry');
 if(!['revoked','accepting'].includes(job.invitationState))available.push('revoke');
 if(['pending_delivery','sent','revoked'].includes(job.invitationState))
   available.push('reissue');
 if(['requires_attention','accepting'].includes(job.invitationState))
   available.push('recover');
 return available;
}
export function parseRecoveryCommand(action:string,value:unknown):{
  generation:number;reconciled:boolean;
}|null{
 if(!['retry','revoke','recover','reissue'].includes(action)||!obj(value)||
   Object.keys(value).length!==2||
   !Object.hasOwn(value,'generation')||!Object.hasOwn(value,'reconciled')||
   !Number.isSafeInteger(value.generation)||(value.generation as number)<1||
   (value.generation as number)>2147483647||
   typeof value.reconciled!=='boolean'||
   (action==='recover'?value.reconciled!==true:value.reconciled!==false))
   return null;
 return {generation:value.generation as number,reconciled:value.reconciled as boolean};
}
export const validProvisioningId=(x:unknown):x is string=>
 typeof x==='string'&&UUID.test(x);
