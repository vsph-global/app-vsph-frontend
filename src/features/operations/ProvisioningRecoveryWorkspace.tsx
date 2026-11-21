'use client';
import Link from 'next/link';
import {useState} from 'react';
import {
  permittedRecoveryActions,type ProvisioningJob,type RecoveryAction
} from './ProvisioningLiveContract';

const label=(text:string)=>text.replaceAll('_',' ').replace(/\b\w/g,s=>s.toUpperCase());
const actionTitle:Record<RecoveryAction,string>={
 retry:'Retry delivery',revoke:'Revoke invitation',
 reissue:'Reissue invitation',recover:'Recover after reconciliation'
};
const explanation:Record<RecoveryAction,string>={
 retry:'Requeues the existing invitation delivery. It does not create another customer.',
 revoke:'Invalidates this invitation. Existing links cannot be used afterward.',
 reissue:'Invalidates the previous link and creates a new invitation generation. Check recipient and organization.',
 recover:'Only after verifying that the external Auth operation has finished and reconciling the identity state. The previous link will be invalidated.'
};
type Pending={job:ProvisioningJob;action:RecoveryAction};
export function ProvisioningRecoveryWorkspace({jobs}:{jobs:readonly ProvisioningJob[]}){
 const [pending,setPending]=useState<Pending|null>(null);
 const [phrase,setPhrase]=useState('');
 const [reconciled,setReconciled]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const required=pending?.action==='recover'?'RECONCILED':pending?.action.toUpperCase()??'';
 const accepted=phrase.trim()===required&&
   (pending?.action!=='recover'||reconciled);
 const queue=jobs.filter(j=>!['ready','revoked'].includes(j.state)).length;

 function choose(job:ProvisioningJob,action:RecoveryAction){
   if(busy)return;
   setPending({job,action});setPhrase('');setReconciled(false);setError('');
 }
 async function submit(){
   if(!pending||!accepted||busy)return;
   const {job,action}=pending;
   setBusy(true);setError('');
   try{
     const response=await fetch('/api/admin-provisioning/'+job.invitationId+'/'+action,{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({generation:job.generation,reconciled:action==='recover'})
     });
     if(response.status===401){window.location.assign('/login');return;}
     if(!response.ok){
       const result:unknown=await response.json().catch(()=>null);
       setError(result&&typeof result==='object'&&'message' in result&&
         typeof result.message==='string'?result.message:
         'Provisioning action could not be confirmed. Reload the queue.');
       return;
     }
     window.location.reload();
   }catch{
     setError('Connection interrupted. The action may have succeeded; reload the queue before trying again.');
   }finally{setBusy(false);}
 }
 return <main className="workspace-content admin-live-workspace" id="mainContent" tabIndex={-1}>
   <nav className="admin-live-breadcrumb" aria-label="Breadcrumb">
     <Link href="/admin">Administration</Link><span aria-hidden="true">/</span>
     <span>Provisioning</span>
   </nav>
   <header className="admin-live-heading"><div><h1>Provisioning recovery</h1>
     <p>Audited customer owner invitation delivery and reconciliation</p></div>
     <div className="admin-live-actions">
       <Link href="/admin/onboarding">Client onboarding</Link>
       <Link href="/admin/provisioning">Refresh queue</Link>
     </div>
   </header>
   <section className="admin-live-panel">
     <h2>Invitation delivery queue</h2>
     <p>Showing at most the most recent 100 provisioning jobs.
       The database controls action eligibility and account permissions.</p>
     <div className="admin-live-stat-grid">
       <div><span>Jobs shown</span><strong>{jobs.length}</strong></div>
       <div><span>Not ready or revoked</span><strong>{queue}</strong></div>
       <div><span>Requiring attention</span>
         <strong>{jobs.filter(j=>j.state==='requires_attention').length}</strong></div>
     </div>
     {error&&<p className="feedback-state error-state" role="alert">{error}</p>}
     {!jobs.length&&<p role="status">No provisioning jobs are in this result.</p>}
     <div className="admin-live-provisioning-list">
       {jobs.map(job=><article className="admin-live-job" key={job.invitationId}>
         <div className="admin-live-job-heading">
           <div><h3>{job.email}</h3><p>Organization ID: {job.organizationId}</p></div>
           <span className="admin-live-job-status">{label(job.state)}</span>
         </div>
         <dl className="admin-live-job-details">
           <div><dt>Invitation</dt><dd>{label(job.invitationState)}</dd></div>
           <div><dt>Generation</dt><dd>{job.generation}</dd></div>
           <div><dt>Delivery attempts</dt><dd>{job.attempts}</dd></div>
           <div><dt>Expires</dt><dd>{new Date(job.expiresAt).toLocaleString()}</dd></div>
           <div><dt>Failure code</dt><dd>{job.failureCode||'None reported'}</dd></div>
         </dl>
         <div className="admin-live-job-actions">
           {permittedRecoveryActions(job).map(action=>
             <button key={action} type="button" disabled={busy}
               onClick={()=>choose(job,action)}>{actionTitle[action]}</button>)}
           {!permittedRecoveryActions(job).length&&
             <span>There are no recommended actions for this invitation.</span>}
         </div>
       </article>)}
     </div>
   </section>
   {pending&&<section className="admin-live-panel admin-live-confirm"
     aria-label="Confirm invitation recovery action">
     <h2>{actionTitle[pending.action]}</h2>
     <p><strong>{pending.job.email}</strong> · Invitation generation {pending.job.generation}</p>
     <p>{explanation[pending.action]}</p>
     <p>This action is audited by the backend. It may invalidate existing invitation
       links, and it cannot be reversed by simply closing this page.</p>
     {pending.action==='recover'&&<label className="admin-live-check">
       <input type="checkbox" checked={reconciled} disabled={busy}
         onChange={event=>setReconciled(event.target.checked)}/>
       I have independently verified the external Auth operation has finished and
       reconciled the invitation/account state.
     </label>}
     <label className="admin-live-confirm-phrase">Type <strong>{required}</strong> to confirm
       <input type="text" autoComplete="off" value={phrase} disabled={busy}
         onChange={event=>setPhrase(event.target.value)}/></label>
     <div className="admin-live-job-actions">
       <button type="button" disabled={busy}
         onClick={()=>{setPending(null);setError('');}}>Cancel</button>
       <button type="button" disabled={busy||!accepted}
         onClick={()=>void submit()}>
         {busy?'Submitting…':'Confirm '+actionTitle[pending.action].toLowerCase()}
       </button>
     </div>
   </section>}
 </main>;
}
