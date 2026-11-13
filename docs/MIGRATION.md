# Control Center frontend migration — PR 1: sign-in

The organization frontend is the **canonical target**:
`vsph-global/app-vsph-frontend`. This work is developed in its fork
`ThunderKhan/app-vsph-frontend` on branch `migration/control-center-login`.

## Scope
- Exact VSPH Control Center portal and application login React components
  from validated source `ThunderKhan/vsph-control-center-v3` main.
- Original Inter font binary with SIL license, exact active `auth.css` and
  `crm-auth.css`, and original copy/MFA/UI interactions.
- `/`, `/login`, and `/apps/[app]/login` UI routes. Root `/` now directly renders
  the original sign-in component through the `(auth)` root layout, without
  redirecting the browser to `/login`. The unused Next.js starter homepage
  was removed; the existing `(site)` layout and Geist + Tailwind stack remain
  available for future workspace pages.
- Two separate **root layouts** in Next.js App Router:
  - `src/app/(site)/layout.tsx`: the pre-existing Geist and Tailwind v4
    root layout for the organization's current homepage and future pages.
  - `src/app/(auth)/layout.tsx`: the original VSPH Inter/font/styles
    for sign-in pages; it does not import Tailwind preflight or Geist.
- The existing `src/app/globals.css`, `next.config.ts`, `package-lock.json`
  and every existing dependency version are preserved. The default generated
  Next.js homepage is deliberately replaced by the original portal login.

### Important: no live authentication yet
The Auth UI still sends requests to the original same-origin `/api/*`
contracts. **There is no verified session-auth backend behind the
organization frontend.** A failed/unavailable request must not become an
accepted login. Rendering `/apps/[app]/login` does not itself grant access.
Do not deploy or promote this frontend as a live authenticated application.

Do not introduce an insecure client-side-only authorization bypass. Before
deployment, the approved Fastify backend needs an atomic DB-backed portal
session store, httpOnly cookies, MFA, tenant/product access enforcement,
server-side route guards and exact same-origin API reverse proxy.

### Why separate root layouts?
The organization starter loads Tailwind's CSS reset and Geist font; the legacy
login uses a distinctive split view, Inter and original global CSS. An
ordinary nested layout under the existing root would leak the reset into
login and alter its appearance. Separate root layouts, using route groups
that do not change URLs, preserve both presentations.

## Local verification
From a clone of this **fork branch** with Node.js 24:

```powershell
npm ci
npm run test:migration
npm run typecheck
npm run lint
npm run build
npm run dev
```

Preview `http://localhost:3000/login` and `/apps/crm/login`.
UI interactions should work; real login requests will not authenticate
without a correctly integrated backend. Compare desktop and mobile visual
captures to the original before declaring pixel parity. The Node source
tests verify original exact file hashes, not rendered screenshots.

## Remaining migration
Dashboard, project pages, employee/HR, organizations, customers, finance,
notifications, calendar, search, profile, session management, and
administration remain unported. This is a first incremental frontend PR,
not an application release.

Source baseline: `ThunderKhan/vsph-control-center`
`3b3a1535873aa0517aea41da32a407f3d9680547`.

## November 13 Windows verification corrections

The first run on the organization fork found four independent porting issues:
- `tests/migration-source.test.mjs` incorrectly wrote `blob <bytes> \\0` (an extra ASCII space before NUL) when computing Git object SHA-1. The header is now `blob <bytes>\\0` and original binary/CSS hashes remain untouched.
- The starter layout depended on Next's generated `LayoutProps<'/'>` type; the site layout now uses an explicit ReactNode prop type that works before generating route types.
- React 19's hooks lint disallows synchronous state resets in the app-lookup effect. Initial state is already correct; the dynamic route keys `AuthPage` by app code to remount for a different application. The brand link uses Next `Link` to satisfy Next's route lint.
- With `cacheComponents: true` and partial prefetching unchanged, the dynamic product login must allow request-time `params`: `export const instant = false` on this route only. No organization-wide cache config is disabled.

The original static Inter stylesheet still comes from `/fonts.css` and the auth-layout ESLint exception is narrowly scoped to that single legacy public resource. These are **candidate fixes** until Node tests, lint, typecheck, and production build all pass on the contributor's Node 24 machine.

## Root URL compatibility

The original portal served its sign-in interface at `/`. The first incremental
fork port left the generated Next.js starter at `/` and displayed the migrated
screen only at `/login`. This no longer matches user expectations.

Now `src/app/(auth)/page.tsx` renders `AuthPage` directly at `/`, alongside
`/login`. The starter `src/app/(site)/page.tsx` was deleted to avoid two
routes competing for the same root URL. The site layout, Tailwind v4 and Geist
configuration remain untouched for future frontend modules.

This changes the frontend entry point only. Sign-in still requires a separately
reviewed, session-backed API and must not be represented as production-ready.

## Stale Next.js route validators after moving `/` (13 November 2026)

After moving the starter `src/app/(site)/page.tsx` to the authentic
`src/app/(auth)/page.tsx`, Next.js 16.4.6 retained old generated imports in
`.next/types/validator.ts` and `.next/dev/types/validator.ts`. Those are
**generated caches**, not application route files. A stale validator can cause
`TS2307 Cannot find module '.../(site)/page.js'` and
`__InvalidParamMatchingKeys` during both `tsc` and `next build`, even
when `GET /` works and the source is valid.

`scripts/clean-next-route-types.mjs` now deletes only the two generated
route-type directories; `npm run typecheck` re-generates current declarations
with `next typegen`, and `npm run build` re-generates them during
`next build`. The original Next.js 16.4.6, React 19.3.0, Tailwind 4.3.3,
`tsconfig.json`, package lockfile, and existing Turbopack configuration are
unchanged. Cached compiled assets under `.next/cache` are preserved.

**Stop any running `npm run dev` process with Ctrl+C** before invoking
typecheck or build, to avoid deleting generated declarations while Next is
writing them. During development Next regenerates the route types itself.
The script is safe and idempotent after a clean checkout.

Run in sequence:

```powershell
# Exit npm run dev first (Ctrl+C)
git pull --ff-only
npm run test:migration
npm run typecheck
npm run lint
npm run build
npm run dev
```

After the build, the route `/` should be under the `(auth)` root layout.
Do not restore the `(site)` starter page to bypass stale generated errors.
