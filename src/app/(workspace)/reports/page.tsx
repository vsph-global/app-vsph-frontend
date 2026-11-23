import type {Metadata} from 'next';
import Link from 'next/link';
import {loadProjectReport,reportExportHref} from '@/features/operations/project-report-server';
import {validReportFilters,type ReportStatus} from '@/features/operations/ProjectReportLiveContract';
import '../reports-live.css';
export const metadata:Metadata={title:'Project reports | VSPH Control Center',
 robots:{index:false,follow:false}};
type Filters=Record<string,string|string[]|undefined>;
const one=(x:string|string[]|undefined)=>x===undefined?'':typeof x==='string'?x:null;
const statuses:ReportStatus[]=['','planned','active','paused','completed','archived'];
export default async function ReportsPage({searchParams}:{searchParams:Promise<Filters>}){
 const raw=await searchParams;
 const status=one(raw.status),from=one(raw.from),to=one(raw.to);
 const extra=Object.keys(raw).filter(k=>!['status','from','to'].includes(k));
 const filters={status,from,to};
 if(extra.length||!validReportFilters(filters))return <main
   className="workspace-content report-live-workspace" id="mainContent">
     <h1>Invalid report filters</h1>
     <p role="alert">Use a supported project state and valid date range.</p>
     <Link href="/reports">Reset report</Link>
   </main>;
 const report=await loadProjectReport(filters);
 if(!report)return <main className="workspace-content report-live-workspace" id="mainContent">
   <h1>Project report unavailable</h1>
   <p role="alert">Your project access or the reporting service could not be verified.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 const complete=report.projects.reduce((n,p)=>n+p.completedTasks,0);
 const total=report.projects.reduce((n,p)=>n+p.totalTasks,0);
 const overdue=report.projects.reduce((n,p)=>n+p.overdueTasks,0);
 const active=report.projects.filter(p=>p.status==='active').length;
 const metrics=[['Projects shown',report.projects.length],
   ['Active shown',active],['Completed tasks shown',complete],
   ['Tasks shown',total],['Overdue tasks shown',overdue]] as const;
 return <main className="workspace-content report-live-workspace" id="mainContent" tabIndex={-1}>
   <header className="report-live-heading"><div>
     <h1>Project reports</h1>
     <p>Authorized project delivery overview · Generated {new Date(report.generatedAt).toLocaleString()}</p>
   </div><a href={reportExportHref(filters)} className="report-live-export">
     Export authorized CSV</a></header>
   <p className="report-live-scope" role="status">
     Showing up to the first 100 matching projects where you have internal project access.
     Metrics below reflect only these rows, not necessarily your entire organization.
     {report.limitReached?' The 100-project limit was reached; narrow your filters for a more specific result.':''}
   </p>
   <section className="report-live-panel">
     <form method="get" action="/reports" className="report-live-filters">
       <label>Project status <select name="status" defaultValue={filters.status}>
         {statuses.map(s=><option value={s} key={s}>{s||'All states'}</option>)}
       </select></label>
       <label>Created from <input type="date" name="from" defaultValue={filters.from}/></label>
       <label>Created to <input type="date" name="to" defaultValue={filters.to}/></label>
       <button type="submit">Apply filters</button>
       <Link href="/reports">Reset</Link>
     </form>
     <div className="report-live-stats" aria-label="Selected project statistics">
       {metrics.map(([label,value])=><div key={label}>
         <span>{label}</span><strong>{value.toLocaleString('en-IN')}</strong></div>)}
     </div>
   </section>
   <section className="report-live-panel">
     <h2>Project delivery summary</h2>
     <div className="report-live-table" role="region" tabIndex={0}
       aria-label="Authorized project report rows">
       <table><thead><tr>
         {['Project','Owner / customer','State','Tasks','Assigned to me',
           'Overdue','Milestones','Open PRs','Failed builds','Due'].map(x=>
           <th scope="col" key={x}>{x}</th>)}</tr></thead>
         <tbody>{report.projects.map(p=><tr key={p.id}>
           <td><Link href={'/projects/'+p.id}>{p.name}</Link><small>{p.key}</small></td>
           <td>{p.ownerName}<small>{p.organizationName||'Internal'}</small></td>
           <td>{p.status}</td><td>{p.completedTasks}/{p.totalTasks}</td>
           <td>{p.assignedToMe}</td><td>{p.overdueTasks}</td>
           <td>{p.completedMilestones} completed · {p.pendingMilestones} pending</td>
           <td>{p.openPrs}<small>{p.prsAwaitingReview} awaiting review</small></td>
           <td>{p.failedBuildRecords}</td><td>{p.dueOn||'—'}</td>
         </tr>)}</tbody>
       </table>
       {!report.projects.length&&<p>No authorized projects match these filters.</p>}
     </div>
   </section>
   <p className="report-live-footnote">
     Delivery and build counts are observations recorded by the backend and may lag
     external services. Deployment status is not inferred from an unconfigured integration.
     CSV export follows the same authorization and 100-project cap.
   </p>
 </main>;
}
