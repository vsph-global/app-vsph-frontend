import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {validNotificationAction} from '@/features/operations/NotificationLiveContract';
type Context={params:Promise<{operation:string}>};
const noStore={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers:noStore});
export async function POST(request:NextRequest,{params}:Context){
 const publicOrigin=approvedPublicOrigin(),backend=approvedInternalOrigin();
 if(!publicOrigin||!backend)return fail('Notification service unavailable.',503);
 if(request.headers.get('origin')!==publicOrigin||
   request.headers.get('sec-fetch-site')==='cross-site')
   return fail('Origin not permitted.',403);
 const sid=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(sid))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>2048)
   return fail('Invalid request.',400);
 let data:unknown;
 try{
   const raw=await request.text();
   if(raw.length>2048)return fail('Request too long.',400);
   data=JSON.parse(raw);
 }catch{return fail('Invalid JSON.',400);}
 const {operation}=await params,command=validNotificationAction(operation,data);
 if(!command)return fail('Unknown notification action.',400);
 try{
   const response=await fetch(backend+command.path,{
     method:'POST',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+sid,Origin:publicOrigin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify(command.body),signal:AbortSignal.timeout(8000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Notification permission denied.',403);
   if(response.status!==200)return fail('Notification change was not confirmed.',503);
   return NextResponse.json({ok:true},{headers:noStore});
 }catch{return fail('Notification service unavailable.',503);}
}
