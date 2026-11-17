# Employee account entry — frontend migration

Branch: `migration/employee-account-entry`, based on
`migration/invitation-entry` (which is based on the login branch).
This is intentionally **stacked**, not an independent PR against org main.

Original source: `ThunderKhan/vsph-control-center` at
`3b3a1535873aa0517aea41da32a407f3d9680547`.
Original HTML and controller JS are preserved byte-identically under
`docs/reference/employee-entry/`. Routes reuse original `invite.css`
and exact original bundled Inter font from the parent branch.

## Routes
- `/employee-enrollment` is a public, private-link setup page.
  Fragment: `#enrollment_id=...&token=...`. The fragment is scrubbed
  from the URL immediately, stored only in component memory (including
  development StrictMode effect replay) and never copied to search params
  or browser storage. `POST /api/employee-enrollment/inspect` must succeed
  before the user can submit an 8–128-character password, confirmation and
  explicit consent. The strength indicator and password toggles follow the
  legacy design. `POST /api/employee-enrollment/accept` is the only
  way to create an account. No local synthetic success.
- `/employee-password` requires a valid temporary sign-in cookie.
  `GET /api/employee-credentials/status` must succeed before showing
  the 12–128-character password and consent form.
  `POST /api/employee-credentials/replace` must confirm the replacement
  on the real server. Cancel calls `POST /api/auth/logout` and only
  redirects after its success; no silent local logout.

## Security and release gate
- These are **frontend ports only**. The organization Next.js application
  has no reviewed backend connected to `/api/employee-enrollment/*`,
  `/api/employee-credentials/*` or `/api/auth/logout`.
- Keep the original PostgreSQL stored procedures, disabled identity
  reservation, Auth Admin credential updates, replay/expiry checks,
  tenant entitlements, Origin, rate limits and audit logs in an authorized
  backend. Never reimplement these sensitive decisions in client JS.
- Public enrollment uses `credentials: 'omit'`; first-sign-in password
  requests use `credentials: 'same-origin'`, matching the original.
- Do not deploy these pages as completed onboarding or sign-in until a
  reviewed backend, staging restore, and end-to-end Auth tests exist.
- Don't merge directly to org main until base branches are merged,
  Windows Node 24 checks pass, and organization PR review is complete.

## Validation
Stop `next dev` and run:
```powershell
git fetch origin
git switch --track origin/migration/employee-account-entry
npm run check
npm run dev
```
Then preview `/employee-enrollment` without a fragment and
`/employee-password` without a session cookie. Both should fail
closed with a clear explanation. Private tokens and real credentials
must **never** be submitted to an unapproved test backend.
