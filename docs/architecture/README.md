# Architecture Notes

Detailed architecture documentation beyond the overview in
[project-specification.md](../project-specification.md) — module boundaries, schema
diagrams, and data-flow notes as they are designed.

## Historical Scenario Domain Core (`backend/`)

The first free-MVP slice ([decision 0007](../decisions/0007-fully-free-historical-prototype.md)):
canonical domain models, a fixture loader, the contribution-provider
abstraction, a heuristic minutes allocator, a same-season one-player-swap
scenario service, and one thin FastAPI route over that service. No database
or trained model exist yet — see
[project-specification.md §7](../project-specification.md) for what comes
next (minimal Next.js Roster Lab UI). Full behavior is documented in each
module's docstring; this section maps concepts to the actual code and records
anything not obvious from the specs alone.

```text
backend/
  domain/models.py     Season, Team, Player, PlayerSeason, TeamRoster,
                        RosterMember, PlayerContribution, RotationEntry,
                        RosterScenarioRequest, RosterScenarioResult,
                        ScenarioExplanationFactor, EpistemicType, ProviderType
  domain/errors.py      Typed errors, each with a stable `.code` string
  fixtures/historical_loader.py   Loads the pinned 2014-15 RAPTOR snapshot
  providers/base.py     ContributionProvider (abstract)
  providers/raptor_benchmark.py   HistoricalRaptorBenchmarkProvider
  providers/synthetic.py          SyntheticContributionProvider
  minutes/allocator.py  MinutesAllocationConfig, allocate_minutes()
  scenario/service.py   RosterScenarioService
  api/app.py             FastAPI app: POST /scenarios + 3 read-only lookup
                          GET routes, startup-loaded season data, CORS,
                          DomainError -> HTTP status/code mapping
  api/schemas.py          Pydantic request/response schemas (distinct from
                           the domain dataclasses above)
  api/errors.py           DomainError subclass -> HTTP status table
  api/lookups.py           Pure season/team/player projections over
                           HistoricalSeasonData for the 3 GET routes — no
                           business logic, no FastAPI/Pydantic dependency
  api/openapi_export.py    Deterministic OpenAPI schema export (no server)
```

### API layer (`backend/api/`)

`POST /scenarios` — request/response contract and the full error-code
mapping table are in
[scenario-engine.md §6-7 and §31](../scenario-engine.md). The 2014-15
`HistoricalSeasonData` is loaded once via a FastAPI `lifespan` context
manager (scenario-engine.md §29: "model artifact loaded once at application
startup"), and both `ContributionProvider` implementations
(`HistoricalRaptorBenchmarkProvider`, `SyntheticContributionProvider`) are
constructed once at startup and reused for every request — provider
selection is an explicit required request field
(`ContributionProviderChoice`), never a fallback. A single
`@app.exception_handler(DomainError)` maps every typed domain error to a
status code and returns `{"code", "message"}`, so `create_scenario()` itself
has no error-handling branches — it only builds the domain request, calls
`RosterScenarioService.build_scenario()`, and maps the result dataclass to
`ScenarioResponse`.

Three read-only lookup routes support the frontend's selectors (UI-002;
decision 0008's "UI-002 Implementation Notes"): `GET /seasons/{season}/teams`,
`GET /seasons/{season}/teams/{team_id}/roster`,
`GET /seasons/{season}/players` — thin projections over the same
`HistoricalSeasonData` (now also stored on `AppState`), implemented in
`backend/api/lookups.py`. These are not scenario-domain logic; they reuse
`TeamNotFoundError`/`UnsupportedSeasonError` from `backend/domain/errors.py`
for consistent 404/422 behavior through the same exception handler.

CORS (`CORSMiddleware`, origins from `FRONTEND_ORIGINS`, methods `GET` and
`POST`) is configured because the browser calls this API directly — no
Next.js proxy (decision 0008 §6). Run locally with
`uv run uvicorn backend.api.app:app --reload`. Tests:
`tests/test_api_scenarios.py` and `tests/test_api_lookups.py`, using
FastAPI's `TestClient` (backed by `httpx2`) against the pinned local
2014-15 snapshot — no live server, no network access.

### Fixture loader

`backend.fixtures.historical_loader.load_historical_season("2014-15")` reads
only `data/raw/fivethirtyeight-nba-raptor/2026-07-19/` (manifest + the two
`historical_RAPTOR_by_*.csv` files) — no network access, raw files untouched.
Team rosters/stints come from `historical_RAPTOR_by_team.csv` filtered to
`season_type == "RS"`; contribution values come from
`historical_RAPTOR_by_player.csv`'s `raptor_total` column, which is a
**season-blended (regular season + playoffs) value exactly as FiveThirtyEight
publishes it** — no custom aggregation is applied. Only `2014-15` is
supported; every other season raises `UnsupportedSeasonError`.

**nba-elo is deliberately not loaded by this slice.** No required domain
model needs team wins/losses, and win conversion is not an approved
methodology (decision 0007 §10), so integrating it now would be premature. If
a future slice adds win conversion, note the one team-code mismatch between
the two pinned snapshots: RAPTOR uses `"CHA"` for the Charlotte Hornets in
2014-15, nba-elo uses `"CHO"` — verified directly against both CSVs, not
previously documented in either audit.

### ContributionProvider

`backend.providers.base.ContributionProvider` is an ABC with
`get_player_contribution`, `get_provider_type`, `get_provider_version`,
`get_data_version`, `get_epistemic_type`, `get_attribution` — matching
decision 0007 §7 and scenario-engine.md §16, plus `get_provider_type()` and
`get_attribution()` so every required response field
(`provider_type`, `provider_version`, `data_version`,
`contribution_epistemic_type`, attribution) can be populated without the
scenario service ever touching a source-specific field.

* `HistoricalRaptorBenchmarkProvider` — thin lookup over an already-loaded
  `HistoricalSeasonData` (the CSV is read once, not once per provider).
  Epistemic type `historical_benchmark`. Raises `MissingContributionError` for
  an unknown player or a season the provider wasn't built for.
* `SyntheticContributionProvider` — deterministic via `hashlib.sha256` (not
  the builtin `hash()`, which Python randomizes per process) keyed on
  `(seed, player_id, season_label)`; falls back to that generated value only
  when no `explicit_values` override is supplied for a given key. Epistemic
  type `synthetic_estimate`. Never raises "missing" — it always produces a
  labeled value, by design.

Provider selection is always an explicit argument to
`RosterScenarioService.build_scenario(request, provider)`; nothing falls back
from one provider to another automatically.

### Minutes allocator

`backend.minutes.allocator.allocate_minutes(player_weights, config)` — a
heuristic assumption, not a rotation-prediction model (scenario-engine.md
§10). Algorithm: rank by weight descending (ties broken by player ID
ascending, for full determinism) → truncate to `maximum_rotation_size` →
scale to sum to `total_team_minutes` → iteratively cap anyone over
`max_player_minutes`, **permanently** fixing capped players and
redistributing only among the rest (this permanence is what guarantees
termination — see the `_cap_excess` docstring) → drop anyone below
`minimum_rotation_minutes` and rescale → snap floating-point drift onto the
top player. Every capping/dropping step is recorded in the result's
`repairs` tuple.

Before allocating, and again after any minimum-drop repair shrinks the active
pool, the allocator verifies `len(pool) * max_player_minutes >=
total_team_minutes` and raises `InvalidRotationError` if not — this is a
per-call check distinct from `MinutesAllocationConfig`'s own validation
(which only bounds the *configured* `maximum_rotation_size`, not the actual
number of eligible players in a given call). **This check was added during
post-implementation review** after a first version could silently allocate
more than `max_player_minutes` to a player when the active pool was too
small (e.g. a lone player receiving all 240 minutes despite a 40-minute cap).
It is covered by `tests/test_minutes_allocator.py`, including a 500-trial
randomized property test asserting the cap is never violated.

Positional viability (scenario-engine.md §13) is **not implemented** in this
slice: the pinned RAPTOR snapshot carries no position column, so there is no
legally usable position data to enforce it against yet.

### Scenario service

`backend.scenario.service.RosterScenarioService.build_scenario(request,
provider)` implements the one-player, same-season swap rule from
[decision 0005 §3](../decisions/0005-historical-only-product-scope.md): the
incoming player must have a player-season record in the selected season and
must not already be on the selected roster. Baseline and scenario
contribution are both computed by the same function
(`_minutes_weighted_contribution`): `sum(contribution[p] * minutes[p] /
total_team_minutes)` over the active rotation — the minutes-weighted-average
formula from scenario-engine.md §17. The incoming player's provisional
minutes weight is the outgoing player's real historical minutes
(scenario-engine.md §11 step 3). The removed player is always included in
the returned `scenario_rotation` with an explicit `0.0` minutes entry, for
visibility, even though it never entered the allocator's active pool.

**No `projected_wins` or `win_conversion_version` field exists in the
response** — no win-conversion methodology is approved yet (decision 0007
§10), so none is invented; `model_version` is present on every result but is
always `None` (the free MVP ships no trained model).

### Known limitations

* Supports exactly one season (2014-15) and RAPTOR-only contribution data.
* No positional-viability constraint (no position data in the pinned source).
* No win conversion — scenario results report contribution change only.
* nba-elo is pinned and audited but not yet wired into any domain model.
* No database, no authentication, no caching, no persistence — every request
  recomputes the scenario from the in-memory season data loaded at startup.

### Running the tests

```text
uv run pytest tests/test_historical_loader.py tests/test_contribution_providers.py \
  tests/test_minutes_allocator.py tests/test_scenario_service.py \
  tests/test_api_scenarios.py tests/test_api_lookups.py -v
```

Or the full suite: `uv run pytest`. All tests are offline (pinned local CSVs
or fully synthetic fixtures); `tests/test_api_scenarios.py` and
`tests/test_api_lookups.py` exercise the real FastAPI app via `TestClient`,
not a live server.
