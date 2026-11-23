# Déploiement production / LAN

Ce guide décrit comment construire Mon Vino, le déployer, et éviter d’exposer des secrets.

## Architecture

| Composant | Dossier repo | Rôle |
|-----------|--------------|------|
| Frontend React | `apps/monvino/client` → `www/` dans l’archive | Interface |
| API PHP | `apps/monvino/api-php` | Backend REST JSON |
| Base de données | `apps/monvino/database/monvino-starter.sql` | Schéma + démo |

| URL (exemple) | Fichiers sur le serveur |
|---------------|-------------------------|
| `/monvino/` | `/var/www/html/monvino/www/` |
| `/api-php/` | `/var/www/html/monvino/api-php/` |

Configurez l’URL d’API dans `apps/monvino/client/.env.production` (gitignored) :

```bash
REACT_APP_API_URI=https://YOUR_DOMAIN/api-php/index.php
```

LAN (exemple) : `http://192.168.0.105/monvino/`.

---

## 1. Préparer la machine de développement

```bash
cd /chemin/vers/Mon-Vino
chmod +x scripts/*.sh .githooks/pre-commit
./scripts/dev-setup.sh
```

Cela crée (s’ils manquent) :

- `apps/monvino/api-php/config.local.php` — identifiants MySQL (gitignored)
- `apps/monvino/api-php/modeles/AccesBd.cls.php` — copie du template (gitignored)
- `apps/monvino/client/src/aws-exports.js` — config Cognito (gitignored)
- le hook Git `pre-commit` pour bloquer les secrets

---

## 2. Build

```bash
./scripts/build-monvino.sh
```

Sortie sous `dist/monvino-release-YYYYMMDD-HHMMSS/` (+ `.tar.gz`).

---

## 3. Deploy (SSH)

```bash
cp deploy.env.example deploy.env   # DEPLOY_USER, DEPLOY_HOST
ssh-copy-id user@192.168.0.105
./scripts/deploy.sh
```

Ou copiez le tarball manuellement sur le serveur et extrayez sous `/var/www/html/monvino/`.

### Config serveur

```bash
cd /var/www/html/monvino/api-php
sudo cp config.local.example.php config.local.php
sudo nano config.local.php   # db_host, db_name, db_user, db_pass
```

### Vérifications

1. `…/monvino/` — React Mon Vino
2. `…/api-php/` — JSON, pas d’erreur 500
3. Cognito — callback / sign-out URLs vers `…/monvino/`
4. `config.local.php`, `.env.production`, `deploy.env`, `aws-exports.js` **absents** du dépôt Git

---

## Checklist sécurité

- [ ] `./scripts/setup-git-hooks.sh` sur chaque poste
- [ ] Aucun fichier sensible dans `git status`
- [ ] Cognito : URLs de callback production
- [ ] MySQL : utilisateur dédié, mot de passe fort
- [ ] SSH : clé locale, pas de mot de passe dans le repo

## Dépannage

| Problème | Solution |
|----------|----------|
| `Configuration manquante` (API) | Créer `api-php/config.local.php` sur le serveur |
| Erreur 500 base de données | Vérifier host/user/pass dans `config.local.php` |
| Auth Cognito échoue | Vérifier `aws-exports.js` au **build** |
| Routes React 404 au refresh | `FallbackResource` / `try_files … /index.html` |
| `deploy.sh` refuse la connexion | `ssh-copy-id user@HOST` puis réessayer |
