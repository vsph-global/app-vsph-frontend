import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {employeeUuid} from '@/features/operations/EmployeeEditContract';
import {parseCustomerMemberChange} from '@/features/operations/CustomerMemberContract';
type Context={params:Promise<{id:string}>};
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
export async function POST(request:NextRequest,{params}:Context){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail('Customer membership changes unavailable.',503);
 if(request.headers.get('origin')!==origin||
   request.headers.get('sec-fetch-site')==='cross-site')return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 const {id}=await params;
 if(!employeeUuid.test(id))return fail('Invalid organization ID.',400);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>2048)
   return fail('Invalid request.',400);
 let raw:unknown;
 try{
   const payload=await request.text();
   if(payload.length>2048)return fail('Request too long.',400);
   raw=JSON.parse(payload);
 }catch{return fail('Invalid JSON.',400);}
 const change=parseCustomerMemberChange(raw);
 if(!change)return fail('Invalid member changes or stale version.',400);
 try{
   const response=await fetch(upstream+'/api/admin-management/customers/'+id+'/member',{
     method:'POST',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify(change),signal:AbortSignal.timeout(8000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Platform owner authority required.',403);
   if(response.status===409)return fail('Membership changed. Reload before retrying.',409);
   if(response.status===400||response.status===422)
     return fail('Membership change rejected. A final organization owner must remain.',400);
   if(response.status!==200)return fail('Membership change could not be saved.',503);
   return NextResponse.json({ok:true},{headers});
 }catch{return fail('Customer service unavailable.',503);}
}
