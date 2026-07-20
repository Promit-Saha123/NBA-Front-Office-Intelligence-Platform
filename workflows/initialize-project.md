# Workflow: Initialize Project Scaffolding

## Objective

Turn the documentation-only repository into a runnable skeleton: frontend, backend,
database tooling, linting, type checking, and test runners — without implementing
features.

## Prerequisites

* Repository and documentation foundation exists (this is complete)
* Package manager chosen (npm, pnpm, or yarn) and recorded as a decision in
  [docs/decisions/](../docs/decisions/)
* Runtime versions (Node, Python) chosen and pinned

## Inputs

* [docs/project-specification.md](../docs/project-specification.md) — architecture
  and technology choices
* The package-manager and runtime decision records

## Steps

1. Scaffold the Next.js application in `frontend/`.
2. Scaffold the FastAPI application in `backend/` following the
   route → service → repository → schema layering.
3. Set up PostgreSQL for local development and a migration tool.
4. Configure linting, type checking, and test runners for both frontend and backend.
5. Create `.env` handling from `.env.example`; never commit real values.
6. Populate the **Commands** section of [CLAUDE.md](../CLAUDE.md) with the actual
   working commands, verified by running each one.
7. Add a minimal CI pipeline running lint, type check, and tests.

## Validation Checks

* Frontend and backend start locally without errors.
* Every command listed in CLAUDE.md runs successfully as written.
* Lint, type check, and (empty) test suites pass.
* No secrets are committed; `.env` is ignored by git.

## Expected Outputs

* Runnable frontend and backend skeletons
* Working local database and migration setup
* Populated CLAUDE.md Commands section
* CI configuration

## Stopping Conditions

* Stop if the package manager or runtime versions are not yet decided — record the
  decision first.
* Stop if scaffolding would require implementing feature logic; that belongs to the
  slice workflows.
