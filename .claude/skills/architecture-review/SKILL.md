---
name: architecture-review
description: Mandatory architecture-boundary rules for this project. Use before and after any change that touches the backend/frontend boundary, the ContributionProvider abstraction, startup-loaded resources, API contracts, or new abstractions/dependencies — especially frontend (Next.js) work calling the FastAPI scenario API.
---

# Architecture Review

Checklist for reviewing a proposed or completed change against this
project's architecture boundaries (CLAUDE.md "Architecture", decision 0007,
scenario-engine.md). Flag violations; don't rewrite unrelated code to fix
them unless asked.

## Domain independence

* `backend/domain/`, `backend/scenario/`, `backend/minutes/`,
  `backend/providers/` must not import FastAPI, Pydantic, or anything
  frontend-related. `backend/api/` depends on the domain layer, never the
  reverse.
* The frontend must not reimplement scenario, minutes, or contribution logic
  — it renders `POST /scenarios`' response, nothing more.

## Provider and provenance visibility

* No code path silently falls back from one `ContributionProvider` to
  another, and no UI silently retries a failed request with a different
  provider. Provider choice is always an explicit, visible input.
* Every surface that shows a scenario result must show `provider_type`,
  `provider_version`, `data_version`, `contribution_epistemic_type`,
  `minutes_method`, `minutes_assumptions`, `attribution`, and
  `model_version` (even when `null` — show an explicit "not applicable"
  state, never hide the field). See CLAUDE.md "Product Claims" and
  scenario-engine.md §2-3.

## HTTP and route boundaries

* FastAPI routes (`backend/api/app.py`) stay thin: request parsing, one
  service call, response mapping. Domain-error-to-HTTP-status mapping lives
  only in `backend/api/errors.py` / the single exception handler — never
  duplicated inline in a route.
* Frontend API-client code lives in its own module, isolated from
  components; components never call `fetch`/`POST /scenarios` directly.
* Changing `backend/api/schemas.py` is an API-contract change: check
  `tests/test_api_scenarios.py` and any frontend consumer before altering a
  field name, type, or required/optional status. Prefer additive changes.

## Startup resources

* `HistoricalSeasonData` and both `ContributionProvider` instances are
  constructed once (FastAPI `lifespan`), never per-request. Flag any new
  per-request instantiation of either.

## Scope discipline

* A new abstraction (interface, factory, config layer, cache, state store)
  needs a current, cited use case — not "might need this for more seasons
  later." Point to the specific requirement or say it's premature.
* Distinguish current requirements (one season, two providers, no auth, no
  persistence) from hypothetical future scale (more seasons, more
  providers, saved scenarios). Design for the former; leave clean extension
  points for the latter — don't build the latter now.
* Any performance or scalability claim ("this will handle X") needs a
  measurement or an explicit "unmeasured" label, per scenario-engine.md §29.
* No Redis, queue, microservice, or persistent multi-agent framework without
  a measured constraint that the current modular monolith can't satisfy.

## UI/DTO coupling

* API response DTOs (the shape `POST /scenarios` returns) should not be
  passed straight into deeply nested presentation components untyped —
  prefer a thin, explicit view-model mapping at the boundary if the DTO
  shape and the display shape diverge, so a future contract change touches
  one mapping function, not every component.
* Don't introduce a view-model layer if the DTO already matches what's
  rendered 1:1 — that's premature indirection.

## Review output

For each finding: file/module, the rule violated, and whether it's
`required now` or `defer` (matching decision-record conventions). Don't
flag things this checklist doesn't cover.
