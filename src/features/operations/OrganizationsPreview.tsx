'use client';
import { useState } from 'react';
import type { Organization } from './OperationsModels';

type Mode = 'customers'|'organizations';
const lifecycle=['active','suspended','closed'] as const;

export function OrganizationsPreview({organizations,mode}:{
 organizations:Organization[];mode:Mode;
}) {
 const [id,setId]=useState('');
 const [page,setPage]=useState(0);
 const [memberPage,setMemberPage]=useState(0);
 const [query,setQuery]=useState('');
 const [panel,setPanel]=useState<'overview'|'members'|'products'|'invitations'|'activity'>('overview');
 const selected=organizations.find(o=>o.id===id);
 const scoped=mode==='organizations'?organizations.filter(o=>o.status==='active'):organizations;
 const filtered=scoped.filter(o=>(o.name+' '+o.slug).toLowerCase().includes(query.toLowerCase()));
 const visible=filtered.slice(page*5,(page+1)*5);
 const owner=mode==='customers';
 return <main className="workspace-content ops-preview-root" id="mainContent" tabIndex={-1}>
  <section className="ops-project-page">
   <header className="ops-title-row">
    <div><p className="utility-eyebrow">{owner?'ADMINISTRATION / CUSTOMERS':'ORGANIZATIONS'}</p>
     <h1>{owner?'Customer workspace':'My organizations'}</h1>
     <p>{owner?'Manage client organizations, members and product access.':
       'Organization membership and subscriptions remain separate from project access.'}</p>
    </div>
    <div className="ops-head-actions"><button type="button" disabled>Refresh</button>
     {owner&&<button type="button" disabled>Create organization</button>}</div>
   </header>
   <p className="ops-preview-caption" role="status">Synthetic organizations only · No invitations or
    subscriptions are created from this screen.</p>
   <div className="ops-panel ops-org-controls">
    <label>Search organizations<input type="search" value={query} maxLength={80}
      onChange={e=>{setQuery(e.target.value);setPage(0);setId('');}}/></label>
    <label>Organization<select value={id} onChange={e=>{setId(e.target.value);setPanel('overview');setMemberPage(0);}}>
      <option value="">Select an organization</option>
      {scoped.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
    <div className="ops-page-controls">
      <button type="button" disabled={page===0} onClick={()=>setPage(page-1)}>Previous</button>
      <span>Page {page+1} of {Math.max(1,Math.ceil(filtered.length/5))}</span>
      <button type="button" disabled={(page+1)*5>=filtered.length}
        onClick={()=>setPage(page+1)}>Next</button>
    </div>
   </div>
   {!selected&&<section className="ops-panel" aria-label="Organization directory">
    <h2>{owner?'Customer directory':'Organization membership'}</h2>
    {visible.map(org=><button type="button" key={org.id} className="ops-org-row"
      onClick={()=>{setId(org.id);setPanel('overview');setMemberPage(0);}}>
      <strong>{org.name}</strong><span>{org.slug} · {org.status}</span>
      <small>{org.members.length} members · {org.subscriptions.length} product terms</small>
    </button>)}
    {visible.length===0&&<p>No organizations match your search.</p>}
   </section>}
   {selected&&<section aria-label={selected.name+' organization details'}>
    <div className="ops-panel">
      <div className="ops-headline">
       <div><h2>{selected.name}</h2><p>{selected.slug} · {selected.status} · Owner: {selected.owner}</p></div>
       <button type="button" onClick={()=>{setId('');setMemberPage(0);}}>All organizations</button>
      </div>
      <nav className="ops-tabs" aria-label="Organization sections">
       {(['overview','products','members','invitations','activity'] as const).map(p=>
        <button key={p} type="button" aria-current={panel===p?'page':undefined}
         onClick={()=>setPanel(p)}>{p[0].toUpperCase()+p.slice(1)}</button>)}
      </nav>
      {panel==='overview'&&<div className="ops-form-grid">
       <div><h3>Organization lifecycle</h3>
        <label>Status <select disabled value={selected.status} onChange={()=>{}}>
         {lifecycle.map(s=><option key={s}>{s}</option>)}</select></label>
        <p>Suspension and terminal closure have lasting access implications. No simulated
          lifecycle change is allowed.</p><button type="button" disabled>Review and save lifecycle</button></div>
       <div><h3>Organization profile</h3>
        <label>Organization display name<input readOnly value={selected.name}/></label>
        <p>Project assignments do not grant product subscriptions or organization roles.</p>
        <button type="button" disabled>Save organization name</button></div>
      </div>}
      {panel==='products'&&<>
       <h3>Subscribed products</h3>
       <p>Subscription terms describe access, not payments or revenue.
         Individual product roles require explicit assignment.</p>
       <div className="ops-table-scroll"><table className="ops-table"><thead><tr>
         {['Product','Plan','Subscription','Access role','Term'].map(x=><th scope="col" key={x}>{x}</th>)}
         </tr></thead><tbody>{selected.subscriptions.map(s=><tr key={s.product}>
         <td>{s.product}</td><td>{s.plan}</td><td>{s.status}</td><td>{s.role}</td>
         <td>{s.renewal}</td></tr>)}</tbody></table></div>
       <div className="ops-muted-actions"><button type="button" disabled>
        Review and save entitlement</button></div>
      </>}
      {panel==='members'&&<>
        <div className="ops-headline"><h3>Members and access</h3>
          <button type="button" disabled>Invite team member</button></div>
        <p>Invited users must accept before gaining access. Owner transfers and platform
          role changes require separate verified workflows.</p>
        <div className="ops-table-scroll"><table className="ops-table">
         <thead><tr>{['Member','Organization role','State','Management'].map(x=>
           <th scope="col" key={x}>{x}</th>)}</tr></thead>
         <tbody>{selected.members.slice(memberPage*5,(memberPage+1)*5).map(m=><tr key={m.id}>
          <td><strong>{m.name}</strong><small>{m.email}</small></td>
          <td>{m.role}</td><td>{m.status}</td>
          <td><button type="button" disabled>Edit access</button></td></tr>)}</tbody></table></div>
        <div className="ops-page-controls">
         <button type="button" disabled={memberPage===0} onClick={()=>setMemberPage(memberPage-1)}>Previous</button>
         <span>{selected.members.length} members</span>
         <button type="button" disabled={(memberPage+1)*5>=selected.members.length}
           onClick={()=>setMemberPage(memberPage+1)}>Next</button></div>
      </>}
      {panel==='invitations'&&<>
       <h3>{owner?'Invitations and delivery':'Your invitations'}</h3>
       <p>Expired invitations cannot be accepted; reissuing rotates the link and requires
         the configured invitation worker.</p>
       {selected.invites.map(i=><div className="ops-list-line" key={i.id}>
        <strong>{i.name}</strong><span>{i.status}</span><button type="button" disabled>
          Reissue invitation</button></div>)}
      </>}
      {panel==='activity'&&<>
       <h3>Recent {owner?'audited activity':'organization changes'}</h3>
       <ol className="ops-history">{selected.changes.map(c=><li key={c.id}>
        <strong>{c.event}</strong><span>{c.when}</span></li>)}</ol></>}
    </div>
   </section>}
  </section>
 </main>;
}
