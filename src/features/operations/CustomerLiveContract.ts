/** Owner-authorized organization directory and detail projections. */
export type CustomerRow=Readonly<{
 id:string;name:string;slug:string;status:'active'|'suspended'|'closed';
}>;
export type CustomerMember=Readonly<{
 userId:string;name:string;email:string;
 role:'owner'|'admin'|'member'|'viewer';
 status:'active'|'suspended'|'invited';
 accountStatus:string;version:number;
}>;
export type CustomerProduct=Readonly<{
 id:string;code:string;name:string;status:string;accessStatus:string;
 planCode:string|null;subscriptionStatus:string|null;
}>;
export type CustomerDetail=Readonly<{
 organization:CustomerRow;members:CustomerMember[];products:CustomerProduct[];
 invitationCount:number;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses=new Set(['active','suspended','closed']);
const roles=new Set(['owner','admin','member','viewer']);
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&
 typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
function customer(v:unknown):CustomerRow|null{
 if(!object(v)||!uuid(v.id)||typeof v.name!=='string'||!v.name.trim()||
   v.name.length>150||typeof v.slug!=='string'||v.slug.length>150||
   typeof v.status!=='string'||!statuses.has(v.status))return null;
 return {id:v.id,name:v.name,slug:v.slug,
   status:v.status as CustomerRow['status']};
}
export function parseCustomerList(value:unknown):{rows:CustomerRow[];nextId:string|null}|null{
 if(!Array.isArray(value)||value.length>100)return null;
 const seen=new Set<string>(),rows:CustomerRow[]=[];
 for(const entry of value){
   const row=customer(entry);
   if(!row||seen.has(row.id.toLowerCase()))return null;
   seen.add(row.id.toLowerCase());rows.push(row);
 }
 return {rows,nextId:rows.length===100?rows[rows.length-1].id:null};
}
export function parseCustomerDetail(value:unknown):CustomerDetail|null{
 if(!object(value)||!object(value.organization)||!Array.isArray(value.members)||
   !Array.isArray(value.products)||!Array.isArray(value.invitations)||
   value.members.length>200||value.products.length>100||
   value.invitations.length>100)return null;
 const organization=customer(value.organization);
 if(!organization)return null;
 const memberIds=new Set<string>(),members:CustomerMember[]=[];
 for(const m of value.members){
   if(!object(m)||!uuid(m.user_id)||memberIds.has(m.user_id.toLowerCase())||
     typeof m.full_name!=='string'||m.full_name.length>150||
     typeof m.email!=='string'||m.email.length>190||
     !roles.has(String(m.role))||!['active','suspended','invited'].includes(String(m.status))||
     typeof m.account_status!=='string'||m.account_status.length>40||
     !Number.isSafeInteger(m.version)||(m.version as number)<1)return null;
   memberIds.add(m.user_id.toLowerCase());
   members.push({userId:m.user_id,name:m.full_name,email:m.email,
     role:m.role as CustomerMember['role'],
     status:m.status as CustomerMember['status'],
     accountStatus:m.account_status,version:m.version as number});
 }
 const productIds=new Set<string>(),products:CustomerProduct[]=[];
 for(const p of value.products){
   if(!object(p)||!uuid(p.id)||productIds.has(p.id.toLowerCase())||
     typeof p.code!=='string'||p.code.length>40||
     typeof p.name!=='string'||p.name.length>150||
     typeof p.status!=='string'||p.status.length>40||
     typeof p.access_status!=='string'||p.access_status.length>40||
     !(p.plan_code===null||(typeof p.plan_code==='string'&&p.plan_code.length<=80))||
     !(p.subscription_status===null||
       (typeof p.subscription_status==='string'&&p.subscription_status.length<=40)))return null;
   productIds.add(p.id.toLowerCase());
   products.push({id:p.id,code:p.code,name:p.name,status:p.status,
     accessStatus:p.access_status,planCode:p.plan_code as string|null,
     subscriptionStatus:p.subscription_status as string|null});
 }
 return {organization,members,products,invitationCount:value.invitations.length};
}
