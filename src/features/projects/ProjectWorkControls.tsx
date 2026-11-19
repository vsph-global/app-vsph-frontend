'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { allowedNextStatuses } from './ProjectWorkContract';

type Props = { projectId:string; version:number };
type Outcome = { message:string; success:boolean };
export function useWorkMutation({projectId,version}: Props) {
  const router = useRouter();
  const lock = useRef(false);
  const [pending,setPending] = useState(false);
  const [settledVersion,setSettledVersion] = useState<number | null>(null);
  const [outcome,setOutcome] = useState<Outcome | null>(null);
  const applied = settledVersion === version;
  async function apply(relativePath: string, method:'POST'|'PATCH', values: Record<string,unknown>) {
    if (lock.current || applied) return false;
    lock.current = true;
    setPending(true);
    setOutcome(null);
    try {
      const response = await fetch('/api/projects/' + projectId + relativePath, {
        method, credentials:'same-origin', cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({version,...values}),
      });
      const payload:unknown = await response.json().catch(()=>null);
      if (response.status === 401) {
        setOutcome({success:false,message:'Session expired. Sign in again.'});
        router.push('/login');
        return false;
      }
      if (!response.ok) {
        setOutcome({success:false,message:
          payload && typeof payload === 'object' && 'message' in payload &&
          typeof payload.message === 'string' ? payload.message :
          'Work item change was not confirmed. Reload before retrying.'});
        return false;
      }
      if (!payload || typeof payload !== 'object' || !('version' in payload) ||
          payload.version !== version + 1) {
        setOutcome({success:false,message:'Update could not be verified. Reload before retrying.'});
        return false;
      }
      setSettledVersion(version);
      setOutcome({success:true,message:'Saved. Project details are refreshing.'});
      router.refresh();
      return true;
    } catch {
      setOutcome({success:false,message:
        'Request outcome is uncertain. Reload the project before retrying.'});
      return false;
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return {apply,pending,applied,outcome,router};
}
function Result({outcome, refresh}: {
  outcome:Outcome|null;refresh:()=>void;
}) {
  if (!outcome) return null;
  return <div className="project-work-result" role="status">
    <p className={outcome.success ? 'project-work-ok' : 'feedback-state error-state'}>{outcome.message}</p>
    {!outcome.success &&
      <button className="project-work-refresh" type="button" onClick={refresh}>Refresh project</button>}
  </div>;
}
const priorities=['low','normal','high','urgent'] as const;

export function TaskCreateForm(props:Props) {
  const [open,setOpen]=useState(false);
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [priority,setPriority]=useState<(typeof priorities)[number]>('normal');
  const [dueOn,setDueOn]=useState('');
  const request=useWorkMutation(props);
  async function onSubmit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (await request.apply('/tasks','POST',{title,description,priority,dueOn})) {
      setOpen(false);setTitle('');setDescription('');setDueOn('');setPriority('normal');
    }
  }
  return <div className="project-work-controls">
    {!open ? <button type="button" disabled={request.applied}
      onClick={()=>setOpen(true)}>Add task</button> :
      <form className="project-live-form project-work-form" onSubmit={onSubmit}>
        <h3>New task</h3>
        <label>Title<input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label>Description<textarea value={description} maxLength={5000}
          onChange={e=>setDescription(e.target.value)} rows={3}/></label>
        <label>Priority<select value={priority}
          onChange={e=>setPriority(e.target.value as typeof priority)}>
          {priorities.map(value=><option key={value} value={value}>{value}</option>)}
        </select></label>
        <label>Due date (optional)<input type="date" value={dueOn}
          onChange={e=>setDueOn(e.target.value)}/></label>
        <p className="project-section-hint">New tasks start as todo. Assignment and client sharing
          are not available in this phase.</p>
        <div className="project-live-form-actions">
          <button type="submit" disabled={request.pending || request.applied}>
            {request.pending?'Creating…':'Create task'}
          </button>
          <button type="button" disabled={request.pending} onClick={()=>setOpen(false)}>Cancel</button>
        </div>
      </form>}
    <Result outcome={request.outcome} refresh={()=>request.router.refresh()}/>
  </div>;
}

export function MilestoneCreateForm(props:Props) {
  const [open,setOpen]=useState(false);
  const [title,setTitle]=useState('');
  const [dueOn,setDueOn]=useState('');
  const request=useWorkMutation(props);
  async function onSubmit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (await request.apply('/milestones','POST',{title,dueOn})) {
      setOpen(false);setTitle('');setDueOn('');
    }
  }
  return <div className="project-work-controls">
    {!open ? <button type="button" disabled={request.applied}
      onClick={()=>setOpen(true)}>Add milestone</button> :
      <form className="project-live-form project-work-form" onSubmit={onSubmit}>
        <h3>New milestone</h3>
        <label>Title<input value={title} required maxLength={200}
          onChange={e=>setTitle(e.target.value)}/></label>
        <label>Due date (optional)<input type="date" value={dueOn}
          onChange={e=>setDueOn(e.target.value)}/></label>
        <p className="project-section-hint">New milestones start as planned and private.
          Project dependencies are configured separately.</p>
        <div className="project-live-form-actions">
          <button type="submit" disabled={request.pending || request.applied}>
            {request.pending?'Creating…':'Create milestone'}
          </button>
          <button type="button" disabled={request.pending} onClick={()=>setOpen(false)}>Cancel</button>
        </div>
      </form>}
    <Result outcome={request.outcome} refresh={()=>request.router.refresh()}/>
  </div>;
}

function StatusForm(props: Props & {entityId:string;current:string;kind:'task'|'milestone'}) {
  const request=useWorkMutation(props);
  const [next,setNext]=useState('');
  const options=allowedNextStatuses(props.kind === 'task'?'task-status':'milestone-status',props.current);
  if (!options.length) return null;
  return <form className="project-work-status" onSubmit={async e=>{
    e.preventDefault();
    if (!options.includes(next)) return;
    const segment=props.kind==='task'?'tasks':'milestones';
    if (await request.apply('/'+segment+'/'+props.entityId,'PATCH',{status:next})) setNext('');
  }}>
    <label>
      <span className="visually-hidden">Change {props.kind} status</span>
      <select value={next} aria-label={'Change '+props.kind+' status'}
        onChange={e=>setNext(e.target.value)} disabled={request.pending||request.applied}>
        <option value="">Move to…</option>
        {options.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}
      </select>
    </label>
    <button type="submit" disabled={!next||request.pending||request.applied}>
      {request.pending?'Saving…':'Apply'}
    </button>
    <Result outcome={request.outcome} refresh={()=>request.router.refresh()}/>
  </form>;
}

export function TaskStatusForm(props: Props & {entityId:string;current:string}) {
  return <StatusForm {...props} kind="task"/>;
}
export function MilestoneStatusForm(props: Props & {entityId:string;current:string}) {
  return <StatusForm {...props} kind="milestone"/>;
}


/** Comments are always private on this frontend; contributors never choose sharing.
 * Only the backend can determine who is permitted to post.
 */
export function ProjectCommentForm(props:Props) {
  const [open,setOpen]=useState(false);
  const [body,setBody]=useState('');
  const mutation=useWorkMutation(props);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(await mutation.apply('/comments','POST',{body})) {
      setBody('');
      setOpen(false);
    }
  }
  return <div className="project-work-controls">
    {!open ? <button type="button" disabled={mutation.applied}
      onClick={()=>setOpen(true)}>Add private comment</button> :
      <form className="project-live-form project-work-form" onSubmit={submit}>
        <h4>New project comment</h4>
        <label>Comment
          <textarea value={body} required rows={3} maxLength={4000}
            onChange={e=>setBody(e.target.value)}/>
        </label>
        <p className="project-section-hint">Private project-level comment. Client sharing and task
          attachment are not supported by this form.</p>
        <div className="project-live-form-actions">
          <button type="submit" disabled={!body.trim()||mutation.pending||mutation.applied}>
            {mutation.pending ? 'Saving…':'Post private comment'}
          </button>
          <button type="button" disabled={mutation.pending}
            onClick={()=>setOpen(false)}>Cancel</button>
        </div>
      </form>}
    <Result outcome={mutation.outcome} refresh={()=>mutation.router.refresh()}/>
  </div>;
}

/** Link-only delivery evidence. No uploads, no arbitrary HTML, no shared/client access. */
export function ProjectDeliverableForm(props:Props) {
  const [open,setOpen]=useState(false);
  const [title,setTitle]=useState('');
  const [url,setUrl]=useState('');
  const mutation=useWorkMutation(props);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(await mutation.apply('/deliverables','POST',{title,url})) {
      setTitle('');setUrl('');setOpen(false);
    }
  }
  return <div className="project-work-controls">
    {!open ? <button type="button" disabled={mutation.applied}
      onClick={()=>setOpen(true)}>Add evidence link</button> :
      <form className="project-live-form project-work-form" onSubmit={submit}>
        <h4>Record delivery evidence</h4>
        <label>Evidence title
          <input required maxLength={200} value={title}
            onChange={e=>setTitle(e.target.value)} placeholder="Build and test report"/>
        </label>
        <label>HTTPS evidence URL
          <input type="url" required maxLength={1800} value={url} pattern="https://.*"
            onChange={e=>setUrl(e.target.value)}
            placeholder="https://example.com/report"/>
        </label>
        <p className="project-section-hint">Private project-level HTTPS link only.
          Files, client sharing and task attachments require separate workflows.</p>
        <div className="project-live-form-actions">
          <button type="submit" disabled={mutation.pending||mutation.applied}>
            {mutation.pending ? 'Saving…':'Save evidence link'}
          </button>
          <button type="button" disabled={mutation.pending}
            onClick={()=>setOpen(false)}>Cancel</button>
        </div>
      </form>}
    <Result outcome={mutation.outcome} refresh={()=>mutation.router.refresh()}/>
  </div>;
}


/** Manager-only assignee selection; backend rejects anyone outside active project membership. */
export function TaskAssignmentForm({projectId,version,taskId,assigneeId,members}:Props & {
 taskId:string;assigneeId:string|null;
 members:{userId:string;name:string}[];
}) {
 const mutation=useWorkMutation({projectId,version});
 const [chosen,setChosen]=useState(assigneeId||'');
 const changed=chosen!==(assigneeId||'');
 async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   if(!changed || (chosen && !members.some(m=>m.userId===chosen)))return;
   await mutation.apply('/tasks/'+taskId+'/assignment','PATCH',{
     assigneeId:chosen||null
   });
 }
 return <form className="project-work-status" onSubmit={submit}>
   <label>
     <span className="visually-hidden">Assign task</span>
     <select aria-label="Assign task" value={chosen}
       disabled={mutation.pending||mutation.applied}
       onChange={e=>setChosen(e.target.value)}>
       <option value="">Unassigned</option>
       {members.map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}
     </select>
   </label>
   <button type="submit" disabled={!changed||mutation.pending||mutation.applied}>
     {mutation.pending?'Saving…':'Assign'}
   </button>
   <Result outcome={mutation.outcome} refresh={()=>mutation.router.refresh()}/>
 </form>;
}

/** Task thread form routes task ID via the URL, never through user-controlled JSON. */
export function TaskCommentForm({projectId,version,taskId}:Props & {taskId:string}) {
 const mutation=useWorkMutation({projectId,version});
 const [body,setBody]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   if(!body.trim())return;
   if(await mutation.apply('/tasks/'+taskId+'/comments','POST',{body}))setBody('');
 }
 return <form className="project-live-form project-work-form" onSubmit={submit}>
  <label>Reply to task
    <textarea rows={2} value={body} maxLength={4000} required
      onChange={e=>setBody(e.target.value)}
      placeholder="Write a private task note…"/>
  </label>
  <p className="project-section-hint">Private to authorized project users. No client sharing.</p>
  <button type="submit" disabled={!body.trim()||mutation.pending||mutation.applied}>
    {mutation.pending?'Saving…':'Post task comment'}
  </button>
  <Result outcome={mutation.outcome} refresh={()=>mutation.router.refresh()}/>
 </form>;
}
