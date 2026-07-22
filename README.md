# NBA Front Office Intelligence Platform

A **historical** NBA front-office simulation platform that combines versioned
historical contribution benchmarks with transparent, user-inspectable rotation
assumptions.

The core question it answers:

> How could adding or removing a player have affected a historical team's projected
> performance under explicit, inspectable assumptions?

The **roster scenario engine is the differentiator**: select a historical season,
select a team from it, remove one player, add another player from that same season,
generate a valid default rotation, and see the estimated scenario difference —
with every output labeled by its epistemic type (historical benchmark, synthetic
estimate, heuristic assumption, deterministic calculation, or descriptive
interpretation).

**Fully free and historical-only**
([decision 0005](docs/decisions/0005-historical-only-product-scope.md),
[decision 0007](docs/decisions/0007-fully-free-historical-prototype.md)): the
initial release uses only clearly licensed FiveThirtyEight historical data
(CC BY 4.0, attributed), synthetic fixtures, and versioned local snapshots — no
paid datasets, no live NBA endpoints, no current-season data. Seed season:
**2014-15**. Scenario outputs are historical simulations, not predictions of real
outcomes.

The **Player Contribution Estimate (PCE)**
([decision 0003](docs/decisions/0003-internal-player-impact-target.md)) is the
approved future research direction; it requires a historical box-score source
([decision 0006](docs/decisions/0006-historical-pce-data-source.md), deferred) and
is not a blocker for the first release.

## Free MVP (decision 0007)

1. One historical season (2014-15) with canonical player/team/roster schemas
2. Contribution-provider abstraction: RAPTOR benchmark + synthetic providers
3. One-player same-season swap with a heuristic 240-minute rotation
4. Deterministic scenario calculation behind one FastAPI endpoint
5. Minimal Next.js Roster Lab with source attribution and methodology disclosures
6. Offline tests and public historical deployment

## Current Status

The full Roster Lab vertical slice runs locally end to end: the backend domain
core (schemas, contribution providers, minutes allocator, scenario service),
a FastAPI layer (`POST /scenarios` plus 3 read-only lookup routes), and a
Next.js frontend (season/team/player selectors, submission, and a full
results-and-disclosures view) are all built and tested for the seed season
(2014-15). No database, no trained model, and no public deployment exist yet
— see "Local Development" below to run it, and "Portfolio Roadmap" for what's
still ahead of a public URL.

## Local Development

Everything below runs entirely on your machine against the pinned, offline
2014-15 dataset — no external network access, no paid services, no database.

### Required runtime versions

* Python 3.12 (pinned `>=3.12,<3.13` in `pyproject.toml`) + [uv](https://docs.astral.sh/uv/)
* Node.js 22 LTS + [pnpm 11.15.1](https://pnpm.io/) (pinned in `frontend/package.json`'s `packageManager` field — run `corepack enable` if `pnpm` isn't already on your `PATH`)

### 1. Install dependencies

```bash
# Backend (from the repo root)
uv sync

# Frontend
cd frontend
pnpm install
```

### 2. Configure environment variables

Both `.env.example` files document every variable; copy them and adjust only
if you need non-default ports or origins:

```bash
# Backend (repo root) — CORS origins the browser is allowed to call this API from
cp .env.example .env

# Frontend — the backend URL the browser will call directly
cp frontend/.env.example frontend/.env.local
```

The committed defaults already match each other (`http://localhost:3000` /
`http://127.0.0.1:3000` on the backend side, `http://127.0.0.1:8000` on the
frontend side), so for a same-machine local setup you can skip this step
entirely — both apps fall back to those defaults if the files don't exist.

### 3. Start both services

```bash
# Backend (from the repo root) — reads FRONTEND_ORIGINS from .env if present
uv run uvicorn backend.api.app:app --reload

# Frontend (from frontend/) — reads NEXT_PUBLIC_API_URL from .env.local if present
cd frontend
pnpm dev
```

### Expected localhost URLs

| Service | URL | Notes |
|---|---|---|
| Frontend (Roster Lab) | http://localhost:3000 | Open this in a browser |
| Backend API | http://127.0.0.1:8000 | The browser calls this directly — no proxy (decision 0008 §6) |
| Backend OpenAPI schema | http://127.0.0.1:8000/openapi.json | Useful for a quick "is the backend up" check |

### Required environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://127.0.0.1:8000` | The one place the frontend reads the backend's base URL (`frontend/src/lib/api/http.ts`) — never hardcoded elsewhere. Missing → every request throws a `CLIENT_CONFIGURATION_ERROR`, shown as "This app isn't configured correctly," never a raw exception. |
| `FRONTEND_ORIGINS` | `.env` (repo root) | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of browser origins the backend's CORS middleware allows (`backend/api/app.py`). No wildcard, ever — see "CORS and future deployment" below. |

### How to verify frontend-to-backend connectivity

1. `curl http://127.0.0.1:8000/openapi.json` should return the schema (confirms the backend is up).
2. Open http://localhost:3000 — the team dropdown should populate with real 2014-15 team codes within a second or two (confirms the frontend reached the backend, since teams only come from a live `GET /seasons/2014-15/teams` call).
3. Open the browser's devtools Network tab, run a scenario, and confirm a `POST http://127.0.0.1:8000/scenarios` request appears with a 200 response — this is a direct browser-to-backend call, not proxied through Next.js.
4. If step 2 hangs on "Loading teams…" or shows an error, see "Common setup failures" below.

### Common setup failures

* **CORS error in the browser console, request never reaches FastAPI:** `FRONTEND_ORIGINS` (backend) doesn't include the exact origin the frontend is actually running on (scheme + host + port must match exactly — `http://localhost:3000` and `http://127.0.0.1:3000` are different origins). Restart the backend after changing `.env` — origins are read once at process startup, not per-request.
* **Frontend shows "This app isn't configured correctly":** `NEXT_PUBLIC_API_URL` isn't set. Next.js only reads `.env.local` at dev-server startup — restart `pnpm dev` after creating or editing it.
* **"Could not reach the server" on every request:** the backend isn't running, or `NEXT_PUBLIC_API_URL` points at the wrong port. Confirm with the `curl` check above.
* **`pnpm` not found:** see the `pnpm`-on-PATH note in `HANDOFF.md`'s gotchas — `corepack enable` may need `--install-directory` on some setups.
* **`uv run` picks up the wrong Python environment:** if you see a `VIRTUAL_ENV=... does not match the project environment path` warning, it's informational — `uv` still uses `.venv` correctly. Pass `--active` to silence it if you have another environment activated.

### Test and quality-check commands

```bash
# Backend (from the repo root)
uv run ruff check .
uv run mypy
uv run pytest -q

# Frontend (from frontend/)
pnpm typecheck
pnpm lint
pnpm test              # hermetic, no uv/Python required
pnpm build
pnpm test:codegen       # requires uv/Python — checks generated API types are fresh
```

## CORS and future deployment

The backend's allowed origins (`FRONTEND_ORIGINS`) and the frontend's backend
URL (`NEXT_PUBLIC_API_URL`) are each read from exactly one place
(`backend/api/app.py`'s `_frontend_origins()`; `frontend/src/lib/api/http.ts`'s
`apiBaseUrl()`) — no other file hardcodes a localhost URL or origin. Moving
from local development to a public deployment is intended to be an
environment-variable change, not an application-code change:

```text
Local:
  NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
  FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

Future public deployment (illustrative — not provisioned):
  NEXT_PUBLIC_API_URL=https://<your-backend-host>.example
  FRONTEND_ORIGINS=https://<your-vercel-project>.vercel.app
```

The likely target is a Vercel-hosted Next.js frontend and a separately hosted
FastAPI backend, but **no deployment, hosting selection, or Vercel project
exists yet** — this is preparatory configuration only. See `HANDOFF.md`'s
"Portfolio Roadmap" note for the current decision on sequencing that work.

## Documentation

* [CLAUDE.md](CLAUDE.md) — root operational rules and priorities
* [docs/project-specification.md](docs/project-specification.md) — product scope,
  architecture, build order
* [docs/data-source-evaluation.md](docs/data-source-evaluation.md) — data source
  evaluation record
* [docs/ml-specification.md](docs/ml-specification.md) — modeling requirements
  (future PCE phase)
* [docs/scenario-engine.md](docs/scenario-engine.md) — scenario engine methodology
* [docs/testing-strategy.md](docs/testing-strategy.md) — testing and quality strategy
* [docs/decisions/](docs/decisions/) — decision records
* [docs/data-audits/](docs/data-audits/) — data source audit results
* [workflows/](workflows/) — repeatable multi-step procedures
