#!/usr/bin/env bash
# pgBackRest backup wrapper — records SchedulerRun + sends alarm on failure (R8)
set -euo pipefail

BACKUP_TYPE="${1:-full}"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
LOG_FILE="/var/log/pgbackrest/backup-wrapper.log"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG_FILE"; }

record_run() {
  local status="$1"
  local detail="$2"
  if command -v psql >/dev/null 2>&1 && [[ -n "${DATABASE_URL_MIGRATOR:-}" ]]; then
    psql "$DATABASE_URL_MIGRATOR" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO \"SchedulerRun\" (id, kind, \"startedAt\", \"finishedAt\", status, detail)
       VALUES (
         'backup_' || extract(epoch from now())::text,
         'backupFull',
         '${STARTED_AT}'::timestamptz,
         now(),
         '${status}',
         '${detail}'::jsonb
       );" 2>>"$LOG_FILE" || log "WARN: could not write SchedulerRun"
  else
    log "SchedulerRun: status=${status} detail=${detail}"
  fi
}

send_alarm() {
  local subject="$1"
  local body="$2"
  if [[ -n "${SMTP_HOST:-}" && -n "${ADMIN_ALERT_EMAIL:-}" ]]; then
    node -e "
      const nodemailer = require('nodemailer');
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      t.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.ADMIN_ALERT_EMAIL,
        subject: '[QM-Pilot] ' + process.argv[1],
        text: process.argv[2],
      }).then(() => process.exit(0)).catch(() => process.exit(1));
    " "$subject" "$body" 2>>"$LOG_FILE" || log "WARN: alarm email failed"
  else
    log "ALARM (no SMTP): ${subject} — ${body}"
  fi
}

log "Starting ${BACKUP_TYPE} backup"
START_MS=$(date +%s%3N)

set +e
pgbackrest --stanza=qmpilot --type="${BACKUP_TYPE}" backup 2>>"$LOG_FILE"
RC=$?
set -e

END_MS=$(date +%s%3N)
DURATION_MS=$((END_MS - START_MS))

if [[ $RC -eq 0 ]]; then
  SIZE_BYTES=$(pgbackrest --stanza=qmpilot info --output=json 2>/dev/null | grep -o '"size":[0-9]*' | head -1 | cut -d: -f2 || echo 0)
  DETAIL="{\"durationMs\":${DURATION_MS},\"sizeBytes\":${SIZE_BYTES:-0},\"type\":\"${BACKUP_TYPE}\"}"
  record_run "ok" "$DETAIL"
  log "Backup succeeded in ${DURATION_MS}ms"
  exit 0
else
  DETAIL="{\"durationMs\":${DURATION_MS},\"error\":\"pgbackrest exit ${RC}\",\"type\":\"${BACKUP_TYPE}\"}"
  record_run "failed" "$DETAIL"
  send_alarm "Backup failed" "pgBackRest ${BACKUP_TYPE} failed (exit ${RC}) after ${DURATION_MS}ms"
  log "Backup FAILED (exit ${RC})"
  exit "$RC"
fi
