/** Platform owner view of customer-scoped application roles, never platform elevation. */
export type PermissionMember=Readonly<{
 userId:string;name:string;email:string;status:string;accountStatus:string;
 version:number;
}>;
export type PermissionProduct=Readonly<{
 id:string;code:string;name:string;status:string;accessStatus:string;
 supportedRoles:string[];
}>;
export type PermissionGrant=Readonly<{
 userId:string;applicationId:string;role:string;
}>;
export type PermissionContext=Readonly<{
 id:string;name:string;status:string;
 members:PermissionMember[];products:PermissionProduct[];
 grants:PermissionGrant[];
}>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj=(x:unknown):x is Record<string,unknown>=>
 x!==null&&typeof x==='object'&&!Array.isArray(x);
const safe=(x:unknown,n:number):x is string=>
 typeof x==='string'&&x.length<=n&&!/[\u0000-\u001f\u007f]/.test(x);
export const validPermissionId=(x:unknown):x is string=>typeof x==='string'&&uuid.test(x);
export const supportedGrantRole=(x:unknown):x is string=>typeof x==='string'&&
 ['super_admin','admin','manager','user','viewer','staff','musician'].includes(x);
export function parsePermissionContext(value:unknown):PermissionContext|null{
 if(!obj(value)||!obj(value.organization)||!Array.isArray(value.members)||
   !Array.isArray(value.products)||!Array.isArray(value.roles)||
   value.members.length>200||value.products.length>100||value.roles.length>500)return null;
 const o=value.organization;
 if(!validPermissionId(o.id)||!safe(o.name,150)||!o.name.trim()||
   !['active','suspended','closed'].includes(String(o.status)))return null;
 const members:PermissionMember[]=[],products:PermissionProduct[]=[],grants:PermissionGrant[]=[];
 const memberIds=new Set<string>(),appIds=new Set<string>(),pairs=new Set<string>();
 for(const m of value.members){
   if(!obj(m)||!validPermissionId(m.user_id)||memberIds.has(m.user_id.toLowerCase())||
     !safe(m.full_name,150)||!safe(m.email,190)||
     !['active','suspended','invited'].includes(String(m.status))||
     !safe(m.account_status,40)||!Number.isSafeInteger(m.version)||
     (m.version as number)<1)return null;
   memberIds.add(m.user_id.toLowerCase());
   members.push({userId:m.user_id,name:m.full_name,email:m.email,
     status:String(m.status),accountStatus:m.account_status,version:m.version as number});
 }
 for(const p of value.products){
   if(!obj(p)||!validPermissionId(p.id)||appIds.has(p.id.toLowerCase())||
     !safe(p.code,40)||!safe(p.name,150)||!safe(p.status,40)||
     !safe(p.access_status,40)||!(p.roles===null||Array.isArray(p.roles))||
     (Array.isArray(p.roles)&&(p.roles.length>20||
       p.roles.some((r:unknown)=>!supportedGrantRole(r)))))return null;
   const roles=[...new Set((p.roles||[]) as string[])];
   appIds.add(p.id.toLowerCase());
   products.push({id:p.id,code:p.code,name:p.name,
     status:p.status,accessStatus:p.access_status,supportedRoles:roles});
 }
 for(const g of value.roles){
   if(!obj(g)||!validPermissionId(g.user_id)||
     !validPermissionId(g.application_id)||!supportedGrantRole(g.role_code))return null;
   const key=g.user_id.toLowerCase()+'|'+g.application_id.toLowerCase();
   if(pairs.has(key))return null;
   pairs.add(key);
   grants.push({userId:g.user_id,applicationId:g.application_id,role:g.role_code});
 }
 return {id:o.id,name:o.name,status:String(o.status),members,products,grants};
}
export type RoleChange=Readonly<{
 userId:string;applicationId:string;version:number;role:string;
}>;
export function parseRoleChange(value:unknown):RoleChange|null{
 if(!obj(value)||Object.keys(value).length!==4||
   !['userId','applicationId','version','role'].every(k=>Object.hasOwn(value,k))||
   !validPermissionId(value.userId)||!validPermissionId(value.applicationId)||
   !Number.isSafeInteger(value.version)||(value.version as number)<1||
   (value.version as number)>2147483646||
   !(value.role===''||supportedGrantRole(value.role)))return null;
 return {userId:value.userId,applicationId:value.applicationId,
   version:value.version as number,role:value.role as string};
}
