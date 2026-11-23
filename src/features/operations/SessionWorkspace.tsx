'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import type {OwnSession} from './AccountSelfServiceContract';

export function SessionWorkspace({sessions}:{sessions:readonly OwnSession[]}){
 const router=useRouter();
 const [confirmation,setConfirmation]=useState(false);
 const [pending,setPending]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const others=sessions.filter(s=>!s.current);
 async function revoke(operation:string){
   if(busy||!confirmation)return;
   if(operation!=='others'&&!others.some(s=>s.id===operation))return;
   setBusy(true);setError('');setNotice('');
   try{
     const response=await fetch('/api/account-sessions/'+operation,{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json'},body:'{}'
     });
     if(response.status===401){router.replace('/login');return;}
     if(!response.ok){
       const result:unknown=await response.json().catch(()=>null);
       setError(result&&typeof result==='object'&&'message' in result&&
         typeof result.message==='string'?result.message:
         'Session revocation was not confirmed. Reload before retrying.');return;
     }
     const result:unknown=await response.json().catch(()=>null);
     const number=result&&typeof result==='object'&&'revoked' in result&&
       typeof result.revoked==='number'?result.revoked:0;
     setNotice(number+' other portal session(s) revoked. The current session remains active.');
     setConfirmation(false);setPending(null);
     router.refresh();
   }catch{setError('Session service unavailable. Reload before retrying.');}
   finally{setBusy(false);}
 }
 return <main className="workspace-content account-live-workspace" id="mainContent" tabIndex={-1}>
   <header className="account-live-heading"><div><h1>Security & sessions</h1>
     <p>Manage your own portal sessions without exposing session tokens</p></div>
     <Link href="/account/profile">Your profile</Link>
   </header>
   <section className="account-live-panel">
     <h2>Your active portal sessions</h2>
     <p>Showing up to 100 active sessions. This screen never reveals
       bearer tokens, session hashes or other accounts&apos; devices.</p>
     {error&&<p role="alert" className="account-live-error">{error}</p>}
     {notice&&<p role="status" className="account-live-success">{notice}</p>}
     <div className="account-live-sessions">
       {sessions.map(s=><article className="account-live-session" key={s.id}>
         <div><h3>{s.current?'Current session':'Other session'}</h3>
           <p>Created: {new Date(s.createdAt).toLocaleString()}</p>
           <p>Expires: {new Date(s.expiresAt).toLocaleString()}</p></div>
         {s.current?<span className="account-live-current">This browser</span>:
           <button type="button" disabled={busy}
             onClick={()=>{setPending(s.id);setConfirmation(false);setError('');}}>
             Revoke this session</button>}
       </article>)}
     </div>
     {others.length>0&&<div className="account-live-security-action">
       <h2>Sign out other sessions</h2>
       <p>Revoking other portal sessions can end their dependent application sessions.
         Your current signed-in session will remain active.</p>
       <button type="button" disabled={busy}
         onClick={()=>{setPending('others');setConfirmation(false);setError('');}}>
         Revoke all other sessions ({others.length} shown)
       </button>
     </div>}
     {pending&&<section className="account-live-session-confirm"
       aria-label="Confirm session revocation">
       <h2>Confirm session revocation</h2>
       <p>{pending==='others'?'Revoke every other active portal session.':
         'Revoke the selected other portal session.'}
         The backend checks your session and ownership before deleting anything.</p>
       <label className="account-live-check">
         <input type="checkbox" checked={confirmation} disabled={busy}
           onChange={e=>setConfirmation(e.target.checked)}/>
         I understand these other sessions will lose access.
       </label>
       <div className="account-live-actions">
         <button type="button" disabled={busy} onClick={()=>setPending(null)}>Cancel</button>
         <button type="button" disabled={!confirmation||busy}
           onClick={()=>void revoke(pending)}>
           {busy?'Revoking…':'Confirm revoke'}
         </button>
       </div>
     </section>}
   </section>
 </main>;
}
