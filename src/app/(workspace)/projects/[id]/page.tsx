import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { portalApi } from '@/features/workspace/server-api';
import { isProjectId, parseProjectDetail, type ProjectDetail } from '@/features/projects/ProjectDetailContract';
import { ProjectEditForm } from '@/features/projects/ProjectEditForm';
import { TaskCreateForm, MilestoneCreateForm, TaskStatusForm, MilestoneStatusForm,
  ProjectCommentForm, ProjectDeliverableForm, TaskAssignmentForm, TaskCommentForm } from '@/features/projects/ProjectWorkControls';
import {parseProjectWorkforce,type ProjectWorkforce} from '@/features/projects/ProjectWorkforceContract';
import {ProjectWorkforcePanel} from '@/features/projects/ProjectWorkforcePanel';
import {portalIdentity} from '@/features/workspace/contracts';
import '../../../(preview)/projects.css';
import '../../../(preview)/project-detail-v2.css';
import '../../projects-live.css';

export const metadata: Metadata = {
  title: 'Project details | VSPH Control Center',
  robots: { index: false, follow: false },
};

const title = (value: string) => value.replaceAll('_', ' ');
const date = (value: string | null) => value || '—';
const views = ['overview','tasks','milestones','team','applications','delivery','engineering','activity'] as const;

function LiveProject({ data, workforce, actorId }: { data: ProjectDetail; workforce: ProjectWorkforce|null; actorId:string|null }) {
  const { project: p, role, tasks, milestones, members, products, deliverables, comments, activity } = data;
  const completed = tasks.filter(t => t.status === 'done').length;
  const active = tasks.filter(t => t.status !== 'cancelled');
  // Availability of controls is only UX; project_command rechecks manager authority.
  const canManageWork = role === 'manager' && p.status !== 'completed' && p.status !== 'archived';
  const canComment = (role === 'manager' || role === 'contributor') &&
    p.status !== 'archived' && p.status !== 'completed';
  const canContribute = role === 'contributor' && p.status !== 'archived' && p.status !== 'completed';
  const assignable = members.filter(m=>m.status==='active' &&
    (m.role==='manager'||m.role==='contributor')).map(m=>({
      userId:m.user_id,name:m.full_name||'Member'
    }));
  return <main className="workspace-content project-workspace project-live-detail" id="mainContent" tabIndex={-1}>
    <header className="project-heading">
      <div>
        <Link className="project-live-back" href="/projects">← All projects</Link>
        <h1 id="projectTitle">{p.name}</h1>
        <p id="projectSubtitle">{p.key} · {title(p.kind)} · {title(p.status)} · Your role: {title(role)}</p>
      </div>
      {role === 'manager' && p.status !== 'archived' && <ProjectEditForm project={p} />}
    </header>
    <nav className="project-sections project-v2-nav" aria-label="Project views">
      {views.map(view => <a key={view} href={'#' + view}>{title(view)}</a>)}
    </nav>
    <section id="overview" className="project-v2-card project-live-section" aria-labelledby="live-overview">
      <h2 id="live-overview">Overview</h2>
      <p>{p.description || 'No description provided.'}</p>
      <div className="project-summary">
        <div>Tasks complete<strong>{completed} / {active.length}</strong></div>
        <div>Milestones<strong>{milestones.length}</strong></div>
        <div>Priority<strong>{title(p.priority)}</strong></div>
        <div>Due date<strong>{date(p.due_on)}</strong></div>
      </div>
    </section>
    <section id="tasks" className="project-v2-card project-live-section" aria-labelledby="live-tasks">
      <h2 id="live-tasks">Tasks</h2>
      {canManageWork && <TaskCreateForm projectId={p.id} version={p.version}/>}
      {tasks.length ? <div className="project-table-wrap" role="region"
        aria-label="Tasks table, horizontally scrollable" tabIndex={0}>
        <table><thead><tr>
          <th scope="col">Task</th><th scope="col">State</th><th scope="col">Priority</th><th scope="col">Due</th>
          {(canManageWork || (canContribute && tasks.some(t=>t.assignee_id===actorId))) &&
            <th scope="col">Change status</th>}
          {canManageWork && <th scope="col">Assignee</th>}
        </tr></thead><tbody>{tasks.map(task => <tr key={task.id}>
          <td>
            <strong>{task.title}</strong>{task.description && <small>{task.description}</small>}
            <details className="project-task-thread">
              <summary>Discussion ({comments.filter(c=>c.task_id===task.id).length})</summary>
              <ul className="project-live-rows">
                {comments.filter(c=>c.task_id===task.id).map(c=>
                  <li key={c.id}>{c.body}</li>)}
              </ul>
              {canComment && <TaskCommentForm projectId={p.id} version={p.version} taskId={task.id}/>}
            </details>
          </td>
          <td>{title(task.status)}</td><td>{title(task.priority)}</td><td>{date(task.due_on)}</td>
          {(canManageWork || (canContribute && tasks.some(t=>t.assignee_id===actorId))) &&
            <td>{(canManageWork || task.assignee_id===actorId) &&
              <TaskStatusForm projectId={p.id} version={p.version}
                entityId={task.id} current={task.status}/>}</td>}
          {canManageWork && <td>
            <TaskAssignmentForm projectId={p.id} version={p.version}
              taskId={task.id} assigneeId={task.assignee_id} members={assignable}/>
          </td>}
        </tr>)}</tbody></table></div> : <p>No visible tasks.</p>}
    </section>
    <section id="milestones" className="project-v2-card project-live-section" aria-labelledby="live-milestones">
      <h2 id="live-milestones">Milestones</h2>
      {canManageWork && <MilestoneCreateForm projectId={p.id} version={p.version}/>}
      {milestones.length ? <ul className="project-live-rows">
        {milestones.map(m => <li key={m.id}>
          <strong>{m.title}</strong><span>{title(m.status)} · Due {date(m.due_on)}</span>
          {canManageWork && <MilestoneStatusForm projectId={p.id} version={p.version}
            entityId={m.id} current={m.status}/>}
        </li>)}</ul> : <p>No visible milestones.</p>}
    </section>
    <section id="team" className="project-v2-card project-live-section" aria-labelledby="live-team">
      <h2 id="live-team">Project team</h2>
      {role==='manager' && (workforce ?
        <ProjectWorkforcePanel context={{projectId:p.id,version:p.version}}
          data={workforce} ownerId={p.owner_id}/> :
        <p role="alert" className="project-section-hint">Linked employee directory unavailable. Team changes are disabled.</p>)}
      {members.length ? <ul className="project-live-rows">
        {members.map(m => <li key={m.user_id}>
          <strong>{m.full_name || 'Project member'}</strong>
          <span>{title(m.role)} · {title(m.status)}</span>
        </li>)}</ul> : <p>No team details are visible to your account.</p>}
    </section>
    <section id="applications" className="project-v2-card project-live-section" aria-labelledby="live-apps">
      <h2 id="live-apps">Linked products</h2>
      <p className="project-section-hint">A project product link is metadata, not a subscription or application entitlement.</p>
      {products.length ? <ul className="project-live-rows">
        {products.map(product => <li key={product.id}><strong>{product.name}</strong></li>)}
      </ul> : <p>No linked products.</p>}
    </section>
    <section id="delivery" className="project-v2-card project-live-section" aria-labelledby="live-delivery">
      <h2 id="live-delivery">Delivery</h2>
      <h3>Deliverables</h3>
      {canManageWork && <ProjectDeliverableForm projectId={p.id} version={p.version}/>}
      {deliverables.length ? <ul className="project-live-rows">
        {deliverables.map(d => <li key={d.id}><strong>{d.title}</strong></li>)}
      </ul> : <p>No visible deliverables.</p>}
      <h3>Comments</h3>
      {canComment && <ProjectCommentForm projectId={p.id} version={p.version}/>}
      {comments.some(c=>c.task_id===null) ? <ul className="project-live-rows">
        {comments.filter(c=>c.task_id===null).map(comment => <li key={comment.id}><span>{comment.body}</span></li>)}
      </ul> : <p>No visible comments.</p>}
    </section>
    <section id="engineering" className="project-v2-card project-live-section" aria-labelledby="live-engineering">
      <h2 id="live-engineering">Engineering delivery</h2>
      <p>Repository and deployment integrations are not yet connected to this frontend.</p>
    </section>
    <section id="activity" className="project-v2-card project-live-section" aria-labelledby="live-activity">
      <h2 id="live-activity">Activity</h2>
      {activity.length ? <ul className="project-live-rows">
        {activity.map((item, index) => <li key={index}>
          <strong>{item.summary}</strong><span>{item.created_at}</span>
        </li>)}</ul> : <p>No visible activity.</p>}
    </section>
    <p className="project-section-hint" role="note">
      Backend-authorized view. Managers can assign tasks and govern eligible linked employees; contributors can post private task discussions and work on their assigned tasks. Client sharing, uploads and deployment integrations require separate reviewed workflows.
    </p>
  </main>;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isProjectId(id)) notFound();
  const result = await portalApi('/api/projects/' + id);
  if (result.kind === 'unauthorized') redirect('/login');
  const data = result.kind === 'ok' ? parseProjectDetail(result.value, id) : null;
  if (!data) return <main className="workspace-content" id="mainContent" tabIndex={-1}>
    <Link href="/projects">← All projects</Link>
    <p className="feedback-state error-state" role="alert">
      Project details unavailable. Check your project access or retry later.
    </p>
  </main>;
  const [workforceResult,identityResult] = await Promise.all([
    data.role === 'manager' ? portalApi('/api/projects/' + id + '/workforce') : Promise.resolve(null),
    data.role === 'contributor' ? portalApi('/api/auth/me') : Promise.resolve(null),
  ]);
  const workforce = workforceResult?.kind === 'ok' ?
    parseProjectWorkforce(workforceResult.value) : null;
  const actorId = identityResult?.kind === 'ok' ?
    portalIdentity(identityResult.value)?.id ?? null : null;
  return <LiveProject data={data} workforce={workforce} actorId={actorId}/>;
}
