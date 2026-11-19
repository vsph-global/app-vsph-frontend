'use client';
import {useState} from 'react';
import type {Employee,Organization} from './OperationsModels';
type Mode='outreach-access'|'employee-identity'|'music-launch';
const outreachRoles=['representative','manager','administrator','analyst'] as const;

export function AccessPreview({mode,employees,organizations}:{
 mode:Mode;employees:Employee[];organizations:Organization[];
}){
 const [employee,setEmployee]=useState('');
 const [role,setRole]=useState<(typeof outreachRoles)[number]>('representative');
 const [organization,setOrganization]=useState('');
 const [filter,setFilter]=useState('');
 const currentOrg=organizations.find(x=>x.id===organization);
 const grants=[
  {id:'g1',name:'Example Engineer',role:'representative',status:'active'},
  {id:'g2',name:'Example Specialist',role:'manager',status:'active'},
  {id:'g3',name:'Example Analyst',role:'analyst',status:'revoked'},
 ].filter(g=>g.name.toLowerCase().includes(filter.toLowerCase()));
 return <main className="workspace-content ops-preview-root" id="mainContent" tabIndex={-1}>
  {mode==='outreach-access'?<section className="ops-access-shell">
   <header className="ops-title-row"><div>
    <p className="utility-eyebrow">INTERNAL APPLICATION</p><h1>Outreach Access</h1></div></header>
   <p className="ops-preview-caption">Example access grants only. Actual Outreach permissions
    must be verified independently by the backend and cannot be assigned here.</p>
   <section className="ops-panel"><h2>Grant employee access</h2>
    <div className="ops-form-grid">
     <label>Employee account<select value={employee} onChange={e=>setEmployee(e.target.value)}>
       <option value="">Select an employee</option>
       {employees.filter(e=>e.status==='active').map(e=>
        <option value={e.id} key={e.id}>{e.fullName} · {e.email}</option>)}
      </select></label>
     <label>Outreach role<select value={role}
       onChange={e=>setRole(e.target.value as typeof role)}>
       {outreachRoles.map(r=><option value={r} key={r}>{r}</option>)}
      </select></label>
    </div>
    <p>Role selection only changes this local preview and grants nothing.</p>
    <button type="button" disabled>Grant access</button>
   </section>
   <section className="ops-panel"><div className="ops-headline"><h2>Existing grants</h2>
     <button type="button" disabled>Refresh</button></div>
     <label>Search example grants<input value={filter} type="search"
       onChange={e=>setFilter(e.target.value)}/></label>
     <div className="ops-table-scroll"><table className="ops-table">
      <thead><tr>{['Employee','Role','Status','Action'].map(x=>
        <th scope="col" key={x}>{x}</th>)}</tr></thead>
      <tbody>{grants.map(g=><tr key={g.id}><td>{g.name}</td><td>{g.role}</td>
        <td>{g.status}</td><td><button type="button" disabled>Change access</button></td></tr>)}</tbody>
     </table></div>
   </section>
  </section>:mode==='employee-identity'?<section className="ops-project-page">
   <header className="ops-title-row"><div><p className="utility-eyebrow">EMPLOYEE / ACCOUNT</p>
    <h1>Employee account &amp; access</h1></div>
    <button type="button" disabled>Refresh</button></header>
   <p className="ops-preview-caption">Account identity and employment records are examples.
    No real account link, invitation or approval is checked here.</p>
   <section id="identityContent" aria-label="Employee account link status">
    <div className="identity-dashboard-hero">
     <div className="identity-avatar" aria-hidden="true">EX</div>
     <div><h2>Example Employee</h2><p>employee@example.invalid · Demo identity</p></div>
    </div>
    <div className="identity-readiness"><h3>Employee identity</h3>
     <p>Portal account: Verification required</p>
     <p>Employee roster link: Not connected to a backend</p>
     <p>App and project roles are managed independently of employment.</p>
     <div className="identity-actions">
      <button type="button" disabled>Request account link</button>
      <button type="button" disabled>Review identity</button>
     </div>
    </div>
    <div className="identity-readiness"><h3>Access readiness</h3>
     <p>The real employee must have an active roster record, accepted account link,
       and separately granted HR or project permissions.</p>
     <p>Identity recovery cannot be completed with visual role selection.</p>
    </div>
   </section>
  </section>:<section className="ops-music-launch">
   <div className="ops-music-card">
    <p className="utility-eyebrow">APPLICATION LAUNCH</p>
    <h1>Open Music<span className="brand-dot">.</span></h1>
    <p className="ops-music-lead">Select the customer workspace you want to open.
      VSPH must verify your access before continuing to Music.</p>
    <label>Customer organization<select value={organization}
      onChange={e=>setOrganization(e.target.value)}>
      <option value="">Select example organization</option>
      {organizations.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}
    </select></label>
    <p className="ops-music-caption" role="status">
      {currentOrg?currentOrg.name+' is a fictional organization. Access is not verified.':
       'No organization or application role has been verified.'}
    </p>
    <button type="button" disabled>Continue to Music</button>
    <p className="ops-music-caption">Your Music role and organization must be verified again by
      the real application. No credentials should ever be included in launch links.</p>
   </div>
  </section>}
 </main>;
}
