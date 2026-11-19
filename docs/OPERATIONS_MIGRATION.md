# Operations frontend migration — UI preview, backend integration deferred

Source of truth: frozen legacy `ThunderKhan/vsph-control-center` at
`3b3a1535873aa0517aea41da32a407f3d9680547`.

**Branch:** `migration/projects-ui-preview` (the same branch as Projects).
No production routes, DNS, database, SSO, email, hosting, or organization branch
was modified. The user requested one combined verification at the end.

## Delivered in this branch
- **Projects:** portfolio and eight detail views, sample task filters, milestones,
  workforce, linked products, delivery, engineering placeholder and activity.
- **Owner and Employee:** inherited the role dashboards from the parent branch.
- **Employee directory:** original five KPIs, all six approved departments,
  department allocation, search, status filters, pagination, archived records
  and read-only employee inspection.
- **HR:** leave review, attendance history, employee access governance and
  a three-step employee onboarding preview.
- **Customers and My organizations:** organization selection, customer/member
  records, product subscription terms, members, invitation status, history
  and lifecycle. No customer/product access is granted by showing data.
- **Platform administration:** overview, organization, product, users,
  subscriptions, app access, app roles, owner-only workforce permissions
  and owner-only audit history (including employee removals).
- **Product catalog, customer onboarding, provisioning recovery,
  project manager directory:** preview-only registration/management surfaces.
- **Finance:** owner-only ledger, fictional invoice/receipt listings and
  a filtered journal. No cash recording, export, reversals or payments.
- **Reports:** project summary filters and display of synthetic delivery.
  CSV export is disabled until audited authorization is available.
- **Notifications:** example inbox, read/unread search, preference controls
  that do not save or deliver.
- **Profile/security:** preview profile display name, bio, time zone, avatar
  tone; illustrative sessions with revocation disabled.
- **Outreach access:** employee and role selector, existing grant directory,
  sample lifecycle; all granting and revoking is disabled.
- **Employee account & access:** sample identity link status/readiness with
  no identity operations or private enrollment information.
- **Music launch chooser:** sample customer workspace selection. Continue is
  disabled until SSO and product access can be verified server-side.
- **Search:** project, task and milestone sample search.

All screens use shared, read-only React components and sample data isolated
to `OperationsFixtures.ts` or `ProjectFixtures.ts`. The role selector
shows **visual presentation roles** only, never establishes an identity.
Role switches reset the visible module to prevent a privileged sample screen
remaining open under an unprivileged visual role.

Use `http://localhost:3000/__preview/workspace`, with **Preview screen**
and **Navigation role** selectors. Top navigation also switches the synthetic
preview screens without visiting any protected web route.

## Original-source fidelity and CSS
32 original operational files, including the Admin HTML/JS, Finance, HRMS, Employees,
Organizations, Customers, account, notifications, reports, product and
provisioning sources, are archived under
`docs/reference/operations/{views,public}`. Their Git blob IDs are checked
against the frozen source in `docs/reference/operations/manifest.json`.
A further 12 original Outreach, identity, SSO chooser and search sources
are preserved at `docs/reference/operations-extra/` with an independent
manifest. The employee-identity stylesheet is byte-identical to its original.
Employee, Finance and project-utilities CSS are copied byte-identically.
Account profile and HRMS CSS remove only their legacy root import, since
Next/Turbopack cannot resolve those root-absolute CSS imports; the original
stylesheets remain archived unchanged. `operations-preview.css` contains
layout bridges and avoids importing global `operations.css` resets that
would accidentally restyle the entire shared application shell.

The original non-React controllers remain archived as design/API reference;
they are NOT loaded or executed inside the Next.js client.

## Real backend contracts (NOT implemented here)
All real routes must be nested in the authenticated `(workspace)` root
and use server-verified sessions, trusted API origins, no-store requests,
per-tenant roles, and precise API response validation. Preview data **must
never be used as a default response** on real routes.

- Workforce: `GET /api/employees`, `/api/employees/access`,
  `/api/employees/archived`, `/api/hrms/access`, `/api/hrms/me`,
  `/api/hrms/leave`, `/api/hrms/attendance`.
- Customers & organizations: original session/tenant-scoped
  `/api/customers` and `/api/organizations` endpoints.
  Owner transfer, status changes, invitations, and entitlements require
  separate server-verified mutations and concurrency safeguards.
- Finance: owner-only `GET /api/finance`, `/api/finance/overview`,
  `/api/finance-journal`; finance mutations require audited verification.
- Admin: owner-only `/api/admin-management/*`; customer onboarding
  and product registration must use governed provisioning workflows.
- Profile: `GET/PATCH /api/profile`; security/session operations
  have separate revocation gates.
- Notifications and reports: `/api/notifications`,
  `/api/project-reports` and authorized CSV export.
- Projects: see `docs/PROJECTS_MIGRATION.md` for membership-scoped reads,
  versions and workforce operations.

**Remaining blockers:** real backend, SSO/MFA, user identity acceptance,
private session revocation, frontend-to-backend adapters, actual cross-role
and tenant authorization tests, production browser acceptance and CI checks.
None of those is simulated by the source-only tests.

## Consolidated final QA checklist (not yet executed by the user)
When ready to run tests, stop `npm run dev`, then:

```powershell
git fetch origin
git switch migration/projects-ui-preview
git pull --ff-only
npm run check
npm run dev
```

Open the development preview URL and check:
1. Role picker Owner / HR / Employee / Customer; make sure restricted screens
   disappear after switching roles.
2. Projects portfolio, original eight tabs, task filters and milestone UI.
3. Employee directory filters and archives; HR leave/attendance.
4. Organization roles/product terms; Admin tabs, onboarding steps, audit.
5. Finance ledger and journal date/search filters; reports, notifications.
6. Account profile and security, 390px mobile and wide desktop layouts.
7. Check Outreach access, employee identity and the Music chooser; confirm all mutations
   remain disabled and no example data is transmitted.
8. In a production server (`npm run start`), the development preview route
   must return HTTP 404. Actual `/dashboard` must never show protected data
   without an authenticated backend session.

The branch is **not production-ready**, and its Next.js TypeScript, ESLint and
browser results have not yet been recorded after these changes. Keep the fork
PR as draft and do not promote to `main`.
