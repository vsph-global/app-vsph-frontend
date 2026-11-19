'use client';

import { useState } from 'react';
import { ApplicationsLibrary } from './ApplicationsLibrary';
import { DashboardSummary } from './DashboardSummary';
import { WorkspaceHeader } from './WorkspaceHeader';
import { OwnerDashboard } from './OwnerDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';
import { ownerPreviewData, employeePreviewData } from './RoleDashboardFixtures';
import { ProjectsPreview } from '@/features/projects/ProjectsPreview';
import { exampleProjects } from '@/features/projects/ProjectFixtures';
import type { HrAccess, PortalApp, PortalUser, ProductAccess } from './contracts';

// Deliberately synthetic. Never embed a real employee, tenant, credential,
// auth token, customer organization, or production metric in this preview.
const fixtures: PortalApp[] = [
  { id: 'sample-crm', code: 'CRM', name: 'CRM', status: 'active' },
  { id: 'sample-outreach', code: 'OUTREACH', name: 'Outreach', status: 'active' },
  { id: 'sample-music', code: 'MUSIC', name: 'Music', status: 'active' },
];
const access: ProductAccess[] = [
  { app: fixtures[0], organizations: [
    { name: 'Example Workspace', role: 'admin' },
    { name: 'Second Example', role: 'user' },
  ], internalRole: null, failed: false },
  { app: fixtures[1], organizations: [], internalRole: 'employee', failed: false },
  { app: fixtures[2], organizations: [], internalRole: null, failed: true },
];

type PreviewRole = 'owner' | 'employee' | 'customer';
type PreviewView = 'overview' | 'applications' | 'role-dashboard' | 'projects';

function previewIdentity(role: PreviewRole): { user: PortalUser; flags: HrAccess } {
  const defaults = { employee: false, pendingLink: false, management: false, governHr: false };
  if (role === 'owner') return {
    user: { id: 'sample-owner', name: 'Preview Owner', email: 'owner@example.invalid', platformRole: 'super_admin' },
    flags: { ...defaults, management: true, governHr: true },
  };
  if (role === 'employee') return {
    user: { id: 'sample-employee', name: 'Preview Employee', email: 'employee@example.invalid', platformRole: null },
    flags: { ...defaults, employee: true },
  };
  return {
    user: { id: 'sample-customer', name: 'Preview Customer', email: 'customer@example.invalid', platformRole: null },
    flags: defaults,
  };
}

export function WorkspacePreview() {
  const [role, setRole] = useState<PreviewRole>('owner');
  const [view, setView] = useState<PreviewView>('role-dashboard');
  const { user, flags } = previewIdentity(role);
  // Preview filtering does not confer real project authorization.
  const roleProjects = role === 'customer'
    ? exampleProjects.filter(p => p.id === 'sample-1')
    : exampleProjects;

  return (
    <div className="workspace-shell" data-development-preview="true">
      <div className="workspace-main">
        <a className="skip-link" href="#mainContent">Skip to content</a>
        <WorkspaceHeader user={user} flags={flags} accessFailed={false} previewMode />
        <section className="workspace-preview-toolbar" role="note"
          aria-label="Local preview; synthetic data only">
          <div className="workspace-preview-disclaimer">
            <strong>Development preview</strong>
            <span>Synthetic data only · Not authenticated · No backend requests</span>
          </div>
          <div className="workspace-preview-controls">
            <label htmlFor="previewRole">Navigation role</label>
            <select id="previewRole" value={role}
              onChange={event => setRole(event.target.value as PreviewRole)}>
              <option value="owner">Owner</option>
              <option value="employee">Employee</option>
              <option value="customer">Customer</option>
            </select>
            <div className="workspace-preview-toggle" role="group" aria-label="Preview section">
              <button type="button" aria-pressed={view === 'overview'}
                onClick={() => setView('overview')}>Overview</button>
              <button type="button" aria-pressed={view === 'applications'}
                onClick={() => setView('applications')}>Applications</button>
              <button type="button" aria-pressed={view === 'role-dashboard'}
                onClick={() => setView('role-dashboard')}>Role dashboard</button>
              <button type="button" aria-pressed={view === 'projects'}
                onClick={() => setView('projects')}>Projects</button>
            </div>
          </div>
        </section>
        {view === 'role-dashboard'
          ? <main className={'workspace-content role-preview-content role-preview-' + role}
              id="mainContent" tabIndex={-1}>
              {role === 'owner' ? <OwnerDashboard data={ownerPreviewData} /> :
                role === 'employee' ? <EmployeeDashboard data={employeePreviewData} /> :
                <section className="role-customer-note" aria-labelledby="customerNoteTitle">
                  <h1 id="customerNoteTitle">Customer workspace</h1>
                  <p>Customer accounts use the general access overview and assigned applications.
                    Internal employee and owner dashboards are not available to customers.</p>
                  <button type="button" onClick={() => setView('overview')}>
                    View access overview
                  </button>
                </section>}
            </main>
          : view === 'overview'
          ? <main className="workspace-content" id="mainContent" tabIndex={-1}>
              <section className="page-intro" id="overview" aria-labelledby="pageTitle">
                <h1 id="pageTitle">Your workspace<span className="title-period">.</span></h1>
                <p className="page-lead">Applications and access, all in one place.</p>
              </section>
              <DashboardSummary appCount={fixtures.length} workspaces={2}
                access={access} previewMode />
            </main>
          : view === 'projects' ? <ProjectsPreview projects={roleProjects}/>
          : <ApplicationsLibrary apps={fixtures} previewMode />}
      </div>
    </div>
  );
}
