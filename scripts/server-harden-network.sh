#!/usr/bin/env bash
# Run ON 192.168.0.105 with: sudo bash ~/server-harden-network.sh
# - UFW: allow 22/80/443 only
# - SSH: PermitRootLogin no
# - Remove phpMyAdmin
# - Bind Postfix to localhost (Monvino Cognito reset does NOT use local SMTP)
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Re-run with sudo: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> SSH: PermitRootLogin no"
install -d -m 755 /etc/ssh/sshd_config.d
cat >/etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
sshd -t
systemctl reload ssh || systemctl reload sshd

echo "==> Remove phpMyAdmin"
a2disconf phpmyadmin >/dev/null 2>&1 || true
apt-get purge -y phpmyadmin dbconfig-common 2>/dev/null || apt-get purge -y phpmyadmin || true
apt-get autoremove -y
# leftover alias conf
rm -f /etc/apache2/conf-enabled/phpmyadmin.conf
rm -f /etc/apache2/conf-available/phpmyadmin.conf
apache2ctl configtest
systemctl reload apache2

echo "==> Postfix: listen on loopback only (does not affect Cognito email)"
if [[ -d /etc/postfix ]]; then
  postconf -e 'inet_interfaces = loopback-only'
  postconf -e 'inet_protocols = all'
  systemctl restart postfix
fi

echo "==> UFW: default deny incoming; allow OpenSSH, HTTP, HTTPS"
apt-get install -y ufw
# Allow SSH BEFORE enabling so we do not lock ourselves out
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
# Non-interactive enable
ufw --force enable
ufw status verbose

echo ""
echo "Done."
echo "Verify: sudo ufw status verbose"
echo "Verify: sudo ss -tuln | grep -E ':25|:80|:443|:22'"
echo "Verify: curl -sI https://alpinecraft.cc/monvino/ | head"
