'use client';
import { useMemo, useState } from 'react';
import { departments, type Employee, type EmployeeState } from './OperationsModels';
const states:EmployeeState[]=['onboarding','active','on_leave','inactive'];
const display=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
const current=(a:Employee[])=>a.filter(e=>e.status!=='archived');

export function PeopleDirectory({employees}:{employees:Employee[]}) {
 const [query,setQuery]=useState('');
 const [state,setState]=useState<'all'|EmployeeState>('all');
 const [page,setPage]=useState(0);
 const [archived,setArchived]=useState(false);
 const [selected,setSelected]=useState<Employee|null>(null);
 const active=current(employees);
 const rows=useMemo(()=>employees.filter(e=>(archived?e.status==='archived':e.status!=='archived')&&
  (state==='all'||e.status===state)&&
  [e.fullName,e.email,e.department,e.jobTitle].some(v=>v.toLowerCase().includes(query.toLowerCase().trim()))),
  [employees,archived,state,query]);
 const visible=rows.slice(page*8,(page+1)*8);
 const departCount=departments.map(d=>({name:d,count:active.filter(e=>e.department===d).length}));
 const max=Math.max(1,...departCount.map(d=>d.count));
 const showArchived=()=>{
   setArchived(!archived);setPage(0);setState('all');setQuery('');setSelected(null);
 };
 return <main className="workspace-content ops-preview-root" id="mainContent" tabIndex={-1}>
  <section className="people-shell">
   <header className="people-header">
    <div><h1>Employee management<span className="brand-dot">.</span></h1></div>
    <div className="people-header-actions">
     <button className="people-secondary" type="button" onClick={showArchived}>
       {archived?'Back to employees':'Archived employees'}</button>
     <button className="people-primary" type="button" disabled>Onboard employee</button>
    </div>
   </header>
   <p className="people-message ops-preview-caption" role="status">Preview only · No employment records are being accessed.</p>
   {!archived&&<>
    <section className="people-metrics" aria-label="Employee summary">
     {[
       ['Employees',active.length],
       ['Active',active.filter(e=>e.status==='active').length],
       ['Onboarding',active.filter(e=>e.status==='onboarding').length],
       ['On leave',active.filter(e=>e.status==='on_leave').length],
       ['HR managers',active.filter(e=>e.isHr).length],
     ].map(([label,value])=><article className="people-metric" key={label}>
       <span>{label}</span><strong>{value}</strong></article>)}
    </section>
    <div className="people-overview"><section className="people-panel" aria-labelledby="deptTitle">
      <div className="people-panel-head"><h2 id="deptTitle">Department allocation</h2></div>
      <div className="people-dept ops-department-chart" aria-label="Employees by department">
       {departCount.map(d=><div className="ops-dept-row" key={d.name}>
         <span>{d.name}</span><div className="ops-dept-track">
          <span style={{width:(d.count/max*100)+'%'}}/></div><strong>{d.count}</strong>
       </div>)}
      </div>
     </section></div>
   </>}
   <section className="people-panel" aria-labelledby="staffDirectoryTitle">
     <div className="people-panel-head"><div>
       <h2 id="staffDirectoryTitle">{archived?'Archived employees':'Staff directory'}</h2>
       <p className="people-small">Selecting a record shows read-only details.</p>
      </div><button className="people-secondary" type="button" disabled>Refresh</button></div>
     <div className="people-filters">
       <label htmlFor="employeeSearch">Search employees<input id="employeeSearch" type="search"
         placeholder="Name, email, department or title" maxLength={80} autoComplete="off"
         value={query} onChange={e=>{setQuery(e.target.value);setPage(0);setSelected(null);}}/></label>
       {!archived&&<label htmlFor="employeeStatus">Employee status
         <select id="employeeStatus" value={state} onChange={e=>{setState(e.target.value as typeof state);setPage(0);setSelected(null);}}>
           <option value="all">All statuses</option>
           {states.map(s=><option value={s} key={s}>{display(s)}</option>)}
         </select></label>}
     </div>
     <div className="people-table-wrap"><table className="people-table">
       <thead><tr>{['Employee','Department / title','Type','Status','Access','Manage']
         .map(x=><th key={x} scope="col">{x}</th>)}</tr></thead>
       <tbody>{visible.map(e=><tr key={e.id}>
         <td><strong>{e.fullName}</strong><small>{e.email}</small></td>
         <td>{e.department}<small>{e.jobTitle}</small></td>
         <td>{display(e.employmentType)}</td><td>{display(e.status)}</td>
         <td>{e.isHr?'HR manager':'Employee'}</td>
         <td><button type="button" className="people-secondary"
           onClick={()=>setSelected(e)}>View details</button></td>
       </tr>)}</tbody></table>
       {visible.length===0&&<p className="ops-empty">No employees match these filters.</p>}
     </div>
     <div className="people-page-actions">
       <button type="button" className="people-secondary" disabled={page===0}
         onClick={()=>setPage(Math.max(0,page-1))}>Previous page</button>
       <span>Showing {rows.length?1+page*8:0}–{Math.min(rows.length,(page+1)*8)} of {rows.length}</span>
       <button type="button" className="people-secondary" disabled={(page+1)*8>=rows.length}
         onClick={()=>setPage(page+1)}>Next page</button>
     </div>
   </section>
   {selected&&<section className="people-panel" aria-labelledby="editEmployeeTitle">
     <div className="people-panel-head"><div><h2 id="editEmployeeTitle">Employee details</h2>
       <p>{selected.fullName} · {selected.email}</p></div>
       <button className="people-secondary" type="button" onClick={()=>setSelected(null)}>Close</button>
     </div>
     <div className="people-form-grid">
       {[
         ['Full name',selected.fullName],['Department',selected.department],
         ['Job title',selected.jobTitle],['Employment type',display(selected.employmentType)],
         ['Start date',selected.startDate],['Roster status',display(selected.status)]
       ].map(([label,value])=><label key={label}>{label}
         <input readOnly value={value}/></label>)}
     </div>
     <p className="people-small">Email, employment status, permissions, and identity changes require
       verified backend authorization. Removal and restoration cannot be simulated here.</p>
     <button className="people-primary" type="button" disabled>Save employee changes</button>
   </section>}
  </section>
 </main>;
}
