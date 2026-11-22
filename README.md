# AlpineCraft

Lean web software, built with AI.

## Layout

**Apps** (products) live under `apps/`. **Shared** tooling stays at the repo root.

| Path | Role |
|------|------|
| [`apps/portfolio/`](./apps/portfolio/) | Portfolio (Rust → WASM) → `/` |
| [`apps/monvino/`](./apps/monvino/) | Mon Vino cellar app → `/monvino/` |
| [`scripts/`](./scripts/) | Build, setup, deploy (all apps) |
| [`.devcontainer/`](./.devcontainer/) | Shared Docker / Apache for nested local URLs |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Production + LAN (`192.168.0.105`) |
| `dist/` | Generated releases only (gitignored) |

Production URLs: `https://alpinecraft.cc/` and `https://alpinecraft.cc/monvino/`.

## Development

Prérequis : **Node.js 20+** (voir `.nvmrc`), ou le **Dev Container**.

```bash
./scripts/dev-setup.sh
cd apps/monvino/client && npm install && npm start
# → http://localhost:3000/monvino/
```

Dans le conteneur, Apache sur le port **80** reprend le nesting de production :

| Local | Production |
|-------|------------|
| `http://localhost/` | portfolio |
| `http://localhost/monvino/` | Mon Vino |
| `http://localhost/api-php/` | API PHP |

Portfolio live : `cd apps/portfolio && trunk serve` → `:8080`.

Base de données : `apps/monvino/database/monvino-starter.sql` (voir son README).

## Build & deploy

```bash
./scripts/build-portfolio.sh   # → dist/portfolio-release-*
./scripts/build-monvino.sh     # → dist/monvino-release-*
./scripts/build-all.sh         # both
```

**LAN deploy without putting SSH secrets in Git** (uses your local SSH key/agent):

```bash
cp deploy.env.example deploy.env   # set DEPLOY_USER
ssh-copy-id youruser@192.168.0.105 # once
./scripts/build-all.sh
./scripts/deploy.sh
```

Or copy the tarballs from `dist/` manually — see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/dev-setup.sh` | Config locale (DB, hooks Git) |
| `scripts/build-portfolio.sh` | Build Rust/WASM + tarball portfolio |
| `scripts/build-monvino.sh` | Build React + tarball Mon Vino |
| `scripts/build-all.sh` | Both builds |
| `scripts/deploy.sh` | rsync vers le serveur via SSH agent |
| `scripts/setup-git-hooks.sh` | Hook anti-secrets |
| `scripts/untrack-sensitive.sh` | Retire les fichiers sensibles de l’index Git |
