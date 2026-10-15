# CSDM Docker

Self-hosted Counter-Strike demo analysis with a browser UI, Steam login, match tracking, highlights, and optional Discord notifications. Runs the custom `csdm serve` command alongside PostgreSQL 18.

This repository includes the CS Demo Manager source required to build the hosted application independently. It was extracted from [DaalbuCZ/cs-demo-manager](https://github.com/DaalbuCZ/cs-demo-manager) at upstream commit `eaffbbfa`, including the local hosted-server changes. The original project's documentation is preserved in [UPSTREAM-README.md](UPSTREAM-README.md), and its MIT license and attribution are preserved in [LICENSE](LICENSE).

## Run

Install Docker with Docker Compose, then:

```sh
git clone https://github.com/DaalbuCZ/csdm-docker.git
cd csdm-docker
cp .env.example .env
# Edit .env, especially POSTGRES_PASSWORD and SESSION_SECRET.
./start.sh
```

Open [localhost:3000](http://localhost:3000). Set `PORT` in `.env` to change the host port. The container always listens on port 3000. Set `PUBLIC_URL` to your external URL for Steam login callbacks. Optional settings for API access, Steam match tracking, Discord, and clips are documented in `.env.example`.

```sh
./stop.sh                         # Stop services, keeping data
docker compose -p csdm logs -f app # Follow server logs
```

Uploads and watched demos live in `/data/inbox` inside the app container. Demos can also be placed in per-player folders at `/data/inbox/<steam-id>/*.dem`.

## Existing local installation

The deployment files now live at the repository root. Use `./start.sh` and `./stop.sh` here. The local `.env` was copied during extraction and is ignored by Git; it is never published.

The scripts retain Compose project name `csdm`, service/container names, and named volumes `csdm_postgres-data` and `csdm_inbox`. PostgreSQL 18 stores its versioned database directory under `/var/lib/postgresql`. Moving the source does not move or delete Docker volumes. Existing deployments without these named volumes should back up their database before changing storage configuration. Do not run `docker compose down -v` unless you intend to delete the stored data.

## Development

Use Node.js 24 and Vite+ (`vp`). The Docker build installs Vite+ and uses the committed lockfile. Analyzer and extraction binaries are installed from the pinned dependencies during the image build.

```sh
vp install
vp check
vp run test
vp run deadcode
```

The hosted entry point is `src/cli/commands/serve-command.ts`, with server implementation in `src/node/web-server/`. Shared database, analyzer, and CLI code retains the upstream layout. Desktop TypeScript source remains available for shared imports, project type checks, and future upstream updates. Native plugin projects, desktop installer assets, editor settings, and upstream release/publishing workflows are excluded from this standalone repository.

## Automatic downloads

The hosted service resolves share codes through a headless Steam client; it does not require a desktop Steam installation in the app container. Authenticate the download account once:

```sh
docker compose -p csdm exec app node scripts/steam-login.mjs
```

For the Komodo file, use `docker compose -p csdm-docker -f compose.komodo.yml exec app node scripts/steam-login.mjs` from the stack's checkout, or run the Node command in the app container's terminal. Enter credentials only in that interactive terminal. The password is hidden, and the resulting refresh token is saved in the `steam-auth` volume. `STEAM_REFRESH_TOKEN` can alternatively be supplied as a secret environment variable. Prefer a separate download account from the account actively rendering CS2.

Set `STEAM_API_KEY` for match discovery. In Settings, add a player's Steam ID, their match-history authentication code, and their latest match share code. Enable automatic downloads. The server checks enabled users every `TRACK_POLL_MINUTES` (default 15). Match-history authentication is separate from logging in to the web UI with Steam.

New codes are persisted before the tracking cursor advances. Queued/interrupted downloads resume on restart, transient network errors retry up to three attempts, and failed downloads can be retried in Downloads. Valve can expire old replay links; expired demos cannot be recovered by retrying. Complete downloads publish atomically before analysis starts. The inbox also accepts `.dem.bz2`, including compressed files incorrectly named `.dem`.

## Linux game rendering and Komodo

Use [compose.komodo.yml](compose.komodo.yml) for a Git-backed Komodo Stack. Select `DaalbuCZ/csdm-docker`, branch `main`, file `compose.komodo.yml`, and enable **Pre Build Images**. Set separate long random values for `POSTGRES_PASSWORD`, `API_TOKEN`, `SESSION_SECRET`, and `RENDER_DESKTOP_PASSWORD` in the stack Environment. Set `STEAM_API_KEY` there for automatic match discovery. The database is private to the Compose network.

The stack has an app, database, and Linux Steam rendering worker. The worker uses the [LinuxServer Steam image](https://docs.linuxserver.io/images/docker-steam/) with `/dev/dri` access for Intel graphics. It renders one job at a time at 1920×1080, 30 fps, with native CS recording and FFmpeg. Rendering may be slower than realtime. Hardware video encoding alone does not eliminate the cost of rendering frames and writing images.

The app listens on host port 3300, and the Steam desktop on 3301 (HTTP for a trusted reverse proxy) / 3302 (HTTPS). All ports bind to `127.0.0.1` by default. Use a trusted private-network reverse proxy for remote access and set `PUBLIC_URL` to the app URL for Steam login. Do not expose the Steam desktop without authentication; it is a complete desktop environment. The desktop login is user `csdm` and your `RENDER_DESKTOP_PASSWORD`.

Open the Steam desktop, sign in to Steam, and ensure the CS2 client and **Steam Linux Runtime 3.0 (sniper)** are available. Launch CS2 once and select low graphics settings so Steam creates the video configuration required by the recorder. Steam login, Steam Guard, and any license acceptance must be completed by the account owner. The stack does not disable seccomp or AppArmor by default; if the host denies Steam's runtime namespace setup, diagnose that specific denial before changing sandbox settings.

The renderer consumes persisted jobs from the database. In Highlights, **Watch** selects the actual highlight window; **Record .webm** records it in the browser and stops at the end. **Render video** queues an in-game render. Completed MP4s appear under Rendered videos. Failed renders can be retried by clicking Render video again. Jobs have renewable leases so an interrupted worker does not leave them stuck forever. The worker keeps intermediate files in its private config volume and publishes completed videos to the shared clips volume.

### Reuse the dedicated server installation

`CS2_SERVER_DIR` defaults to `/home/byttorrent/cs2/server`, matching the existing server. Its game tree is mounted **read-only** at `/shared-cs2`. The renderer builds a private directory tree, symlinks large shared assets, and copies the launcher, executable, and gameinfo files that require a private path or modification. Its cfg, CSDM plugin, demo actions, and frame output never write into the server installation. Do not update shared game files while a render is running; use a game build compatible with the demo and CSDM plugin.

The dedicated server's `game/csgo` directory is also mounted read-only as `/data/server-demos` in the app and worker, allowing completed server recordings to be analyzed automatically. If your server writes demos elsewhere, adjust this bind mount and `SERVER_DEMOS_DIR`. A separate writable inbox remains available for uploads and Valve downloads.

The server install must contain `game/cs2.sh`, `game/bin/linuxsteamrt64/cs2`, and the client assets. If a dedicated-only depot lacks graphical client assets, install the client in the worker's Steam desktop and remove `SHARED_CS2_DIR` to use that installation instead. A second writable mount of the dedicated server's game tree is not needed.

### Export for an existing CSDM installation

The video config export contains complete CSDM `Sequence` objects, including player focus, and can be used with `csdm video --config-file <file>`. Download the original demo from `/api/matches/<checksum>/demo` beside the config, named `<checksum>.dem`. Analyze it in the local CSDM database first. The built-in worker handles this automatically through the shared database and volumes.

### Private Tailscale access

Add `compose.tailscale.yml` after `compose.komodo.yml` in Komodo's File Paths. The overlay adds a dedicated Tailscale node and a proxy sharing its network namespace. It publishes no additional host ports, uses userspace networking without host networking or extra capabilities, and leaves the existing host Tailscale setup intact.

On first startup, open the authentication URL from the `tailscale` service logs and approve `csdm-docker` in the tailnet used by your computer. Its identity persists in `tailscale-state`. The logs show the assigned DNS name; HTTPS must be enabled in that tailnet. Open `https://<assigned-name>/` for the app and `https://<assigned-name>:8443/` for the Steam desktop. Existing API/session authentication and desktop credentials still apply. Funnel is not enabled.

Set `PUBLIC_URL` in the stack Environment to the app's HTTPS URL before using Steam web login, then redeploy. Tailscale ACLs must permit ports 443 and 8443. Direct connections to the server's LAN address on ports 3300–3302 still use the base stack's loopback-only bindings.
