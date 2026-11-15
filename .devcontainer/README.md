# Dev container

Shared defaults (versioned): `Dockerfile`, `devcontainer.json`, scripts, Apache config, and `docker-compose.example.yml`.

Local-only (gitignored): `docker-compose.yml` — your credentials and overrides.

Base image uses **Node 22**; `post-create.sh` then installs the version from the repo `.nvmrc` (currently Node 26 LTS).

## First-time setup (forks)

```bash
./scripts/dev-setup.sh
# or manually:
cp .devcontainer/docker-compose.example.yml .devcontainer/docker-compose.yml
# then set DB_PASSWORD / MYSQL_ROOT_PASSWORD in the gitignored compose file
```

The example ships with non-secret placeholders (`change-me`). After copying, you can change passwords in the gitignored `docker-compose.yml` only.

Then **F1 → Dev Containers: Reopen in Container**.

`DB_PASSWORD` comes from your local Compose file (not from `devcontainer.json`).

Apache starts automatically in two places:
1. when the `app` container starts (`docker-compose` `command`)
2. again when the IDE attaches (`postStartCommand` → `post-start.sh`)

Ports: React `3000`, Apache/PHP API `80`, MariaDB `3306` (forwarded into Cursor).

If the API ever returns HTTP 504: `sudo service apache2 restart`

## Reopen locally + tear down

**F1 → Dev Containers: Reopen Folder Locally** stops the Compose stack (`shutdownAction: stopCompose`) but does **not** remove containers/networks.

To fully remove them (keep the DB volume):

```bash
docker compose -f .devcontainer/docker-compose.yml down
```

To also wipe MariaDB data:

```bash
docker compose -f .devcontainer/docker-compose.yml down -v
```

The Compose project name is fixed as `monvino_devcontainer` so these commands match what Dev Containers started.

Database seed on first start: `cellier-projet/database/monvino-starter.sql`.
