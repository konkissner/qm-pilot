# Host Hardening — QM-Pilot (URS-F-046…050, R-027)

## Scope

Applies to each Hetzner Cloud VM running QM-Pilot (production and test separately).

## Automated setup

Run once per fresh VM (idempotent):

```bash
sudo ADMIN_SSH_KEY="ssh-ed25519 AAAA..." ./deploy/setup-host.sh
```

This script:

- Enables **chrony** NTP (URS-F-022) — verify with `chronyc tracking`
- Sets host timezone to **UTC** (display conversion in app UI only)
- Installs Docker + Compose plugin
- Configures **UFW**: allow 22, 80, 443 only
- Disables SSH root login and password authentication
- Enables **unattended-upgrades** for security patches
- Creates `deploy` user (member of `docker` group) for CI/CD SSH

## TLS & HTTP headers (Caddy)

Configured in `deploy/Caddyfile`:

| Header | Value |
|--------|-------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| Referrer-Policy | strict-origin-when-cross-origin |
| Content-Security-Policy | restrictive default-src 'self' |

Verification: `./deploy/check-hardening.sh qm.example.de`

## Firewall

**Host (UFW):** 22, 80, 443 inbound. All other ports denied.

**Hetzner Cloud Firewall (recommended duplicate layer):** same rules as code in Hetzner console or Terraform — document per customer.

**Postgres:** not published on host ports in `deploy/docker-compose.yml` — only reachable on Docker network `qm_net`.

## SSH access (URS-F-049, R-014)

- Personal SSH keys only — maintain list in customer runbook / internal wiki
- `deploy` user for GitHub Actions — no direct root login for pipeline
- **auditd** + **journald** retain sudo/SSH events — default retention per Ubuntu LTS; extend via `/etc/audit/auditd.conf` if required

## Admin access logging

| Source | Location |
|--------|----------|
| SSH auth | `/var/log/auth.log` (journald) |
| sudo | `/var/log/auth.log` |
| auditd | `/var/log/audit/audit.log` |

Review monthly or on incident.

## Container hardening

- App/worker images run as non-root user `qmpilot` (UID 1001)
- `NODE_ENV=production`, `TZ=UTC`
- Secrets only via `deploy/.env` (never in git)

## Acceptance test

```bash
./deploy/check-hardening.sh <your-domain>
```

Reference in IQ/OQ protocol — see `validation/traceability.csv` (URS-F-046…050).
