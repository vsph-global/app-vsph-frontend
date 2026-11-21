import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {parseClientOnboarding,validOnboardingKey} from '@/features/operations/ClientOnboardingContract';
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Idempotent creation only. Backend atomically creates owner invitation and audit/outbox. */
export async function POST(request:NextRequest){
 const publicOrigin=approvedPublicOrigin(),backend=approvedInternalOrigin();
 if(!publicOrigin||!backend)return fail('Client onboarding unavailable.',503);
 if(request.headers.get('origin')!==publicOrigin||
    request.headers.get('sec-fetch-site')==='cross-site')return fail('Origin not permitted.',403);
 const sid=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(sid))return fail('Sign in again.',401);
 const key=request.headers.get('Idempotency-Key');
 if(!validOnboardingKey(key))return fail('A UUID idempotency key is required.',400);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
    Number(request.headers.get('content-length')||0)>8192)
   return fail('Invalid request.',400);
 let raw:unknown;
 try{
   const body=await request.text();
   if(body.length>8192)return fail('Onboarding request too large.',400);
   raw=JSON.parse(body);
 }catch{return fail('Invalid JSON.',400);}
 const validated=parseClientOnboarding(raw);
 if(!validated)return fail('Review organization, owner and subscription details.',400);
 try{
   const response=await fetch(backend+'/api/admin-management/onboardings',{
     method:'POST',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+sid,Origin:publicOrigin,
       'Idempotency-Key':key,'Content-Type':'application/json',
       Accept:'application/json'},
     body:JSON.stringify(validated),signal:AbortSignal.timeout(12000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Active platform owner access required.',403);
   if(response.status===409)return fail('An organization or owner invitation conflicts with existing records. Review before trying a new request.',409);
   if(response.status===400||response.status===422)
     return fail('Onboarding rejected. Review all required fields.',400);
   if(response.status!==202)return fail('Creation confirmation unavailable. Check the original request before retrying.',503);
   const result:unknown=await response.json().catch(()=>null);
   if(!result||typeof result!=='object'||!('id' in result)||
     !validOnboardingKey(result.id))
     return fail('Creation confirmation unavailable. Check the original request before retrying.',503);
   return NextResponse.json({id:result.id,state:'queued',message:
     'Customer onboarding committed. Invitation delivery has not been confirmed.'},
     {status:202,headers});
 }catch{
   return fail('The request may have been committed. Check the original request key before retrying.',503);
 }
}
