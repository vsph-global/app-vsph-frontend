# Development-only frontend preview — no backend needed

This is a **read-only UI preview**, not a mock authentication provider and
not an alternative portal route.

## Access

Run the fork branch `migration/workspace-shell-applications` using Node 24:

```powershell
git fetch origin
git switch migration/workspace-shell-applications
git pull --ff-only
npm run check
npm run dev
```

Open **http://localhost:3000/__preview/workspace** (development server only).

The preview reuses the same workspace navigation, dashboard summary, application
library, original CSS, Inter font and shared components as the actual migrated
screens. It provides:
- Example-only products and organizations (not actual records).
- Owner, HR manager, employee and customer *visual presentations*.
- Overview, Applications, Role dashboard and Projects quick tabs.
- **Preview screen** selector for workforce, HR, customers, organizations,
  administration, products, onboarding, finance, reports, notifications,
  account, Outreach, identity, Music launch chooser and project search.
- Role-aware top navigation with local-only screen switching, visual role
  changes reset to the role dashboard and synthetic example data is scoped
  to the selected visual role.
- Desktop and mobile responsive design using unchanged VSPH CSS.
- A permanent **Development preview / Synthetic data only** banner.

**The role picker is only a visual fixture selector. It does not confer any
permission or represent a signed-in identity.** Detailed owner, employee,
project and administration screens are synthetic presentation components.
No production role-dependent page uses these fixtures, and neither billing
nor workforce operations can be submitted from the preview.

## Hard security boundary

The preview lives at `/__preview/workspace`, **outside** the
`(workspace)` authenticated route group. The physical folder is
`src/app/(preview)/%5F_preview/workspace/`: Next.js treats a literal
leading underscore in a folder name as a private, *non-routable* directory.
`%5F_preview` encodes the first underscore and preserves the public URL
`/__preview/workspace`. Do not rename it to `__preview` (which caused
a 404 in development despite all previous source tests passing). It is guarded by

```ts
if (process.env.NODE_ENV !== 'development') notFound();
```

This means it must return 404 in production (`next start`). The original
`/dashboard` and `/applications` routes **remain protected** by the server
session check and are not modified to accept preview identities.

The preview code has no `fetch`, browser storage, real API, credentials,
private URL parameters or auth tokens. Its shared components disable sign-out,
application-launch links, account shortcuts and navigation actions when
`previewMode` is enabled. The server-side API helper is not imported by
this preview route.

The `npm run check` command now also verifies the **actual Next.js
production route manifest** includes `/__preview/workspace`. This prevents
false positives from source-only tests that merely check file existence.

Always verify the production guard before deployment: after `npm run check`,
run `npm run start` and request `/__preview/workspace` in a separate
terminal. It must give an HTTP 404; do not mistake a streamed page body
or application shell for authorized content.

A development-only preview must not be publicly hosted. Run it on an
isolated developer machine; if using a LAN URL, protect access to the
development server. Never enter real account passwords or private tokens
into any preview.

## Completed frontend UI scope and remaining gates

The owner and employee dashboards, Projects, People/HR, Customers,
Organizations, Finance/Journal, Admin, Reports, Notifications, Account,
Outreach, employee identity and Music launch preview screens have been
added in stacked frontend branches, culminating in
`migration/projects-ui-preview`. The original page JS/controllers are
archived as immutable references and are **not executed** in React.

The remaining work is approved server-side API adapters and input/response
validation, identity/session/tenant permission verification, real mutation
flows, staging/production acceptance, and the consolidated user-requested
end-of-implementation test pass. The previews do not satisfy these gates.

See `docs/OPERATIONS_MIGRATION.md` and `docs/PROJECTS_MIGRATION.md` for
a detailed list of implemented UI surfaces, existing source hashes, API
contracts, and the final QA checklist.

No library/runtime dependencies, auth rules, external services, production
databases or deployment settings are changed by this preview.
