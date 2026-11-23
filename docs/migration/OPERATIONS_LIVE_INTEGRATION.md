# Operations migration — employee, HR and customer workflows

Branch: `migration/projects-member-selection`
Repository: `ThunderKhan/app-vsph-frontend`

This is a frontend migration branch only. Existing company backend and production
database are not changed or redeployed here. The original preview UI snapshots
remain immutable and development-only.

## Implemented frontend integration surfaces

### Internal employees

- `/employees`: authenticated, owner/HR-authorized 50-row keyset roster;
  backend counts and department distribution; bounded search/status filters.
- In-place employee editing with immutable email, canonical six departments,
  active version, explicit confirmation. Ordinary HR may not edit existing HR
  managers in the UI. Backend rejects unauthorized edits independently.
- `/employees/new`: permission-checked internal roster onboarding. The
  server forwards a UUID Idempotency-Key, and the browser retains that key
  when retrying unchanged data after an uncertain response.
- Onboarding is not identity provisioning: it does not create an account,
  grant HR authority, or send an invitation.

### Human Resources

- `/hr`: authenticated, current HR/owner leave requests and attendance.
  Backend returns role-scoped 25-row keyset pages.
- Pending leave approval/rejection with record version, decision and note.
  The backend rejects self-approval, role violations and stale records.
- Open attendance corrections require an 8–300 character reason, current
  version, confirmation, and a past work day. The backend validates that.
- All actions go through a same-origin Next server proxy, not a browser
  connection to database or service credentials.

### Customers

- `/admin/customers`: owner-only customer organizations (100-row keyset)
  with explicit backend authorization.
- `/admin/customers/<UUID>`: organization members, application access and
  subscription status displayed from that organization only.
- Explicit member role/status changes with current version and review
  confirmation; backend prevents removal/demotion of the last active owner
  and immediately revokes affected product sessions.
- Customer organization membership alone never grants product/app access.

### Finance, delivery reports and notifications

- `/admin/finance`: owner-only INR overview, using exact decimal paise strings.
- `/admin/finance/journal`: owner-only read-only invoice and cash receipt
  journal. Search, status and dates are validated; pagination retains the
  backend's unrounded timestamp cursor and filter-scope fingerprint. Bank
  settlement is **not** inferred from a manually recorded receipt.
- `/reports`: permission-scoped project report covering **at most the first
  100 authorized matching non-client projects**. Counts and metrics reflect
  only returned projects, never an assumed organization-wide total.
- `/api/project-report/export`: authenticated CSV export forwarding the same
  filters to the backend's formula-safe first-100-project CSV generator.
  Invalid filters, cross-site requests and unauthorized sessions fail closed.
- `/notifications`: current-user in-app inbox (up to 100 entries), personal
  preferences and explicit mark-read/retry controls. The backend's inbox GET
  may dispatch queued items while rechecking current project permissions;
  this is not an external mail or push notification system.

These read surfaces do **not** enable invoice creation, payment recording,
reversal, product provisioning or automatic external message delivery.

## Routing, authorization and deployment requirements

Environment variables:

- `VSPH_INTERNAL_API_ORIGIN`: trusted backend URL, exact HTTPS origin except
  loopback development HTTP.
- `VSPH_PUBLIC_ORIGIN`: exact public frontend origin, used to enforce Origin
  checks on writes.

A valid `vsph.portal.sid` browser session must be accepted by the backend,
and all required services/SQL migrations must exist on the **staging database**.

The frontend's server-only API allowlist now includes only the documented:
`GET /api/employees`, `GET /api/employees/access`,
`GET /api/hrms/leave`, `GET /api/hrms/attendance`,
`GET /api/admin-management/customers` and organization detail reads.
All paths have bounded query filters and scoped identifiers. The backend
rechecks every permission for every request; no client role is authoritative.

Mutation proxies:
`POST /api/employee-update/<UUID>`, `POST /api/employee-onboard`,
`POST /api/hr-actions/<kind>/<UUID>` and
`POST /api/customer-member/<UUID>` accept only fixed operations and
allowlisted fields.

## Verification commands

```sh
npm ci
npm run check
```

A fork-only validation workflow exists at
`.github/workflows/projects-migration.yml`. **A passing CI result has not
been observed here.** Do not merge or deploy based only on committed code.

## Staging acceptance checklist

1. Owner sees `/employees`, `/hr` and `/admin/customers`; HR manager sees
   permitted employee and HR screens, not customers. Employee/customer with no
   HR authority sees no roster records.
2. Roster counts, departments, search and 50-row cursor pagination are correct.
   Invalid, repeated or cross-tenant cursor values fail safely.
3. Employee update uses current version and explicit confirmation. HR cannot
   edit HR peers or platform owners, change email or grant HR roles.
4. Onboard an internal employee. Retry after simulated network loss using the
   same key; no duplicate is created. Existing/archived email conflicts do not
   silently reactivate identity. No auth account/invitation is created.
5. HR reviewer sees only allowed leave/attendance. Self-approval is rejected.
   A stale version produces conflict; approved/rejected changes audit.
6. Attendance recovery requires prior-day open entry and meaningful reason;
   rejected conditions do not create recovery changes.
7. Customer list/detail are owner-only. Member status/role changes are versioned,
   audited, and revoke affected sessions. Last active owner remains protected.
8. All mutation proxies reject cross-site or absent Origin, malformed cookies,
   invalid IDs, unknown fields, unsupported actions and oversized bodies.
9. Test responsive layouts, keyboard access, loading/errors and expiry behavior
   on desktop/mobile; confirm preview fixtures never reach authenticated routes.
10. Verify no production DDL, writes, app rollout or organization PR happened.

## Still incomplete

These delivered operations slices **are not staged/CI-verified** and are not the
entire platform migration. Remaining modules include:

- Customer invitation/acceptance, product role grants and lifecycle changes.
- Employee archive, restoration, removal, HR authority and account linking.
- Full HR self-service, employee leave requests and personal attendance.
- Finance write operations (invoice creation, payment recording, reversal),
  administration, product catalog, provisioning, account/security,
  outreach and other application integrations.
- Full project engineering/delivery integrations and consolidated production QA.

The destination organization PR queue remains untouched.
