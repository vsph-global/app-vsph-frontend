import type { Metadata } from 'next';
import Link from 'next/link';
import { loadLiveProjects } from '@/features/projects/project-server';
import { ProjectCreateForm } from '@/features/projects/ProjectCreateForm';
import '../../../(preview)/projects.css';
import '../../projects-live.css';

export const metadata: Metadata = {
  title: 'New internal project | VSPH Control Center',
  robots: { index: false, follow: false },
};
export default async function NewProjectPage() {
  // An affordance only: backend POST independently verifies owner authority.
  const access = await loadLiveProjects({ q: '', status: '', page: 1 });
  return <main className="workspace-content project-workspace" id="mainContent" tabIndex={-1}>
    <Link className="project-live-back" href="/projects">← All projects</Link>
    <h1 id="projectTitle">New internal project</h1>
    {access?.canCreate === true ? <ProjectCreateForm /> :
      <p role="alert" className="feedback-state error-state">
        Project creation is unavailable or your account does not have platform administrator access.
      </p>}
  </main>;
}
