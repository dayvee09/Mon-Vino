# Dev container

Shared defaults (versioned): `Dockerfile`, `devcontainer.json`, scripts, Apache config, and `docker-compose.example.yml`.

Local-only (gitignored): `docker-compose.yml` — your credentials and overrides.

Base image uses **Node 22**; `post-create.sh` then installs the version from the repo `.nvmrc`.

## Nested URLs

Apache on port **80**:

| URL (in container / forwarded) | Serves |
|--------------------------------|--------|
| `http://localhost/` | Small landing page |
| `http://localhost/monvino/` | Mon Vino React (proxied to CRA on `:3000`) |
| `http://localhost/api-php/` | PHP API (`apps/monvino/api-php`) |

Direct CRA (hot reload): `http://localhost:3000/monvino/`

## First-time setup (forks)

```bash
./scripts/dev-setup.sh
# or manually:
cp .devcontainer/docker-compose.example.yml .devcontainer/docker-compose.yml
# then set DB_PASSWORD / MYSQL_ROOT_PASSWORD in the gitignored compose file
```

Then **F1 → Dev Containers: Reopen in Container**.

`DB_PASSWORD` comes from your local Compose file (not from `devcontainer.json`).

Apache starts automatically in two places:
1. when the `app` container starts (`docker-compose` `command`)
2. again when the IDE attaches (`postStartCommand` → `post-start.sh`)

Ports: React `3000`, Apache nested sites `80`, MariaDB `3306`.

On WSL/Docker, file watching uses polling (`CHOKIDAR_USEPOLLING` / `WATCHPACK_POLLING`) so saves hot-reload without restarting `npm start`.

After attach, start Mon Vino:

```bash
cd apps/monvino/client && npm start
# open http://localhost:3000/monvino/  or  http://localhost/monvino/
```

If the API ever returns HTTP 504: `sudo service apache2 restart`

If you change `apache-monvino.conf` or the Dockerfile, rebuild the container image (**Dev Containers: Rebuild Container**).

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

The Compose project name is fixed as `alpinecraft_devcontainer` so these commands match what Dev Containers started (workspace folder name on disk).

Database seed on first start: `apps/monvino/database/monvino-starter.sql`.
