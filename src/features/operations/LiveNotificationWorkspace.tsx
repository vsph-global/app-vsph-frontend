'use client';
import Link from 'next/link';
import {useState,type FormEvent} from 'react';
import type {NotificationInbox,NotificationPreferences} from './NotificationLiveContract';

export function LiveNotificationWorkspace({inbox,preferences}:{
 inbox:NotificationInbox;preferences:NotificationPreferences;
}){
 const [prefs,setPrefs]=useState(preferences);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const unread=inbox.notifications.filter(n=>n.readAt===null).length;
 async function mutate(operation:'read'|'preferences'|'retry',body:Record<string,unknown>){
   if(busy)return;
   setBusy(true);setError('');
   try{
     const response=await fetch('/api/notification-action/'+operation,{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
     });
     if(response.status===401){window.location.assign('/login');return;}
     if(!response.ok){
       const result:unknown=await response.json().catch(()=>null);
       setError(result&&typeof result==='object'&&'message' in result&&
         typeof result.message==='string'?result.message:
         'The change was not confirmed. Reload before trying again.');
       return;
     }
     // Backend remains authoritative for reads, delivery and preferences.
     window.location.reload();
   }catch{setError('The notification service could not be reached. No change was confirmed.');}
   finally{setBusy(false);}
 }
 function updatePreferences(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(busy)return;
   void mutate('preferences',prefs);
 }
 return <main className="workspace-content notice-live-workspace" id="mainContent" tabIndex={-1}>
   <header className="notice-live-heading"><div>
     <h1>Notifications</h1><p>Your project inbox · In-app delivery only</p>
   </div><button type="button" onClick={()=>window.location.reload()} disabled={busy}>
     Refresh</button></header>
   {error&&<p role="alert" className="feedback-state error-state">{error}</p>}
   <section className="notice-live-summary" aria-label="Inbox counts">
     <div><span>Unread in recent 100</span><strong>{unread}</strong></div>
     <div><span>Queued delivery</span><strong>{inbox.queued}</strong></div>
     <div><span>Delivery needs attention</span><strong>{inbox.attention}</strong></div>
   </section>
   {inbox.attention>0&&<section className="notice-live-panel">
     <h2>Some notifications need another delivery attempt</h2>
     <p>Retry will requeue entries for the current account. Delivery is still subject
       to your current project permissions and notification preferences.</p>
     <button type="button" disabled={busy} onClick={()=>void mutate('retry',{})}>
       Retry my pending deliveries</button>
   </section>}
   <section className="notice-live-panel">
     <h2>Recent project notices</h2>
     <p>Showing up to the latest 100 authorized notifications. Revoked project
       access cannot be recovered by opening a saved notice.</p>
     <div className="notice-live-list">
       {!inbox.notifications.length&&<p>No project notifications are available.</p>}
       {inbox.notifications.map(n=><article className="notice-live-item"
         key={n.id} data-unread={n.readAt===null?'true':undefined}>
         <div className="notice-live-item-body">
           <div><strong>{n.projectName}</strong>
             <span>{new Date(n.createdAt).toLocaleString()}</span></div>
           <h3>{n.title||n.eventType.replaceAll('.',' · ')}</h3>
           <p>{n.eventType.replaceAll('.',' · ')}</p>
           <Link href={'/projects/'+n.projectId}>Open project</Link>
         </div>
         {n.readAt===null?
           <button type="button" disabled={busy}
             onClick={()=>void mutate('read',{notificationId:n.id})}>Mark read</button>:
           <span className="notice-live-read">Read</span>}
       </article>)}
     </div>
   </section>
   <section className="notice-live-panel">
     <h2>Notification preferences</h2>
     <p>Updates apply only to this account and will not grant project access.</p>
     <form className="notice-live-preferences" onSubmit={updatePreferences}>
       {(['assignments','delivery','overdue'] as const).map(key=>
         <label key={key}><input type="checkbox" disabled={busy}
           checked={prefs[key]} onChange={e=>setPrefs(old=>({...old,[key]:e.target.checked}))}/>
           {key==='assignments'?'Task assignments':key==='delivery'?'Project delivery updates':'Overdue work'}
         </label>)}
       <button type="submit" disabled={busy||
         (prefs.assignments===preferences.assignments&&
           prefs.delivery===preferences.delivery&&prefs.overdue===preferences.overdue)}>
         {busy?'Saving…':'Save preferences'}</button>
     </form>
   </section>
 </main>;
}
