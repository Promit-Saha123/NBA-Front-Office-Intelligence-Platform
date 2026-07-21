### Automated audit: `data\raw\fivethirtyeight-nba-elo\2026-07-19\nbaallelo.csv`

* Rows: 126314
* Columns: 23
* Key columns: `game_id`, `team_id`
* Duplicate rows on key: **0**
* Season range (`year_id`): 1947–2015
* Missing seasons inside range: none
* Unparseable season values: 0
* Blank/null `team_id` rows: 0
* Max distinct names per id: 1
* Max distinct ids per name: 6

| Column | Dtype | Nulls | Null % | Distinct |
|---|---|---|---|---|
| `gameorder` | int64 | 0 | 0.00% | 63157 |
| `game_id` | str | 0 | 0.00% | 63157 |
| `lg_id` | str | 0 | 0.00% | 2 |
| `_iscopy` | int64 | 0 | 0.00% | 2 |
| `year_id` | int64 | 0 | 0.00% | 69 |
| `date_game` | str | 0 | 0.00% | 12426 |
| `seasongame` | int64 | 0 | 0.00% | 108 |
| `is_playoffs` | int64 | 0 | 0.00% | 2 |
| `team_id` | str | 0 | 0.00% | 104 |
| `fran_id` | str | 0 | 0.00% | 53 |
| `pts` | int64 | 0 | 0.00% | 139 |
| `elo_i` | float64 | 0 | 0.00% | 123947 |
| `elo_n` | float64 | 0 | 0.00% | 123982 |
| `win_equiv` | float64 | 0 | 0.00% | 123857 |
| `opp_id` | str | 0 | 0.00% | 104 |
| `opp_fran` | str | 0 | 0.00% | 53 |
| `opp_pts` | int64 | 0 | 0.00% | 139 |
| `opp_elo_i` | float64 | 0 | 0.00% | 123947 |
| `opp_elo_n` | float64 | 0 | 0.00% | 123982 |
| `game_location` | str | 0 | 0.00% | 3 |
| `game_result` | str | 0 | 0.00% | 2 |
| `forecast` | float64 | 0 | 0.00% | 125039 |
| `notes` | str | 120890 | 95.71% | 231 |
