import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {parseWorkforceAction,type WorkforceAction} from './ProjectWorkforceContract';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const token=/^[A-Za-z0-9_-]{32,128}$/;
const error=(status:number,message:string)=>NextResponse.json({message},
  {status,headers:{'Cache-Control':'no-store'}});
function publicOrigin():string|null {
 const raw=process.env.VSPH_PUBLIC_ORIGIN;
 if(!raw)return null;
 try {
  const u=new URL(raw);
  const local=['127.0.0.1','localhost','[::1]'].includes(u.hostname);
  return u.origin===raw&&!u.username&&!u.password&&
    (u.protocol==='https:'||(local&&u.protocol==='http:'))?raw:null;
 }catch{return null;}
}
/** Narrowly constrained workforce gateway. No arbitrary role grants, customer assignments,
 * URL parameters, credential forwarding, or locally trusted permissions.
 */
export async function projectWorkforceWrite(request:NextRequest,id:string,
 action:WorkforceAction):Promise<NextResponse> {
 const origin=publicOrigin(),backend=approvedInternalOrigin();
 if(!origin||!backend)return error(503,'Workforce changes are not configured.');
 if(!uuid.test(id))return error(400,'Invalid project identifier.');
 if(request.headers.get('origin')!==origin ||
    ![null,'same-origin'].includes(request.headers.get('sec-fetch-site')))
   return error(403,'Request origin not permitted.');
 if(request.nextUrl.search ||
    request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')
   return error(400,'Invalid workforce request.');
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!session||!token.test(session))return error(401,'Sign in to continue.');
 const length=request.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>4096))
   return error(413,'Workforce request too large.');
 let raw:string;
 try{raw=await request.text();}catch{return error(400,'Invalid workforce request.');}
 if(new TextEncoder().encode(raw).byteLength>4096)return error(413,'Workforce request too large.');
 let submitted:unknown;
 try{submitted=JSON.parse(raw);}catch{return error(400,'Invalid JSON.');}
 const parsed=parseWorkforceAction(action,submitted);
 if(!parsed.ok)return error(400,parsed.error);
 const payload=action==='assign'
   ? {version:parsed.data.version,userId:parsed.data.userId,
      role:parsed.data.role,team:parsed.data.team}
   : {version:parsed.data.version,userId:parsed.data.userId};
 try{
   const result=await fetch(backend+'/api/projects/'+id+'/workforce/'+action,{
     method:'POST',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000),
     headers:{'Content-Type':'application/json',Accept:'application/json',
      Origin:origin,Cookie:'vsph.portal.sid='+session},
     body:JSON.stringify(payload),
   });
   if(result.status===401)return error(401,'Session expired. Sign in again.');
   if(result.status===403)return error(403,'This account cannot manage that project member.');
   if(result.status===404)return error(404,'Project member unavailable.');
   if(result.status===409)return error(409,'Project changed. Reload before trying again.');
   if(result.status===400)return error(400,'The backend rejected the assignment or member change.');
   if(result.status!==200)return error(503,'Member change could not be confirmed.');
   const data:unknown=await result.json();
   if(!data||typeof data!=='object'||Array.isArray(data)||
      !('id' in data)||typeof data.id!=='string'||
      data.id.toLowerCase()!==parsed.data.userId.toLowerCase()||
      !('version' in data)||data.version!==parsed.data.version+1)
     return error(502,'Cannot verify project member change. Reload before retrying.');
   return NextResponse.json({id:data.id,version:data.version},
     {status:200,headers:{'Cache-Control':'no-store'}});
 }catch{return error(503,'Member change outcome is uncertain. Reload before retrying.');}
}
