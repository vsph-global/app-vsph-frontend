# Reconciled frontend implementation — 19 November 2026

## Decision

Use a **new fork integration branch**, `integration/ops-live-on-projects-20261119`,
rather than force-pushing either diverged source branch.

- **Base**: `integration/projects-live-details` at
  `e509c4400424d50dccbc1a1361c3d7f374c723ef`.
- **Operations source**: `migration/projects-member-selection` at
  `6e3e869f2fd3b74bedac9b98e339b749f788c1a6`.
- **Organization target**: `vsph-global/app-vsph-frontend:dev`, *only after*
  organization PRs #8 (Projects read-only), #9 (Operations preview) and
  #10 (Projects detail integration) have merged and the resulting integration
  diff has passed review and staging acceptance.

## Conflict-resolution policy

The newer, separately reviewed **Projects live-details** branch owns every
existing project implementation and its tests, including project creation,
project details, workflow, task/milestone operations, member assignments,
project delivery and accepted native PostgreSQL test harness. Those files
are not replaced with the competing `projects-member-selection` versions.

The independently developed **Operations live** branch supplies 100 new
nonconflicting files: current-user accounts/sessions; customer and owner
onboarding; products, roles and provisioning; employees/HR; finance
overview/history; notifications; project reporting and exports, and
associated server projections, fixed-path mutation adapters and tests.
It also supplies the shared `ProjectProxySecurity.ts` origin/session
validation utility required by those Ops API proxies.

Shared `server-api.ts`, `WorkspaceHeader.tsx`, `package.json`, and
legacy Projects header coverage are resolved explicitly, never replaced
by accident. The API retains base Projects authorization/forbidden semantics,
strict UUID workforce filtering, and adds bounded, reviewed Operations
read contracts. The header activates only implemented live routes while
leaving unported navigation intentionally disabled. The test script runs
both Projects and Operations suites; competing obsolete Projects-only
test suites from the older branch are excluded.

## Deliberately not imported

- The older duplicate Projects creation, details, workforce, and mutations
  (`src/features/projects/LiveProjectWorkspace.tsx`, related contracts/forms,
  `src/app/api/project-actions`, `src/app/api/project-create`).
- The older competing `src/app/(workspace)/projects` route implementations
  and product/project CSS.
- `tests/projects-member-selection.test.mjs` and
  `tests/projects-integration.test.mjs` (assertions target the older
  competing Projects implementation).
- The older branch-specific Projects migration workflow/docs in favor of
  the newer reviewed native acceptance workflow and its matching contract.

## Required validation

1. `npm ci && npm run check`: migration tests, type checking, lint,
   production build and preview-route production behavior.
2. Anonymous production-route denial, fixed-source project write HTTP smoke,
   responsive Chromium previews.
3. Native isolated PostgreSQL project acceptance, including creation,
   task/workforce transitions, unauthorized actor and stale versions.
4. Staging verification of **all** live Operations routes against the
   explicitly configured backend/session/auth/database target, including
   cross-tenant restrictions, idempotency replay, account invitation
   generation fencing, customer/role revocation and personal sessions.
5. Review the final diff against organization `dev` *after* #8/#9/#10 merge.
   Confirm none of the earlier project changes are duplicated or overwritten.
6. Open a focused review PR from this branch in the fork (base:
   `integration/projects-live-details`); after approval/upstream baseline
   alignment, create an organization PR against `dev` through the
   appropriate account permissions.

CI may validate source composition, but no branch-level CI pass alone
demonstrates live hosted Auth, email, finance, provisioning worker,
production provider integration, backup/restore or deployment readiness.

## Deferred product work

Full employee/HR self-service, customer delegation and recovery,
financial journal writes, product/customer lifecycle expansion, global
search, external SSO/delivery/repository integrations, accessibility and
real-provider/production operational acceptance remain independently
tracked requirements. No production data or existing Supabase target is
modified by this frontend reconciliation.
