'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState,type FormEvent} from 'react';
import {
 parseProfileChange,type OwnProfile,type ProfileTone
} from './AccountSelfServiceContract';
const timeZones=['UTC','Asia/Kolkata','Asia/Singapore','Asia/Tokyo',
 'Europe/London','Europe/Paris','America/New_York','America/Los_Angeles',
 'Australia/Sydney'];
export function ProfileWorkspace({profile}:{profile:OwnProfile}){
 const router=useRouter();
 const [name,setName]=useState(profile.displayName);
 const [bio,setBio]=useState(profile.bio);
 const [timeZone,setTimeZone]=useState(profile.timeZone);
 const [tone,setTone]=useState<ProfileTone>(profile.avatarTone);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const updated=name.trim()!==profile.displayName||bio!==profile.bio||
   timeZone!==profile.timeZone||tone!==profile.avatarTone;
 const initials=name.trim().split(/\s+/).filter(Boolean)
   .slice(0,2).map(part=>Array.from(part)[0]).join('').toUpperCase()||'—';
 async function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault();if(busy||!updated)return;
   const change=parseProfileChange({
     displayName:name,bio,timeZone,avatarTone:tone,version:profile.version
   });
   if(!change){setError('Review your display name, bio, IANA time zone, and avatar choice.');return;}
   setBusy(true);setError('');setNotice('');
   try{
     const response=await fetch('/api/account-profile',{
       method:'PATCH',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json'},body:JSON.stringify(change)
     });
     if(response.status===401){router.replace('/login');return;}
     if(!response.ok){
       const body:unknown=await response.json().catch(()=>null);
       setError(body&&typeof body==='object'&&'message' in body&&
         typeof body.message==='string'?body.message:
         'Profile could not be saved. Reload before retrying.');return;
     }
     setNotice('Your profile was saved. Email and account permissions were unchanged.');
     router.refresh();
   }catch{setError('Save status is uncertain. Reload your profile before retrying.');}
   finally{setBusy(false);}
 }
 return <main className="workspace-content account-live-workspace" id="mainContent" tabIndex={-1}>
   <header className="account-live-heading"><div><h1>Your profile</h1>
     <p>Your own workspace identity and preferences</p></div>
     <Link href="/account/security">Security & sessions</Link>
   </header>
   <section className="account-live-panel">
     <div className="account-live-profile-preview">
       <span className="account-live-avatar" data-tone={tone}>{initials}</span>
       <div><h2>{name.trim()||'Your name'}</h2>
         <p>{profile.email}</p>
         <p>{profile.platformRole==='super_admin'?'Platform owner':'Portal member'} · Account email immutable</p>
       </div>
     </div>
     {error&&<p className="account-live-error" role="alert">{error}</p>}
     {notice&&<p className="account-live-success" role="status">{notice}</p>}
     <form className="account-live-form" onSubmit={submit}>
       <label>Display name
         <input required maxLength={150} value={name} disabled={busy}
           onChange={e=>{setName(e.target.value);setNotice('');}}/>
       </label>
       <label>Bio (optional)
         <textarea rows={5} maxLength={500} value={bio} disabled={busy}
           onChange={e=>{setBio(e.target.value);setNotice('');}}/>
       </label>
       <label>IANA time zone
         <input required maxLength={100} value={timeZone} list="availableTimeZones"
           disabled={busy} onChange={e=>{setTimeZone(e.target.value);setNotice('');}}/>
         <datalist id="availableTimeZones">
           {timeZones.map(t=><option key={t} value={t}/>)}
         </datalist>
       </label>
       <fieldset className="account-live-tones" disabled={busy}>
         <legend>Initials-avatar color</legend>
         {(['navy','blue','slate'] as const).map(t=>
           <label key={t}><input type="radio" name="avatarTone"
             checked={tone===t} onChange={()=>setTone(t)}/>{t}</label>)}
       </fieldset>
       <p>Profile record version {profile.version} · Last updated
         {' '}{new Date(profile.updatedAt).toLocaleString()}.
         Concurrent updates must be reloaded before saving.</p>
       <div className="account-live-actions">
         <Link href="/dashboard">Dashboard</Link>
         <button type="submit" disabled={busy||!updated}>{busy?'Saving…':'Save profile'}</button>
       </div>
     </form>
   </section>
 </main>;
}
