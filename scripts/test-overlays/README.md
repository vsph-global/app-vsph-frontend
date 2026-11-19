# Disposable-only project SQL overlay

The SQL file here must match the forward-only migration on:
https://github.com/ThunderKhan/vsph-control-center/tree/fix/project-linked-staff-task-scope-20261117

It is copied into the ephemeral pinned backend checkout for PostgreSQL/Chromium acceptance.
It does not modify the organization backend, apply any hosted migration, or grant backend permissions in production.

Fixes verified by the fixture:
- Eligible linked internal contributors/viewers retain project role access.
- Task comments may only target tasks within the same project.
- Task-linked evidence may only target tasks within the same project.

The existing 2026-11-11 Outreach SQL delimiter/identifier overlay remains separate.
Both forward fixes require review, integration and hosted rollout approval.
