# Deployment

This app deploys from **GitHub Actions** to an **EC2** instance. Each push to `main` runs a remote script over SSH: it builds a fresh release in a staging directory, swaps it into place atomically, then reloads **PM2**.

## Architecture

| Piece | Role |
|--------|------|
| `.github/workflows/deploy.yml` | Triggers on `push` to `main`, runs `appleboy/ssh-action` |
| EC2 host | Holds the repo at `/home/ec2-user/tennis-booking-frontend`, runs `pnpm` + `next build` + PM2 |
| `ecosystem.config.js` | PM2 app `tennis-booking-frontend`: `npm start` (Next production server), port **3001** |

## GitHub repository secrets

Configure these in the repo: **Settings → Secrets and variables → Actions**.

| Secret | Description |
|--------|----------------|
| `EC2_HOST` | Public hostname or IP of the instance (e.g. `ec2-…amazonaws.com` or `1.2.3.4`) |
| `EC2_KEY` | Private SSH key contents (PEM) for user `ec2-user` |

The workflow connects as **`ec2-user`** (Amazon Linux style). If you use another AMI or user, update `username` in `deploy.yml` and paths below accordingly.

## EC2 prerequisites

On the instance, before the first automated deploy:

1. **Node.js** — LTS version compatible with this project (see `package.json` / Next.js requirements).
2. **pnpm** — Version compatible with `packageManager` in `package.json` (e.g. `corepack enable` then `corepack prepare pnpm@9.15.4 --activate`, or install pnpm globally).
3. **Git** — For `git fetch` / `git reset --hard origin/main`.
4. **rsync** — Used to copy the live tree into the staging directory.
5. **PM2** — Installed globally (`npm i -g pm2` or equivalent) and optionally `pm2 startup` so processes survive reboot.

### First-time bootstrap on the server

1. Clone the repository (HTTPS with credential helper, or SSH deploy key) into the exact path the workflow expects:

   ```bash
   cd /home/ec2-user
   git clone <your-repo-url> tennis-booking-frontend
   cd tennis-booking-frontend
   ```

2. Add **`.env`** (or `.env.production.local`, depending on how you load env vars) with production values. The deploy script **does not** overwrite `.env`; it rsyncs from the live directory into `tennis-booking-frontend-new`, so secrets stay on the server.

3. Ensure **`origin`** points at the same GitHub repo Actions uses, and that `ec2-user` can `git fetch` (deploy key or HTTPS token on the server).

4. Run a local smoke build once if you like:

   ```bash
   pnpm install --frozen-lockfile
   pnpm run build
   pm2 startOrReload ecosystem.config.js
   pm2 save
   ```

After that, pushes to `main` can drive deploys via Actions.

## What the workflow does

1. **`set -euo pipefail`** — Exit on error, unset variables, or pipe failure.
2. **Staging copy** — `rsync` from `/home/ec2-user/tennis-booking-frontend` to `tennis-booking-frontend-new`, excluding `node_modules` and `.next` (fresh install and build each time).
3. **Update code** — `git fetch origin` and `git reset --hard origin/main` in the staging directory.
4. **Install & build** — `pnpm install --frozen-lockfile`, then `pnpm run build`.
5. **Validate** — Asserts `.next/standalone/server.js` exists (matches `output: "standalone"` in `next.config.js`).
6. **Atomic swap** — Moves current app to `tennis-booking-frontend-old`, moves `tennis-booking-frontend-new` to `tennis-booking-frontend`.
7. **Process manager** — `pm2 startOrReload ecosystem.config.js`, then `pm2 save`.
8. **Cleanup** — Removes `tennis-booking-frontend-old`.

If any step fails, the script stops; the live directory is only replaced after a successful build and validation.

## Manual operations on EC2

Useful commands (run as the same user that owns the app, typically `ec2-user`):

```bash
cd /home/ec2-user/tennis-booking-frontend

# Logs
pm2 logs tennis-booking-frontend

# Status
pm2 status

# Restart without a full GitHub deploy
pm2 restart tennis-booking-frontend
```

## Changing Next.js output mode

The workflow checks for **`.next/standalone/server.js`**. If you remove `output: "standalone"` from `next.config.js`, update the validation line in `.github/workflows/deploy.yml` (for example, to `test -f .next/BUILD_ID`) so CI matches your build layout.

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| SSH step fails | `EC2_HOST`, `EC2_KEY`, security group allows SSH from GitHub Actions IPs (or use a self-hosted runner in the same network). |
| `git fetch` / `reset` fails | `origin` URL and credentials on the server; branch is `main`. |
| `pnpm install --frozen-lockfile` fails | Commit an updated `pnpm-lock.yaml` after dependency changes. |
| Build validation fails | Run `pnpm run build` on the server manually; confirm `next.config.js` still uses standalone output if the check expects it. |
| App not reachable | PM2 running, `PORT` in `ecosystem.config.js` (3001), reverse proxy / firewall rules. |
