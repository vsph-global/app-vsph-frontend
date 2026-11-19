'use client';
import {useState} from 'react';
import type {ProjectModel} from '@/features/projects/ProjectModel';
export function SearchPreview({projects}:{projects:ProjectModel[]}){
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState<'all'|'projects'|'tasks'|'milestones'>('all');
 const [submitted,setSubmitted]=useState({query:'',category:'all'});
 const results=projects.flatMap(project=>{
   const rows=[
    {kind:'projects',title:project.name,detail:project.key+' · '+project.status},
    ...project.tasks.map(t=>({kind:'tasks',title:t.title,detail:project.name+' · '+t.status})),
    ...project.milestones.map(m=>({kind:'milestones',title:m.title,detail:project.name+' · '+m.status}))
   ];
   return rows.filter(r=>(submitted.category==='all'||r.kind===submitted.category)&&
     (!submitted.query||(r.title+' '+r.detail).toLowerCase().includes(submitted.query.toLowerCase())));
 });
 return <main className="workspace-content project-workspace utility-workspace ops-preview-root"
   id="mainContent" tabIndex={-1}>
   <header className="project-heading"><div>
    <p className="utility-eyebrow">WORK / SEARCH</p><h1>Find project work</h1>
    <p>Search tasks, project names, and milestones across authorized workspaces.</p>
   </div></header>
   <section className="project-panel">
    <form className="ops-report-filters" onSubmit={e=>{
      e.preventDefault();setSubmitted({query:query.trim(),category});}}>
      <label>Search term<input type="search" maxLength={100} value={query}
       onChange={e=>setQuery(e.target.value)} placeholder="Project key, task or milestone"/></label>
      <label>Result type<select value={category}
       onChange={e=>setCategory(e.target.value as typeof category)}>
       <option value="all">All kinds</option><option value="projects">Projects</option>
       <option value="tasks">Tasks</option><option value="milestones">Milestones</option>
      </select></label>
      <button type="submit">Search work</button></form>
    <p role="status" className="ops-preview-caption">{results.length} fictional results</p>
    <ul className="ops-history">{results.slice(0,30).map((item,i)=><li key={i}>
      <strong>{item.title}</strong><span>{item.kind} · {item.detail}</span></li>)}</ul>
   </section>
 </main>;
}
