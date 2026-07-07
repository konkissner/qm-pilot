# Backup & Restore Runbook — QM-Pilot

**RPO:** ≪ 24 h (continuous WAL archiving)  
**RTO:** ≤ 1 Arbeitstag (target; measure on each exercise)

## Components

| Component | Location | Encrypted |
|-----------|----------|-----------|
| PostgreSQL data + WAL | VM + pgBackRest | Repo AES-256-CBC |
| `deploy/` config | Git repository | N/A (no secrets) |
| Secrets (`deploy/.env`) | Password manager / Hetzner vault | Customer process |
| Object Storage files | Hetzner Object Storage DE | SSE AES256 |

**Storage Box geography:** VM e.g. Falkenstein (fsn1) → Storage Box Helsinki or Nürnberg (different site). Document actual choice per customer AVV.

## Retention (R7)

- **Daily full backups:** 30 days (`repo1-retention-full=30`)
- **Weekly anchor:** Sunday 03:00 UTC full (long-term weekly chain within 3 months)
- **WAL:** archived continuously between fulls

## 1. New VM provisioning

```bash
# On fresh Hetzner CX32 (Ubuntu 24.04, DE)
git clone https://github.com/ORG/qm-pilot.git
cd qm-pilot
sudo ADMIN_SSH_KEY="$(cat ~/.ssh/id_ed25519.pub)" ./deploy/setup-host.sh
cp deploy/env.prod.example deploy/.env
# Edit deploy/.env — all secrets, Storage Box, S3, SMTP
cd deploy && docker compose up -d
```

Run migrations as migrator:

```bash
docker compose exec app npx prisma migrate deploy
```

## 2. pgBackRest restore (PITR)

**Prerequisites:** Storage Box SFTP credentials, `PGBACKREST_CIPHER_PASS`, stopped app/worker.

```bash
cd deploy
docker compose stop app worker
docker compose exec postgres pgbackrest --stanza=qmpilot stop
docker compose exec postgres pgbackrest --stanza=qmpilot --delta restore
# Optional PITR:
# docker compose exec postgres pgbackrest --stanza=qmpilot --type=time --target="2026-07-01 12:00:00+00" restore
docker compose start postgres
docker compose exec postgres pgbackrest --stanza=qmpilot start
docker compose up -d app worker
```

## 3. Integrity verification

```bash
./deploy/verify-backup.sh
# Or against live restored DB:
SKIP_DOCKER_RESTORE=1 DATABASE_URL="postgresql://..." ./deploy/verify-backup.sh
```

Checks:

- `SchedulerRun` table present with rows
- `AuditEvent` table present (after WP-02) + `MAX(occurredAt)` within expected RPO window
- Row counts of core tables vs. pre-incident baseline (document baseline after go-live)
- `pgbackrest check` + `pgbackrest info` — repo encrypted

## 4. App smoke tests

```bash
curl -sf https://qm.example.de/api/health | jq .
# Expect status "ok" (or "degraded" only if worker not yet ticked)
curl -sI https://qm.example.de/ | grep -i strict-transport
```

Login page loads (E2E / manual).

## 5. Restore exercise protocol (URS-F-040)

| Field | Value |
|-------|-------|
| Date | |
| Environment | Test VM (never prod-first) |
| Performer | |
| Reviewer (2nd person) | |
| Backup source | Storage Box stanza `qmpilot` |
| PITR target | |
| Start time (UTC) | |
| End time (UTC) | |
| Duration | |
| RTO met (≤ 1 Arbeitstag)? | yes / no |
| Integrity checks | pass / fail |
| AuditEvent latest timestamp | |
| Notes | |

### Test exercise record (WP-05 dry run — no live Hetzner)

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Environment | Local `verify-backup.sh` disposable container |
| Performer | CI / agent |
| Duration | ~2 min (automated script) |
| RTO met | yes (automated path; full VM exercise pending customer test VM) |
| Integrity checks | pass (`SchedulerRun` count ≥ 1) |
| Notes | Full Storage Box restore requires customer credentials — script documents path |

## Alarm paths (R8)

- Backup wrapper writes `SchedulerRun` + SMTP on failure
- Worker daily `backupCheck` — alarm if last `backupFull` > 26 h
- External: Uptime Robot / Hetzner on `GET /api/health` → `status != ok`

## Secrets backup

Export `deploy/.env` from password manager after each change. Never store in git.

## References

- `deploy/pgbackrest/pgbackrest.conf`
- `docs/backup-concept.md`
- URS-F-035…043, Risiko R-022, R-023
