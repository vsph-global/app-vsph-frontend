'use client';

import {useState,type FormEvent} from 'react';
import {useWorkMutation} from './ProjectWorkControls';
import type {ProjectWorkforce,WorkforceMember,WorkforceAction} from './ProjectWorkforceContract';

type Context={projectId:string;version:number};
const label=(s:string)=>s.replaceAll('_',' ');
function Feedback({message,refresh}: {message:string;refresh:()=>void}) {
 return <p className="project-section-hint" role="status">{message}{' '}
  <button type="button" className="project-work-refresh" onClick={refresh}>Reload team</button>
 </p>;
}
function WorkforceAssignment({context,staff}:{
 context:Context;staff:WorkforceMember[];
}) {
 const [person,setPerson]=useState('');
 const [role,setRole]=useState<'contributor'|'viewer'>('contributor');
 const [team,setTeam]=useState('');
 const mutation=useWorkMutation(context);
 const candidates=staff.filter(x=>x.role!=='manager'||x.membership!=='active');
 async function submit(e:FormEvent<HTMLFormElement>) {
   e.preventDefault();
   if(!candidates.some(x=>x.userId===person)||!['viewer','contributor'].includes(role))return;
   if(await mutation.apply('/workforce/assign','POST',{userId:person,role,team})) {
    setPerson('');setRole('contributor');setTeam('');
   }
 }
 return <form className="project-live-form project-work-form" onSubmit={submit}>
   <h3>Add or update a project contributor</h3>
   <p className="project-section-hint">Only active, linked internal employees are listed.
     Customer accounts and manager appointments are excluded from this form.</p>
   <label>Eligible employee
     <select required value={person} onChange={e=>setPerson(e.target.value)}>
       <option value="">Select an employee…</option>
       {candidates.map(p=><option key={p.userId} value={p.userId}>
         {p.name}{p.membership==='active'?' · '+label(p.role||'member'):''}
         {p.department?' · '+p.department:''}
       </option>)}
     </select>
   </label>
   <label>Access
     <select value={role} onChange={e=>setRole(e.target.value as typeof role)}>
       <option value="contributor">Contributor — delivery and assigned task work</option>
       <option value="viewer">Viewer — read-only</option>
     </select>
   </label>
   <label>Team (optional)
     <input maxLength={100} value={team} onChange={e=>setTeam(e.target.value)}/>
   </label>
   {person&&role==='viewer'&&candidates.some(p=>p.userId===person&&p.openTasks>0)&&
     <p role="alert" className="feedback-state error-state">
       Reassign this employee&apos;s open tasks before downgrading to viewer.</p>}
   <button type="submit" disabled={!person||mutation.pending||mutation.applied||
     (role==='viewer'&&candidates.some(p=>p.userId===person&&p.openTasks>0))}>
     {mutation.pending?'Saving…':'Save employee access'}
   </button>
   {mutation.outcome&&<Feedback message={mutation.outcome.message}
     refresh={()=>mutation.router.refresh()}/>}
 </form>;
}
function ControlledAction({context,employee,action,title}:{
 context:Context;employee:WorkforceMember;
 action:Exclude<WorkforceAction,'assign'>;title:string;
}) {
 const mutation=useWorkMutation(context);
 const [confirmed,setConfirmed]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>) {
   e.preventDefault();
   if(!confirmed)return;
   if(await mutation.apply('/workforce/'+action,'POST',{userId:employee.userId}))
     setConfirmed(false);
 }
 return <form className="project-workforce-action" onSubmit={submit}>
   <label className="project-workforce-confirm">
     <input type="checkbox" checked={confirmed} disabled={mutation.pending||mutation.applied}
       onChange={e=>setConfirmed(e.target.checked)}/>
     Confirm {title.toLowerCase()} for {employee.name}
   </label>
   <button type="submit" disabled={!confirmed||mutation.pending||mutation.applied}>
     {mutation.pending?'Saving…':title}
   </button>
   {mutation.outcome&&<Feedback message={mutation.outcome.message}
     refresh={()=>mutation.router.refresh()}/>}
 </form>;
}
export function ProjectWorkforcePanel({context,data,ownerId}:{
 context:Context;data:ProjectWorkforce;ownerId:string;
}) {
 const active=data.staff.filter(p=>p.membership==='active');
 return <div className="project-workforce">
  <h3>Linked employee access</h3>
  <p className="project-section-hint">
    {active.length} active linked team members · {data.staff.length} eligible linked employees.
    The server decides whether a role or access change is permitted.
  </p>
  {active.length?<ul className="project-live-rows">
    {active.map(person=><li key={person.userId} className="project-workforce-member">
      <div><strong>{person.name}</strong>
        <span>{label(person.role||'member')}{person.team?' · '+person.team:''}
          {person.department?' · '+person.department:''}
          {person.openTasks>0?' · '+person.openTasks+' open tasks':''}
        </span></div>
      <div className="project-workforce-actions">
        {data.canAssign && person.role!=='manager' &&
          person.userId!==ownerId && person.openTasks===0 &&
          <ControlledAction context={context} employee={person} action="remove" title="Remove access"/>}
        {data.canAssign && data.canGovernManagers && person.userId!==ownerId &&
          (person.role==='viewer'||person.role==='contributor') &&
          <ControlledAction context={context} employee={person}
            action="manager-grant" title="Grant manager"/>}
        {data.canAssign && data.canGovernManagers && person.userId!==ownerId &&
          person.role==='manager' &&
          <ControlledAction context={context} employee={person}
            action="manager-revoke" title="Revoke manager"/>}
      </div>
    </li>)}
  </ul>:<p>No active linked employee assignments.</p>}
  {data.canAssign?<WorkforceAssignment context={context} staff={data.staff}/>:
   <p className="project-section-hint">This project is closed to staffing changes.</p>}
  <p className="project-section-hint">Manager governance is platform-owner-only.
    Removing an employee with unfinished assigned tasks is blocked by the backend.</p>
 </div>;
}
