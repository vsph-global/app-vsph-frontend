# Projects hosted staging acceptance

The project already has native PostgreSQL/Express/Next.js/Chromium CI acceptance. This does not prove hosted staging or Supabase Auth/PostgREST behavior.

## Safe read-only preflight
From a machine allowed to access the approved staging deployment, run:

    STAGING_FRONTEND_ORIGIN=https://staging.example.com STAGING_HOST_APPROVED=staging.example.com node scripts/projects-staging-preflight.mjs

Optionally supply STAGING_PROJECT_ID (synthetic UUID) and STAGING_PORTAL_SESSION (ephemeral test session) together. Never commit or paste test sessions into logs. The script sends GET requests only; it rejects non-HTTPS and hosts without an explicit staging/test/preview label.

## Release acceptance (requires an actual isolated hosted staging environment)
- Owner creates an internal project; non-owner cannot.
- Authenticated user with permission sees project details; unauthorized user cannot.
- Manager edits, creates work and receives a 409 for stale version.
- Linked internal staff directory visible to manager only, never customers.
- Manager assigns/removes contributors and viewers only; platform owner exclusively grants and revokes manager authority.
- Staff with unfinished assigned tasks cannot be removed or demoted to viewer.
- Manager assigns tasks only to active contributors/managers; contributor changes only own assigned task state.
- Private task-thread comments are scoped to same-project tasks; cross-project IDs rejected.
- Viewer/client cannot create task comments, project comments or delivery evidence.
- Revocation takes effect without a new login.
- Hosted Supabase Auth, PostgREST permissions, RLS and tenant boundaries verified independently.
- Browser keyboard and responsive checks at 320, 390, 768, 1440 px.

## Outstanding backend deployment blockers
The original 2026-11-11 Outreach migration contains a malformed dollar quote and a reserved current_role variable. Native CI corrects only its disposable checkout. It does NOT repair the upstream migration or any hosted environment.

Backend project_command comment.create should independently verify that taskId belongs to the selected project before a public deployment. The frontend checks authorized task membership, but the legacy backend can also be called directly. Implement a reviewed forward-only SQL change and test it before public exposure.

No hosted staging credentials or endpoints have been provided. Green fixture CI is not equivalent to hosted acceptance.

Do not open organization PRs before explicit authorization; preserve Projects read-only then Operations then live integration merge order.
