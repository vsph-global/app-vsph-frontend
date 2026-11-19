'use client';
import { useState } from 'react';
import type { ProjectModel,ProjectStatus } from './ProjectModel';
import { activeTasks,completed,lifecycle } from './ProjectModel';

export function ProjectPortfolio({projects,onOpen}:{
 projects:ProjectModel[];onOpen:(id:string)=>void;
}) {
 const [query,setQuery]=useState('');
 const [status,setStatus]=useState<ProjectStatus|''>('');
 const [page,setPage]=useState(1);
 const [applied,setApplied]=useState({q:'',status:''});
 const filtered=projects.filter(p=>{
   const terms=[p.name,p.key,p.kind,p.manager,p.description].join(' ').toLocaleLowerCase();
   return (!applied.q||terms.includes(applied.q.toLocaleLowerCase())) &&
      (!applied.status||p.status===applied.status);
 });
 const visible=filtered.slice(0,page*5);
 return <main className="workspace-content project-workspace project-preview-workspace"
   id="mainContent" tabIndex={-1}>
   <header className="project-heading"><div><h1 id="projectTitle">Projects</h1>
     <p id="projectSubtitle">Internal work and customer delivery, with explicit project access.</p></div>
     <div className="actions"><button type="button" disabled>Refresh</button>
       <button type="button" disabled>New project</button></div>
   </header>
   <section id="portfolio" aria-label="Project portfolio">
     <form className="project-filters" id="projectFilters"
       onSubmit={event=>{event.preventDefault();setApplied({q:query.trim(),status});setPage(1);}}>
       <label>Search projects<input name="q" maxLength={100} type="search" value={query}
         placeholder="Search by name, key or manager" onChange={event=>setQuery(event.target.value)}/></label>
       <label>Lifecycle<select name="status" value={status}
         onChange={event=>setStatus(event.target.value as ProjectStatus|'')}>
         <option value="">All states</option>
         {lifecycle.map(s=><option key={s} value={s}>{s}</option>)}
       </select></label>
       <button type="submit">Filter</button>
     </form>
     <p className="project-preview-count" role="status">
       Showing {visible.length} of {filtered.length} projects · Example records only
     </p>
     <div className="project-table-wrap" id="projectList">
       <table><thead><tr>
         {['Project','Ownership','State','Priority','Progress','Due'].map(name=>
           <th key={name} scope="col">{name}</th>)}</tr></thead>
         <tbody>{visible.map(p=>{
           const work=activeTasks(p);const done=completed(p);
           return <tr key={p.id}>
             <td><button className="project-preview-open" type="button"
               onClick={()=>onOpen(p.id)}>{p.name}</button>
               <small>{p.key} · Managed by {p.manager}</small></td>
             <td>{p.kind}</td>
             <td><span className={'project-preview-badge status-'+p.status}>{p.status}</span></td>
             <td>{p.priority}</td>
             <td><span>{done} / {work.length} tasks</span>
               <progress value={done} max={Math.max(1,work.length)}
                 aria-label={p.name+' task progress'} /></td>
             <td>{p.dueOn||'—'}</td>
           </tr>;
         })}</tbody>
       </table>
       {!visible.length&&<p className="project-preview-empty">No projects match these filters.</p>}
     </div>
     {visible.length<filtered.length&&<button className="project-preview-more" type="button"
       onClick={()=>setPage(page+1)}>Load more projects</button>}
   </section>
 </main>;
}
