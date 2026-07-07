#!/bin/bash
# Creates qmpilot_app and qmpilot_migrator roles (WP-02 GRANTs — AuditEvent stub TODO)
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

  -- TODO(WP-02): REVOKE UPDATE, DELETE ON "AuditEvent" FROM qmpilot_app;
  -- TODO(WP-02): CREATE TRIGGER audit_event_immutable ...

  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO qmpilot_app;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO qmpilot_migrator;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO qmpilot_app;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO qmpilot_migrator;
EOSQL
