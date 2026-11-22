# Deploy AlpineCraft (portfolio) + Mon Vino on alpinecraft.cc

## Layout

| URL | Files on server |
|-----|-----------------|
| `https://alpinecraft.cc/` | `/var/www/html/alpinecraft/` (this Trunk `dist/`) |
| `https://alpinecraft.cc/monvino/` | `/var/www/html/monvino/www/` |
| `https://alpinecraft.cc/api-php/` | `/var/www/html/monvino/api-php/` |

## Build on your machine

### Portfolio

```bash
# Once: rustup + wasm target + trunk
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
cargo install trunk

./scripts/build-portfolio.sh
```

### Mon Vino (subpath `/monvino`)

```bash
# Ensure apps/monvino/client/.env.production has:
# REACT_APP_API_URI=https://alpinecraft.cc/api-php/index.php
#
# package.json homepage is "/monvino"
# Router basename follows PUBLIC_URL (src/index.jsx)

./scripts/build-monvino.sh
```

Update Cognito app client callback / sign-out URLs to:

- `https://alpinecraft.cc/monvino/`

and rebuild so `aws-exports.js` matches (baked at build time).

## Upload (manual)

```bash
# Portfolio
scp dist/portfolio-release-*.tar.gz user@192.168.0.105:/tmp/
ssh user@192.168.0.105
sudo mkdir -p /var/www/html/alpinecraft
sudo tar -xzf /tmp/portfolio-release-*.tar.gz -C /tmp
sudo rsync -a --delete /tmp/portfolio-release-*/ /var/www/html/alpinecraft/

# Mon Vino (keep existing config.local.php)
# Extract release, rsync www/ and api-php/ as usual — see ../../DEPLOYMENT.md
```

Or use SSH-agent deploy (no passwords in the repo):

```bash
cp deploy.env.example deploy.env   # set DEPLOY_USER
./scripts/build-all.sh
./scripts/deploy.sh
```

## Apache vhost (Debian)

`/etc/apache2/sites-available/alpinecraft.conf`:

```apache
<VirtualHost *:80>
    ServerName alpinecraft.cc
    ServerAlias www.alpinecraft.cc

    DocumentRoot /var/www/html/alpinecraft

    <Directory /var/www/html/alpinecraft>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>

    Alias /monvino /var/www/html/monvino/www
    <Directory /var/www/html/monvino/www>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        FallbackResource /monvino/index.html
    </Directory>

    Alias /api-php /var/www/html/monvino/api-php
    <Directory /var/www/html/monvino/api-php>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        FallbackResource disabled
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/alpinecraft-error.log
    CustomLog ${APACHE_LOG_DIR}/alpinecraft-access.log combined
</VirtualHost>
```

```bash
sudo a2enmod rewrite alias
sudo a2ensite alpinecraft.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Then HTTPS with Certbot as usual.

## Local preview

```bash
cd apps/portfolio
trunk serve
# http://127.0.0.1:8080
```

In the Dev Container, Apache on port **80** already nests like production (`/` → `apps/portfolio/dist`, `/monvino/` → React, `/api-php/` → API). See [`.devcontainer/README.md`](../../.devcontainer/README.md).
