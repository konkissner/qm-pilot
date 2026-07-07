#!/bin/bash
# Creates qmpilot_app and qmpilot_migrator roles (aligned with WP-02 migration GRANTs)
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'qmpilot_app') THEN
      CREATE ROLE qmpilot_app LOGIN PASSWORD '${QMPILOT_APP_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'qmpilot_migrator') THEN
      CREATE ROLE qmpilot_migrator LOGIN PASSWORD '${QMPILOT_MIGRATOR_PASSWORD}';
    END IF;
  END
  \$\$;

  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO qmpilot_app, qmpilot_migrator;
  GRANT USAGE ON SCHEMA public TO qmpilot_app, qmpilot_migrator;

  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qmpilot_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO qmpilot_app;

  GRANT CREATE ON SCHEMA public TO qmpilot_migrator;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO qmpilot_migrator;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO qmpilot_migrator;

  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO qmpilot_app;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO qmpilot_migrator;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO qmpilot_app;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO qmpilot_migrator;

  -- AuditEvent append-only for qmpilot_app (matches migration 20260707140000_wp02_audit_trail_immutability)
  DO \$\$
  BEGIN
    IF EXISTS (
      SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'AuditEvent'
    ) THEN
      REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "AuditEvent" FROM qmpilot_app;
      GRANT SELECT, INSERT ON TABLE "AuditEvent" TO qmpilot_app;
    END IF;
  END
  \$\$;
EOSQL
