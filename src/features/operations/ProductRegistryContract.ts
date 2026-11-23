/** Fixed owner-only product registry projection. Never forward secrets or raw observations. */
export type ProductState='active'|'disabled'|'maintenance'|'retired';
export type ProductVisibility='listed'|'unlisted';
export type IntegrationMode='adapter'|'portal_only';
export type ProductReadiness=Readonly<{
 state:'unavailable'|'degraded'|'configured'|'reachable';
 configured:boolean;verified:false;reachable:boolean|null;scope:string;reason:string;
}>;
export type ProductRow=Readonly<{
 id:string;code:string;name:string;loginPath:string;status:ProductState;version:number;
 description:string;ownerId:string|null;ownerName:string|null;
 supportEmail:string;docsUrl:string;visibility:ProductVisibility;
 integrationMode:IntegrationMode;readiness:ProductReadiness;
 observedAt:string|null;lastObservedState:string|null;
}>;
export type ProductCommand=Readonly<{
 code:string;name:string;loginPath:string;status:ProductState;
 visibility:ProductVisibility;integrationMode:IntegrationMode;
 description:string;ownerId:string;supportEmail:string;docsUrl:string;
 version?:number;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE=/^[A-Z][A-Z0-9_]{1,39}$/;
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&
 typeof x==='object'&&!Array.isArray(x);
const text=(x:unknown,n:number):x is string=>typeof x==='string'&&
 x.length<=n&&!/[\u0000-\u001f\u007f]/.test(x);
export const productUuid=(x:unknown):x is string=>typeof x==='string'&&UUID.test(x);
export const productCode=(x:unknown):x is string=>typeof x==='string'&&CODE.test(x);
const state=(x:unknown):x is ProductState=>
 ['active','disabled','maintenance','retired'].includes(String(x));
const visibility=(x:unknown):x is ProductVisibility=>
 x==='listed'||x==='unlisted';
const mode=(x:unknown):x is IntegrationMode=>
 x==='adapter'||x==='portal_only';
const date=(x:unknown)=>typeof x==='string'&&!Number.isNaN(Date.parse(x));
const email=(x:unknown)=>text(x,190)&&(x===''||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
function validDocs(value:unknown){
 if(!text(value,1000))return false;
 if(value==='')return true;
 try{
   const url=new URL(value);
   return url.protocol==='https:'&&!url.username&&!url.password&&
     !url.hash&&!url.search&&!!url.hostname&&url.toString().startsWith('https://');
 }catch{return false;}
}
function readiness(value:unknown):ProductReadiness|null{
 if(!obj(value)||!['unavailable','degraded','configured','reachable'].includes(String(value.state))||
   typeof value.configured!=='boolean'||value.verified!==false||
   !(value.reachable===null||typeof value.reachable==='boolean')||
   !text(value.scope,200)||!text(value.reason,500))return null;
 return {state:value.state as ProductReadiness['state'],configured:value.configured,
   verified:false,reachable:value.reachable as boolean|null,
   scope:value.scope as string,reason:value.reason as string};
}
export function parseProduct(value:unknown):ProductRow|null{
 if(!obj(value)||!productUuid(value.id)||!productCode(value.code)||
   !text(value.name,150)||!value.name.trim()||
   value.login_path!=='/apps/'+value.code.toLowerCase()+'/login'||
   !state(value.status)||!Number.isSafeInteger(value.version)||
   (value.version as number)<1||!text(value.description,2000)||
   !(value.owner_id===null||productUuid(value.owner_id))||
   !(value.owner_name===null||text(value.owner_name,150))||
   !(value.support_email===null||email(value.support_email))||
   !(value.docs_url===null||validDocs(value.docs_url))||
   !visibility(value.visibility)||!mode(value.integration_mode)||
   !(value.health_observed_at===null||date(value.health_observed_at)))return null;
 const health=readiness(value.readiness);
 if(!health)return null;
 let observed:string|null=null;
 if(value.latest_health!==null){
   if(!obj(value.latest_health)||!['unavailable','degraded','configured','reachable'].includes(String(value.latest_health.state)))
     return null;
   observed=value.latest_health.state as string;
 }
 return {
   id:value.id,code:value.code,name:value.name,loginPath:value.login_path,
   status:value.status,version:value.version as number,
   description:value.description,ownerId:value.owner_id as string|null,
   ownerName:value.owner_name as string|null,
   supportEmail:(value.support_email as string|null)||'',
   docsUrl:(value.docs_url as string|null)||'',
   visibility:value.visibility,integrationMode:value.integration_mode,
   readiness:health,observedAt:value.health_observed_at as string|null,
   lastObservedState:observed
 };
}
export function parseProducts(value:unknown):{items:ProductRow[];nextCode:string|null}|null{
 if(!Array.isArray(value)||value.length>100)return null;
 const items:ProductRow[]=[],seenId=new Set<string>(),seenCode=new Set<string>();
 for(const record of value){
   const p=parseProduct(record);
   if(!p||seenId.has(p.id.toLowerCase())||seenCode.has(p.code)||
     (items.length>0&&p.code<=items[items.length-1].code))return null;
   seenId.add(p.id.toLowerCase());seenCode.add(p.code);items.push(p);
 }
 return {items,nextCode:items.length===100?items[items.length-1].code:null};
}
export function parseProductCommand(value:unknown,action:'create'|'update'):ProductCommand|null{
 if(!obj(value))return null;
 const keys=['code','name','loginPath','status','visibility','integrationMode',
   'description','ownerId','supportEmail','docsUrl'];
 if(action==='update')keys.push('version');
 if(Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k))||
   !productCode(value.code)||!text(value.name,150)||!value.name.trim()||
   value.loginPath!=='/apps/'+value.code.toLowerCase()+'/login'||
   !state(value.status)||!visibility(value.visibility)||!mode(value.integrationMode)||
   !text(value.description,2000)||
   !(value.ownerId===''||productUuid(value.ownerId))||
   !email(value.supportEmail)||!validDocs(value.docsUrl)||
   (['CRM','MUSIC'].includes(value.code as string)&&value.integrationMode!=='adapter')||
   (action==='update'&&(!Number.isSafeInteger(value.version)||
     (value.version as number)<1||(value.version as number)>2147483646)))
   return null;
 return value as ProductCommand;
}
