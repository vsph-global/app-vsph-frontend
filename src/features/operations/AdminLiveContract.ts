/** Owner-only platform administration projections; no raw audit details or secrets. */
export type AdminOverview = Readonly<{
  organizations:number;users:number;applications:number;
  activeSubscriptions:number;enabledAppAccess:number;
}>;
export type AuditEntry = Readonly<{
 id:string;action:string;targetType:string;targetId:string;
 actorName:string|null;organizationName:string|null;createdAt:string;
}>;
const obj=(value:unknown):value is Record<string,unknown>=>
 value!==null&&typeof value==='object'&&!Array.isArray(value);
const count=(value:unknown):value is number=>
 Number.isSafeInteger(value)&&(value as number)>=0;
const safe=(value:unknown,max:number):value is string=>
 typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f\u007f]/.test(value);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseAdminOverview(value:unknown):AdminOverview|null{
 if(!obj(value))return null;
 const fields=['organizations','users','applications','activeSubscriptions','enabledAppAccess'] as const;
 if(fields.some(field=>!count(value[field])))return null;
 return {
   organizations:value.organizations as number,users:value.users as number,
   applications:value.applications as number,
   activeSubscriptions:value.activeSubscriptions as number,
   enabledAppAccess:value.enabledAppAccess as number
 };
}
export function parseAdminAudit(value:unknown):AuditEntry[]|null{
 if(!obj(value)||!Array.isArray(value.logs)||value.logs.length>200)return null;
 const seen=new Set<string>(),logs:AuditEntry[]=[];
 for(const entry of value.logs){
   if(!obj(entry)||typeof entry.id!=='string'||!uuid.test(entry.id)||
     seen.has(entry.id.toLowerCase())||!safe(entry.action,120)||
     !safe(entry.target_type,120)||!safe(entry.target_id,200)||
     !(entry.actor_name===null||entry.actor_name===undefined||safe(entry.actor_name,150))||
     !(entry.organization_name===null||entry.organization_name===undefined||
       safe(entry.organization_name,150))||
     typeof entry.created_at!=='string'||Number.isNaN(Date.parse(entry.created_at)))
     return null;
   seen.add(entry.id.toLowerCase());
   logs.push({
     id:entry.id,action:entry.action,targetType:entry.target_type,
     targetId:entry.target_id,createdAt:entry.created_at,
     actorName:typeof entry.actor_name==='string'?entry.actor_name:null,
     organizationName:typeof entry.organization_name==='string'?entry.organization_name:null
   });
 }
 return logs;
}
