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
                        CustomRosterRequest, CustomRosterResult,
                        RosterProfileCategory (decision 0014),
                        ScenarioExplanationFactor, EpistemicType, ProviderType
  domain/errors.py      Typed errors, each with a stable `.code` string
  fixtures/historical_loader.py   Loads the pinned 2014-15 RAPTOR snapshot
  providers/base.py     ContributionProvider (abstract)
  providers/raptor_benchmark.py   HistoricalRaptorBenchmarkProvider
  providers/synthetic.py          SyntheticContributionProvider
  minutes/allocator.py  MinutesAllocationConfig, allocate_minutes()
  scenario/service.py   RosterScenarioService (build_scenario(),
                          build_custom_roster() — decision 0014)
  api/app.py             FastAPI app: POST /scenarios, POST /custom-rosters,
                          + 5 read-only lookup GET routes, startup-loaded
                          season data, CORS, DomainError -> HTTP status/code
                          mapping
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

Two more read-only routes support standalone player/team detail pages
(step 8, CLAUDE.md's build order):

* `GET /seasons/{season}/players/{player_id}?contribution_provider=...` —
  `contribution_provider` (`ContributionProviderChoice`) is a **required**
  query parameter, no default, matching `POST /scenarios`' own
  no-provider-fallback rule; an omitted or invalid value fails FastAPI's own
  request validation (plain `{"detail": [...]}"` 422), not the domain
  `{"code","message"}"` shape. The route composes
  `lookups.get_player_detail()` (season-blended identity/usage plus
  per-team stints — see below) with direct `ContributionProvider.
  get_player_contribution()`/`get_player_profile()` calls, the same
  compositional pattern `create_scenario()` uses; every RAPTOR-derived value
  in the response (`contribution_value`, `offensive_impact`,
  `defensive_impact`) carries its full provenance quartet
  (`provider_type`, `provider_version`, `data_version`,
  `contribution_epistemic_type`) plus `attribution`, matching
  `ScenarioResponse`'s labeling completeness.
  **`team_stints` is a list, not a single team_id**: 76 of the 2014-15
  season's players were traded mid-season (verified directly against the
  pinned CSV, e.g. Arron Afflalo — DEN then POR), so `lookups.
  get_player_detail()` reverse-scans every team roster for that player_id
  rather than assuming one team. Stint minutes/possessions are
  regular-season-only (by-team CSV); the top-level `minutes`/`possessions`
  are the season-blended totals (by-player CSV, may include playoffs) — the
  two are not asserted equal in tests, only stint-sum ≤ blended-total.
* `GET /seasons/{season}/teams/{team_id}` — a richer sibling of the existing
  `.../roster` route (left untouched; the frontend already depends on its
  exact shape), adding `roster_size` and `total_roster_minutes` (a plain sum
  of the already-listed per-player minutes) to the same player list.
  **Deliberately no summed possessions aggregate**: RAPTOR's `poss` is a
  per-player on-court possession count, and summing it across a roster would
  overcount the team's actual season possessions roughly 5x (each
  possession credits ~5 players simultaneously) — a number that would look
  like a real team stat while silently misrepresenting one. No provider
  call is made for this route (no query parameter either) — it exposes only
  raw roster/identity data, same category as the original 3 lookup routes.

`POST /custom-rosters` ([decision 0014](../decisions/0014-roster-builder-scenario-contract.md))
— a from-scratch 12-player roster, completely independent of the swap
scenario's `team_id`/in-out pair. `RosterBuilderRequest`/`RosterBuilderResponse`
are named distinctly from `backend.domain.models.CustomRosterRequest`/
`CustomRosterResult` (same collision-avoidance convention as
`ScenarioRequest`/`RosterScenarioRequest`). The route is as thin as
`create_scenario()`: parse, look up the provider, call
`RosterScenarioService.build_custom_roster()`, map the result. There is no
baseline/scenario/change triplet in the response — a from-scratch roster has
no "before" — and `team_profile` carries a single aggregate value per
category (`RosterProfileCategoryResponse`), not a `TeamProfileCategoryResponse`
baseline/scenario pair.

CORS (`CORSMiddleware`, origins from `FRONTEND_ORIGINS`, methods `GET` and
`POST`) is configured because the browser calls this API directly — no
Next.js proxy (decision 0008 §6). Run locally with
`uv run uvicorn backend.api.app:app --reload`. Tests:
`tests/test_api_scenarios.py`, `tests/test_api_lookups.py`, and
`tests/test_api_custom_rosters.py`, using FastAPI's `TestClient` (backed by
`httpx2`) against the pinned local 2014-15 snapshot — no live server, no
network access.

### Fixture loader

`backend.fixtures.historical_loader.load_historical_season(season_label)`
reads only `data/raw/fivethirtyeight-nba-raptor/2026-07-19/` (manifest + the
two `historical_RAPTOR_by_*.csv` files) — no network access, raw files
untouched. Team rosters/stints come from `historical_RAPTOR_by_team.csv`
filtered to `season_type == "RS"`; contribution values come from
`historical_RAPTOR_by_player.csv`'s `raptor_total` column, which is a
**season-blended (regular season + playoffs) value exactly as FiveThirtyEight
publishes it** — no custom aggregation is applied.

`SUPPORTED_SEASON_LABELS` covers **all 46 RS seasons the pinned snapshot has
complete rows for, 1976-77 through 2021-22** (decision 0015) — every other
season label raises `UnsupportedSeasonError`. The manifest read and both
CSV parses are cached per `snapshot_dir` (`functools.cache` on a private
`_load_source_frames()` helper) so the FastAPI startup loop's 46 calls to
`load_historical_season()` read each multi-decade CSV from disk once, not
46 times — `load_historical_season()`'s own public signature and behavior
are unchanged. Team codes drift across this range (relocations, renames,
defunct franchises — 42 distinct codes total; only 2013-14 onward matches
today's 30 codes exactly), which is why the frontend's `nba-teams.ts` is
season-aware, not a flat code→name map (decision 0015).

**nba-elo is deliberately not loaded by this slice.** No required domain
model needs team wins/losses, and win conversion is not an approved
methodology (decision 0007 §10), so integrating it now would be premature.
Its own coverage (1947-2015, per its audit) is also narrower than RAPTOR's
46-season range, so wiring it in later needs its own scope decision, not an
assumption that every RAPTOR-supported season has matching Elo data. If a
future slice adds win conversion, note the one team-code mismatch already
found between the two pinned snapshots: RAPTOR uses `"CHA"` for the
Charlotte Hornets/Bobcats since 2004-05, nba-elo uses `"CHO"` — verified
directly against both CSVs, not previously documented in either audit.

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
