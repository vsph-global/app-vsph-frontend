# Owner and employee dashboards — UI migration (backend-independent)

Source: frozen legacy `ThunderKhan/vsph-control-center` at
`3b3a1535873aa0517aea41da32a407f3d9680547`.

Branch `migration/role-dashboards-preview` is based on
`migration/workspace-shell-applications` and is independent of
customer-invitation and employee-entry branches.

## Implemented
- **Owner:** nine original bento panels (cash collected, product portfolio,
  task completion, cash collection trend, work distribution, needs attention,
  team, projects and project activity), with working 1/3/6-month filters and
  month selection for the chart.
- **Employee:** work activity heatmap, assigned task list with Open/All filter,
  notifications, attendance history, leave form/history and calendar with
  Month/Week/Day/List views, search, category filter and navigation.
- Original four CSS files and three legacy controllers are archived,
  Git SHA-1 checked and retained without modifying their styles.
- Existing `/__preview/workspace` now defaults to **Role dashboard**.
  Switch between Owner and Employee to inspect both; Customer explains
  why internal dashboards aren't available. Overview/Applications remain.
- A separate `RoleDashboardFixtures.ts` supplies **synthetic data only**.
  No account, tenant, financial or staff information is read from the server.

## Nonfunctional operations
The preview is read-only. No login, live finance, task updates, timesheet
changes, leave submissions, event creation or project navigation is provided.
Mutating controls and unported links remain disabled. Interactive chart
ranges, task filters, search and calendar switches affect synthetic UI only.

The **real authenticated** `/dashboard` and `/applications` remain unchanged
and require a verified backend session. The preview remains guarded by
`NODE_ENV === 'development'`, and the production preview URL must return 404.

## Original API contracts for later integration
- Owner overview: `GET /api/admin-management/dashboard`,
  `GET /api/finance/overview`. Owner route and both APIs require
  server-side privileges; **no owner/finance data should be requested
  merely because a UI switch says 'Owner'**.
- Employee dashboard: `GET /api/hrms/access`,
  `GET /api/hrms/me`, `GET /api/hrms/me/activity`,
  `GET /api/notifications` and `GET /api/hrms/calendar`.
  Attendance/leave/task/calendar mutations are guarded by the original
  HR RPC, authorization, Origin checks and idempotency handling.
- No endpoints above are called in this preview branch. Once a reviewed
  backend exists, implement approved server-side data adapters and
  permission gates before wiring these visual components to real data.

## Local acceptance (Windows)
Stop `npm run dev` first:

```powershell
git fetch origin
git switch --track origin/migration/role-dashboards-preview
npm run check
npm run dev
```

Open `http://localhost:3000/__preview/workspace`. Inspect Owner then
Employee under **Role dashboard** and verify at 390px and desktop sizes.
Test owner cash ranges, task filter, calendar views and calendar search.
Check `/dashboard` doesn't reveal private data without a session.

Run `npm run start` only after the production build, and verify
`/__preview/workspace` returns 404. Visual parity and browser end-to-end
checks against the original portal remain to be completed. The branch is
**not production-ready**.
