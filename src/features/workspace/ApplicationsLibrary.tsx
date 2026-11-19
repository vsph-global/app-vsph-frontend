'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PortalApp, ProductAccess } from './contracts';

const presentations: Record<string, { category: string; description: string; icon: string }> = {
  CRM: {
    category: 'CUSTOMER MANAGEMENT',
    description: 'Customer contacts and relationship management.',
    icon: 'crm',
  },
  OUTREACH: {
    category: 'INTERNAL OUTREACH',
    description: 'Campaign approvals and governed email workflows.',
    icon: 'generic',
  },
  MUSIC: {
    category: 'VENUE OPERATIONS',
    description: 'Music requests and guest-facing experiences.',
    icon: 'music',
  },
};

function ProductIcon({ name }: { name: string }) {
  return <svg className="icon" aria-hidden="true">
    <use href={'/portal-icons.svg#icon-' + name} />
  </svg>;
}

export function ApplicationsLibrary({ apps, previewMode = false }: { apps: PortalApp[]; previewMode?: boolean }) {
  const [query, setQuery] = useState('');
  const matches = apps.filter((app) =>
    (app.name + ' ' + app.code).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <main className="workspace-content" id="mainContent" tabIndex={-1}>
      <section className="page-intro" aria-labelledby="pageTitle">
        <h1 id="pageTitle">Applications</h1>
        <p className="page-lead">Access the applications assigned to your account.</p>
      </section>
      <section className="applications-section" aria-labelledby="applicationTitle">
        <div className="apps-section-header">
          <div>
            <p className="section-kicker">APPLICATION LIBRARY</p>
            <h2 id="applicationTitle">Your applications</h2>
          </div>
          <div className="search-container">
            <label className="visually-hidden" htmlFor="appSearch">Search applications</label>
            <input id="appSearch" type="search" value={query}
              placeholder="Search applications" onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
        <div className="directory-toolbar">
          <span id="libraryCount">{matches.length} {matches.length === 1 ? 'product' : 'products'}</span>
        </div>
        <div className="application-grid" id="appGrid" aria-live="polite" aria-busy="false">
          {matches.length === 0 ? (
            <p className="feedback-state" id="emptyMessage">
              {apps.length ? 'No applications match your search.' :
                'No applications have been assigned to your account yet.'}
            </p>
          ) : matches.map(app => {
            const display = presentations[app.code] ?? {
              category: 'BUSINESS APPLICATION',
              description: 'Your assigned business workspace.',
              icon: 'generic',
            };
            return <article key={app.id} className="app-card">
              <div className="app-card-upper">
                <span className="app-symbol"><ProductIcon name={display.icon} /></span>
                <span className="app-status">{previewMode ? 'Example' : 'Assigned'}</span>
              </div>
              <p className="app-category">{display.category}</p>
              <h3>{app.name}</h3>
              <p className="app-description">{display.description}</p>
              {previewMode
                ? <span className="app-open" aria-disabled="true">Preview only</span>
                : <span className="app-open app-open-unavailable" aria-disabled="true"
                    title="Application launching requires the approved SSO route">Launch not connected</span>}
            </article>;
          })}
        </div>
      </section>
    </main>
  );
}

export function AccessOverview({ entries, previewMode = false }: {
  entries: ProductAccess[]; previewMode?: boolean;
}) {
  return (
    <section className="access-overview" aria-labelledby="accessTitle">
      <div className="apps-section-header">
        <div>
          <p className="section-kicker">ACCESS SUMMARY</p>
          <h2 id="accessTitle">Your access</h2>
          <p className="section-description">
            See your customer workspaces and roles in each product.
          </p>
        </div>
        {previewMode
          ? <span className="secondary-link" aria-disabled="true">Browse applications</span>
          : <Link className="secondary-link" href="/applications">Browse applications</Link>}
      </div>
      <div id="accessGrid" className="access-grid" aria-live="polite" aria-busy="false">
        {entries.length === 0 && <p className="access-empty">
          No products are currently assigned to your account.
        </p>}
        {entries.map(({ app, organizations, internalRole, failed }) => {
          const roles = [...new Set(organizations.map(org => org.role.replaceAll('_', ' ')))];
          return (
            <article className="access-row" key={app.id}>
              <div className="access-row-product">
                <strong>{app.name}</strong>
                <span className="access-row-caption">
                  {failed ? 'Unable to retrieve product access' :
                    internalRole ? 'Internal employee workspace' :
                      organizations.length === 1 ? '1 customer workspace' :
                        organizations.length + ' customer workspaces'}
                </span>
              </div>
              <div className="access-row-details">
                {!failed && internalRole ? (
                  <>
                    <strong className="access-role-label">{internalRole.replaceAll('_', ' ')}</strong>
                    <span className="access-org-label">VSPH Internal</span>
                  </>
                ) : !failed && organizations.length ? (
                  <>
                    <strong className="access-role-label">{roles.join(', ')}</strong>
                    <span className="access-org-label">
                      {organizations.slice(0, 3).map(org => org.name).join(' · ')}
                      {organizations.length > 3 ? ' · +' + (organizations.length - 3) + ' more' : ''}
                    </span>
                  </>
                ) : <span className="access-org-label">
                  {failed ? 'Product access details are temporarily unavailable.' :
                    'No active customer assignments'}
                </span>}
              </div>
              {!failed && (internalRole || organizations.length > 0) ?
                (previewMode
                  ? <span className="access-unavailable" aria-disabled="true">Preview only</span>
                  : <span className="access-unavailable" aria-disabled="true"
                      title="Application launch requires the approved SSO integration">Launch pending</span>) :
                <span className="access-unavailable">Unavailable</span>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
