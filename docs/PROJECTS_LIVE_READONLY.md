# Authenticated Projects — read-only frontend integration

Branch: `migration/projects-ui-preview`. This is a **non-production** milestone.

- Added `/projects` under the existing verified-session workspace root.
- The original Projects portfolio table, filter and Load more controls now
  request **real backend-authorized records**, not preview fixtures.
- Server-only `GET /api/projects?q=&status=&cursor=` is added to the strict
  `portalApi` path allowlist, with trusted backend origin, portal cookie,
  no-store, timeout and redirect rejection unchanged.
- A strict decoder validates all rows (UUID, uppercase project key, name,
  kind, status, priority, task counts and due date) and rejects duplicate IDs.
- An invalid response or unavailable backend never displays invented records.
- The original Projects CSS is reused unchanged.
- Search and lifecycle filter submit via ordinary GET, and Load more performs
  bounded, server-side accumulation of up to 10 × 50 authorized rows.

**Still unavailable:** a reviewed Fastify backend and environment configuration,
project detail views, writes, task assignment, role/grant changes, live SSO,
cross-tenant testing and browser acceptance. The New project control remains
disabled even when `canCreate` is true, and read-only rows have no fake
detail destination. No real user data, database, deployment or organization
branch was modified.

The synthetic project UI continues to exist only in development
`/__preview/workspace`. No preview fixtures are imported into the live route.

## Consolidated QA, intentionally pending

Run Node 24 `npm run check` on this branch. Then connect a **reviewed isolated**
backend via `VSPH_INTERNAL_API_ORIGIN` and verify anonymously redirected,
authorized project visibility, owner/employee/customer scoping, invalid
session/response fail-closed behavior, search, filters, pagination, mobile
layout and production-preview 404. All cross-tenant and write-action
acceptance must be performed against an approved backend before release.
