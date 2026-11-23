# Account Profile and Security self-service migration

Source: `ThunderKhan/app-vsph-frontend`,
`migration/projects-member-selection`.

## Routes

- `/account/profile`: authenticated profile display and edit of only
  `displayName`, plain-text `bio`, IANA `timeZone` and
  `avatarTone` (`navy`, `blue`, `slate`).
- `/account/security`: authenticated list of up to 100 current user's
  portal sessions, plus revoke-one-other and revoke-all-other controls.
- The account dropdown links these pages, while leaving logout
  independent and available.

## Source contract

Backend `GET/PATCH /api/account/profile` uses the session-bound
`account_profile` RPC. PATCH validates exactly five permitted fields
including `version`; a concurrent/stale update conflicts. Email,
account status, platform role, employment and product/customer roles are
**immutable** here. The change is audited without storing bio text.

Backend `GET /api/account/sessions` uses `session_command('list')`;
`POST /api/account/sessions/<publicUUID>/revoke` and
`POST /api/account/sessions/revoke-others` use the current signed-in
account and its secret session hash captured by the backend, never the
browser's JSON. Current session deletion is denied by backend SQL.

Next.js proxies require approved frontend Origin, current portal cookie,
fixed JSON body shapes and fixed allowed paths. Browser data never
includes raw portal session hashes, access tokens, reset tokens or other
users' sessions. No password, TOTP, MFA or third-party Auth operations
are invented by this migration.

## Staging acceptance checklist

1. Ordinary employees, platform owners and customer accounts each see
   **only their own** profile and sessions.
2. Edit a name, multiline bio, IANA zone and avatar tone; reload and
   confirm persistence. Simultaneous edit from another session must
   return conflict and require reload.
3. Attempt to append `email`, `platformRole`, `userId`, credential
   or unknown fields to PATCH: reject and leave identity unchanged.
4. Verify account-session listing never includes another account's
   session or token hash. Revoke one other session by public UUID and
   confirm that session loses access; current browser stays signed in.
5. Revoke all others, including dependent app access where applicable;
   verify current session survives. Revoke-current and cross-account
   attempts must fail.
6. Test expired/disabled accounts, malformed cookies, cross-origin
   writes, timeout and backend outage. No previous user's profile or
   session data should appear on failed loads.
7. Test keyboard and mobile layouts, announcement messages and
   account-menu links. Verify global header reflects a renamed account
   after the versioned save.
8. Ensure no production DDL/worker deployment occurs from a frontend
   branch merge.

## Known limits

These screens do **not** implement password reset, MFA enrollment,
credential changes or third-party identity-provider account recovery.
Those require explicit reviewed backend routes and their own staging
acceptance rather than guessed client-side operations.
