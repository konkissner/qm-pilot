-- WP-02: AuditEvent, Signature, immutability/retention triggers, DB roles

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "SignatureMeaning" AS ENUM ('created', 'reviewed', 'approved', 'acknowledged');
CREATE TYPE "ReAuthMethod" AS ENUM ('password', 'pin');

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userNameSnapshot" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actionLabel" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "objectLabel" TEXT NOT NULL,
    "diff" JSONB,
    "context" JSONB,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'info',

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userNameSnapshot" TEXT NOT NULL,
    "signedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meaning" "SignatureMeaning" NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "objectLabel" TEXT NOT NULL,
    "reAuthMethod" "ReAuthMethod" NOT NULL,
    "comment" TEXT,
    "lockedAt" TIMESTAMPTZ,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_occurredAt_idx" ON "AuditEvent"("tenantId", "occurredAt");
CREATE INDEX "AuditEvent_tenantId_objectType_objectId_idx" ON "AuditEvent"("tenantId", "objectType", "objectId");
CREATE INDEX "AuditEvent_tenantId_userId_idx" ON "AuditEvent"("tenantId", "userId");
CREATE INDEX "Signature_tenantId_objectType_objectId_idx" ON "Signature"("tenantId", "objectType", "objectId");
CREATE INDEX "Signature_tenantId_userId_idx" ON "Signature"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only AuditEvent (trigger — also blocks superuser misuse)
CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent rows are append-only and cannot be updated or deleted';
END;
$$;

CREATE TRIGGER audit_event_immutable
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_event_mutation();

-- Generic immutability for lockedAt-protected rows (R9)
CREATE OR REPLACE FUNCTION enforce_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  col record;
  old_json jsonb;
  new_json jsonb;
  whitelist text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF OLD."lockedAt" IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Row is immutable (lockedAt set) — delete not allowed on %', TG_TABLE_NAME;
  END IF;

  whitelist := CASE WHEN TG_NARGS > 0 THEN string_to_array(TG_ARGV[0], ',') ELSE ARRAY[]::text[] END;
  old_json := to_jsonb(OLD);
  new_json := to_jsonb(NEW);

  FOR col IN SELECT * FROM jsonb_each(old_json)
  LOOP
    IF col.key = ANY(whitelist) THEN CONTINUE; END IF;
    IF (old_json -> col.key) IS DISTINCT FROM (new_json -> col.key) THEN
      RAISE EXCEPTION 'Row is immutable — column % cannot change on %', col.key, TG_TABLE_NAME;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER signature_immutable
  BEFORE UPDATE OR DELETE ON "Signature"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_immutable('lockedAt');

-- Retention delete guard (R10) — reusable via attach_retention_trigger()
CREATE OR REPLACE FUNCTION enforce_retention()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."retentionUntil" IS NULL OR OLD."retentionUntil" > CURRENT_DATE THEN
    RAISE EXCEPTION 'Delete blocked by retention policy on % until %', TG_TABLE_NAME, COALESCE(OLD."retentionUntil"::text, 'indefinite');
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION attach_retention_trigger(target_table regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  trigger_name text := 'retention_guard_' || target_table::text;
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_name, target_table);
  EXECUTE format(
    'CREATE TRIGGER %I BEFORE DELETE ON %s FOR EACH ROW EXECUTE FUNCTION enforce_retention()',
    trigger_name,
    target_table
  );
END;
$$;

-- Test table for immutability/retention integration tests (no Prisma model)
CREATE TABLE IF NOT EXISTS "_ImmutabilityProbe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "lockedAt" TIMESTAMPTZ,
    "retentionUntil" DATE
);

CREATE TRIGGER immutability_probe_locked
  BEFORE UPDATE OR DELETE ON "_ImmutabilityProbe"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_immutable('lockedAt');

SELECT attach_retention_trigger('"_ImmutabilityProbe"'::regclass);

-- Postgres role split (R2)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'qmpilot_app') THEN
    CREATE ROLE qmpilot_app LOGIN PASSWORD 'qmpilot_app';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'qmpilot_migrator') THEN
    CREATE ROLE qmpilot_migrator LOGIN PASSWORD 'qmpilot_migrator';
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO qmpilot_app, qmpilot_migrator', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO qmpilot_app, qmpilot_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO qmpilot_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO qmpilot_app;

GRANT ALL ON ALL TABLES IN SCHEMA public TO qmpilot_migrator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO qmpilot_migrator;
GRANT CREATE ON SCHEMA public TO qmpilot_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qmpilot_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO qmpilot_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO qmpilot_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO qmpilot_migrator;

-- AuditEvent: app role append-only (INSERT + SELECT only)
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "AuditEvent" FROM qmpilot_app;
GRANT SELECT, INSERT ON TABLE "AuditEvent" TO qmpilot_app;
