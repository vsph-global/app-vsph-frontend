import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {employeeUuid} from '@/features/operations/EmployeeEditContract';
import {parseEmployeeCreate} from '@/features/operations/EmployeeCreateContract';
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
export async function POST(request:NextRequest){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail('Workforce onboarding is unavailable.',503);
 if(request.headers.get('origin')!==origin||
   request.headers.get('sec-fetch-site')==='cross-site')
   return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 const key=request.headers.get('Idempotency-Key');
 if(!key||!employeeUuid.test(key))return fail('A valid idempotency key is required.',400);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>4096)
   return fail('Invalid request.',400);
 let raw:unknown;
 try{
   const body=await request.text();
   if(body.length>4096)return fail('Onboarding details too long.',400);
   raw=JSON.parse(body);
 }catch{return fail('Invalid JSON.',400);}
 const data=parseEmployeeCreate(raw);
 if(!data)return fail('Review the employee details and required department.',400);
 try{
   const response=await fetch(upstream+'/api/employees',{
     method:'POST',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,
       'Idempotency-Key':key,'Content-Type':'application/json',
       Accept:'application/json'},
     body:JSON.stringify(data),signal:AbortSignal.timeout(8000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Workforce management permission denied.',403);
   if(response.status===409)return fail('Employee already exists or is archived. Review the current roster.',409);
   if(response.status===400||response.status===422)
     return fail('Onboarding rejected. Review required fields.',400);
   if(response.status!==200&&response.status!==201)
     return fail('Employee record was not confirmed. Retry only with the same details.',503);
   const result:unknown=await response.json().catch(()=>null);
   if(!result||typeof result!=='object'||!('id' in result)||
     typeof result.id!=='string'||!employeeUuid.test(result.id))
     return fail('Creation confirmation unavailable. Check the roster before retrying.',503);
   return NextResponse.json({id:result.id,replayed:response.status===200},
     {status:response.status,headers});
 }catch{return fail('Employee service unavailable. Retry only with the same details.',503);}
}
