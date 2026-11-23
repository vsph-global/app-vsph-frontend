'use client';
import Link from 'next/link';
import {useRef,useState,type FormEvent} from 'react';
import {departments} from './OperationsModels';
import type {EmployeeType} from './EmployeeLiveContract';

export function EmployeeOnboardForm(){
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [department,setDepartment]=useState('');
 const [jobTitle,setJobTitle]=useState('');
 const [employmentType,setEmploymentType]=useState<EmployeeType>('full_time');
 const [startDate,setStartDate]=useState('');
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState(false);
 const request=useRef<{signature:string;id:string}|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(saving||success||!name.trim()||!email.trim()||!department||!jobTitle.trim()||
     !startDate)return;
   const body={fullName:name.trim(),email:email.toLowerCase().trim(),department,
     jobTitle:jobTitle.trim(),employmentType,startDate};
   const signature=JSON.stringify(body);
   // For an uncertain network response, retry the identical payload with the same
   // UUID; editing any field creates a fresh idempotent attempt.
   if(!request.current||request.current.signature!==signature)
     request.current={signature,id:crypto.randomUUID()};
   setSaving(true);setError('');
   try{
     const response=await fetch('/api/employee-onboard',{
       method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/json','Idempotency-Key':request.current.id},
       body:signature
     });
     if(response.status===401){window.location.assign('/login');return;}
     if(response.ok){setSuccess(true);return;}
     const result:unknown=await response.json().catch(()=>null);
     setError(result&&typeof result==='object'&&'message' in result&&
       typeof result.message==='string'?result.message:
       'The employee record was not confirmed. Review the roster before retrying.');
   }catch{
     setError('Connection failed. Re-submit the same details to retry safely, or check the roster.');
   }finally{setSaving(false);}
 }
 return <main className="workspace-content employee-live-workspace" id="mainContent" tabIndex={-1}>
   <nav className="employee-live-breadcrumb" aria-label="Breadcrumb">
     <Link href="/employees">Employees</Link><span aria-hidden="true">/</span><span>Onboard</span>
   </nav>
   <header className="employee-live-heading">
     <div><h1>Onboard employee</h1>
       <p>Create an internal employee roster entry with approved department and employment details.</p></div>
   </header>
   <section className="employee-live-panel employee-live-onboard">
     {success?<div role="status" className="employee-live-success">
       <h2>Employee roster entry saved</h2>
       <p>Creating this record did not create a login account or send an invitation.
         Identity linking and employee access require their separate approved workflows.</p>
       <Link className="employee-live-action" href="/employees">Return to employee directory</Link>
     </div>:<>
       <p>Use the employee&apos;s actual work email. Existing and archived addresses cannot
         be silently reused.</p>
       {error&&<p className="feedback-state error-state" role="alert">{error}</p>}
       <form onSubmit={submit}>
         <label>Full name <input required maxLength={150} value={name} disabled={saving}
           onChange={e=>setName(e.target.value)}/></label>
         <label>Work email <input type="email" required maxLength={190} value={email}
           autoComplete="off" disabled={saving}
           onChange={e=>setEmail(e.target.value)}/></label>
         <label>Department <select required value={department} disabled={saving}
           onChange={e=>setDepartment(e.target.value)}>
           <option value="">Choose a department</option>
           {departments.map(d=><option key={d} value={d}>{d}</option>)}
         </select></label>
         <label>Job title <input required maxLength={120} value={jobTitle} disabled={saving}
           onChange={e=>setJobTitle(e.target.value)}/></label>
         <label>Employment type <select value={employmentType} disabled={saving}
           onChange={e=>setEmploymentType(e.target.value as EmployeeType)}>
           <option value="full_time">Full time</option>
           <option value="part_time">Part time</option>
           <option value="intern">Intern</option>
           <option value="contract">Contract</option>
         </select></label>
         <label>Employment start date <input type="date" required value={startDate}
           disabled={saving} onChange={e=>setStartDate(e.target.value)}/></label>
         <div className="employee-live-edit-actions">
           <Link href="/employees">Cancel</Link>
           <button type="submit" disabled={saving||!name.trim()||!email.trim()||
             !department||!jobTitle.trim()||!startDate}>
             {saving?'Saving roster…':'Save employee roster entry'}</button>
         </div>
       </form>
     </>}
   </section>
 </main>;
}
