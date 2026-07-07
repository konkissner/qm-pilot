-- pgBackRest archive mode — WAL continuous archiving (RPO ≪ 24h)
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'pgbackrest --stanza=qmpilot archive-push %p';
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET max_wal_senders = '3';
