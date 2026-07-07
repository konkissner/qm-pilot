# Backup Concept — QM-Pilot (URS-F-035…041)

## Strategy

1. **Continuous WAL archiving** via `archive_command` → pgBackRest → Hetzner Storage Box (SFTP)
2. **Daily full backup** 02:00 UTC (Mon–Sat incremental chain; Sunday 03:00 weekly anchor)
3. **Encryption:** `repo1-cipher-type=aes-256-cbc` with secret `PGBACKREST_CIPHER_PASS`
4. **Monitoring:** `deploy/pgbackrest/backup-wrapper.sh` → `SchedulerRun` + email alarm
5. **Freshness:** worker `backupCheck` every hour — alarm if > 26 h since last successful `backupFull`

## Scope (URS-F-041)

Included in DB backup:

- All application tables including future `AuditEvent`
- `SchedulerRun` heartbeat history

Included in git (not pgBackRest):

- `deploy/docker-compose.yml`, `Caddyfile`, init SQL, pgbackrest config

Excluded (separate customer process):

- `deploy/.env` secrets — export from password manager

Object Storage (S3) files: separate bucket replication/lifecycle policy on Hetzner — document per customer.

## RPO / RTO

| Metric | Target | Mechanism |
|--------|--------|-----------|
| RPO | ≪ 24 h | WAL archiving (minutes) |
| RTO | ≤ 1 Arbeitstag | Documented restore runbook + annual exercise (WP-52) |

## Verification

- **Automated:** `deploy/verify-backup.sh` (CI + test-VM cron)
- **Manual:** annual restore exercise — protocol in `docs/runbooks/restore.md`

## Geo-redundancy

Primary VM: Hetzner DE (e.g. fsn1).  
Backup repo: Storage Box different location (hel1 / nbg1).  
Object Storage: Hetzner DE region only (URS-F-044).
