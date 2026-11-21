# Platform administration and durable provisioning migration

Source branch: `migration/projects-member-selection` in
`ThunderKhan/app-vsph-frontend`. No organization-repository PR, production
deployment, or database migration is performed by these frontend commits.

## Live routes

- `/admin`: owner-only backend overview (organizations, accounts,
  applications, active subscriptions, enabled app access) and recent audit
  records. Raw `audit_logs.details` is never sent to the browser by this
  screen; the view uses a deliberately reduced projection.
- `/admin/provisioning`: owner-only latest 100 durable invitation jobs,
  including the current generation, expiry, delivery attempts and failure
  code. Recovery actions are guarded with explicit confirmations.
- `/admin/onboarding`: owner-only guided customer organization and owner
  setup. Supports organization-only creation or up to 12 product-backed
  subscriptions with validated trial/active plan settings.
- `/api/admin-onboarding/request/<UUID>`: resolve the original idempotent
  creation request before any retry after network failure.

Only the existing backend's audited API/RPC is authoritative. No frontend
role flag, returned action button or typed acknowledgement can bypass a
server-side access, account, invitation or generation check.

## Reviewed backend API contracts

Reads (server-only):

- `GET /api/admin-management/overview`
- `GET /api/admin-management/audit-logs`
- `GET /api/admin-management/onboardings`
- `GET /api/admin-management/lookups`

Writes through bounded, same-origin Next.js proxies:

- `POST /api/admin-management/onboardings` — exact five-field payload:
  `organizationName`, `slug`, `adminName`, `adminEmail`, `products`.
  The current UUID `Idempotency-Key` is preserved on retries. Successful
  HTTP 202 means **the organization/invitation transaction is committed and
  delivery is queued**, not that the email was delivered.
- `GET /api/admin-management/onboardings/requests/<UUID>` — current owner
  resolves a submission's existing request identity; it does **not**
  trigger another job.
- `POST /api/admin-management/onboardings/<invitationUUID>/retry`
- `POST /api/admin-management/onboardings/<invitationUUID>/revoke`
- `POST /api/admin-management/onboardings/<invitationUUID>/reissue`
- `POST /api/admin-management/onboardings/<invitationUUID>/recover`

Recovery bodies are exactly `{generation,reconciled}`, with
`reconciled=true` permitted only for the explicit recover action.
Every write is session-bound, Origin-checked, URL/method allowlisted, and
validated before forwarding. SQL remains the final authority for
invitation generation, lease state, owner privilege, external Auth
reconciliation and last-known identity status.

**Recovery safety:** The recovery form requires the operator to type
`RECONCILED` and affirm that external Auth state was checked. The UI
does not itself validate an external Auth operation; this action must only
be used with independently verified reconciliation evidence.

**Retired workflows:** There is no direct password-based provisioning,
platform-role elevation, or arbitrary user creation via the frontend.
The backend's retired `POST /users` and `POST /clients` remain disabled.

## Staging acceptance required before production

1. Verify an active platform owner can load overview, audit, provisioning,
   catalog, and customer creation. Verify regular employees, customer
   owners and unauthenticated sessions cannot read any admin data.
2. Create a new organization with zero products. Verify exactly one
   organization and owner invitation, with **no** product grants.
3. Create a product-backed customer with one trial and one active plan.
   Verify app IDs match the active catalog, trial expiry is future, and
   both subscriptions and grants match the confirmed request.
4. Simulate network failure after backend commit; resolve the same request
   UUID and show the original organization. Confirm **no duplicate**
   organization/invitation is created.
5. Retry the identical payload and idempotency key after an uncertain
   result. Confirm the backend returns the same organization; do not use
   a fresh key until the original result is reconciled.
6. Reissue an invitation and confirm the old token becomes unusable.
   Verify the generation increments and audit event is durable.
7. Revoke using the current generation. Confirm old links cannot be
   accepted and affected auth/product permissions are reevaluated.
8. Test a stale generation, an accepted invitation, an in-progress
   acceptance lease, expired delivery, account disablement, and
   unauthorized actor; all must fail with no side effects.
9. Simulate worker failure and external Auth partial completion in a
   disposable environment. Recover **only after external Auth state is
   independently reconciled** and verify old token invalidation.
10. Verify mobile layout, keyboard navigation, status announcements,
    logout/expired-cookie redirects, sensitive-data minimization, and
    cross-origin write rejection. Confirm no invitation tokens, cookies,
    secrets or raw audit metadata are exposed.

Required runtime configuration: `VSPH_INTERNAL_API_ORIGIN` for the trusted
backend, `VSPH_PUBLIC_ORIGIN` for strict same-origin mutation checks, and
a backend-compatible `vsph.portal.sid` session. All referenced SQL
migrations and the invitation worker must already be verified in staging.

## Validation and delivery boundaries

Run `npm ci && npm run check` and inspect the matching GitHub Actions
commit. A source-build success alone does not prove that email was
delivered, that the worker was configured, or that staging has the
required database migrations. The migration is not production-ready
until the staging acceptance cases above pass.

Remaining work outside this slice: admin product registry, application
roles/subscriptions, account and security workflows, employee removal,
full HR self-service, finance mutations, delivery integrations, and the
final organization PR queue/release validation.
