# Projects frontend migration — UI-first, backend unavailable

Source: `ThunderKhan/vsph-control-center` frozen at
`3b3a1535873aa0517aea41da32a407f3d9680547`.

The branch `migration/projects-ui-preview` is based on the separate,
unmerged `migration/role-dashboards-preview` branch, itself stacked on
the workspace shell. Merge these changes in dependency order.

## Implemented in the local preview

Open `http://localhost:3000/__preview/workspace` and select **Projects**.

- Portfolio with the original project table columns: project, ownership,
  state, priority, progress and due date. Search, lifecycle filter and
  Load more pagination use local-only example records.
- Click a project to inspect its workspace. The eight original views are
  **Overview, Tasks, Milestones, Team, Applications, Delivery, Engineering,
  Activity**. Settings is deliberately unavailable.
- Overview with progress, overdue count, health, priority work, milestone
  roadmap, risks, resources and weekly updates.
- Tasks with all/open/done filters; milestones with checklists and progress;
  team and project roles; linked products vs custom applications; deliverable
  metadata; activity history.
- Disabled creation/edit/delete/archive, team assignments, attendance,
  deployment and other mutations. No synthetic success messages.
- Original portfolio HTML, CSS, JS, detail JS/CSS, and delivery script are
  preserved under `docs/reference/projects/` with immutable Git blob
  hashes. Active CSS is byte-identical; preview-specific adjustments live
  in `src/app/(preview)/projects-preview.css`.

## Security/release boundaries

**These are development-preview React components, not authenticated
production Projects pages.** Sample data is explicitly fictional and
imported only from `src/features/projects/ProjectFixtures.ts` into the
isolated, development-only `WorkspacePreview`. There is no `fetch`,
storage, session, mutation, user credential, or real project/customer
name used in project preview components.

The existing `/dashboard` and `/applications` keep their server-side
auth gate; we do not publish an unauthenticated `/projects` route merely
to preview UI. The preview route remains guarded by
`process.env.NODE_ENV === 'development'`, with a production 404.

The original server enforces `portalSession` and uses SQL RPCs.
For later authorization, follow these contracts (verify detailed shapes
in the frozen source before wiring real data):

- `GET /api/projects?q=...&status=...&cursor=...` returns a
  user-scoped `projects` list and `canCreate`; 50-row pagination.
- `GET /api/projects/by-key/:key` resolves an approved 2–20-character
  uppercase project key server-side to an authorized detail.
- `GET /api/projects/:id/workspace` returns project-specific task,
  milestone, owner, resources, risks and other workspace information.
- `GET /api/projects/:id/workforce` requires project membership/permissions.
- Creation, assignments and lifecycle operations are authorized by the
  server's versioned RPCs and cannot be inferred from frontend navigation.

**Do not treat a UI role selector as permission to view another project's
data.** Project role, tenant scope and allowed actions must come from the
verified session/backend at the time of each operation.

## Validation

Stop `npm run dev` first, then:

```powershell
git fetch origin
git switch --track origin/migration/projects-ui-preview
npm run check
npm run dev
```

In the preview, check Projects > first sample project, the eight tab views,
task filters, milestones, team roster, applications, and back navigation.
Search for `CRM`, filter by `active`, and use `Load more projects`.
Also check 390px/mobile widths.

The branch has source-level tests but still requires your local TypeScript,
ESLint, production build and visual review. No backend integration, live
data, database or production deployment was performed.
