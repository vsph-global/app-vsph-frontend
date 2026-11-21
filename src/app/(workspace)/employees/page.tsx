import type {Metadata} from 'next';
import Link from 'next/link';
import {Suspense} from 'react';
import {loadEmployeeRoster} from '@/features/operations/employee-server';
import {LiveEmployeeTable} from '@/features/operations/LiveEmployeeTable';
import type {EmployeeStatus} from '@/features/operations/EmployeeLiveContract';
import '../employees-live.css';

export const metadata:Metadata={
 title:'Employees | VSPH Control Center',robots:{index:false,follow:false}
};
type Filters={search?:string|string[];status?:string|string[];afterId?:string|string[]};
const validStatuses=['all','onboarding','active','on_leave','inactive'] as const;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one=(value:string|string[]|undefined):string|null=>
  value===undefined?'':typeof value==='string'?value:null;
const display=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
function employeeUrl(search:string,status:string,afterId?:string){
  const params=new URLSearchParams();
  if(search)params.set('search',search);
  if(status!=='all')params.set('status',status);
  if(afterId)params.set('afterId',afterId);
  return '/employees'+(params.size?'?'+params:'');
}
async function EmployeeContent({searchParams}:{searchParams:Promise<Filters>}){
 const raw=await searchParams;
 const searchRaw=one(raw.search),statusRaw=one(raw.status),cursorRaw=one(raw.afterId);
 const search=searchRaw?.trim()??'',status=statusRaw||'all';
 if(searchRaw===null||statusRaw===null||cursorRaw===null||
    search.length>80||/[\u0000-\u001f\u007f]/.test(searchRaw)||
    !validStatuses.some(s=>s===status)||(cursorRaw!==''&&!uuid.test(cursorRaw))){
   return <p className="feedback-state error-state" role="alert">
     Invalid employee directory filters. Clear the filters and retry.</p>;
 }
 const roster=await loadEmployeeRoster({
   search,status:status as 'all'|EmployeeStatus,afterId:cursorRaw||null
 });
 if(!roster)return <section className="employee-live-panel" role="alert">
   <h2>Employee directory unavailable</h2>
   <p>Your workforce permission or backend directory could not be verified.
     No employee records were displayed.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </section>;
 const stats=[
   ['Employees',roster.counts.total],['Active',roster.counts.active],
   ['Onboarding',roster.counts.onboarding],['On leave',roster.counts.onLeave],
   ['HR managers',roster.counts.hrManagers]
 ] as const;
 const max=Math.max(1,...roster.departments.map(d=>d.members));
 return <>
   <header className="employee-live-heading">
     <div><h1>Employee management</h1>
       <p>Authorized internal employee records · {roster.role==='owner'?'Platform owner':'HR workspace'}</p></div>
     <div className="employee-live-heading-actions">
       <Link className="employee-live-action" href={employeeUrl(search,status)}>Refresh</Link>
       <Link className="employee-live-action" href="/employees/new">Onboard employee</Link>
     </div>
   </header>
   <section className="employee-live-summary" aria-label="Workforce summary">
     {stats.map(([label,value])=><article key={label}>
       <span>{label}</span><strong>{value.toLocaleString('en-IN')}</strong></article>)}
   </section>
   <section className="employee-live-panel" aria-labelledby="departmentTitle">
     <h2 id="departmentTitle">Department allocation</h2>
     {!roster.departments.length&&<p>No active workforce department assignments.</p>}
     <div className="employee-live-departments">
       {roster.departments.map(item=><div key={item.department}>
         <span>{item.department}</span><progress max={max} value={item.members}
           aria-label={item.department+' members'}/><strong>{item.members}</strong>
       </div>)}
     </div>
   </section>
   <section className="employee-live-panel" aria-labelledby="directoryTitle">
     <h2 id="directoryTitle">Staff directory</h2>
     <form method="get" action="/employees" className="employee-live-filters">
       <label>Search employees
         <input type="search" maxLength={80} name="search" defaultValue={search}
           placeholder="Name, email, department, job title"/></label>
       <label>Employee status
         <select name="status" defaultValue={status}>
           {validStatuses.map(s=><option key={s} value={s}>
             {s==='all'?'All statuses':display(s)}</option>)}
         </select></label>
       <button type="submit">Apply filters</button>
       <Link href="/employees">Reset</Link>
     </form>
     <LiveEmployeeTable employees={roster.employees} role={roster.role}/>
     <div className="employee-live-pagination">
       <p role="status">{roster.employees.length} employee records on this page
         {roster.hasMore?' · additional records available':''}</p>
       {roster.hasMore&&roster.nextCursor&&
         <Link className="employee-live-action"
           href={employeeUrl(search,status,roster.nextCursor)}>Next 50 employees</Link>}
       {cursorRaw&&<Link href={employeeUrl(search,status)}>First page</Link>}
     </div>
   </section>
 </>;
}
export default function EmployeesPage({searchParams}:{searchParams:Promise<Filters>}){
 return <main className="workspace-content employee-live-workspace" id="mainContent" tabIndex={-1}>
   <Suspense fallback={<p role="status">Checking workforce access…</p>}>
     <EmployeeContent searchParams={searchParams}/>
   </Suspense>
 </main>;
}
