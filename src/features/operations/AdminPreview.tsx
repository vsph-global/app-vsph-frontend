'use client';
import { useState } from 'react';
import type {Employee, Organization, ProductRecord, AuditEvent} from './OperationsModels';
import type {ProjectModel} from '@/features/projects/ProjectModel';
type Mode='platform'|'products'|'onboarding'|'provisioning'|'managers';
type Tab='overview'|'organizations'|'applications'|'users'|'subscriptions'|'access'|'roles'|'permissions'|'audit';
const tabs:Tab[]=['overview','organizations','applications','users','subscriptions','access','roles','permissions','audit'];
const title=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const Disabled=({children}:{children:string})=>
 <button type="button" disabled>{children}</button>;
function AdminTable({columns,rows}:{columns:string[];rows:string[][]}) {
 return <div className="ops-table-scroll"><table className="ops-table"><thead><tr>
  {columns.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead>
  <tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table>
  {!rows.length&&<p className="ops-empty">No sample records available.</p>}</div>;
}
function AdminPanel({tab,organizations,products,employees,audit}:{
 tab:Tab;organizations:Organization[];products:ProductRecord[];employees:Employee[];audit:AuditEvent[];
}){
 const [query,setQuery]=useState('');
 const [auditKind,setAuditKind]=useState<'all'|'removals'>('all');
 const [auditQuery,setAuditQuery]=useState('');
 const scoped=employees.filter(e=>[e.fullName,e.email,e.department].some(
  s=>s.toLowerCase().includes(query.toLowerCase())));
 const events=audit.filter(e=>(auditKind==='all'||e.action==='Employee removed')&&
  [e.actor,e.action,e.target].join(' ').toLowerCase().includes(auditQuery.toLowerCase()));
 const subscriptions=organizations.flatMap(o=>o.subscriptions.map(s=>[o.name,s.product,s.plan,s.status,s.renewal]));
 switch(tab){
 case 'overview':return <>
  <section className="ops-admin-panel ops-admin-banner">
    <div><p className="utility-eyebrow">CUSTOMER ONBOARDING</p><h2>Create a customer organization</h2>
     <p>Create a dedicated organization, invite its owner and optionally configure reusable products.</p></div>
    <Disabled>New customer</Disabled></section>
  <section className="ops-admin-stats" aria-label="Platform summary">
    {[
      ['Organizations',organizations.length],['Users',employees.length+organizations.reduce((s,o)=>s+o.members.length,0)],
      ['Applications',products.length],
      ['Active / Trial subscriptions',subscriptions.filter(s=>['active','trial'].includes(s[3])).length],
      ['Enabled app grants',subscriptions.filter(s=>s[3]==='active').length]
    ].map(([name,count])=><div className="ops-admin-stat" key={name}>
      {name}<strong>{count}</strong></div>)}</section>
  <section className="ops-admin-panel"><h2>Before granting access</h2>
    <p>An organization requires an active or trial subscription and an enabled product grant.
      Each user also requires a separate assigned application role.</p></section>
 </>;
 case 'organizations':return <section className="ops-admin-panel">
  <h2>Organizations</h2><p>Customer creation starts in a separate governed onboarding workflow.</p>
  <AdminTable columns={['Organization','Lifecycle','Owner','Members']} rows={
   organizations.map(o=>[o.name,o.status,o.owner,String(o.members.length)])}/>
  <Disabled>Create organization</Disabled></section>;
 case 'applications':return <section className="ops-admin-panel"><h2>Application catalog</h2>
  <p>Registration and editing use atomic, audited changes in the real portal.</p>
  <AdminTable columns={['Code','Application','Status','Visibility']} rows={
   products.map(p=>[p.code,p.name,p.status,p.visibility])}/>
  <Disabled>Add application</Disabled></section>;
 case 'users':return <section className="ops-admin-panel"><h2>Users</h2>
  <p>Manage customer members through the organization workspace. Standalone identity changes
    require a governed invitation workflow.</p>
  <AdminTable columns={['Name','Email','Organization','Role']} rows={
   organizations.flatMap(o=>o.members.map(m=>[m.name,m.email,o.name,m.role]))}/>
  <Disabled>Invite customer member</Disabled></section>;
 case 'subscriptions':return <section className="ops-admin-panel">
  <h2>Create or update subscription</h2><p>One subscription per organization and application.</p>
  <div className="ops-form-grid">
   <label>Organization<select disabled><option>Select organization</option></select></label>
   <label>Application<select disabled><option>Select application</option></select></label>
   <label>Plan code<input readOnly disabled value="prototype"/></label>
   <label>Status<select disabled><option>active</option></select></label>
   <label>End date (optional)<input type="datetime-local" disabled/></label>
  </div><Disabled>Save subscription</Disabled><h2>Subscriptions</h2>
  <AdminTable columns={['Organization','Application','Plan','Status','Terms']}
    rows={subscriptions}/></section>;
 case 'access':return <section className="ops-admin-panel">
  <h2>Grant or change application access</h2>
  <p>Enabled access and an active/trial subscription must both be present.</p>
  <div className="ops-form-grid">
   <label>Organization<select disabled><option>Select organization</option></select></label>
   <label>Application<select disabled><option>Select product</option></select></label>
   <label>Access status<select disabled><option>enabled</option></select></label></div>
  <Disabled>Save app access</Disabled>
  <h2>Application access grants</h2>
  <AdminTable columns={['Organization','Application','Access','Plan']}
   rows={organizations.flatMap(o=>o.subscriptions.map(s=>[o.name,s.product,s.role,s.plan]))}/>
 </section>;
 case 'roles':return <section className="ops-admin-panel">
  <h2>Assign an individual application role</h2>
  <p>A subscription is not an individual user role. CRM and Music may assign different roles.</p>
  <div className="ops-form-grid"><label>Existing user email<input disabled placeholder="employee@example.invalid"/></label>
   <label>Organization<select disabled><option>Select organization</option></select></label>
   <label>Application<select disabled><option>Select application</option></select></label>
   <label>Role<select disabled><option>Viewer</option></select></label></div>
  <Disabled>Assign role</Disabled>
  <h2>Application role assignments</h2>
  <AdminTable columns={['Organization','Member','Role']}
   rows={organizations.flatMap(o=>o.members.map(m=>[o.name,m.name,m.role]))}/>
 </section>;
 case 'permissions':return <section className="ops-admin-panel">
  <h2>Workforce roles &amp; permissions</h2>
  <p>Only the platform owner may appoint or revoke HR managers. HR authority and
    product application roles are separate. Employee identity must be verified.</p>
  <label>Find employee<input type="search" value={query}
    onChange={e=>setQuery(e.target.value)} placeholder="Name, email or department"/></label>
  <AdminTable columns={['Employee','Department','HR authority','Action']}
   rows={scoped.map(e=>[e.fullName,e.department,e.isHr?'HR manager':'Employee','Review unavailable'])}/>
  <Disabled>Refresh HR roles</Disabled>
 </section>;
 case 'audit':return <section className="ops-admin-panel">
  <h2>Audit logs</h2>
  <p>Platform-owner audit activity. Employee-removal history is not exposed on
    ordinary HR employee management pages.</p>
  <div className="ops-tabs" role="group" aria-label="Audit categories">
   {(['all','removals'] as const).map(a=><button type="button" key={a}
      aria-pressed={auditKind===a} onClick={()=>setAuditKind(a)}>
      {a==='all'?'All events':'Employee removals'}</button>)}</div>
  <label>Search events<input value={auditQuery} type="search"
   onChange={e=>setAuditQuery(e.target.value)}/></label>
  <AdminTable columns={['When','Actor','Action','Target']}
   rows={events.map(e=>[e.when,e.actor,e.action,e.target])}/>
  <Disabled>Refresh history</Disabled>
 </section>;
 }
}
function ProductsCatalog({products}:{products:ProductRecord[]}) {
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState('');
 const shown=products.filter(p=>(p.code+' '+p.name).toLowerCase().includes(query.toLowerCase()));
 return <section className="ops-admin-panel">
  <div className="ops-headline"><h2>Product catalog</h2><Disabled>Register product</Disabled></div>
  <p>Reusable VSPH products are distinct from project-specific applications.</p>
  <label>Search registered products<input type="search" value={query}
   onChange={e=>setQuery(e.target.value)} placeholder="Name or code"/></label>
  <AdminTable columns={['Code','Name','Lifecycle','Visibility']}
   rows={shown.map(p=>[p.code,p.name,p.status,p.visibility])}/>
  <label>Inspect application<select value={selected} onChange={e=>setSelected(e.target.value)}>
    <option value="">Select a product</option>
    {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {products.filter(p=>p.id===selected).map(p=><div className="ops-detail-card" key={p.id}>
    <h3>{p.name}</h3><p>Code: {p.code} · {p.status} · {p.visibility}</p>
    <p>Application identity, ownership and integration readiness must be checked before editing.</p>
    <Disabled>Check integration readiness</Disabled><Disabled>Edit product</Disabled>
  </div>)}
 </section>;
}
function OnboardingWizard(){
 const [step,setStep]=useState(0);
 const steps=['Organization details','Assign the customer owner','Choose product access','Review and create'];
 return <section className="ops-admin-panel">
  <h2>Create an organization.</h2>
  <p>Guided setup preview only. No customer organization or invitation is created.</p>
  <div className="ops-step-row" role="group" aria-label="Customer onboarding steps">
   {steps.map((s,i)=><button type="button" key={s} onClick={()=>setStep(i)}
    className={step===i?'ops-step-current':''}>{i+1}. {s}</button>)}</div>
  {step===0?<div className="ops-form-grid">
    <label>Organization name<input value="Example Company" readOnly disabled/></label>
    <label>Identifier<input value="example-company" readOnly disabled/></label>
  </div>:step===1?<div className="ops-form-grid">
    <label>Customer owner<input value="Example Owner" readOnly disabled/></label>
    <label>Owner email<input value="owner@example.invalid" readOnly disabled/></label>
  </div>:step===2?<div className="ops-form-grid">
    <label>Product catalog<select disabled><option>CRM</option></select></label>
    <label>Subscription terms<select disabled><option>trial</option></select></label>
  </div>:<div className="ops-detail-card">
    <h3>Review and create</h3><p>Confirm the customer owner, organization identifier,
     entitlement terms and invitation delivery before committing a real setup.</p>
    <Disabled>Save and send invitation</Disabled></div>}
  <div className="ops-head-actions">
    <button type="button" disabled={step===0} onClick={()=>setStep(step-1)}>Previous</button>
    <button type="button" disabled={step===3} onClick={()=>setStep(step+1)}>Next</button></div>
 </section>;
}
function ProvisioningQueue(){
 return <section className="ops-admin-panel"><h2>Provisioning recovery</h2>
  <p>Failed or ambiguous provisioning jobs require reconciliation against the
   real identity and invitation systems. No workflow is replayed in this preview.</p>
  <div className="ops-detail-card"><h3>Example invitation dispatch</h3>
    <p>State: requires review · A real operator must check delivery evidence.</p>
    <Disabled>Retry provisioning</Disabled></div>
  <Disabled>Refresh jobs</Disabled>
 </section>;
}
function ManagerOverview({projects}:{projects:ProjectModel[]}) {
 const [query,setQuery]=useState('');
 const managers=[...new Set(projects.map(p=>p.manager))];
 return <section className="ops-admin-panel"><h2>Project leadership directory</h2>
 <p>Governance boundaries: workforce authority is separate from customer access
   and individual project assignments.</p>
 <label>Search project managers<input type="search" value={query}
  onChange={e=>setQuery(e.target.value)}/></label>
 <AdminTable columns={['Manager','Assigned projects','Active projects']} rows={
  managers.filter(m=>m.toLowerCase().includes(query.toLowerCase())).map(m=>[
   m,String(projects.filter(p=>p.manager===m).length),
   String(projects.filter(p=>p.manager===m&&p.status==='active').length)
  ])}/>
 <Disabled>Refresh manager overview</Disabled></section>;
}

export function AdminPreview({mode,organizations,products,employees,audit,projects,initialTab='overview'}:{
 mode:Mode;organizations:Organization[];products:ProductRecord[];
 employees:Employee[];audit:AuditEvent[];projects:ProjectModel[];initialTab?:Tab;
}){
 const [tab,setTab]=useState<Tab>(initialTab);
 const heading=mode==='platform'?'Platform administration':
  mode==='products'?'Product catalog':
  mode==='onboarding'?'Customer onboarding':
  mode==='provisioning'?'Provisioning recovery':'Project managers';
 return <main className="workspace-content ops-preview-root" id="mainContent" tabIndex={-1}>
  <section className="ops-admin-root">
   <header className="ops-title-row"><div><p className="utility-eyebrow">PLATFORM / ADMINISTRATION</p>
    <h1>{heading}</h1></div>
    <div className="ops-head-actions"><Disabled>New customer</Disabled></div>
   </header>
   <p className="ops-preview-caption">Fictional platform records only. Account provisioning,
    role grants and production actions are disabled.</p>
   {mode==='platform'?<>
      <nav className="ops-tabs" aria-label="Administration sections">
       {tabs.map(t=><button type="button" key={t} aria-current={tab===t?'page':undefined}
        onClick={()=>setTab(t)}>{t==='access'?'App Access':t==='roles'?'App Roles':
        t==='permissions'?'Roles & Permissions':t==='audit'?'Audit Logs':title(t)}</button>)}
      </nav>
      <AdminPanel tab={tab} organizations={organizations} products={products}
        employees={employees} audit={audit}/>
    </>:mode==='products'?<ProductsCatalog products={products}/>:
      mode==='onboarding'?<OnboardingWizard/>:
      mode==='provisioning'?<ProvisioningQueue/>:
      <ManagerOverview projects={projects}/>}
  </section>
 </main>;
}
