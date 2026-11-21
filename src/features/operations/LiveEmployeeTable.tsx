'use client';

import {useState,type FormEvent} from 'react';
import {departments} from './OperationsModels';
import type {EmployeeStatus,EmployeeType,RosterEmployee} from './EmployeeLiveContract';

const statuses:EmployeeStatus[]=['onboarding','active','on_leave','inactive'];
const types:EmployeeType[]=['full_time','part_time','intern','contract'];
const display=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());

function EmployeeEditor({employee,onClose}:{employee:RosterEmployee;onClose:()=>void}){
 const [name,setName]=useState(employee.fullName);
 const [department,setDepartment]=useState(employee.department);
 const [jobTitle,setJobTitle]=useState(employee.jobTitle);
 const [employmentType,setEmploymentType]=useState(employee.employmentType);
 const [startDate,setStartDate]=useState(employee.startDate);
 const [status,setStatus]=useState(employee.status);
 const [confirmed,setConfirmed]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 async function save(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(!confirmed||saving||!departments.some(d=>d===department))return;
   setSaving(true);setError('');
   try{
     const response=await fetch('/api/employee-update/'+employee.id,{
       method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({fullName:name.trim(),department,jobTitle:jobTitle.trim(),
         employmentType,startDate,version:employee.version,status,confirmed:true})
     });
     if(response.status===401){window.location.assign('/login');return;}
     if(response.ok){window.location.reload();return;}
     const data:unknown=await response.json().catch(()=>null);
     setError(data&&typeof data==='object'&&'message' in data&&
       typeof data.message==='string'?data.message:'Employee update was not saved.');
   }catch{setError('The workforce service is unavailable. No update was confirmed.');}
   finally{setSaving(false);}
 }
 return <section className="employee-live-edit" aria-label={'Edit '+employee.fullName}>
   <div className="employee-live-edit-heading"><div>
     <h3>Edit employee</h3><p>{employee.fullName} · {employee.email}</p></div>
     <button type="button" disabled={saving} onClick={onClose}>Close</button>
   </div>
   <p>Email and linked identity are immutable here. HR access and employee removal
     require separate governed workflows.</p>
   {error&&<p role="alert" className="feedback-state error-state">{error}</p>}
   <form onSubmit={save}>
     <label>Full name <input value={name} maxLength={150} required disabled={saving}
       onChange={e=>setName(e.target.value)}/></label>
     <label>Department <select value={department} disabled={saving} required
       onChange={e=>setDepartment(e.target.value)}>
       {!departments.some(d=>d===department)&&
         <option value={department}>Review historical department before saving</option>}
       {departments.map(d=><option key={d} value={d}>{d}</option>)}
     </select></label>
     <label>Job title <input value={jobTitle} maxLength={120} required disabled={saving}
       onChange={e=>setJobTitle(e.target.value)}/></label>
     <label>Employment type <select value={employmentType} disabled={saving}
       onChange={e=>setEmploymentType(e.target.value as EmployeeType)}>
       {types.map(t=><option key={t} value={t}>{display(t)}</option>)}
     </select></label>
     <label>Start date <input type="date" required value={startDate} disabled={saving}
       onChange={e=>setStartDate(e.target.value)}/></label>
     <label>Roster status <select value={status} disabled={saving}
       onChange={e=>setStatus(e.target.value as EmployeeStatus)}>
       {statuses.map(s=><option key={s} value={s}>{display(s)}</option>)}
     </select></label>
     <label className="employee-live-confirm">
       <input type="checkbox" checked={confirmed} disabled={saving}
         onChange={e=>setConfirmed(e.target.checked)}/>
       I have reviewed this employee record and confirm the proposed changes.
     </label>
     <div className="employee-live-edit-actions">
       <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
       <button type="submit" disabled={saving||!confirmed||!name.trim()||
         !jobTitle.trim()||!departments.some(d=>d===department)}>
         {saving?'Saving…':'Save employee changes'}
       </button>
     </div>
   </form>
 </section>;
}

export function LiveEmployeeTable({employees,role}:{
 employees:readonly RosterEmployee[];role:'owner'|'hr';
}){
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const selected=employees.find(e=>e.id===selectedId)||null;
 return <>
   <div className="employee-live-table" role="region"
     aria-label="Authorized employee records" tabIndex={0}>
     <table><thead><tr>
       {['Employee','Department / title','Type','Status','Access','Manage'].map(c=>
         <th scope="col" key={c}>{c}</th>)}</tr></thead>
       <tbody>{employees.map(employee=>{
         const canEdit=role==='owner'||!employee.isHr;
         return <tr key={employee.id}>
           <td><strong>{employee.fullName}</strong><small>{employee.email}</small></td>
           <td>{employee.department}<small>{employee.jobTitle}</small></td>
           <td>{display(employee.employmentType)}</td>
           <td>{display(employee.status)}</td>
           <td>{employee.isHr?'HR manager':'Employee'}</td>
           <td>{canEdit?<button type="button" aria-expanded={selectedId===employee.id}
             onClick={()=>setSelectedId(selectedId===employee.id?null:employee.id)}>
             {selectedId===employee.id?'Close':'Edit'}</button>:
             <span>Owner-managed</span>}</td>
         </tr>;
       })}</tbody>
     </table>
     {!employees.length&&<p>No employees match these filters.</p>}
   </div>
   {selected&&(role==='owner'||!selected.isHr)&&
     <EmployeeEditor key={selected.id} employee={selected} onClose={()=>setSelectedId(null)}/>}
 </>;
}
