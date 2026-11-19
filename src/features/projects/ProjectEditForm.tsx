'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { ProjectDetail } from './ProjectDetailContract';

export function ProjectEditForm({ project }: { project: ProjectDetail['project'] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [priority, setPriority] = useState(project.priority);
  const [dueOn, setDueOn] = useState(project.due_on || '');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFeedback('');
    try {
      const response = await fetch('/api/projects/' + project.id, {
        method: 'PATCH', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: project.version, name, description, priority, dueOn }),
      });
      if (!response.ok) {
        const result: unknown = await response.json();
        setFeedback(result && typeof result === 'object' && 'message' in result &&
          typeof result.message === 'string' ? result.message : 'Update failed.');
        if (response.status === 401) router.push('/login');
        return;
      }
      setOpen(false);
      setFeedback('');
      router.refresh();
    } catch { setFeedback('Could not verify your edit. Reload the project before retrying.'); }
    finally { setBusy(false); }
  }
  return <section className="project-live-editor" aria-label="Edit project details">
    {!open ? <button type="button" onClick={()=>setOpen(true)}>Edit project</button> :
    <form className="project-live-form" onSubmit={submit}>
      <p className="project-section-hint">
        Changes use project version {project.version}. Concurrent edits require reloading.
      </p>
      <label>Name
        <input required maxLength={150} value={name} onChange={e=>setName(e.target.value)}/>
      </label>
      <label>Description
        <textarea rows={4} maxLength={5000} value={description}
          onChange={e=>setDescription(e.target.value)}/>
      </label>
      <label>Priority
        <select value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}>
          {(['low','normal','high','urgent'] as const).map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label>Due date
        <input type="date" value={dueOn} min={project.starts_on || undefined}
          onChange={e=>setDueOn(e.target.value)}/>
      </label>
      {feedback && <p role="alert" className="feedback-state error-state">{feedback}</p>}
      <div className="project-live-form-actions">
        <button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save project'}</button>
        <button disabled={busy} type="button" onClick={()=>{setOpen(false);setFeedback('');}}>
          Cancel
        </button>
      </div>
    </form>}
  </section>;
}
