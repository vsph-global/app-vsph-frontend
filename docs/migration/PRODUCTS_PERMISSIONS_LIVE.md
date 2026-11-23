# Product Registry and customer-scoped role governance

Branch: `migration/projects-member-selection`, fork:
`ThunderKhan/app-vsph-frontend`.

## Implemented routes

- `/admin/products`: platform-owner-only registered product list, with
  100-row code-keyset pagination.
- `/admin/products/new`: product registration with client-generated UUID
  identity reused on uncertain-response retries of an **unchanged** payload.
- `/admin/products/<productUUID>`: versioned metadata, owner/contact,
  lifecycle, visibility, integration mode, and deliberately limited local
  readiness observation.
- `/admin/permissions`: organization-scoped membership, application access,
  and current product-role grants; versioned assign/change/remove actions.

These pages rely on the backend's active platform-owner authorization.
The frontend owner flag is a UI convenience; it is **not** the security
boundary. Every backend command must independently recheck privilege and
relevant current database state under transaction locks.

## Backend contract compatibility

Product registry backend routes:

- `GET /api/admin-management/product-registry[?afterCode=CODE]`
- `GET /api/admin-management/product-registry/item/<UUID>`
- `POST /api/admin-management/product-registry/create/<UUID>`
- `POST /api/admin-management/product-registry/update/<UUID>`
- `POST /api/admin-management/product-registry/<UUID>/check`

Creation and update payloads permit only `code`, `name`, `loginPath`,
`status`, `visibility`, `integrationMode`, `description`, `ownerId`,
`supportEmail`, `docsUrl`, plus `version` for updates. Product codes
are immutable once registered, retirement is terminal, and changing a
product to non-active revokes its product sessions and launch codes.
CRM and MUSIC must retain their reviewed adapter integration mode.
`check` is only a local adapter/configuration observation: it does not
prove external service reachability or deployment acceptance.

Customer-scoped product roles:

- `GET /api/admin-management/customers?...` and
  `GET /api/admin-management/customers/<UUID>`
- `POST /api/admin-management/customers/<UUID>/role`

The role command supplies the target current `userId`, `version`,
`applicationId`, and an explicit `role`. Empty role removes an existing
product grant. The database confirms active membership, product status,
current entitlement, and allowed product role; then increments membership
version, revokes affected sessions and launch codes, and writes audit data.
`super_admin` as a **product role** is not a platform owner elevation.

All frontend write proxies accept only exact whitelisted JSON bodies,
fixed methods/UUID routes, a compatible authenticated session, and
strict same-origin requests. They never call arbitrary destinations or
expose backend service credentials.

## Required staging acceptance

1. Owner can list/register/edit products; a regular employee, customer
   owner, and unauthenticated browser cannot access product governance.
2. A new disabled, unlisted, portal-only product is registered once.
   Retry the same UUID/payload after uncertain network response; verify
   one product and one audited creation, no duplicate.
3. Validate duplicate product code and create identity mismatch fail
   without changes; product code changes, retired reactivation, invalid
   owners, invalid URLs and unknown fields are rejected.
4. Change an active product to disabled/retired: verify session and SSO
   launch-code revocation, new access denial and audit record.
5. Confirm CRM/MUSIC retain reviewed adapters even when the UI is bypassed.
   The backend remains authoritative.
6. Local health checks save an observation but **never** claim external
   SSO/end-to-end verification. Validate no arbitrary backend URLs are fetched.
7. Owner can select a customer, see its active memberships and eligible
   products, and grant a permitted application role.
8. Removing a product role revokes affected sessions and launch codes.
   Confirm organization membership persists and platform/HR roles are
   unchanged.
9. Test concurrent membership modifications, suspended members,
   disabled organizations, disabled product access, and unsupported
   role/product combinations; they must fail safely.
10. Run browser keyboard/mobile/expired-session/error recovery tests and
    confirm no preview fixtures are displayed in authenticated routes.

## Delivery boundary

Commit-level `npm run check` is necessary but not sufficient. The
organization repository, production environment, SQL migrations, external
providers, and seeded customer accounts remain unchanged. Staging end-to-end
verification and code review are mandatory before merging or deploying.
