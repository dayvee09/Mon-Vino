#!/usr/bin/env bash
# Run ON 192.168.0.105 with: sudo bash server-harden-php83.sh
# Hardens Apache/PHP and upgrades Debian 12 from PHP 8.2 → 8.3 (Sury).
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Re-run with sudo: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
PHP_FROM="${PHP_FROM:-8.2}"
PHP_TO="${PHP_TO:-8.3}"

echo "==> Security updates"
apt-get update -y
apt-get -y upgrade

echo "==> Apache fingerprint / signature"
SECURITY_CONF=/etc/apache2/conf-available/security.conf
if [[ -f "$SECURITY_CONF" ]]; then
  sed -i 's/^ServerTokens .*/ServerTokens Prod/' "$SECURITY_CONF"
  sed -i 's/^#ServerTokens Prod/ServerTokens Prod/' "$SECURITY_CONF"
  sed -i 's/^ServerSignature .*/ServerSignature Off/' "$SECURITY_CONF"
  sed -i 's/^#ServerSignature Off/ServerSignature Off/' "$SECURITY_CONF"
fi

echo "==> Security headers (if missing)"
HEADERS_CONF=/etc/apache2/conf-available/monvino-security-headers.conf
cat >"$HEADERS_CONF" <<'EOF'
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
</IfModule>
EOF
a2enmod headers >/dev/null
a2enconf monvino-security-headers >/dev/null || true

echo "==> Ensure Sury PHP repo (for PHP ${PHP_TO} on Bookworm)"
if [[ ! -f /etc/apt/sources.list.d/php.list ]]; then
  apt-get install -y apt-transport-https lsb-release ca-certificates curl gnupg
  curl -fsSL https://packages.sury.org/php/apt.gpg \
    | gpg --dearmor -o /usr/share/keyrings/deb.sury.org-php.gpg
  echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" \
    >/etc/apt/sources.list.d/php.list
  apt-get update -y
fi

echo "==> Install PHP ${PHP_TO} + extensions"
apt-get install -y \
  "php${PHP_TO}" \
  "libapache2-mod-php${PHP_TO}" \
  "php${PHP_TO}-cli" \
  "php${PHP_TO}-common" \
  "php${PHP_TO}-curl" \
  "php${PHP_TO}-gd" \
  "php${PHP_TO}-mbstring" \
  "php${PHP_TO}-mysql" \
  "php${PHP_TO}-opcache" \
  "php${PHP_TO}-xml" \
  "php${PHP_TO}-zip" \
  "php${PHP_TO}-readline"

APACHE_INI="/etc/php/${PHP_TO}/apache2/php.ini"
if [[ -f "$APACHE_INI" ]]; then
  echo "==> Harden ${APACHE_INI}"
  sed -i 's/^expose_php = .*/expose_php = Off/' "$APACHE_INI"
  sed -i 's/^display_errors = .*/display_errors = Off/' "$APACHE_INI"
  sed -i 's/^display_startup_errors = .*/display_startup_errors = Off/' "$APACHE_INI"
  sed -i 's/^session.use_strict_mode = .*/session.use_strict_mode = 1/' "$APACHE_INI"
  sed -i 's/^;session.cookie_httponly =.*/session.cookie_httponly = 1/' "$APACHE_INI"
  sed -i 's/^session.cookie_httponly =.*/session.cookie_httponly = 1/' "$APACHE_INI"
  # SAQ sync needs headroom
  sed -i 's/^memory_limit = .*/memory_limit = 256M/' "$APACHE_INI"
fi

echo "==> Switch Apache PHP module ${PHP_FROM} → ${PHP_TO}"
a2dismod "php${PHP_FROM}" >/dev/null 2>&1 || true
a2enmod "php${PHP_TO}"
apache2ctl configtest
systemctl restart apache2

echo "==> Versions"
php -v | head -1
apache2ctl -M 2>/dev/null | grep php || true

echo ""
echo "Done. Smoke-test: curl -sI https://alpinecraft.cc/api-php/ | head"
echo "Rollback if needed:"
echo "  sudo a2dismod php${PHP_TO} && sudo a2enmod php${PHP_FROM} && sudo systemctl restart apache2"
