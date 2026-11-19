'use client';
import {useState} from 'react';

export function AccountPreview({mode,role}:{mode:'profile'|'security';
 role:'owner'|'employee'|'hr'|'customer'}){
 const [name,setName]=useState('Preview User');
 const [bio,setBio]=useState('This profile is an example for frontend design review.');
 const [zone,setZone]=useState('Asia/Kolkata');
 const [tone,setTone]=useState<'navy'|'blue'|'slate'>('navy');
 const [section,setSection]=useState<'profile'|'security'>(mode);
 const identity=role==='owner'?'Platform owner':role==='hr'?'HR manager':
  role==='employee'?'Workspace employee':'Organization member';
 return <main className="workspace-content ops-preview-root" id="mainContent" tabIndex={-1}>
  <section className="account-page">
   <header className="utility-page-head"><div><p className="utility-eyebrow">YOUR ACCOUNT</p>
     <h1>{section==='profile'?'Your profile':'Security & sessions'}</h1>
     {section==='security'&&<p>Review portal sessions and sign out other browsers.
       Device identities are not collected.</p>}</div>
    <nav aria-label="Account sections">
     <button type="button" aria-current={section==='profile'?'page':undefined}
       onClick={()=>setSection('profile')}>Personal details</button>
     <button type="button" aria-current={section==='security'?'page':undefined}
       onClick={()=>setSection('security')}>Security</button>
    </nav></header>
   <p className="ops-preview-caption" role="status">Development preview. This is not a signed-in
     identity, and no account or session information is read or saved.</p>
   {section==='profile'?<div className="account-grid">
     <aside className="account-preview">
      <div className="profile-avatar" data-tone={tone} aria-hidden="true">
       {name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'P'}
      </div>
      <h2>{name||'Preview User'}</h2><p>{bio||'Add a short introduction.'}</p>
      <p>preview@example.invalid</p><p>{identity}</p>
      <small>Your work record and access are managed separately.</small>
     </aside>
     <form id="profileForm" onSubmit={e=>e.preventDefault()}>
      <h2>Personal details</h2>
      <label>Display name<input name="displayName" value={name} required
       maxLength={150} autoComplete="off" onChange={e=>setName(e.target.value)}/></label>
      <label>About you<textarea name="bio" rows={4} maxLength={500} value={bio}
       onChange={e=>setBio(e.target.value)}
       placeholder="A short introduction (optional)"/></label>
      <label>Time zone<input name="timeZone" value={zone} maxLength={100}
       onChange={e=>setZone(e.target.value)} list="profileZones"/></label>
      <datalist id="profileZones">{['Asia/Kolkata','UTC','Asia/Singapore','Europe/London',
        'America/New_York'].map(x=><option value={x} key={x}/>)}</datalist>
      <fieldset><legend>Avatar color</legend>
       {(['navy','blue','slate'] as const).map(value=>
        <label key={value}><input type="radio" name="avatarTone" value={value}
          checked={tone===value} onChange={()=>setTone(value)}/>
          {value[0].toUpperCase()+value.slice(1)}</label>)}</fieldset>
      <p className="account-note">Email, employment status and permissions cannot be changed here.
       Avatar uses your initials; image uploads are unavailable.</p>
      <div className="account-actions">
       <button type="submit" disabled>Save profile</button>
       <button type="button" className="secondary" onClick={()=>{
         setName('Preview User');setBio('This profile is an example for frontend design review.');
         setZone('Asia/Kolkata');setTone('navy');
       }}>Reset preview</button></div>
     </form>
   </div>:<section className="utility-security-card" id="accountSessions">
      <h2>Active sessions</h2>
      <p>Revoking a session also terminates linked product sessions.
       Your current login remains active when you revoke other sessions.</p>
      <p className="ops-preview-caption">Illustrative sessions only. No device identifiers
       or tokens are displayed.</p>
      <ol className="utility-session-list">
       <li><div><strong>Current example session</strong><p>Browser · Active now (sample)</p></div>
        <span>Current</span></li>
       <li><div><strong>Other example session</strong><p>Browser · Last active earlier (sample)</p></div>
        <button type="button" disabled>Revoke session</button></li>
      </ol>
      <button type="button" className="utility-revoke" disabled>Revoke other sessions</button>
   </section>}
  </section>
 </main>;
}
