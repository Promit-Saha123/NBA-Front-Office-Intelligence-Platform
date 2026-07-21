### Automated audit: `data\raw\fivethirtyeight-nba-raptor\2026-07-19\historical_RAPTOR_by_team.csv`

* Rows: 29976
* Columns: 17
* Key columns: `player_id`, `season`, `season_type`, `team`
* Duplicate rows on key: **0**
* Season range (`season`): 1977–2022
* Missing seasons inside range: none
* Unparseable season values: 0
* Blank/null `player_id` rows: 0
* Max distinct names per id: 2
* Max distinct ids per name: 3

| Column | Dtype | Nulls | Null % | Distinct |
|---|---|---|---|---|
| `player_name` | str | 0 | 0.00% | 3571 |
| `player_id` | str | 0 | 0.00% | 3591 |
| `season` | int64 | 0 | 0.00% | 46 |
| `season_type` | str | 0 | 0.00% | 2 |
| `team` | str | 0 | 0.00% | 42 |
| `poss` | int64 | 0 | 0.00% | 6038 |
| `mp` | int64 | 0 | 0.00% | 3228 |
| `raptor_offense` | float64 | 0 | 0.00% | 29973 |
| `raptor_defense` | float64 | 0 | 0.00% | 29972 |
| `raptor_total` | float64 | 0 | 0.00% | 29973 |
| `war_total` | float64 | 2 | 0.01% | 29960 |
| `war_reg_season` | float64 | 1 | 0.00% | 21416 |
| `war_playoffs` | float64 | 1 | 0.00% | 8545 |
| `predator_offense` | float64 | 0 | 0.00% | 29973 |
| `predator_defense` | float64 | 0 | 0.00% | 29973 |
| `predator_total` | float64 | 0 | 0.00% | 29973 |
| `pace_impact` | float64 | 2 | 0.01% | 29844 |
