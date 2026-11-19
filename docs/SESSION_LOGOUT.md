# Same-origin session sign-out — candidate integration

The original VSPH UI already POSTs `/api/auth/logout`, but the new Next.js
frontend previously had no route and always failed. This branch now provides
a **narrow server-side proxy**, without changing any login or MFA flow.

## Required staging configuration (not set by this branch)

- `VSPH_PUBLIC_ORIGIN`: exact externally facing frontend origin, such as
  `https://app.example.invalid`. No path/trailing slash. Development may use
  `http://localhost:3000`.
- `VSPH_INTERNAL_API_ORIGIN`: already reviewed internal backend origin,
  such as `http://127.0.0.1:3001` for local integration. Remote origins
  require HTTPS.
- The legacy Express backend's `PUBLIC_ORIGIN` must match the forwarded
  `VSPH_PUBLIC_ORIGIN`, because the original backend checks Origin on writes.
  Any future Fastify replacement needs its own reviewed revocation contract.

## Boundary

Only POST is supported. Browser Origin must exactly match the configured
public frontend origin and must not declare cross-site Fetch Metadata.
The upstream path is fixed to `/api/auth/logout`. The proxy relays only
reviewed VSPH session cookies, uses manual redirects, no-store and 8-second
timeout, does not return upstream Set-Cookie data, and clears browser
session cookies only after HTTP 200 confirms revocation.

When either origin is unconfigured, backend unreachable, or upstream fails,
the proxy returns an error without pretending sign-out succeeded.
The original UI stays on the page and shows a retry message.
No real backend, cookies, credentials, deployment, or database were altered.

## Required final acceptance

With a reviewed isolated staging backend, check:
1. Correct same-origin POST with active session revokes server-side session
   and clears portal, app and temporary-setup session cookies.
2. Missing/foreign Origin yields 403 without forwarding.
3. Backend outage/non-200 yields 503 without false logout.
4. Protected routes are blocked after logout, including back navigation.
5. CSRF, cookie-path/domain, HTTP-only/Secure and multi-application SSO
   behavior under the real production reverse proxy.
6. Node 24 `npm run check` and authenticated browser tests.

This is a frontend integration candidate, **not** proof of a working
production sign-out flow.
