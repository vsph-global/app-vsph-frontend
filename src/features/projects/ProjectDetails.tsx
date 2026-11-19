'use client';
import { useState } from 'react';
import type { ProjectModel,ProjectTask } from './ProjectModel';
import { activeTasks,completed } from './ProjectModel';

type DetailTab='overview'|'tasks'|'milestones'|'team'|'applications'|'delivery'|'engineering'|'activity';
const tabs:DetailTab[]=['overview','tasks','milestones','team','applications','delivery','engineering','activity'];
const title=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1).replaceAll('_',' ');
const dueRank=(status:ProjectTask['status'])=>status==='blocked'?0:status==='in_progress'?1:2;
function Empty({children}:{children:string}){return <p className="project-v2-empty">{children}</p>}
function Label({children}:{children:string}){return <span className="project-v2-badge">{title(children)}</span>}
function Head({kicker,name}:{kicker:string;name:string}){return <div className="project-v2-card-head">
  <div><p className="project-v2-eyebrow">{kicker}</p><h2>{name}</h2></div></div>}

export function ProjectDetails({project,onBack}:{
 project:ProjectModel;onBack:()=>void;
}) {
 const [view,setView]=useState<DetailTab>('overview');
 const [filter,setFilter]=useState<'all'|'open'|'done'>('all');
 const work=activeTasks(project);
 const done=completed(project);
 const today=new Date().toISOString().slice(0,10);
 const overdue=work.filter(t=>t.status!=='done'&&t.dueOn&&t.dueOn<today).length+
   project.milestones.filter(m=>m.status!=='done'&&m.dueOn&&m.dueOn<today).length;
 const blocked=work.filter(t=>t.status==='blocked');
 const needsAttention=work.filter(t=>t.status==='blocked'||t.priority==='urgent')
   .sort((a,b)=>dueRank(a.status)-dueRank(b.status));
 const sorted=[...project.milestones].sort((a,b)=>a.dueOn.localeCompare(b.dueOn));
 const tasks=work.filter(t=>filter==='all'||(filter==='done'?t.status==='done':t.status!=='done'));
 const move=(v:DetailTab)=>{setView(v);setFilter('all');};
 return <main className="workspace-content project-workspace project-preview-workspace"
    id="mainContent" tabIndex={-1}>
   <header className="project-heading"><div><h1 id="projectTitle">{project.name}</h1>
     <p id="projectSubtitle">{project.key} · {project.kind} · {project.status} · Owner: {project.owner}</p></div>
     <div className="actions"><button type="button" disabled>Edit project</button></div>
   </header>
   <section id="projectDetail" className="project-v2" aria-label={project.name+' project workspace'}>
     <div className="project-v2-breadcrumb">
       <button type="button" className="project-preview-back" onClick={onBack}>← All projects</button>
       <span aria-hidden="true">/</span><span>{title(view)}</span></div>
     <div className="project-v2-meta"><Label>{project.kind}</Label><Label>{project.status}</Label>
       <Label>{project.priority}</Label><span className="project-v2-description">{project.description}</span></div>
     <nav className="project-sections project-v2-nav" aria-label="Project views">
       {tabs.map(tab=><button key={tab} type="button" aria-current={view===tab?'page':undefined}
         className={view===tab?'is-active':''} onClick={()=>move(tab)}>{title(tab)}</button>)}
       <span className="project-preview-disabled-tab" aria-disabled="true">Settings</span>
     </nav>

     {view==='overview'&&<section id="overview" className="project-view-pane" aria-label="Project overview">
       <div className="project-summary" aria-label="Key project metrics">
         {([
           ['Task completion',work.length?Math.round(done/work.length*100)+'%':'No tasks'],
           ['Completed / total',done+' / '+work.length],
           ['Overdue work',String(overdue)],
           ['Health',overdue||blocked.length?'Needs attention':!work.length?'Not started':'On track']
         ] as const).map(([label,value])=><div key={label}>{label}<strong>{value}</strong></div>)}
       </div>
       <div className="project-v2-overview-grid">
         <article className="project-v2-card"><Head kicker="FOCUS" name="Needs attention"/>
           {needsAttention.length?needsAttention.slice(0,4).map(t=>
             <div className="project-v2-action-row" key={t.id}>
               <span className="project-v2-action-marker">!</span>
               <div><strong>{t.title}</strong><p>{title(t.status)} · {t.dueOn}</p></div>
             </div>):<Empty>No urgent or blocked tasks.</Empty>}</article>
         <article className="project-v2-card"><div className="project-v2-card-head">
           <div><p className="project-v2-eyebrow">DELIVERY</p><h2>Milestone roadmap</h2></div>
           <button type="button" onClick={()=>move('milestones')}>View milestones</button></div>
           {sorted.slice(0,5).map(m=><div className="project-v2-milestone" key={m.id}>
             <span className={'project-v2-milestone-circle'+(m.status==='done'?' is-done':'')}/>
             <div className="project-v2-milestone-info"><strong>{m.title}</strong>
               <span>{m.dueOn} · {title(m.status)}</span></div></div>)}
         </article>
         <article className="project-v2-card"><Head kicker="OWNERSHIP" name="Risks & blockers"/>
           {blocked.length?blocked.map(t=><div className="project-v2-risk-row" key={t.id}>
             <strong>{t.title}</strong><p>{t.assignee} · {t.description||'Needs resolution'}</p>
           </div>):<Empty>No blocked tasks in this example.</Empty>}</article>
         <article className="project-v2-card"><Head kicker="REFERENCE" name="Project resources"/>
           {project.resources.map(item=><div className="project-v2-resource-row" key={item.title}>
             <div className="project-v2-resource-content"><strong>{item.title}</strong>
               <p>{item.description}</p></div></div>)}</article>
         <article className="project-v2-card project-v2-wide"><Head kicker="STATUS" name="Weekly updates"/>
           {project.updates.map(update=><div key={update.id} className="project-v2-update">
             <div className="project-v2-update-head"><strong>{update.summary}</strong>
               <span>{update.date} · {update.author}</span></div></div>)}</article>
       </div>
     </section>}

     {view==='tasks'&&<section className="project-panel" aria-label="Tasks">
       <div className="project-section-head"><h2>Tasks</h2>
         <button type="button" disabled>Assign a task</button></div>
       <div className="project-preview-task-filters" role="group" aria-label="Task filter">
         {(['all','open','done'] as const).map(value=><button type="button" key={value}
           aria-pressed={filter===value} onClick={()=>setFilter(value)}>{title(value)}</button>)}</div>
       <div className="project-table-wrap"><table><thead><tr>
         {['Task','Assignee','State','Priority','Due'].map(x=><th key={x} scope="col">{x}</th>)}
         </tr></thead><tbody>{tasks.map(t=><tr key={t.id}>
           <td><strong>{t.title}</strong><small>{t.description||'—'}</small></td>
           <td>{t.assignee}</td><td><Label>{t.status}</Label></td>
           <td>{title(t.priority)}</td><td>{t.dueOn}</td>
         </tr>)}</tbody></table>
         {!tasks.length&&<Empty>No tasks match this filter.</Empty>}
       </div></section>}

     {view==='milestones'&&<section className="project-panel" aria-label="Milestones">
       <div className="project-section-head"><h2>Milestones</h2>
         <button type="button" disabled>Create milestone</button></div>
       <div className="project-preview-milestones">{sorted.map(m=>{
         const checked=m.checks.filter(x=>x.done).length;
         return <article className="project-preview-milestone" key={m.id}>
           <div className="project-preview-milestone-head"><div><h3>{m.title}</h3>
             <p>Due {m.dueOn} · <Label>{m.status}</Label></p></div>
             <strong>{checked}/{m.checks.length}</strong></div>
           <progress max={Math.max(1,m.checks.length)} value={checked}
             aria-label={m.title+' checklist progress'}/>
           <ul className="project-preview-checklist">{m.checks.map(item=><li key={item.id}>
             <input type="checkbox" checked={item.done} disabled
               aria-label={item.title+' (preview only)'} readOnly/>
             <span>{item.title}</span></li>)}</ul>
         </article>;
       })}</div></section>}

     {view==='team'&&<section className="project-panel" aria-label="Team">
       <div className="project-section-head"><h2>Project team</h2>
         <button type="button" disabled>Add team member</button></div>
       <p className="project-section-hint">Project managers can grant access to eligible accounts
         within this project. HR authority and customer product access are managed separately.</p>
       <div className="project-table-wrap"><table><thead><tr>
         {['Member','Team','Project role','Status'].map(x=><th scope="col" key={x}>{x}</th>)}
         </tr></thead><tbody>{project.members.map(m=><tr key={m.id}>
           <td><strong>{m.name}</strong><small>{m.email}</small></td>
           <td>{m.team}</td><td>{title(m.role)}</td><td><Label>{m.status}</Label></td>
         </tr>)}</tbody></table></div></section>}

     {view==='applications'&&<section className="project-panel project-applications" aria-label="Applications">
       <div className="project-section-head"><h2>Applications</h2>
         <button type="button" disabled>New custom application</button></div>
       {(['product','custom'] as const).map(kind=><section className="project-app-group" key={kind}>
         <h3>{kind==='product'?'Linked VSPH products':'Custom project applications'}</h3>
         <p className="project-section-hint">{kind==='product'
           ?'A product link does not grant a customer subscription or application access.'
           :'Applications built specifically for this project are tracked separately.'}</p>
         <div className="project-app-cards">{project.applications.filter(a=>a.kind===kind).map(a=>
           <article className="project-app-card" key={a.id}>
             <div className="project-app-card-title"><strong>{a.name}</strong>
               <span className="project-app-state">{title(a.status)}</span></div>
             <p>{a.description}</p><span className="project-app-visibility">
               {a.shared?'Shared with authorized project viewers':'Internal only'}</span>
           </article>)}</div>
       </section>)}</section>}

     {view==='delivery'&&<section className="project-panel" aria-label="Delivery">
       <h2>Deliverables and comments</h2>
       <div className="project-preview-deliverables">{project.deliverables.map(d=>
         <article className="project-preview-deliverable" key={d.id}>
           <strong>{d.title}</strong><Label>{d.status}</Label></article>)}</div>
       <button type="button" disabled>Add deliverable</button></section>}

     {view==='engineering'&&<section className="project-panel" aria-label="Engineering">
       <h2>Engineering delivery</h2><p className="project-section-hint">
         Repository and deployment connections will appear only after the reviewed backend and
         authorized integrations are connected. No placeholder credentials or deployment status.</p>
       <button type="button" disabled>Connect repository</button></section>}

     {view==='activity'&&<section className="project-panel" aria-label="Activity history">
       <h2>Activity history</h2><p className="project-section-hint">
         Recorded mutations will be shown after authorization is connected.</p>
       <ol className="project-preview-activity">{project.events.map(e=>
         <li key={e.id}><strong>{e.label}</strong><span>{e.actor}</span>
           <small>{e.when}</small></li>)}</ol>
     </section>}
   </section>
 </main>;
}
