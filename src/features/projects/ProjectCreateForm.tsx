'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

const priorities = ['low','normal','high','urgent'] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function ProjectCreateForm() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<(typeof priorities)[number]>('normal');
  const [startsOn, setStartsOn] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (startsOn && dueOn && dueOn < startsOn) {
      setError('Due date cannot be earlier than start date.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/projects', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, name, description, kind: 'internal',
          priority, startsOn, dueOn }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'message' in result &&
          typeof result.message === 'string' ? result.message : 'Project creation failed.';
        setError(message);
        if (response.status === 401) router.push('/login');
        return;
      }
      if (!result || typeof result !== 'object' || !('id' in result) ||
          typeof result.id !== 'string' || !uuid.test(result.id)) {
        setError('Could not confirm the new project. Check the portfolio before retrying.');
        return;
      }
      router.push('/projects/' + result.id);
      router.refresh();
    } catch {
      setError('Creation could not be confirmed. Check the portfolio before retrying.');
    } finally { setBusy(false); }
  }

  return <form className="project-live-form" onSubmit={submit}>
    <p className="project-section-hint">Internal projects only in this phase. Customer
      engagements require a reviewed organization selection flow.</p>
    <label>Project key
      <input value={key} required minLength={1} maxLength={20}
        pattern="[A-Z][A-Z0-9-]{0,19}"
        placeholder="PLATFORM-2026"
        onChange={e=>setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,''))}/>
    </label>
    <label>Project name
      <input value={name} required maxLength={150} onChange={e=>setName(e.target.value)}
        placeholder="Internal platform improvements"/>
    </label>
    <label>Description
      <textarea value={description} maxLength={5000} rows={4}
        onChange={e=>setDescription(e.target.value)}/>
    </label>
    <label>Priority
      <select value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}>
        {priorities.map(value=><option key={value} value={value}>{value}</option>)}
      </select>
    </label>
    <div className="project-live-form-dates">
      <label>Start date (optional)
        <input type="date" value={startsOn} onChange={e=>setStartsOn(e.target.value)}/>
      </label>
      <label>Due date (optional)
        <input type="date" value={dueOn} min={startsOn || undefined}
          onChange={e=>setDueOn(e.target.value)}/>
      </label>
    </div>
    {error && <p role="alert" className="feedback-state error-state">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create internal project'}</button>
  </form>;
}
