import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {parseProductCommand,productUuid} from '@/features/operations/ProductRegistryContract';
type Context={params:Promise<{action:string;id:string}>};
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Fixed, audited backend product command routes only. No arbitrary URL probing. */
export async function POST(request:NextRequest,{params}:Context){
 const origin=approvedPublicOrigin(),backend=approvedInternalOrigin();
 if(!origin||!backend)return fail('Product registry unavailable.',503);
 if(request.headers.get('origin')!==origin||
   request.headers.get('sec-fetch-site')==='cross-site')return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 const {action,id}=await params;
 if(!productUuid(id)||!['create','update','check'].includes(action))
   return fail('Invalid product operation.',400);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>6144)
   return fail('Invalid request.',400);
 let value:unknown;
 try{
   const raw=await request.text();
   if(raw.length>6144)return fail('Product request too large.',400);
   value=JSON.parse(raw);
 }catch{return fail('Invalid JSON.',400);}
 let body:unknown;
 if(action==='check'){
   if(!value||typeof value!=='object'||Array.isArray(value)||
      Object.keys(value).length!==0)return fail('Product health check has no input fields.',400);
   body={};
 }else{
   body=parseProductCommand(value,action as 'create'|'update');
   if(!body)return fail('Invalid product fields. Review the current version and required metadata.',400);
 }
 const suffix=action==='check'?'/'+id+'/check':'/'+action+'/'+id;
 try{
   const response=await fetch(backend+'/api/admin-management/product-registry'+suffix,{
     method:'POST',redirect:'manual',cache:'no-store',
     headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify(body),signal:AbortSignal.timeout(10000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Platform-owner access required.',403);
   if(response.status===409)return fail('Product changed or already exists. Reload before retrying.',409);
   if(response.status===400||response.status===422)
     return fail('Product command rejected. Review metadata, lifecycle and permissions.',400);
   if(response.status!==200)return fail('Product operation could not be confirmed. Check the current registry before retrying.',503);
   if(action==='check')return NextResponse.json({ok:true},{headers});
   const result:unknown=await response.json().catch(()=>null);
   if(!result||typeof result!=='object'||!('id' in result)||result.id!==id)
     return fail('Product command confirmation could not be verified. Reload before retrying.',503);
   return NextResponse.json({ok:true,id},{headers});
 }catch{
   return fail('Product operation status is uncertain. Reload the registry before retrying.',503);
 }
}
