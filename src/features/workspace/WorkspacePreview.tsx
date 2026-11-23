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
import { PeopleDirectory } from '@/features/operations/PeopleDirectory';
import { HrPreview } from '@/features/operations/HrPreview';
import { OrganizationsPreview } from '@/features/operations/OrganizationsPreview';
import { AdminPreview } from '@/features/operations/AdminPreview';
import { FinancePreview } from '@/features/operations/FinancePreview';
import { ReportsPreview, NotificationsPreview } from '@/features/operations/WorkUtilitiesPreview';
import { AccountPreview } from '@/features/operations/AccountPreview';
import { SearchPreview } from '@/features/operations/SearchPreview';
import { AccessPreview } from '@/features/operations/AccessPreview';
import { exampleEmployees, exampleLeaves, exampleAttendance,
  exampleOrganizations, exampleProducts, exampleInvoices, exampleReceipts,
  exampleAudit, exampleNotices } from '@/features/operations/OperationsFixtures';
import type { HrAccess, PortalApp, PortalUser, ProductAccess } from './contracts';

// Deliberately synthetic. Never embed real tenants, login credentials, or
// financial/HR records here. This file is reached only by the dev-only route.
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

type PreviewRole = 'owner' | 'employee' | 'hr' | 'customer';
type PreviewView = 'overview' | 'applications' | 'role-dashboard' | 'projects' |
 'people' | 'hr-workspace' | 'hr-access' | 'employee-onboarding' |
 'customers' | 'organizations' | 'admin' | 'products' | 'customer-onboarding' |
 'provisioning' | 'managers' | 'finance' | 'journal' | 'reports' |
 'notifications' | 'profile' | 'security' | 'search' |
 'outreach-access' | 'employee-identity' | 'music-launch';

type Screen = { id: PreviewView; label: string; roles: readonly PreviewRole[] };
const everyone: PreviewRole[] = ['owner', 'employee', 'hr', 'customer'];
const internal: PreviewRole[] = ['owner', 'hr'];
const ownerOnly: PreviewRole[] = ['owner'];
const screens: Screen[] = [
  { id: 'role-dashboard', label: 'Role dashboard', roles: everyone },
  { id: 'overview', label: 'Workspace overview', roles: everyone },
  { id: 'applications', label: 'Application library', roles: everyone },
  { id: 'projects', label: 'Projects', roles: everyone },
  { id: 'reports', label: 'Project reports', roles: everyone },
  { id: 'notifications', label: 'Notifications', roles: everyone },
  { id: 'search', label: 'Search project work', roles: everyone },
  { id: 'organizations', label: 'My organizations', roles: ['owner', 'customer'] },
  { id: 'people', label: 'Employee directory', roles: internal },
  { id: 'hr-workspace', label: 'HR workspace', roles: internal },
  { id: 'employee-onboarding', label: 'Employee onboarding', roles: internal },
  { id: 'hr-access', label: 'HR access governance', roles: ownerOnly },
  { id: 'customers', label: 'Customer directory', roles: ownerOnly },
  { id: 'admin', label: 'Platform administration', roles: ownerOnly },
  { id: 'products', label: 'Product catalog', roles: ownerOnly },
  { id: 'customer-onboarding', label: 'Customer onboarding', roles: ownerOnly },
  { id: 'provisioning', label: 'Provisioning recovery', roles: ownerOnly },
  { id: 'managers', label: 'Project managers', roles: ownerOnly },
  { id: 'finance', label: 'Finance ledger', roles: ownerOnly },
  { id: 'journal', label: 'Finance journal', roles: ownerOnly },
  { id: 'profile', label: 'Your profile', roles: everyone },
  { id: 'security', label: 'Security & sessions', roles: everyone },
  { id: 'outreach-access', label: 'Outreach Access', roles: ownerOnly },
  { id: 'employee-identity', label: 'Employee account & access', roles: ['owner','hr','employee'] },
  { id: 'music-launch', label: 'Music application chooser', roles: everyone },
];

const navViews: Record<string, PreviewView> = {
  '/dashboard': 'overview',
  '/dashboard#employeeDashboardWork': 'role-dashboard',
  '/applications': 'applications',
  '/projects': 'projects',
  '/reports': 'reports',
  '/notifications': 'notifications',
  '/search': 'search',
  '/organizations': 'organizations',
  '/employees': 'people',
  '/employment': 'employee-identity',
  '/apps/music/launch': 'music-launch',
  '/hr': 'hr-workspace',
  '/admin/customers': 'customers',
  '/admin/onboarding': 'customer-onboarding',
  '/admin/products': 'products',
  '/admin/project-managers': 'managers',
  '/admin': 'admin',
  '/admin/permissions': 'admin',
  '/admin?tab=permissions': 'admin',
  '/admin?tab=audit&view=removals': 'admin',
  '/admin/provisioning': 'provisioning',
  '/admin/finance': 'finance',
  '/admin/finance/journal': 'journal',
  '/admin/outreach-access': 'outreach-access',
  '/account/profile': 'profile',
  '/account/security': 'security',
};

function previewIdentity(role: PreviewRole): { user: PortalUser; flags: HrAccess } {
  const defaults = { employee: false, pendingLink: false, management: false, governHr: false };
  if (role === 'owner') return {
    user: { id: 'sample-owner', name: 'Preview Owner', email: 'owner@example.invalid',
      platformRole: 'super_admin' },
    flags: { ...defaults, management: true, governHr: true },
  };
  if (role === 'hr') return {
    user: { id: 'sample-hr', name: 'Preview HR', email: 'hr@example.invalid', platformRole: null },
    flags: { ...defaults, employee: true, management: true },
  };
  if (role === 'employee') return {
    user: { id: 'sample-employee', name: 'Preview Employee', email: 'employee@example.invalid',
      platformRole: null },
    flags: { ...defaults, employee: true },
  };
  return {
    user: { id: 'sample-customer', name: 'Preview Customer', email: 'customer@example.invalid',
      platformRole: null },
    flags: defaults,
  };
}

export function WorkspacePreview() {
  const [role, setRole] = useState<PreviewRole>('owner');
  const [view, setView] = useState<PreviewView>('role-dashboard');
  const [adminTab, setAdminTab] = useState<'overview' | 'permissions' | 'audit'>('overview');
  const { user, flags } = previewIdentity(role);
  const available = screens.filter(x => x.roles.includes(role));
  const activePreviewHref = view === 'admin' && adminTab === 'permissions'
    ? '/admin/permissions'
    : view === 'admin' && adminTab === 'audit'
    ? '/admin?tab=audit&view=removals'
    : Object.entries(navViews).find(
      ([href, target]) => target === view && !href.includes('?')
    )?.[0] ?? '';
  // Presentation scoping only: these sample slices are not authorization.
  // Actual project/org visibility must come from the backend's tenant checks.
  const roleProjects = role === 'customer'
    ? exampleProjects.filter(p => p.id === 'sample-1')
    : role === 'employee' || role === 'hr'
      ? exampleProjects.filter(p => p.status !== 'archived')
      : exampleProjects;
  const roleOrganizations = role === 'customer'
    ? exampleOrganizations.filter(o => o.id === 'org1')
    : exampleOrganizations;
  const roleApps = role === 'customer'
    ? fixtures.filter(app => app.code !== 'OUTREACH')
    : fixtures;
  const roleAccess = access.filter(item => roleApps.some(app => app.id === item.app.id));
  const changeRole = (nextRole: PreviewRole) => {
    setRole(nextRole);
    // Prevent privileged screens remaining visible under a different visual role.
    setView('role-dashboard');
    setAdminTab('overview');
  };
  const canNavigatePreview = (href: string) => {
    const target = navViews[href];
    return Boolean(target && screens.some(s => s.id === target && s.roles.includes(role)));
  };
  const navigatePreview = (href: string) => {
    const target = navViews[href];
    if (target && canNavigatePreview(href)) {
      if (target === 'admin') {
        setAdminTab(href === '/admin/permissions' || href.includes('tab=permissions') ? 'permissions' :
          href.includes('tab=audit') ? 'audit' : 'overview');
      }
      setView(target);
    }
  };
  return (
    <div className="workspace-shell" data-development-preview="true"
      data-preview-role={role} data-preview-view={view}>
      <div className="workspace-main">
        <a className="skip-link" href="#mainContent">Skip to content</a>
        <WorkspaceHeader user={user} flags={flags} accessFailed={false} previewMode
          onPreviewNavigate={navigatePreview} canPreviewNavigate={canNavigatePreview}
          previewActiveHref={activePreviewHref} />
        <section className="workspace-preview-toolbar" role="note"
          aria-label="Local preview; synthetic data only">
          <div className="workspace-preview-disclaimer">
            <strong>Development preview</strong>
            <span>Synthetic data only · Not authenticated · No backend requests</span>
          </div>
          <div className="workspace-preview-controls">
            <label htmlFor="previewRole">Navigation role</label>
            <select id="previewRole" value={role}
              onChange={event => changeRole(event.target.value as PreviewRole)}>
              <option value="owner">Owner</option>
              <option value="employee">Employee</option>
              <option value="hr">HR manager</option>
              <option value="customer">Customer</option>
            </select>
            <label htmlFor="previewScreen">Preview screen</label>
            <select id="previewScreen" value={view}
              onChange={event => {
                setView(event.target.value as PreviewView);
                setAdminTab('overview');
              }}>
              {available.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
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
                role === 'employee' || role === 'hr'
                  ? <EmployeeDashboard data={employeePreviewData} /> :
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
              <DashboardSummary appCount={roleApps.length} workspaces={roleOrganizations.length}
                access={roleAccess} previewMode />
            </main>
          : view === 'projects' ? <ProjectsPreview projects={roleProjects}/>
          : view === 'people' ? <PeopleDirectory employees={exampleEmployees}/>
          : view === 'hr-workspace' || view === 'hr-access' || view === 'employee-onboarding'
            ? <HrPreview key={view} mode={view === 'hr-workspace' ? 'workspace' :
                view === 'hr-access' ? 'access' : 'onboarding'}
                employees={exampleEmployees} leave={exampleLeaves} attendance={exampleAttendance}/>
          : view === 'customers' || view === 'organizations'
            ? <OrganizationsPreview key={view} organizations={roleOrganizations}
                mode={view === 'customers' ? 'customers' : 'organizations'}/>
          : view === 'admin' || view === 'products' || view === 'customer-onboarding' ||
            view === 'provisioning' || view === 'managers'
            ? <AdminPreview key={view + adminTab} initialTab={adminTab} mode={view === 'admin' ? 'platform' : view === 'products' ? 'products' :
                view === 'customer-onboarding' ? 'onboarding' : view === 'provisioning' ?
                  'provisioning' : 'managers'}
                organizations={exampleOrganizations} products={exampleProducts}
                employees={exampleEmployees} audit={exampleAudit} projects={exampleProjects}/>
          : view === 'finance' || view === 'journal'
            ? <FinancePreview key={view} invoices={exampleInvoices} receipts={exampleReceipts}
                mode={view === 'finance' ? 'ledger' : 'journal'}/>
          : view === 'reports' ? <ReportsPreview projects={roleProjects}/>
          : view === 'notifications' ? <NotificationsPreview notices={exampleNotices}/>
          : view === 'profile' || view === 'security'
            ? <AccountPreview key={view} mode={view} role={role}/>
          : view === 'search' ? <SearchPreview projects={roleProjects}/>
          : view === 'outreach-access' || view === 'employee-identity' || view === 'music-launch'
            ? <AccessPreview mode={view} employees={exampleEmployees}
                organizations={roleOrganizations}/>
          : <ApplicationsLibrary apps={roleApps} previewMode />}
      </div>
    </div>
  );
}
