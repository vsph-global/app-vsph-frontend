import { type NextRequest, NextResponse } from 'next/server';
import { approvedInternalOrigin } from '@/features/workspace/server-api';
import { approvedPublicOrigin, validPortalSession } from '@/features/projects/ProjectProxySecurity';
import { employeeUuid, parseEmployeeUpdate } from '@/features/operations/EmployeeEditContract';

type Context={params:Promise<{id:string}>};
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Explicit employee-update proxy: no client-specified method, URL, actor, or role. */
export async function POST(request:NextRequest,{params}:Context){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail('Employee changes are unavailable.',503);
 if(request.headers.get('origin')!==origin||
   request.headers.get('sec-fetch-site')==='cross-site')return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>4096)return fail('Invalid request.',400);
 const {id}=await params;
 if(!employeeUuid.test(id))return fail('Invalid employee identifier.',400);
 let payload:unknown;
 try{
   const raw=await request.text();
   if(raw.length>4096)return fail('Employee details too long.',400);
   payload=JSON.parse(raw);
 }catch{return fail('Invalid JSON.',400);}
 const update=parseEmployeeUpdate(payload);
 if(!update)return fail('Review the current employee details and confirm the change.',400);
 try{
   const response=await fetch(upstream+'/api/employees/'+id+'/update',{
     method:'POST',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify(update),signal:AbortSignal.timeout(8000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Employee permission denied.',403);
   if(response.status===409)return fail('This employee changed. Reload before editing again.',409);
   if(response.status===400||response.status===422)
     return fail('Employee change rejected. Review their status and current version.',400);
   if(response.status!==200)return fail('Employee changes could not be saved.',503);
   return NextResponse.json({ok:true},{headers});
 }catch{return fail('Employee service unavailable.',503);}
}
