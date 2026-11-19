'use client';
import {useState} from 'react';
import type { ProjectModel } from '@/features/projects/ProjectModel';
import { activeTasks,completed } from '@/features/projects/ProjectModel';
import type { Notice } from './OperationsModels';
export function ReportsPreview({projects}:{projects:ProjectModel[]}) {
 const [status,setStatus]=useState('');
 const [id,setId]=useState('');
 const [from,setFrom]=useState('');
 const [to,setTo]=useState('');
 const [filters,setFilters]=useState({status:'',id:'',from:'',to:''});
 const rows=projects.filter(p=>(!filters.status||p.status===filters.status)&&
  (!filters.id||p.key.toLowerCase().includes(filters.id.toLowerCase())) &&
  (!filters.from||p.dueOn>=filters.from)&&(!filters.to||p.dueOn<=filters.to));
 return <main className="workspace-content project-workspace utility-workspace ops-preview-root"
  id="mainContent" tabIndex={-1}>
  <header className="project-heading"><div><p className="utility-eyebrow">WORK / REPORTS</p>
   <h1>Project reports</h1>
   <p>An exportable view of project delivery, workload, milestones and engineering status.</p>
  </div></header>
  <section className="project-panel"><h2>Project reports</h2>
   <p className="ops-preview-caption">Synthetic report only. Authorized CSV export requires a backend.</p>
   <form className="delivery-controls ops-report-filters" onSubmit={e=>{
    e.preventDefault();setFilters({status,id:id.trim(),from,to});}}>
    <label>Project ID or key<input value={id} placeholder="Optional sample project key"
      onChange={e=>setId(e.target.value)}/></label>
    <label>Customer organization<select disabled><option>All authorized customers</option></select></label>
    <label>Project owner<select disabled><option>All authorized owners</option></select></label>
    <label>Project state<select value={status} onChange={e=>setStatus(e.target.value)}>
     <option value="">All states</option>
     {['planned','active','paused','completed','archived'].map(x=><option key={x}>{x}</option>)}
    </select></label>
    <label>Due from<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <label>Due through<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
    <button type="submit">Filter report</button></form>
   <p role="status" className="ops-preview-caption">{rows.length} example projects match</p>
   <button type="button" disabled>Download project summary CSV (up to 100 projects)</button>
   <div className="project-table-wrap"><table><thead><tr>
     {['Project','Lifecycle','Priority','Completed / total','Milestones','Due']
      .map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead>
     <tbody>{rows.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small>{p.key}</small></td>
       <td>{p.status}</td><td>{p.priority}</td><td>{completed(p)} / {activeTasks(p).length}</td>
       <td>{p.milestones.length}</td><td>{p.dueOn}</td></tr>)}</tbody>
   </table></div>
  </section></main>;
}
export function NotificationsPreview({notices}:{notices:Notice[]}) {
 const [search,setSearch]=useState('');
 const [onlyUnread,setOnlyUnread]=useState(false);
 const [preferences,setPreferences]=useState({assignments:true,delivery:true,overdue:true});
 const matching=notices.filter(n=>(!onlyUnread||!n.read)&&
  (n.title+' '+n.message).toLowerCase().includes(search.toLowerCase()));
 return <main className="workspace-content project-workspace utility-workspace ops-preview-root"
   id="mainContent" tabIndex={-1}>
   <header className="project-heading"><div><p className="utility-eyebrow">INBOX</p>
    <h1>Notifications</h1>
    <p>Project updates and assignment notices across your authorized work.</p>
   </div></header>
   <section className="project-panel"><h2>Your project inbox</h2>
    <p className="ops-preview-caption">Development preview — no delivery status or notifications are persisted.</p>
    <div className="ops-headline"><label>Search notifications<input type="search"
      value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label className="ops-inline-check"><input type="checkbox" checked={onlyUnread}
       onChange={e=>setOnlyUnread(e.target.checked)}/>Unread only</label>
    </div>
    <ol className="ops-history">{matching.map(n=><li key={n.id}>
      <strong>{n.title}</strong><span>{n.message}</span>
      <small>{n.date} · {n.read?'Read':'Unread'} · {n.kind}</small></li>)}</ol>
    {!matching.length&&<p>No notifications match this filter.</p>}
    <button type="button" disabled>Refresh inbox</button>
    <button type="button" disabled>Retry failed in-app delivery</button>
    <h2>Notification preferences</h2>
    <fieldset className="ops-pref-list"><legend>Local display controls only (not saved)</legend>
    {([
     ['assignments','Assignments'],
     ['delivery','Milestones and engineering changes'],
     ['overdue','Overdue tasks and milestones'],
    ] as const).map(([id,label])=><label className="ops-inline-check" key={id}>
     <input type="checkbox" checked={preferences[id]}
       onChange={e=>setPreferences({...preferences,[id]:e.target.checked})}/>{label}
    </label>)}</fieldset>
    <button type="button" disabled>Save notification preferences</button>
   </section>
 </main>;
}
