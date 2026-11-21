import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {validSessionId} from '@/features/operations/AccountSelfServiceContract';
type Context={params:Promise<{operation:string}>};
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** Revoke only the current actor's non-current sessions. Never accept a target account. */
export async function POST(request:NextRequest,{params}:Context){
 const origin=approvedPublicOrigin(),backend=approvedInternalOrigin();
 if(!origin||!backend)return fail('Session management unavailable.',503);
 if(request.headers.get('origin')!==origin||
   request.headers.get('sec-fetch-site')==='cross-site')return fail('Origin not permitted.',403);
 const sid=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(sid))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>256)
   return fail('Invalid request.',400);
 let input:unknown;
 try{const raw=await request.text();if(raw.length>256)return fail('Request too large.',400);
   input=JSON.parse(raw);
 }catch{return fail('Invalid JSON.',400);}
 if(!input||typeof input!=='object'||Array.isArray(input)||
   Object.keys(input).length!==0)return fail('Session commands cannot contain target identity fields.',400);
 const {operation}=await params;
 let suffix:string;
 if(operation==='others')suffix='/revoke-others';
 else if(validSessionId(operation))suffix='/'+operation+'/revoke';
 else return fail('Invalid session operation.',400);
 try{
   const response=await fetch(backend+'/api/account/sessions'+suffix,{
     method:'POST',redirect:'manual',cache:'no-store',
     headers:{Cookie:'vsph.portal.sid='+sid,Origin:origin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:'{}',signal:AbortSignal.timeout(8000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Session action not permitted.',403);
   if(response.status!==200)return fail('Session revocation could not be confirmed.',503);
   const data:unknown=await response.json().catch(()=>null);
   if(!data||typeof data!=='object'||!('revoked' in data)||
     !Number.isSafeInteger(data.revoked)||(data.revoked as number)<0)
     return fail('Session operation result could not be verified.',503);
   return NextResponse.json({revoked:data.revoked},{headers});
 }catch{return fail('Session service unavailable. Reload before retrying.',503);}
}
