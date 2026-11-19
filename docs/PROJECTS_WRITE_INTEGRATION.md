# Projects write integration — staging milestone

Branch: integration/projects-live-details; this is NOT merged into the organization.

## Implemented
- Existing read-only, backend-authorized Projects portfolio and detail pages remain isolated from the synthetic dev preview.
- Owner-only **internal** project creation affordance on /projects/new. Server GET list's canCreate controls visibility; backend POST /api/projects makes the actual access decision.
- Manager-only editing of name, description, priority and due date. Every request includes the currently displayed project version. Backend checks membership, status constraints and optimistic version (conflicts yield 409). The UI never asks for an owner, subscription, entitlement, team grant or customer organization on this path.
- Same-origin Next.js POST /api/projects and PATCH /api/projects/[id] route handlers forward narrowly validated JSON to a trusted internal API origin, using only the portal session cookie. Bounded request size, exact public Origin requirement, no-store, manual redirect rejection, timeout, sanitized errors and no arbitrary URL/path forwarding.
- On failed/ambiguous creation, the UI asks the user to inspect their portfolio before retrying so it does not encourage accidental duplicates.
- Manager-only task/milestone creation and allowed status transitions now use POST /api/projects/:id/tasks, POST /api/projects/:id/milestones, PATCH /api/projects/:id/tasks/:entity and PATCH /api/projects/:id/milestones/:entity. The Next gateway strictly forwards only the selected status or bounded title/description/priority/date fields, plus the current project version. The backend still rejects illegal transitions (including completion with outstanding milestone work).
- All work item updates require a backend-confirmed UUID and project version increment. The UI holds repeat submissions until the parent page refreshes, and warns to reload after 409/ambiguous errors.
- Managers can post **private project-level delivery-evidence links** and **private comments**. Contributors can post private comments; viewers and clients cannot use these forms. Browser requests cannot set sharing, assignees, arbitrary task IDs or customer permissions. Evidence requires bounded HTTPS URLs without credentials, query strings or fragments.
- An isolated Node HTTP fake backend test exercises the production Next gateways: token/origin enforcement, bad schema and oversized body, successful creation/transition/comment/evidence, stale version, and malformed upstream success. No production records were touched.
- A native PostgreSQL 17 + production Next.js + real Express backend CI acceptance workflow passed on 2026-11-17 before comment/evidence integration. It verifies persisted project creation, manager edits, version conflicts, manager task/milestone transitions, Chromium role-gated details and revocation. The comment/evidence extension has its own CI acceptance run; refer to latest workflow rather than assuming that extension passed.


## Required environment
- VSPH_INTERNAL_API_ORIGIN: exact approved backend origin (HTTPS, or loopback HTTP in development)
- VSPH_PUBLIC_ORIGIN: exact browser-facing Next.js origin, e.g. https://control.example.invalid
- Legacy Express **PUBLIC_ORIGIN** must match VSPH_PUBLIC_ORIGIN for forwarded writes. Do not weaken the backend Origin validation to accommodate a deployment mismatch.
- Real portal cookie vsph.portal.sid, and backend endpoint availability.

## Deliberately not complete
- Customer project creation (needs approved customer organization selector).
- Task and milestone creation/status changes and private project-level comments/evidence are implemented and covered by isolated tests. Advanced task editing, assignment, task-thread comments, dependencies, uploads and client-facing sharing are NOT connected.
- Project member, lifecycle, file/deployment, customer grant and product entitlement mutations remain unavailable.
- Hosted staging integration, real Supabase Auth/PostgREST/SMTP session testing, full cross-tenant customer acceptance, migration deployment and production verification remain outstanding. Native PostgreSQL fixture acceptance is not hosted staging acceptance.
- No live Supabase credentials, database changes or external mail/API calls were performed.

## Staging acceptance (do not test on production customer records)
1. With a dedicated owner test account and isolated backend, create an internal project and confirm redirect to its real UUID.
2. Confirm unauthorized employee/client cannot create; expired session gives 401, wrong Origin gives 403.
3. With an authorized manager, edit project metadata; reload verifies persisted changes.
4. Submit the same old version twice: only the first update succeeds, the second returns 409; an invalid status transition is still denied by the backend.
5. Verify customer/client viewers see no edit control; test cross-tenant project GET/PATCH denial.
6. Missing backend/env returns unavailable and never invents successful project records.
7. Verify a production build returns 404 on /__preview/workspace and redirects anonymous /projects, /projects/new and /projects/[id] navigation.
8. With an authorized manager on an active project, create a task and milestone; verify persisted IDs, starting state (todo/planned), private visibility and incremented project version.
9. Use the lifecycle controls to move task todo → in_progress → in_review → done and milestone planned → active → done (subject to backend outstanding-work rules); confirm unauthorized viewer/client and suspended memberships cannot mutate.
10. Attempt a second mutation with the previous project version: expect 409, never silent overwrite. Simulate a backend success without valid id/version: frontend reports unconfirmed and requires inspection.
11. Check task/milestone form usability at mobile widths and browser-only keyboard navigation. Verify customer visibility remains backend-filtered; do not infer project access from product links.
12. As manager, post private project comment and HTTPS evidence via the browser; reload and verify PostgreSQL rows and version increments. Confirm shared=false and that unauthorized viewers/outsiders cannot create either resource. Check malformed URLs and stale-version conflict responses.

## Merge queue
Organization employee entry (#6) and role dashboards (#7) merged on 2026-11-17. The agreed queue is still Projects read-only, Operations preview, then focused Projects integration. Revalidate the fork against organization dev before opening these PRs. No additional organization PR was opened here.


## Disposable CI backend overlay and upstream migration defect
The backend repository's \`supabase/migrations/20261111100000_outreach_internal_sso.sql\`
has two defects that prevent provisioning a fresh native PostgreSQL database:
\`outreach_introspect\` uses \`as $\`/\`end$;\` rather than matched \`$$\` delimiters,
and \`outreach_consume_code\` declares the reserved PostgreSQL identifier
\`current_role\` as a PL/pgSQL variable. The
\`scripts/prepare-isolated-backend.mjs\` overlay edits ONLY the temporary
\`.acceptance-backend\` checkout during CI (and enables concise fixture logging).
This is not a migration repair, does not touch any hosted database, and
does not establish whether the faulty migration was installed in production.
Upstream must be corrected and separately tested before anyone attempts a
new deployment from the checked-in migrations.
