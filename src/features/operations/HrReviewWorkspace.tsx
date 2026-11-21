'use client';

import {useState,type FormEvent} from 'react';
import type {AttendanceRow,LeaveRow} from './HrLiveContract';

const display=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());

async function saveHr(kind:string,id:string,payload:Record<string,unknown>){
 const response=await fetch('/api/hr-actions/'+kind+'/'+id,{
   method:'POST',credentials:'same-origin',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
 });
 if(response.status===401){window.location.assign('/login');return;}
 if(response.ok){window.location.reload();return;}
 const body:unknown=await response.json().catch(()=>null);
 const message=body&&typeof body==='object'&&'message' in body&&
   typeof body.message==='string'?body.message:'HR operation failed.';
 throw Error(message);
}
function LeaveReview({record}:{record:LeaveRow}){
 const [decision,setDecision]=useState<'approved'|'rejected'>('approved');
 const [note,setNote]=useState('');
 const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   if(busy||!confirmed)return;
   setBusy(true);setError('');
   try{await saveHr('leave-review',record.id,{
     version:record.version,decision,note,confirmed:true
   });}catch(cause){setError(cause instanceof Error?cause.message:'Review failed.');}
   finally{setBusy(false);}
 }
 return <form className="hr-live-review" onSubmit={submit}>
   <label>Decision <select value={decision} disabled={busy}
     onChange={e=>setDecision(e.target.value as 'approved'|'rejected')}>
     <option value="approved">Approve</option><option value="rejected">Reject</option>
   </select></label>
   <label>Review note <textarea maxLength={300} value={note} disabled={busy}
     onChange={e=>setNote(e.target.value)} rows={2}/></label>
   <label className="hr-live-checkbox"><input type="checkbox" checked={confirmed}
     disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>
     Confirm this decision</label>
   <button type="submit" disabled={busy||!confirmed}>{busy?'Saving…':'Submit review'}</button>
   {error&&<p role="alert">{error}</p>}
 </form>;
}
function AttendanceRecovery({record}:{record:AttendanceRow}){
 const [note,setNote]=useState('');
 const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   if(busy||!confirmed||note.trim().length<8)return;
   setBusy(true);setError('');
   try{await saveHr('attendance-incomplete',record.id,{
     version:record.version,note:note.trim(),confirmed:true
   });}catch(cause){setError(cause instanceof Error?cause.message:'Correction failed.');}
   finally{setBusy(false);}
 }
 return <form className="hr-live-review" onSubmit={submit}>
   <label>Reason for incomplete attendance
     <textarea minLength={8} maxLength={300} required rows={2} disabled={busy}
       value={note} onChange={e=>setNote(e.target.value)}/></label>
   <label className="hr-live-checkbox"><input type="checkbox" checked={confirmed}
     disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>
     Confirm attendance correction</label>
   <button type="submit" disabled={busy||!confirmed||note.trim().length<8}>
     {busy?'Saving…':'Mark incomplete'}</button>
   {error&&<p role="alert">{error}</p>}
 </form>;
}
export function HrReviewWorkspace({leaves,attendance,role}:{
 leaves:readonly LeaveRow[];attendance:readonly AttendanceRow[];role:'owner'|'hr';
}){
 return <>
   <p>These records were filtered by the backend for your current {role==='owner'?'owner':'HR'} permission.
     Employees cannot approve their own leave requests.</p>
   <div className="hr-live-table" tabIndex={0} role="region" aria-label="Leave requests">
     <table><thead><tr>{['Employee','Dates','Type','Status','Reason','Review'].map(x=>
       <th scope="col" key={x}>{x}</th>)}</tr></thead>
       <tbody>{leaves.map(r=><tr key={r.id}>
         <td>{r.employeeName}</td><td>{r.startOn} – {r.endOn}</td>
         <td>{display(r.kind)}</td><td>{display(r.status)}</td>
         <td className="hr-live-reason">{r.reason}</td>
         <td>{r.status==='pending'?<LeaveReview record={r}/>:
           <span>{r.decisionNote||'Reviewed'}</span>}</td>
       </tr>)}</tbody></table>
     {!leaves.length&&<p>No leave requests match this filter.</p>}
   </div>
   <h2 className="hr-live-secondary-heading">Attendance records</h2>
   <div className="hr-live-table" tabIndex={0} role="region" aria-label="Attendance records">
     <table><thead><tr>{['Employee','Day','Checked in','Checked out','Status','Correction'].map(x=>
       <th scope="col" key={x}>{x}</th>)}</tr></thead>
       <tbody>{attendance.map(r=><tr key={r.id}>
         <td>{r.employeeName}</td><td>{r.workDay}</td>
         <td>{new Date(r.checkedInAt).toLocaleString()}</td>
         <td>{r.checkedOutAt?new Date(r.checkedOutAt).toLocaleString():'—'}</td>
         <td>{display(r.status)}</td>
         <td>{r.status==='open'?<AttendanceRecovery record={r}/>:
           <span>{r.recoveryNote||'No correction needed'}</span>}</td>
       </tr>)}</tbody></table>
     {!attendance.length&&<p>No attendance records available.</p>}
   </div>
 </>;
}
