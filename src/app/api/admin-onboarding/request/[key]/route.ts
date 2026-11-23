import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {validOnboardingKey,parseExistingOnboardingRequest} from '@/features/operations/ClientOnboardingContract';
type Context={params:Promise<{key:string}>};
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Resolve uncertain create requests without creating another organization. */
export async function GET(request:NextRequest,{params}:Context){
 const backend=approvedInternalOrigin();
 if(!backend)return fail('Onboarding recovery unavailable.',503);
 if(request.headers.get('sec-fetch-site')==='cross-site')
   return fail('Cross-site recovery checks are unavailable.',403);
 const sid=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(sid))return fail('Sign in again.',401);
 const {key}=await params;
 if(!validOnboardingKey(key))return fail('Invalid request identifier.',400);
 try{
   const response=await fetch(backend+'/api/admin-management/onboardings/requests/'+key,{
     method:'GET',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+sid,Accept:'application/json'},
     signal:AbortSignal.timeout(8000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Platform owner access required.',403);
   if(response.status!==200)return fail('Could not verify the original request.',503);
   const value:unknown=await response.json().catch(()=>null);
   const result=parseExistingOnboardingRequest(value);
   if(!result)return fail('Unexpected recovery response.',503);
   return NextResponse.json(result,{headers});
 }catch{return fail('Could not verify the original request.',503);}
}
