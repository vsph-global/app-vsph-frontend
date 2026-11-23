import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {parseRecoveryCommand,validProvisioningId} from '@/features/operations/ProvisioningLiveContract';
type Context={params:Promise<{id:string;action:string}>};
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
/** No arbitrary invitation URL, account, recipient or backend method accepted. */
export async function POST(request:NextRequest,{params}:Context){
 const origin=approvedPublicOrigin(),backend=approvedInternalOrigin();
 if(!origin||!backend)return fail('Provisioning service unavailable.',503);
 if(request.headers.get('origin')!==origin||
    request.headers.get('sec-fetch-site')==='cross-site')
   return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
    Number(request.headers.get('content-length')||0)>2048)
   return fail('Invalid request.',400);
 const {id,action}=await params;
 if(!validProvisioningId(id))return fail('Invalid invitation.',400);
 let raw:unknown;
 try{
   const body=await request.text();
   if(body.length>2048)return fail('Request too large.',400);
   raw=JSON.parse(body);
 }catch{return fail('Invalid JSON.',400);}
 const command=parseRecoveryCommand(action,raw);
 if(!command)return fail('Invalid provisioning command.',400);
 try{
   const response=await fetch(backend+'/api/admin-management/onboardings/'+id+'/'+action,{
     method:'POST',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify(command),signal:AbortSignal.timeout(8000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Platform owner authority required.',403);
   if(response.status===409)return fail('Invitation changed or external reconciliation is incomplete. Refresh the queue.',409);
   if(response.status===400||response.status===422)
     return fail('Invitation action rejected. Review its state and generation.',400);
   if(response.status!==200)return fail('Invitation action was not confirmed.',503);
   return NextResponse.json({ok:true},{headers});
 }catch{return fail('Provisioning service unavailable. Refresh before retrying.',503);}
}
