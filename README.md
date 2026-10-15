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
