# Mon Vino

Wine cellar web app (React + PHP API + Cognito).

## Layout

| Path | Role |
|------|------|
| [`apps/monvino/client/`](./apps/monvino/client/) | React frontend (`homepage`: `/monvino`) |
| [`apps/monvino/api-php/`](./apps/monvino/api-php/) | REST API |
| [`apps/monvino/database/`](./apps/monvino/database/) | Starter SQL |
| [`scripts/`](./scripts/) | Setup, build, deploy |
| [`.devcontainer/`](./.devcontainer/) | Docker / Apache local URLs |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Production / LAN deploy |

## Development

Requires **Node.js 20+** (see `.nvmrc`), or the **Dev Container**.

```bash
./scripts/dev-setup.sh
cd apps/monvino/client && npm install && npm start
# → http://localhost:3000/monvino/
```

In the container, Apache on port **80** mirrors a nested deploy:

| Local | Serves |
|-------|--------|
| `http://localhost/monvino/` | Mon Vino (proxied to CRA `:3000`) |
| `http://localhost/api-php/` | PHP API |

Database seed: `apps/monvino/database/monvino-starter.sql` (see its README).

## Build & deploy

```bash
./scripts/build-monvino.sh   # → dist/monvino-release-*
```

LAN deploy (SSH agent; no secrets in Git):

```bash
cp deploy.env.example deploy.env   # set DEPLOY_USER
ssh-copy-id youruser@192.168.0.105 # once
./scripts/build-monvino.sh
./scripts/deploy.sh
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/dev-setup.sh` | Local config (DB template, Git hooks) |
| `scripts/build-monvino.sh` | Build React + tarball |
| `scripts/deploy.sh` | rsync to server via SSH agent |
| `scripts/setup-git-hooks.sh` | Secret-blocking pre-commit hook |
| `scripts/untrack-sensitive.sh` | Untrack sensitive files from the index |
