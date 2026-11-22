# Déploiement production / LAN

Ce guide décrit comment construire les apps, les déployer (manuellement ou via SSH), et éviter d’exposer des secrets.

## Architecture

| Composant | Dossier repo | Rôle |
|-----------|--------------|------|
| Portfolio | `apps/portfolio` | Site AlpineCraft (Rust → WASM) |
| Frontend React | `apps/monvino/client` → `www/` dans l’archive | Interface Mon Vino |
| API PHP | `apps/monvino/api-php` | Backend REST JSON |
| Base de données | `apps/monvino/database/monvino-starter.sql` | Schéma + démo |

| URL | Fichiers sur le serveur |
|-----|-------------------------|
| `/` | `/var/www/html/alpinecraft/` |
| `/monvino/` | `/var/www/html/monvino/www/` |
| `/api-php/` | `/var/www/html/monvino/api-php/` |

URL de production de l’API : `https://alpinecraft.cc/api-php/index.php`  
Détail Apache : **[apps/portfolio/DEPLOY.md](./apps/portfolio/DEPLOY.md)**.

LAN (exemple) : `http://192.168.0.105/` avec la même arborescence.

---

## 1. Préparer la machine de développement

```bash
cd /chemin/vers/alpinecraft
chmod +x scripts/*.sh .githooks/pre-commit
./scripts/dev-setup.sh
```

Cela crée (s’ils manquent) :

- `apps/monvino/api-php/config.local.php` — identifiants MySQL (gitignored)
- `apps/monvino/api-php/modeles/AccesBd.cls.php` — copie du template (gitignored)
- `apps/monvino/client/src/aws-exports.js` — config Cognito (gitignored)
- le hook Git `pre-commit` pour bloquer les secrets

### Fichiers à ne jamais committer

| Fichier | Raison |
|---------|--------|
| `AccesBd.cls.php` | Ancienne variante avec mots de passe en dur |
| `config.local.php` | Identifiants base de données |
| `.env`, `.env.production`, `.env.*.local` | Variables d’environnement |
| `src/aws-exports.js` | IDs Cognito / OAuth |
| Amplify local / cloud-backend | Compte AWS, secrets OAuth |
| `.devcontainer/docker-compose.yml` | Mots de passe MariaDB locaux |
| `deploy.env` | Hôte / utilisateur SSH locaux |
| `apps/monvino/database/*.sql` (sauf `monvino-starter.sql`) | Dumps SQL personnels |

### Activer la protection Git

```bash
./scripts/setup-git-hooks.sh
```

---

## 2. Construire les archives

```bash
# Portfolio seul
./scripts/build-portfolio.sh

# Mon Vino seul
cp apps/monvino/client/.env.production.example apps/monvino/client/.env.production
# Éditer REACT_APP_API_URI si besoin
./scripts/build-monvino.sh

# Les deux
./scripts/build-all.sh
```

Résultat dans `dist/` :

- `portfolio-release-YYYYMMDD-HHMMSS/` (+ `.tar.gz`)
- `monvino-release-YYYYMMDD-HHMMSS/` (+ `.tar.gz`)

Les archives **ne contiennent pas** : `node_modules`, `.env`, `config.local.php`, ni secrets locaux.

---

## 3. Déployer sur le serveur

### Option A — Script SSH (recommandé, sans secrets dans Git)

Aucune clé ni mot de passe n’est stocké dans le dépôt. Le script utilise **votre agent SSH / `~/.ssh`**.

```bash
# Une fois : clé SSH vers le serveur LAN
ssh-keygen -t ed25519   # si besoin
ssh-copy-id votreuser@192.168.0.105

cp deploy.env.example deploy.env
# Éditer DEPLOY_USER=votreuser (DEPLOY_HOST=192.168.0.105 déjà)

./scripts/build-all.sh
./scripts/deploy.sh              # les deux apps
./scripts/deploy.sh portfolio    # ou une seule
./scripts/deploy.sh monvino
```

`deploy.sh` **préserve** `api-php/config.local.php` déjà présent sur le serveur.

### Option B — Manuel (scp / rsync)

```bash
scp dist/portfolio-release-*.tar.gz user@192.168.0.105:/tmp/
scp dist/monvino-release-*.tar.gz user@192.168.0.105:/tmp/
ssh user@192.168.0.105
```

Sur le serveur :

```bash
sudo mkdir -p /var/www/html/alpinecraft /var/www/html/monvino
sudo tar -xzf /tmp/portfolio-release-*.tar.gz -C /tmp
sudo rsync -a --delete /tmp/portfolio-release-*/ /var/www/html/alpinecraft/

sudo tar -xzf /tmp/monvino-release-*.tar.gz -C /tmp
# Ne pas écraser config.local.php
sudo rsync -a --delete /tmp/monvino-release-*/www/ /var/www/html/monvino/www/
sudo rsync -a --delete --exclude=config.local.php \
  /tmp/monvino-release-*/api-php/ /var/www/html/monvino/api-php/
```

### Base de données (première fois)

```bash
mysql -u root -p -e "CREATE DATABASE pw2 CHARACTER SET utf8mb4;"
mysql -u root -p pw2 < /var/www/html/monvino/database/monvino-starter.sql
```

### Configuration API (première fois)

```bash
cd /var/www/html/monvino/api-php
sudo cp config.local.example.php config.local.php
sudo nano config.local.php   # db_host, db_name, db_user, db_pass
```

### Apache

Voir l’exemple vhost dans [apps/portfolio/DEPLOY.md](./apps/portfolio/DEPLOY.md).

### Vérifications

1. `http://192.168.0.105/` ou `https://alpinecraft.cc/` — portfolio
2. `…/monvino/` — React Mon Vino
3. `…/api-php/` — JSON, pas d’erreur 500
4. Cognito — redirects vers `…/monvino/`
5. `config.local.php`, `.env.production`, `deploy.env` **absents** du dépôt Git

---

## 4. Mises à jour

1. Dev : `git pull`, `./scripts/build-all.sh`, `./scripts/deploy.sh` (ou scp manuel)
2. Ne pas écraser `api-php/config.local.php` sur le serveur
3. Remplacer `www/` et le code PHP sauf la config locale

---

## 5. Checklist sécurité

- [ ] `./scripts/setup-git-hooks.sh` sur chaque poste
- [ ] Aucun fichier sensible listé ci-dessus dans `git status`
- [ ] Cognito : URLs de callback production
- [ ] MySQL : utilisateur dédié, mot de passe fort
- [ ] SSH : clé locale, pas de mot de passe dans le repo
- [ ] HTTPS en production publique

---

## Dépannage

| Problème | Solution |
|----------|----------|
| `Configuration manquante` (API) | Créer `api-php/config.local.php` sur le serveur |
| Erreur 500 base de données | Vérifier host/user/pass dans `config.local.php` |
| Auth Cognito échoue | Vérifier `aws-exports.js` au **build** |
| Routes React 404 au refresh | `FallbackResource` / `try_files … /index.html` |
| `deploy.sh` refuse la connexion | `ssh-copy-id user@192.168.0.105` puis réessayer |
| pre-commit bloque un commit | Retirer le fichier de l’index et l’ajouter au `.gitignore` |
