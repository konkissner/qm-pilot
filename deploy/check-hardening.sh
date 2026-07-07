#!/usr/bin/env bash
# Hardening verification for test/prod VM acceptance (R27 test)
set -euo pipefail

DOMAIN="${1:-}"
BASE_URL="${BASE_URL:-https://${DOMAIN}}"

failures=0
pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*"; failures=$((failures + 1)); }

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <domain>" >&2
  exit 2
fi

log "Checking HTTP → HTTPS redirect"
if curl -sI "http://${DOMAIN}" | grep -qi '301\|302\|307'; then
  pass "HTTP redirects to HTTPS"
else
  fail "HTTP does not redirect"
fi

log "Checking TLS and security headers"
headers=$(curl -sI "$BASE_URL/api/health" || true)
echo "$headers" | grep -qi 'strict-transport-security' && pass 'HSTS' || fail 'HSTS missing'
echo "$headers" | grep -qi 'x-content-type-options: nosniff' && pass 'X-Content-Type-Options' || fail 'nosniff missing'
echo "$headers" | grep -qi 'x-frame-options: deny' && pass 'X-Frame-Options' || fail 'X-Frame-Options missing'
echo "$headers" | grep -qi 'referrer-policy' && pass 'Referrer-Policy' || fail 'Referrer-Policy missing'
echo "$headers" | grep -qi 'content-security-policy' && pass 'CSP' || fail 'CSP missing'

log "Checking SSH configuration (local host)"
if grep -q '^PermitRootLogin no' /etc/ssh/sshd_config 2>/dev/null; then
  pass 'PermitRootLogin no'
else
  fail 'PermitRootLogin not disabled'
fi
if grep -q '^PasswordAuthentication no' /etc/ssh/sshd_config 2>/dev/null; then
  pass 'PasswordAuthentication no'
else
  fail 'PasswordAuthentication not disabled'
fi

log "Checking Postgres not exposed on host (port 5432)"
if command -v ss >/dev/null; then
  if ss -tln | grep -q ':5432'; then
    fail 'Port 5432 is listening on host'
  else
    pass 'Port 5432 not published on host'
  fi
else
  echo "SKIP: ss not available"
fi

log "Checking open ports (expect 22, 80, 443 only)"
if command -v nmap >/dev/null; then
  open_ports=$(nmap -p 22,80,443,5432,4321 localhost 2>/dev/null | grep open || true)
  echo "$open_ports"
  echo "$open_ports" | grep -q 5432 && fail 'Postgres port open' || pass 'Postgres not in nmap open'
else
  echo "SKIP: nmap not installed"
fi

if [[ $failures -gt 0 ]]; then
  echo "${failures} check(s) failed"
  exit 1
fi

echo "All hardening checks passed"
