import {type NextRequest,NextResponse} from 'next/server';
import {approvedInternalOrigin} from '@/features/workspace/server-api';
import {validPortalSession} from '@/features/projects/ProjectProxySecurity';
import {reportApiPath,validReportFilters} from '@/features/operations/ProjectReportLiveContract';

const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const fail=(message:string,status:number)=>NextResponse.json({message},{status,headers:noStore});
export async function GET(request:NextRequest){
 const params=request.nextUrl.searchParams,keys=[...params.keys()];
 if(keys.length>3||new Set(keys).size!==keys.length||
   keys.some(k=>!['status','from','to'].includes(k)))
   return fail('Invalid report export filters.',400);
 const filters={status:params.get('status')||'',from:params.get('from')||'',
   to:params.get('to')||''};
 if(!validReportFilters(filters))return fail('Invalid report date or status filter.',400);
 if(request.headers.get('sec-fetch-site')==='cross-site')
   return fail('Cross-site exports are unavailable.',403);
 const session=request.cookies.get('vsph.portal.sid')?.value;
 if(!validPortalSession(session))return fail('Sign in again.',401);
 const origin=approvedInternalOrigin();
 if(!origin)return fail('Reporting service unavailable.',503);
 try{
   const api=reportApiPath(filters).replace(/^\/api\/project-reports/,'/api/project-reports/export.csv');
   const response=await fetch(origin+api,{
     method:'GET',cache:'no-store',redirect:'manual',
     headers:{Cookie:'vsph.portal.sid='+session,Accept:'text/csv'},
     signal:AbortSignal.timeout(12000)
   });
   if(response.status===401)return fail('Sign in again.',401);
   if(response.status===403)return fail('Project reporting permission denied.',403);
   if(response.status!==200)return fail('Project CSV unavailable.',503);
   const contentType=response.headers.get('content-type')||'';
   const length=Number(response.headers.get('content-length')||0);
   if(!contentType.toLowerCase().startsWith('text/csv')||
      !Number.isSafeInteger(length)||length>1000000)
     return fail('Unexpected report export response.',503);
   const csv=await response.text();
   if(csv.length>1000000)return fail('Report export exceeds the supported size.',503);
   return new NextResponse(csv,{status:200,headers:{
     ...noStore,'Content-Type':'text/csv; charset=utf-8',
     'Content-Disposition':'attachment; filename="vsph-project-report.csv"',
     'X-VSPH-Export-Scope':'first-100-authorized-matching-projects'
   }});
 }catch{return fail('Project export service unavailable.',503);}
}
