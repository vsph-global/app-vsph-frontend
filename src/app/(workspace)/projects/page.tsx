import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { loadLiveProjects } from '@/features/projects/project-server';
import '../../(preview)/projects.css';
import '../projects-live.css';

export const metadata: Metadata = {
  title: 'Projects | VSPH Control Center',
  robots: { index: false, follow: false },
};
type Filters = { q?: string | string[]; status?: string | string[]; page?: string | string[] };
const statuses = ['planned', 'active', 'paused', 'completed', 'archived'] as const;
const one = (v: string | string[] | undefined): string | null =>
  v === undefined ? '' : typeof v === 'string' ? v : null;
function url(q: string, status: string, page = 1) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  return '/projects' + (params.size ? '?' + params : '');
}
function Warning({ text }: { text: string }) {
  return <p className="feedback-state error-state" role="alert">{text}</p>;
}

async function ProjectList({ searchParams }: { searchParams: Promise<Filters> }) {
  const raw = await searchParams;
  const qValue = one(raw.q), status = one(raw.status), pageValue = one(raw.page);
  const page = pageValue ? Number(pageValue) : 1;
  if (qValue === null || status === null || pageValue === null ||
      qValue.length > 100 || /[\u0000-\u001f\u007f]/.test(qValue) ||
      (status !== '' && !statuses.some(x => x === status)) ||
      !/^\d{1,2}$/.test(pageValue || '1') || page < 1 || page > 10) {
    return <Warning text="Invalid project filters. Clear your filters and retry."/>;
  }
  const q = qValue.trim();
  const result = await loadLiveProjects({ q, status, page });
  if (!result) return <Warning text="Projects unavailable. Your session or project access could not be verified."/>;
  const { projects, canCreate, hasMore } = result;
  return <>
    <header className="project-heading">
      <div><h1 id="projectTitle">Projects</h1>
        <p id="projectSubtitle">Internal work and customer delivery, with explicit project access.</p>
      </div>
      <div className="actions">
        <Link className="project-live-refresh" href={url(q, status)}>Refresh</Link>
        {canCreate && <button type="button" disabled title="Creation awaits the approved backend">
          New project
        </button>}
      </div>
    </header>
    <section id="portfolio" aria-label="Project portfolio">
      <form className="project-filters" id="projectFilters" action="/projects" method="get">
        <label>Search projects
          <input name="q" type="search" maxLength={100} defaultValue={q}
            placeholder="Search by name, key or manager"/>
        </label>
        <label>Lifecycle
          <select name="status" defaultValue={status}>
            <option value="">All states</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button type="submit">Filter</button>
      </form>
      <p role="status" className="project-live-count">Showing {projects.length} authorized projects</p>
      <div className="project-table-wrap" id="projectList" role="region"
        aria-label="Project portfolio table, horizontally scrollable" tabIndex={0}>
        <table><thead><tr>{['Project','Ownership','State','Priority','Progress','Due']
          .map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{projects.map(project => <tr key={project.id}>
            <td><strong>{project.name}</strong><small>{project.key}</small></td>
            <td>{project.kind}</td><td>{project.status}</td><td>{project.priority}</td>
            <td>{project.completed_tasks} / {project.total_tasks} tasks</td>
            <td>{project.due_on || '—'}</td>
          </tr>)}</tbody>
        </table>
        {!projects.length && <p className="project-live-empty">No projects match these filters.</p>}
      </div>
      {hasMore && page < 10 && <Link className="project-live-more"
        href={url(q, status, page + 1)}>Load more projects</Link>}
      {hasMore && page === 10 &&
        <p role="status">Showing the first 500 projects. Refine your search for more.</p>}
      <p className="project-section-hint">
        Project details and changes remain unavailable until the reviewed backend integration.
      </p>
    </section>
  </>;
}

export default function ProjectsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  return <main className="workspace-content project-workspace" id="mainContent" tabIndex={-1}>
    <Suspense fallback={<p role="status" className="loading-state">Checking project access…</p>}>
      <ProjectList searchParams={searchParams}/>
    </Suspense>
  </main>;
}
