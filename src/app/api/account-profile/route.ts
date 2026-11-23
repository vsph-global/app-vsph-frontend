import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {parseProfileChange,parseOwnProfile} from '@/features/operations/AccountSelfServiceContract';
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Only own editable display fields; never email, roles, credentials or target ID. */
export async function PATCH(request:NextRequest){
 const origin=approvedPublicOrigin(),backend=approvedInternalOrigin();
 if(!origin||!backend)return fail('Profile service unavailable.',503);
 if(request.headers.get('origin')!==origin||
   request.headers.get('sec-fetch-site')==='cross-site')return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>4096)
   return fail('Invalid request.',400);
 let input:unknown;
 try{const raw=await request.text();
   if(raw.length>4096)return fail('Profile request too large.',400);
   input=JSON.parse(raw);
 }catch{return fail('Invalid JSON.',400);}
 const change=parseProfileChange(input);
 if(!change)return fail('Invalid display name, bio, time zone, avatar or version.',400);
 try{
   const response=await fetch(backend+'/api/account/profile',{
     method:'PATCH',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify(change),signal:AbortSignal.timeout(8000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Current account is unavailable.',403);
   if(response.status===409)return fail('Profile changed in another session. Reload before editing.',409);
   if(response.status===400||response.status===422)return fail('Profile values were rejected.',400);
   if(response.status!==200)return fail('Profile save could not be confirmed.',503);
   const value:unknown=await response.json().catch(()=>null);
   const saved=parseOwnProfile(value);
   if(!saved)return fail('Saved profile response could not be verified. Reload.',503);
   return NextResponse.json(saved,{headers});
 }catch{return fail('Profile service unavailable; reload before retrying.',503);}
}
