'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { HrAccess, PortalUser } from './contracts';

const activePages = new Set(['/dashboard', '/applications', '/projects']);

type NavItem = { label: string; href: string; show?: boolean };
type NavGroup = { label: string; items: NavItem[]; show?: boolean };

function Icon({ name }: { name: string }) {
  return <svg className="icon" aria-hidden="true"><use href={'/portal-icons.svg#icon-' + name} /></svg>;
}

function NavItemLink({ label, href, onActivate, pathname, previewMode }: NavItem & {
  onActivate: () => void; pathname: string; previewMode: boolean;
}) {
  if (previewMode || !activePages.has(href)) {
    // Do not provide a working link to a not-yet-ported protected page.
    return <span className="portal-link portal-pending" aria-disabled="true" title="Page migration pending">{label}</span>;
  }
  return <Link className={'portal-link' + (pathname === href ? ' is-active' : '')}
    aria-current={pathname === href ? 'page' : undefined}
    href={href} onClick={onActivate}>{label}</Link>;
}

export function WorkspaceHeader({ user, flags, accessFailed, previewMode = false }: {
  user: PortalUser;
  flags: HrAccess | null;
  accessFailed: boolean;
  previewMode?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [feedback, setFeedback] = useState(accessFailed ?
    'Some navigation permissions could not be checked.' : '');
  const isOwner = user.platformRole === 'super_admin';
  const firstName = user.name.trim().split(/\s+/)[0] || 'V';
  const initial = firstName.slice(0, 1).toUpperCase();

  const groups: NavGroup[] = [
    { label: 'Work', items: [
      { label: 'Projects', href: '/projects' },
      { label: 'My tasks', href: '/dashboard#employeeDashboardWork', show: flags?.employee === true },
      { label: 'Reports', href: '/reports' },
    ] },
    { label: 'Organizations', items: [
      { label: 'My organizations', href: '/organizations' },
      { label: 'Customer directory', href: '/admin/customers', show: isOwner },
      { label: 'Client onboarding', href: '/admin/onboarding', show: isOwner },
    ] },
    { label: 'Applications', items: [
      { label: 'Application launcher', href: '/applications' },
      { label: 'Product catalog', href: '/admin/products', show: isOwner },
    ] },
    { label: 'People',
      show: isOwner || flags?.employee === true || flags?.pendingLink === true ||
        flags?.management === true,
      items: [
        { label: 'My employment', href: '/employment',
          show: flags?.employee === true || flags?.pendingLink === true },
        { label: 'Employee directory', href: '/employees',
          show: isOwner || flags?.management === true },
        { label: 'HR workspace', href: '/hr', show: isOwner || flags?.management === true },
        { label: 'Project managers', href: '/admin/project-managers',
          show: isOwner || flags?.governHr === true },
      ] },
    { label: 'Administration', show: isOwner, items: [
      { label: 'Platform administration', href: '/admin' },
      { label: 'Roles & permissions', href: '/admin?tab=permissions' },
      { label: 'Provisioning recovery', href: '/admin/provisioning' },
      { label: 'Finance', href: '/admin/finance' },
      { label: 'Finance journal', href: '/admin/finance/journal' },
      { label: 'Audit logs', href: '/admin?tab=audit&view=removals' },
    ] },
  ];

  async function logout() {
    if (logoutBusy || previewMode) return;
    setLogoutBusy(true);
    setFeedback('');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Sign out failed. Please retry.');
      window.location.replace('/login');
    } catch {
      setFeedback('Sign out failed. Please retry.');
      setLogoutBusy(false);
    }
  }

  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="workspace-topbar crm-topbar">
      <div className="crm-header-row">
        <div className="crm-brand-group">
          <button id="openMenu" className="icon-button top-menu-toggle" type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen} aria-controls="workspaceNavigation"
            onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button>
          {previewMode
            ? <span className="crm-brand">VSPH<span>CONTROL CENTER</span></span>
            : <Link className="crm-brand" href="/dashboard">VSPH<span>CONTROL CENTER</span></Link>}
        </div>
        <div className="crm-global-search" role="search" aria-label="Workspace search">
          <Icon name="search" />
          <input aria-label="Search work" placeholder="Search work" disabled
            title="Search is unavailable until the secured search route is migrated" />
          <button type="button" disabled>Search</button>
        </div>
        <div className="crm-header-actions">
          {previewMode
            ? <span className="crm-header-icon" aria-label="Application launcher is not connected">
                <Icon name="apps" />
              </span>
            : <Link className="crm-header-icon" href="/applications" aria-label="Open application launcher">
                <Icon name="apps" />
              </Link>}
          <details className="portal-disclosure portal-account">
            <summary aria-label="Account menu">
              <span className="crm-header-avatar-wrap"><span className="crm-header-avatar" id="avatar">
                {initial}
              </span></span>
              <span id="topAccount" className="crm-account-name">{user.name}</span>
              <span className="portal-account-chevron" aria-hidden="true" />
            </summary>
            <div className="portal-dropdown">
              <div className="portal-account-info">
                <strong id="sideName">{user.name}</strong>
                <small id="sideRole">{isOwner ? 'Platform owner' : 'Workspace member'}</small>
              </div>
              <span className="portal-link portal-pending" aria-disabled="true">Your profile</span>
              <span className="portal-link portal-pending" aria-disabled="true">Security &amp; sessions</span>
              {previewMode
                ? <span className="portal-link portal-pending" aria-disabled="true">Sign out unavailable in preview</span>
                : <button id="logoutButton" type="button" className="portal-link portal-signout"
                    disabled={logoutBusy} onClick={() => void logout()}>Sign out</button>}
            </div>
          </details>
        </div>
      </div>
      <nav id="workspaceNavigation" className="portal-navigation" aria-label="Main"
        data-mobile-open={menuOpen} onKeyDown={(e) => {
          if (e.key === 'Escape') { e.currentTarget.querySelectorAll('details').forEach((d) => {d.open = false;});closeMenu(); }
        }}>
        {previewMode
          ? <span className="portal-link is-active" aria-current="page">Overview</span>
          : <Link className={'portal-link' + (pathname === '/dashboard' ? ' is-active' : '')}
              aria-current={pathname === '/dashboard' ? 'page' : undefined}
              href="/dashboard" onClick={closeMenu}>Overview</Link>}
        {groups.filter(group => group.show !== false).map(group => {
          const hasActive = group.items.some(item => item.href === pathname);
          return (
            <details className={'portal-disclosure' + (hasActive ? ' has-active-page' : '')}
              key={group.label}>
              <summary>{group.label}<span aria-hidden="true" className="nav-chevron" /></summary>
              <div className="portal-dropdown">
                {group.items.filter(item => item.show !== false).map(item =>
                  <NavItemLink key={item.label} {...item} pathname={pathname} previewMode={previewMode} onActivate={closeMenu} />
                )}
              </div>
            </details>
          );
        })}
      </nav>
      {feedback && <div id="navigationFeedback" className="portal-nav-feedback">
        <p id="navigationMessage" role="status">{feedback}</p>
      </div>}
    </header>
  );
}
