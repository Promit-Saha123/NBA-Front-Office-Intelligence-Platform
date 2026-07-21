### Automated audit: `data\raw\fivethirtyeight-nba-raptor\2026-07-19\modern_RAPTOR_by_player.csv`

* Rows: 4685
* Columns: 21
* Key columns: `player_id`, `season`
* Duplicate rows on key: **0**
* Season range (`season`): 2014–2022
* Missing seasons inside range: none
* Unparseable season values: 0
* Blank/null `player_id` rows: 0
* Max distinct names per id: 2
* Max distinct ids per name: 1

| Column | Dtype | Nulls | Null % | Distinct |
|---|---|---|---|---|
| `player_name` | str | 0 | 0.00% | 1322 |
| `player_id` | str | 0 | 0.00% | 1314 |
| `season` | int64 | 0 | 0.00% | 9 |
| `poss` | int64 | 0 | 0.00% | 3139 |
| `mp` | int64 | 0 | 0.00% | 2261 |
| `raptor_box_offense` | float64 | 1 | 0.02% | 4684 |
| `raptor_box_defense` | float64 | 1 | 0.02% | 4684 |
| `raptor_box_total` | float64 | 1 | 0.02% | 4684 |
| `raptor_onoff_offense` | float64 | 1 | 0.02% | 4681 |
| `raptor_onoff_defense` | float64 | 1 | 0.02% | 4681 |
| `raptor_onoff_total` | float64 | 1 | 0.02% | 4681 |
| `raptor_offense` | float64 | 0 | 0.00% | 4685 |
| `raptor_defense` | float64 | 0 | 0.00% | 4685 |
| `raptor_total` | float64 | 0 | 0.00% | 4685 |
| `war_total` | float64 | 0 | 0.00% | 4685 |
| `war_reg_season` | float64 | 0 | 0.00% | 4680 |
| `war_playoffs` | float64 | 0 | 0.00% | 1932 |
| `predator_offense` | float64 | 0 | 0.00% | 4685 |
| `predator_defense` | float64 | 0 | 0.00% | 4685 |
| `predator_total` | float64 | 0 | 0.00% | 4685 |
| `pace_impact` | float64 | 1 | 0.02% | 4684 |
