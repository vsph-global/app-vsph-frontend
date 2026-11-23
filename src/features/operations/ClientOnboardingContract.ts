/** Mirrors the backend's exact five-field governed customer onboarding contract. */
export type CatalogProduct=Readonly<{id:string;name:string;code:string}>;
export type SubscriptionChoice=Readonly<{
 applicationId:string;planCode:string;status:'active'|'trial';endsAt:string|null;
}>;
export type ClientOnboardingPayload=Readonly<{
 organizationName:string;slug:string;adminName:string;adminEmail:string;
 products:SubscriptionChoice[];
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object=(x:unknown):x is Record<string,unknown>=>
 x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(r:Record<string,unknown>,keys:string[])=>
 Object.keys(r).length===keys.length&&keys.every(k=>Object.hasOwn(r,k));
const safe=(v:unknown,max:number):v is string=>
 typeof v==='string'&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
export function parseOnboardingCatalog(value:unknown):CatalogProduct[]|null{
 if(!object(value)||!Array.isArray(value.applications)||
   value.applications.length>200)return null;
 const seen=new Set<string>(),products:CatalogProduct[]=[];
 for(const row of value.applications){
   if(!object(row)||!uuid(row.id)||seen.has(row.id.toLowerCase())||
     !safe(row.name,150)||!row.name.trim()||
     typeof row.code!=='string'||!/^[A-Z][A-Z0-9_]{1,39}$/.test(row.code)||
     row.status!=='active')return null;
   seen.add(row.id.toLowerCase());
   products.push({id:row.id,name:row.name,code:row.code});
 }
 return products;
}
export function parseClientOnboarding(value:unknown,now=Date.now()):
  ClientOnboardingPayload|null{
 if(!object(value)||!exact(value,[
   'organizationName','slug','adminName','adminEmail','products'
 ])||!safe(value.organizationName,150)||value.organizationName.trim().length<2||
   typeof value.slug!=='string'||value.slug.length>160||
   !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)||
   !safe(value.adminName,150)||value.adminName.trim().length<2||
   !safe(value.adminEmail,190)||
   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.adminEmail)||
   !Array.isArray(value.products)||value.products.length>12)return null;
 const seen=new Set<string>(),products:SubscriptionChoice[]=[];
 for(const row of value.products){
   if(!object(row)||!exact(row,['applicationId','planCode','status','endsAt'])||
     !uuid(row.applicationId)||seen.has(row.applicationId.toLowerCase())||
     typeof row.planCode!=='string'||!/^[a-z0-9][a-z0-9_-]{0,59}$/.test(row.planCode)||
     !['active','trial'].includes(String(row.status))||
     !(row.endsAt===null||
       (typeof row.endsAt==='string'&&
       /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(row.endsAt)&&
       !Number.isNaN(Date.parse(row.endsAt))&&Date.parse(row.endsAt)>now))||
     (row.status==='trial'&&row.endsAt===null))return null;
   seen.add(row.applicationId.toLowerCase());
   products.push({
     applicationId:row.applicationId,planCode:row.planCode,
     status:row.status as SubscriptionChoice['status'],endsAt:row.endsAt as string|null
   });
 }
 return {
   organizationName:value.organizationName.trim(),slug:value.slug,
   adminName:value.adminName.trim(),adminEmail:value.adminEmail.trim().toLowerCase(),
   products
 };
}
export function parseExistingOnboardingRequest(value:unknown):
 {found:false}|{found:true;id:string;organizationName:string;slug:string;state:string}|null{
 if(!object(value)||typeof value.found!=='boolean')return null;
 if(value.found===false)return {found:false};
 if(!uuid(value.id)||!safe(value.organizationName,150)||!value.organizationName.trim()||
   typeof value.slug!=='string'||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug))||
   typeof value.state!=='string'||!(/^[a-z][a-z_]{0,39}$/.test(value.state)))
   return null;
 return {found:true,id:value.id,organizationName:value.organizationName,
   slug:value.slug,state:value.state};
}
export const validOnboardingKey=(value:unknown):value is string=>uuid(value);
