# PostgreSQL role split (WP-02)

QM-Pilot uses two Postgres roles in addition to the bootstrap superuser (`qmpilot` in dev/CI):

| Role | Purpose | Privileges |
|------|---------|------------|
| `qmpilot_migrator` | Prisma migrations (`prisma migrate deploy`) | `CREATE` on schema `public`, `ALL` on tables/sequences |
| `qmpilot_app` | Runtime Astro/worker (`DATABASE_URL`) | `SELECT`, `INSERT`, `UPDATE`, `DELETE` on business tables **except** `AuditEvent` |

## AuditEvent append-only (URS-F-021 / R-013)

1. **GRANT layer:** `qmpilot_app` has only `SELECT` + `INSERT` on `"AuditEvent"` (`REVOKE UPDATE, DELETE, TRUNCATE`).
2. **Trigger layer:** `audit_event_immutable` (`BEFORE UPDATE OR DELETE`) raises an exception — also protects against superuser accidents and test DBs without role split.

Migrations run as `qmpilot` / `qmpilot_migrator` (owner). The app connects as `qmpilot_app`.

## Local development

```bash
docker compose -f docker-compose.dev.yml up -d
export DATABASE_URL="postgresql://qmpilot:qmpilot@localhost:5432/qmpilot?schema=public"
npm run db:migrate   # or: npx prisma migrate deploy
```

After migrations, roles are created automatically by migration `20260707140000_wp02_audit_trail_immutability`.

Optional app-role URL (matches production):

```bash
export DATABASE_URL="postgresql://qmpilot_app:qmpilot_app@localhost:5432/qmpilot?schema=public"
```

Default passwords (`qmpilot_app` / `qmpilot_migrator`) are for **local/CI only**. Production passwords come from deployment secrets (WP-05).

## CI

GitHub Actions uses the `qmpilot` bootstrap user for `prisma migrate deploy`. Integration tests that verify GRANT restrictions use:

`DATABASE_URL_APP=postgresql://qmpilot_app:qmpilot_app@localhost:5432/qmpilot?schema=public`

## Immutability & retention triggers

- `enforce_immutable()` — tables with `lockedAt` (e.g. `Signature`); optional comma-separated whitelist via trigger arg.
- `enforce_retention()` — tables with `retentionUntil`; blocks `DELETE` while date is null or in the future.
- `attach_retention_trigger(regclass)` — helper for future models.

Test probe table: `"_ImmutabilityProbe"` (integration tests only).
