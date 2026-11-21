import type {Metadata} from 'next';
import Link from 'next/link';
import {Suspense} from 'react';
import {loadHrWorkspace} from '@/features/operations/hr-server';
import {HrReviewWorkspace} from '@/features/operations/HrReviewWorkspace';
import '../hr-live.css';

export const metadata:Metadata={title:'HR workspace | VSPH Control Center',
 robots:{index:false,follow:false}};
type Filters={leaveStatus?:string|string[];leaveAfter?:string|string[];
 attendanceAfter?:string|string[]};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses=['pending','approved','rejected','cancelled','all'] as const;
const one=(v:string|string[]|undefined):string|null=>
 v===undefined?'':typeof v==='string'?v:null;
function pageUrl(status:string,leaveAfter?:string,attendanceAfter?:string){
 const params=new URLSearchParams();
 if(status!=='pending')params.set('leaveStatus',status);
 if(leaveAfter)params.set('leaveAfter',leaveAfter);
 if(attendanceAfter)params.set('attendanceAfter',attendanceAfter);
 return '/hr'+(params.size?'?'+params:'');
}
async function HrContent({searchParams}:{searchParams:Promise<Filters>}){
 const raw=await searchParams;
 const filterRaw=one(raw.leaveStatus),leaveAfter=one(raw.leaveAfter),
   attendanceAfter=one(raw.attendanceAfter);
 const status=filterRaw||'pending';
 if(filterRaw===null||leaveAfter===null||attendanceAfter===null||
   !statuses.some(s=>s===status)||
   (leaveAfter!==''&&!uuid.test(leaveAfter))||
   (attendanceAfter!==''&&!uuid.test(attendanceAfter)))
   return <p role="alert" className="feedback-state error-state">
     Invalid HR filters. Clear the filters and try again.</p>;
 const result=await loadHrWorkspace({
   leaveStatus:status as typeof statuses[number],
   leaveAfter:leaveAfter||null,attendanceAfter:attendanceAfter||null,
 });
 if(!result)return <section className="hr-live-panel">
   <h2>HR workspace unavailable</h2>
   <p role="alert">Your current HR permission or the workforce service could not be verified.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </section>;
 return <>
   <header className="hr-live-heading"><div><h1>HR workspace</h1>
     <p>{result.role==='owner'?'Platform owner':'HR manager'} · Authorized internal workforce only</p>
   </div><Link href={pageUrl(status)}>Refresh</Link></header>
   <section className="hr-live-panel">
     <h2>Leave review</h2>
     <form method="get" action="/hr" className="hr-live-filters">
       <label>Leave status <select name="leaveStatus" defaultValue={status}>
         {statuses.map(s=><option key={s} value={s}>{s==='all'?'All statuses':s}</option>)}
       </select></label>
       <button type="submit">Apply</button>
     </form>
     <HrReviewWorkspace leaves={result.leaves.items} attendance={result.attendance.items}
       role={result.role}/>
     <nav className="hr-live-pagination" aria-label="HR records pagination">
       {result.leaves.nextId&&<Link href={pageUrl(status,result.leaves.nextId,
         attendanceAfter||undefined)}>Next leave requests</Link>}
       {leaveAfter&&<Link href={pageUrl(status,undefined,attendanceAfter||undefined)}>
         First leave page</Link>}
       {result.attendance.nextId&&<Link href={pageUrl(status,leaveAfter||undefined,
         result.attendance.nextId)}>Next attendance records</Link>}
       {attendanceAfter&&<Link href={pageUrl(status,leaveAfter||undefined)}>
         First attendance page</Link>}
     </nav>
   </section>
 </>;
}
export default function HrPage({searchParams}:{searchParams:Promise<Filters>}){
 return <main className="workspace-content hr-live-workspace" id="mainContent" tabIndex={-1}>
   <Suspense fallback={<p role="status">Verifying HR workspace access…</p>}>
     <HrContent searchParams={searchParams}/>
   </Suspense>
 </main>;
}
