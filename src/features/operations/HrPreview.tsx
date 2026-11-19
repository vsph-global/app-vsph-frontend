'use client';
import { useState } from 'react';
import type { Employee,LeaveRequest,Attendance } from './OperationsModels';
type Mode='workspace'|'access'|'onboarding';
export function HrPreview({mode,employees,leave,attendance}:{
 mode:Mode;employees:Employee[];leave:LeaveRequest[];attendance:Attendance[];
}){
 const [status,setStatus]=useState<'all'|'pending'|'approved'|'rejected'>('all');
 const [search,setSearch]=useState('');
 const [page,setPage]=useState(0);
 const [step,setStep]=useState(0);
 const visible=leave.filter(l=>status==='all'||l.status===status);
 const access=employees.filter(e=>e.fullName.toLowerCase().includes(search.toLowerCase())||
  e.email.toLowerCase().includes(search.toLowerCase()));
 const title=mode==='access'?'HR access governance':mode==='onboarding'?'Onboard an employee.':'HR workspace';
 return <main className="workspace-content ops-preview-root" id="mainContent" tabIndex={-1}>
   <section className="hr-page">
    <header className="ops-title-row"><div><p className="utility-eyebrow">PEOPLE / HUMAN RESOURCES</p>
      <h1>{title}</h1><p>Illustrative records · No live workforce changes.</p></div></header>
    {mode==='workspace'?<div className="hr-grid">
      <section className="hr-panel"><div className="ops-headline">
        <h2>Leave review</h2>
        <select aria-label="Filter leave status" value={status}
          onChange={e=>setStatus(e.target.value as typeof status)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option><option value="approved">Approved</option>
          <option value="rejected">Rejected</option></select></div>
        {visible.map(l=><article className="hr-record" key={l.id}>
          <h3>{l.employee} · {l.type}</h3><p>{l.from} – {l.through}</p>
          <p className="muted">{l.reason} · {l.status}</p>
          {l.status==='pending'&&<div className="hr-actions">
            <button disabled type="button">Approve</button><button className="secondary" disabled type="button">Reject</button>
          </div>}
        </article>)}
        {!visible.length&&<p>No leave requests match the selected status.</p>}
      </section>
      <section className="hr-panel"><h2>Attendance records</h2>
        {attendance.map(a=><article className="hr-record" key={a.id}>
          <h3>{a.employee}</h3><p>{a.date} · {a.in} – {a.out}</p>
        </article>)}
        <button className="secondary" disabled type="button">Load more attendance</button>
      </section>
      <section className="hr-panel hr-wide"><h2>Management boundaries</h2>
        <p>HR can review approved employee and attendance records. Only the platform owner
          can grant HR authority or restore archived workforce records. No access grant is
          created by choosing a role in this preview.</p></section>
    </div>:mode==='access'?<div className="hr-grid">
     <section className="hr-panel hr-wide"><h2>Employee access</h2>
      <label>Search employee
       <input type="search" value={search} placeholder="Name or email"
         onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label>
      <div className="ops-table-scroll"><table className="ops-table"><thead><tr>
        {['Employee','Employment','Portal access','HR authority','Actions'].map(x=>
          <th scope="col" key={x}>{x}</th>)}</tr></thead><tbody>
        {access.slice(page*8,(page+1)*8).map(e=><tr key={e.id}>
          <td><strong>{e.fullName}</strong><small>{e.email}</small></td>
          <td>{e.status.replaceAll('_',' ')}</td><td>Requires verification</td>
          <td>{e.isHr?'HR manager':'Standard employee'}</td>
          <td><button type="button" className="secondary" disabled>Review permission change</button></td>
        </tr>)}</tbody></table></div>
      {access.length===0&&<p role="status">No employees match your search.</p>}
      <div className="hr-actions">
       <button type="button" className="secondary" disabled={page===0}
         onClick={()=>setPage(page-1)}>Previous</button>
       <span aria-live="polite">Showing {access.length?1+page*8:0}–{Math.min(access.length,(page+1)*8)} of {access.length}</span>
       <button type="button" className="secondary" disabled={(page+1)*8>=access.length}
         onClick={()=>setPage(page+1)}>Next</button></div>
     </section></div>:<div className="hr-grid">
       <section className="hr-panel hr-wide"><h2>Employee onboarding</h2>
         <p className="muted">Read-only wizard preview. Never enter real employee details here.</p>
         <div className="ops-step-row" role="group" aria-label="Employee onboarding steps">
           {['Identity','Employment','Review'].map((s,i)=><button key={s}
             type="button" className={i===step?'ops-step-current':''} onClick={()=>setStep(i)}>
             {i+1}. {s}</button>)}
         </div>
         {step===0?<div className="ops-form-grid">
          <label>Full name<input disabled value="Example Employee" readOnly/></label>
          <label>Work email<input disabled value="employee@example.invalid" readOnly/></label>
         </div>:step===1?<div className="ops-form-grid">
          <label>Department<select disabled defaultValue="Engineering"><option>Engineering</option></select></label>
          <label>Job title<input readOnly disabled value="Software Developer"/></label>
          <label>Employment type<select disabled defaultValue="intern"><option value="intern">Intern</option></select></label>
         </div>:<p>Confirm employee identity, department, and terms before any real invitation.
          Account activation requires the reviewed invitation service and employee consent.</p>}
         <div className="hr-actions"><button type="button" className="secondary"
           disabled={step===0} onClick={()=>setStep(step-1)}>Back</button>
          <button type="button" disabled={step===2}
           onClick={()=>setStep(step+1)}>Next</button>
          <button type="button" disabled>Complete onboarding</button></div>
       </section>
     </div>}
   </section>
 </main>;
}
