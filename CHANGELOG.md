# Changelog

Alle Releases sind Git-Tags auf Commits mit grüner CI (URS-F-052). Software-Versionierung ist getrennt vom QM-Change-Control des Kunden (URS-F-053).

## 0.0.1 — Bootstrap (WP-00)

**URS:** URS-F-052, URS-F-053, URS-F-064

- Astro 5 SSR + React 19 Islands + Tailwind v4
- Prisma + ZenStack Platzhaltermodell `SystemInfo`
- Better Auth als Dependency (Konfiguration WP-03)
- Vitest + Playwright + ESLint
- GitHub Actions CI (lint, test, build, e2e)
- Vollständiger `spec/`-Ordner laut Kopier-Manifest
- Traceability-Gerüst unter `validation/`

## Unreleased — WP-05 Hetzner Deployment

**URS:** URS-F-022, URS-F-034…043, URS-F-044…052

- Docker Compose stack (Caddy, app, worker, Postgres 17, pgBackRest)
- `SchedulerRun` heartbeat model + `/api/health` endpoint
- Hetzner Object Storage client (`src/lib/storage.ts`) + auth-gated `/api/files/[id]`
- Deploy pipeline (`.github/workflows/deploy.yml`), hardening docs, restore runbook
- `deploy/verify-backup.sh` + `deploy/check-hardening.sh`
