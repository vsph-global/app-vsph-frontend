import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {approvedPublicOrigin,validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {hrMutation} from '@/features/operations/HrMutationContract';
type Context={params:Promise<{kind:string;id:string}>};
const headers={'Cache-Control':'no-store'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers});
export async function POST(request:NextRequest,{params}:Context){
 const origin=approvedPublicOrigin(),upstream=approvedInternalOrigin();
 if(!origin||!upstream)return fail('HR actions unavailable.',503);
 if(request.headers.get('origin')!==origin||
   request.headers.get('sec-fetch-site')==='cross-site')return fail('Origin not permitted.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 if(!request.headers.get('content-type')?.startsWith('application/json')||
   Number(request.headers.get('content-length')||0)>2048)return fail('Invalid request.',400);
 let data:unknown;
 try{
   const raw=await request.text();
   if(raw.length>2048)return fail('Request too long.',400);
   data=JSON.parse(raw);
 }catch{return fail('Invalid JSON.',400);}
 const {kind,id}=await params,mutation=hrMutation(kind,id,data);
 if(!mutation)return fail('Invalid HR operation or missing confirmation.',400);
 try{
   const response=await fetch(upstream+mutation.path,{
     method:'POST',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+session,Origin:origin,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify(mutation.body),signal:AbortSignal.timeout(8000),
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('HR permission or self-review denied.',403);
   if(response.status===409)return fail('The HR record changed. Reload and retry.',409);
   if(response.status===400||response.status===422)
     return fail('HR operation rejected. Review the current record and reason.',400);
   if(response.status!==200)return fail('HR action could not be saved.',503);
   return NextResponse.json({ok:true},{headers});
 }catch{return fail('HR service unavailable.',503);}
}
