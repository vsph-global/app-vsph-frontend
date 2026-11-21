'use client';
import Link from 'next/link';
import {useState,type FormEvent} from 'react';
import type {CustomerDetail,CustomerMember} from './CustomerLiveContract';

const roles:CustomerMember['role'][]=['owner','admin','member','viewer'];
const statuses=['active','suspended'] as const;
function CustomerMemberEditor({organizationId,member,onClose}:{
 organizationId:string;member:CustomerMember;onClose:()=>void;
}){
 const [role,setRole]=useState<CustomerMember['role']>(member.role);
 const [status,setStatus]=useState<'active'|'suspended'>(
   member.status==='suspended'?'suspended':'active');
 const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(busy||!confirmed||member.status==='invited')return;
   setError('');setBusy(true);
   try{
     const response=await fetch('/api/customer-member/'+organizationId,{
       method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({userId:member.userId,version:member.version,role,status})
     });
     if(response.status===401){window.location.assign('/login');return;}
     if(response.ok){window.location.reload();return;}
     const data:unknown=await response.json().catch(()=>null);
     setError(data&&typeof data==='object'&&'message' in data&&
       typeof data.message==='string'?data.message:'Membership was not updated.');
   }catch{setError('Customer service unavailable. No membership change confirmed.');}
   finally{setBusy(false);}
 }
 return <section className="customer-live-editor" aria-label={'Edit '+member.name+' membership'}>
   <div className="customer-live-editor-heading"><div><h2>Manage organization member</h2>
     <p>{member.name} · {member.email}</p></div>
     <button type="button" disabled={busy} onClick={onClose}>Close</button></div>
   <p>Changing an organization role does not itself grant product permissions.
     Suspending a membership revokes its application sessions.</p>
   {error&&<p className="feedback-state error-state" role="alert">{error}</p>}
   <form onSubmit={submit}>
     <label>Organization role <select disabled={busy} value={role}
       onChange={e=>setRole(e.target.value as CustomerMember['role'])}>
       {roles.map(r=><option value={r} key={r}>{r}</option>)}</select></label>
     <label>Membership status <select disabled={busy} value={status}
       onChange={e=>setStatus(e.target.value as 'active'|'suspended')}>
       {statuses.map(s=><option value={s} key={s}>{s}</option>)}</select></label>
     <label className="customer-live-confirm"><input type="checkbox" checked={confirmed}
       disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>
       I confirm this member&apos;s updated permissions and status.</label>
     <div className="customer-live-editor-actions">
       <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
       <button type="submit" disabled={busy||!confirmed||
         (role===member.role&&status===member.status)}>
         {busy?'Saving…':'Save membership changes'}</button>
     </div>
   </form>
 </section>;
}
export function CustomerMemberWorkspace({customer}:{customer:CustomerDetail}){
 const [selected,setSelected]=useState<string|null>(null);
 const {organization,members,products,invitationCount}=customer;
 const member=members.find(m=>m.userId===selected)||null;
 return <main className="workspace-content customer-live-workspace" id="mainContent" tabIndex={-1}>
   <nav className="customer-live-breadcrumb"><Link href="/admin/customers">Customers</Link>
     <span aria-hidden="true">/</span><span>{organization.name}</span></nav>
   <header className="customer-live-heading"><div><h1>{organization.name}</h1>
     <p>{organization.slug} · {organization.status} · Platform-owner management</p></div>
     <button type="button" onClick={()=>window.location.reload()}>Refresh</button>
   </header>
   <section className="customer-live-panel">
     <h2>Organization members</h2>
     <p>Membership and product access are independent. An active membership alone
       does not grant access to a VSPH application.</p>
     <div className="customer-live-table" tabIndex={0} role="region"
       aria-label="Customer organization members">
       <table><thead><tr>
         {['Member','Organization role','Status','Account','Manage'].map(s=>
           <th scope="col" key={s}>{s}</th>)}</tr></thead>
         <tbody>{members.map(m=><tr key={m.userId}>
           <td><strong>{m.name}</strong><small>{m.email}</small></td>
           <td>{m.role}</td><td>{m.status}</td><td>{m.accountStatus}</td>
           <td>{m.status!=='invited'?
             <button type="button" aria-expanded={selected===m.userId}
               onClick={()=>setSelected(selected===m.userId?null:m.userId)}>
               {selected===m.userId?'Close':'Manage'}
             </button>:<span>Invitation pending</span>}</td>
         </tr>)}</tbody></table>
       {!members.length&&<p>No current organization memberships.</p>}
     </div>
     {member&&member.status!=='invited'&&
       <CustomerMemberEditor key={member.userId} organizationId={organization.id}
         member={member} onClose={()=>setSelected(null)}/>}
   </section>
   <section className="customer-live-panel">
     <h2>Subscribed and linked products</h2>
     <div className="customer-live-table" tabIndex={0} role="region"
       aria-label="Customer applications">
       <table><thead><tr>
         {['Application','Access','Plan','Subscription'].map(s=>
           <th scope="col" key={s}>{s}</th>)}</tr></thead>
         <tbody>{products.map(p=><tr key={p.id}>
           <td><strong>{p.name}</strong><small>{p.code} · {p.status}</small></td>
           <td>{p.accessStatus}</td><td>{p.planCode||'—'}</td>
           <td>{p.subscriptionStatus||'—'}</td>
         </tr>)}</tbody></table>
       {!products.length&&<p>No linked applications.</p>}
     </div>
     <p>{invitationCount} recorded invitation entries in this bounded detail response.
       Delivery state is not inferred from the count.</p>
   </section>
 </main>;
}
