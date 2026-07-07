#!/usr/bin/env bash
# Idempotent Hetzner VM host setup for QM-Pilot (R3, R4, R14)
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
ADMIN_SSH_KEY="${ADMIN_SSH_KEY:-}"

log() { echo "[setup-host] $*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

log "Updating packages"
apt-get update -qq
apt-get upgrade -y -qq

log "Installing base packages"
apt-get install -y -qq ca-certificates curl git ufw fail2ban unattended-upgrades chrony docker.io docker-compose-plugin

log "Enabling NTP (chrony)"
systemctl enable --now chrony
timedatectl set-timezone UTC

log "Configuring unattended-upgrades for security patches"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

log "Hardening SSH"
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd

log "Creating deploy user (pipeline SSH, no root shell)"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
fi

if [[ -n "$ADMIN_SSH_KEY" ]]; then
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  echo "$ADMIN_SSH_KEY" >>"/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

log "Configuring UFW firewall (80, 443, SSH only)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (ACME + redirect)'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

log "Enabling auditd for admin access logging"
apt-get install -y -qq auditd
systemctl enable --now auditd

log "Verifying time sync"
chronyc tracking || true
timedatectl status

log "Done. Next: copy deploy/.env, run docker compose from deploy/"
