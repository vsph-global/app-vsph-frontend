import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {
  parseRoleChange,validPermissionId
} from '@/features/operations/PermissionLiveContract';
type Context={params:Promise<{organizationId:string}>};
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Versioned customer-scoped product grants and removal. Never platform role elevation. */
export async function POST(request:NextRequest,{params}:Context){
 const origin=approvedPublicOrigin(),backend=approvedInternalOrigin();
 if(!origin||!backend)return fail('Role governance unavailable.',503);
 if(request.headers.get('origin')!==origin||
   request.headers.get('sec-fetch-site')==='cross-site')return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 const {organizationId}=await params;
 if(!validPermissionId(organizationId))return fail('Invalid organization.',400);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>2048)
   return fail('Invalid request.',400);
 let raw:unknown;
 try{const body=await request.text();
   if(body.length>2048)return fail('Request too large.',400);
   raw=JSON.parse(body);
 }catch{return fail('Invalid JSON.',400);}
 const change=parseRoleChange(raw);
 if(!change)return fail('Invalid role, member, application or version.',400);
 try{
   const response=await fetch(backend+'/api/admin-management/customers/'+
     organizationId+'/role',{
     method:'POST',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,
       Accept:'application/json','Content-Type':'application/json'},
     body:JSON.stringify(change),signal:AbortSignal.timeout(8000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Owner authority, active membership or product entitlement required.',403);
   if(response.status===409)return fail('Member version changed. Reload before retrying.',409);
   if(response.status===400||response.status===422)
     return fail('Product-role mutation rejected. Review the member and supported roles.',400);
   if(response.status!==200)return fail('Product-role change was not confirmed.',503);
   return NextResponse.json({ok:true},{headers});
 }catch{return fail('Role governance unavailable; reload before retrying.',503);}
}
