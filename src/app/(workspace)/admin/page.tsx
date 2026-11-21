import type {Metadata} from 'next';
import Link from 'next/link';
import {loadAdminWorkspace} from '@/features/operations/admin-server';
import '../admin-live.css';
export const metadata:Metadata={
  title:'Administration | VSPH Control Center',robots:{index:false,follow:false}
};
type Params={tab?:string|string[];view?:string|string[]};
const one=(x:unknown)=>typeof x==='string'?x:'';
export default async function AdminPage({searchParams}:{
 searchParams:Promise<Params>;
}){
 const options=await searchParams,admin=await loadAdminWorkspace();
 if(!admin)return <main className="workspace-content admin-live-workspace" id="mainContent">
   <h1>Administration unavailable</h1>
   <p role="alert">An active platform-owner session is required to access these records.</p>
   <Link href="/dashboard">Return to dashboard</Link>
 </main>;
 const auditOnly=one(options.tab)==='audit';
 const rows=admin.audit??[];
 const removals=one(options.view)==='removals';
 const visible=removals?rows.filter(r=>/remov|revok|archiv|disabl/i.test(r.action)):rows;
 const counts=admin.overview?[
   ['Customer organizations',admin.overview.organizations],
   ['Accounts',admin.overview.users],
   ['Registered applications',admin.overview.applications],
   ['Active subscriptions',admin.overview.activeSubscriptions],
   ['Enabled product access',admin.overview.enabledAppAccess]
 ] as const:[];
 return <main className="workspace-content admin-live-workspace" id="mainContent" tabIndex={-1}>
   <header className="admin-live-heading">
     <div><h1>Platform administration</h1>
       <p>Owner-only account, organization and audit overview</p></div>
     <Link href="/admin">Refresh</Link>
   </header>
   <nav className="admin-live-tabs" aria-label="Administration sections">
     <Link href="/admin" aria-current={!auditOnly?'page':undefined}>Overview</Link>
     <Link href="/admin?tab=audit" aria-current={auditOnly?'page':undefined}>Audit log</Link>
   </nav>
   {!auditOnly&&<>
     <section className="admin-live-panel">
       <h2>Platform summary</h2>
       {admin.overview?<div className="admin-live-stat-grid">
         {counts.map(([label,value])=><div key={label}>
           <span>{label}</span><strong>{value.toLocaleString('en-IN')}</strong>
         </div>)}
       </div>:<p role="alert">The platform summary could not be verified.</p>}
     </section>
     <section className="admin-live-panel">
       <h2>Manage the platform</h2>
       <div className="admin-live-actions">
         <Link href="/admin/customers">Customer organizations</Link>
         <Link href="/admin/provisioning">Provisioning recovery</Link>
         <Link href="/admin/finance">Finance overview</Link>
         <Link href="/reports">Project reports</Link>
       </div>
       <p>Direct password provisioning and unrestricted role elevation have been retired.
         Use the governed onboarding and permission workflows.</p>
     </section>
   </>}
   <section className="admin-live-panel">
     <div className="admin-live-section-heading"><h2>Recent audit activity</h2>
       <nav aria-label="Audit filters">
         <Link href="/admin?tab=audit">All events</Link>
         <Link href="/admin?tab=audit&view=removals">Revocation and removal events</Link>
       </nav></div>
     <p>Up to 200 most recent backend audit records.
       Sensitive details and raw audit payloads are deliberately omitted.</p>
     {admin.audit===null?<p role="alert">Audit records could not be verified.</p>:
       <div className="admin-live-table" role="region" tabIndex={0}
         aria-label="Authorized platform audit events">
         <table><thead><tr>
           {['When','Action','Actor','Organization','Target'].map(x=>
             <th key={x} scope="col">{x}</th>)}</tr></thead>
           <tbody>{visible.map(row=><tr key={row.id}>
             <td>{new Date(row.createdAt).toLocaleString()}</td>
             <td><strong>{row.action}</strong><small>{row.targetType}</small></td>
             <td>{row.actorName||'System / former account'}</td>
             <td>{row.organizationName||'Platform'}</td>
             <td>{row.targetId||'—'}</td>
           </tr>)}</tbody>
         </table>
         {!visible.length&&<p>No events match this filter in the latest 200 records.</p>}
       </div>}
   </section>
 </main>;
}
