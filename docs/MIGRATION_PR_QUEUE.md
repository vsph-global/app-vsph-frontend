# Frontend migration PR queue and cleanup ledger (November 17, 2026)

Source fork: https://github.com/ThunderKhan/app-vsph-frontend
Organization: https://github.com/vsph-global/app-vsph-frontend

## Completed in organization
- [x] Organization #1 — Control Center Login (merged)
- [x] Organization #4 — Customer Invitation Entry (merged)
- [x] Organization #5 — Workspace Shell Applications (merged)
- [x] Organization #6 — Employee Account Entry (merged 2026-11-17)
- [x] Organization #7 — Owner/Employee Dashboard UI (merged 2026-11-17)
- [x] Redundant **fork** #1 (customer invitation) and fork #3 (workspace shell) closed; their history remains visible.

## Organization review status
Both prerequisite organization PRs (#6 and #7) have merged. The user asked to **keep new organization PRs unopened until explicitly requested**; continue code and acceptance on fork branches only.

## Prepared but NOT yet proposed to the organization
- [ ] Fork draft #6 — Projects preview + authenticated read-only list:
  https://github.com/ThunderKhan/app-vsph-frontend/pull/6
- [ ] Fork draft #7 — Operations UI previews + navigation/security polish:
  https://github.com/ThunderKhan/app-vsph-frontend/pull/7
- [ ] Branch integration/projects-live-details — backend-authorized details; internal creation; metadata edits; task/milestone creation and lifecycle updates; private project comments and HTTPS delivery-evidence links. Strict same-origin, versioned gateway with native PostgreSQL fixture acceptance, but hosted staging acceptance remains outstanding. No organization PR yet.

When explicitly authorized, open **separate** organization PRs from migration/projects-readonly-port and migration/operations-ui-port in that order. Do not merge the fork draft PRs into the fork's main branch; they are review checkpoints. Revalidate with the organization dev head to avoid duplicate already-merged content, and only then decide whether to create a separate project detail integration PR.

## Branch cleanup (manual deletion pending)

GitHub PRs cannot be deleted; close redundant fork PRs after their counterpart has merged. The connected GitHub integration can close PRs but does not expose branch-ref deletion. No branch deletions are claimed.

Legacy fork branches with changes merged into organization:
- migration/control-center-login — organization PR #1
- migration/invitation-entry — organization PR #4
- migration/workspace-shell-applications — organization PR #5

Do not remove any branch that is the base or head of a still-needed fork PR. In particular, fork PR #2 currently uses migration/invitation-entry as its base, and fork PR #3 used migration/control-center-login; retarget/close the relevant redundant fork PRs before deleting those branches. Once no PR depends on them, visit **fork repository > Branches**, filter each exact branch, and use the delete (trash) control. Check the organization PRs remain intact before removing any branch they still reference as a head.

Never delete: migration/employee-account-entry, migration/role-dashboards-preview, migration/projects-readonly-port, migration/operations-ui-port, or integration/projects-live-details while their work is under review or needed.
