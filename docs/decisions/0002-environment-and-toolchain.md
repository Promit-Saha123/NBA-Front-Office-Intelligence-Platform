# 0002 — Environment and Toolchain Defaults

**Status:** Accepted (user-directed, 2026-07-19)
**Number note:** 0001 is reserved for the historical data-source decision, which was
in progress when this record was created.

## Context

The project specification listed the package manager and runtime/tooling versions as
unresolved. The repository contained no conflicting configuration (no `pyproject.toml`,
no `package.json`, no compose file). The user directed a specific default toolchain on
2026-07-19.

## Decision

| Concern | Choice |
|---|---|
| Python runtime | Python 3.12 (pinned in `.python-version`, `requires-python` in `pyproject.toml`) |
| Python dependency management | `uv` (dependency groups in `pyproject.toml`, lockfile `uv.lock`) |
| Node runtime | Node.js 22 LTS (pinned in `.nvmrc`) |
| Node package manager | `pnpm` (see pinning note below) |
| Database | PostgreSQL 16, pinned to `postgres:16.14` via Docker Compose (`docker-compose.yml`) |
| Python lint | Ruff (configured in `pyproject.toml`) |
| Python type-check | mypy (configured in `pyproject.toml`) |
| Python tests | Pytest (configured in `pyproject.toml`) |
| Frontend framework | Next.js with TypeScript |

## Options Considered

Explicitly directed by the user; alternatives (npm/yarn, pip/poetry, other Python or
Postgres versions) were not re-litigated. No repository configuration conflicted.

## Rationale

* All choices are mainstream, actively maintained, and compatible with the FastAPI /
  Next.js / XGBoost stack already established in the specification.
* uv provides lockfile-based reproducibility, which the ML specification requires
  (pinned package versions in model artifacts).
* Docker Compose gives a reproducible local PostgreSQL 16 without host installation.

## Pinning Notes (updated 2026-07-19)

* **pnpm cannot be enforced yet.** Version pinning requires a `package.json`
  `packageManager` field (with corepack) and none exists until the frontend is
  scaffolded. Creating a `package.json` solely to pin pnpm was deliberately
  avoided. Whoever scaffolds the frontend must add the `packageManager` pin in
  the same change.
* **PostgreSQL is pinned to `postgres:16.14`** (newest 16.x image on Docker Hub at
  pin time, published 2026-07-17) instead of the floating `postgres:16` tag, so
  local databases do not drift across minor versions. Bump deliberately.
* **The full quality check stops on the first failure** — commands are chained
  with `&&` in a POSIX shell (see CLAUDE.md Commands).

## Consequences

* All Python commands run through `uv run …` (see the Commands section in CLAUDE.md).
* The frontend, when scaffolded, must use Next.js + TypeScript with pnpm and must add
  its commands to CLAUDE.md.
* Local machines need uv and Docker; at record time the development machine had
  uv 0.10.8 and Python 3.12.8 but not pnpm or Docker installed — install before
  frontend/database work.
* CI, when added, must respect `.python-version`, `.nvmrc`, and `uv.lock`.

## Re-evaluation Triggers

* Python 3.12 or Node 22 approaching end of support
* A dependency requiring a newer runtime
* pnpm or uv becoming unmaintained or incompatible with required tooling
