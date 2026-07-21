"""Tests for backend.minutes.allocator — synthetic weights only, exact expected outputs."""

from collections.abc import Sequence

import pytest

from backend.domain.errors import InvalidRotationError
from backend.domain.models import RotationEntry
from backend.minutes.allocator import MinutesAllocationConfig, allocate_minutes

DEFAULT_CONFIG = MinutesAllocationConfig()


def _total_minutes(entries: Sequence[RotationEntry]) -> float:
    return sum(entry.minutes for entry in entries)


def test_total_minutes_equal_exactly_240() -> None:
    weights = {f"p{i}": 30.0 - i for i in range(12)}
    result = allocate_minutes(weights, DEFAULT_CONFIG)
    assert _total_minutes(result.entries) == pytest.approx(240.0, abs=1e-9)


def test_no_negative_minutes() -> None:
    weights = {f"p{i}": float(i + 1) for i in range(15)}
    result = allocate_minutes(weights, DEFAULT_CONFIG)
    assert all(entry.minutes >= 0 for entry in result.entries)


def test_configurable_maximum_is_enforced() -> None:
    config = MinutesAllocationConfig(max_player_minutes=30.0, maximum_rotation_size=10)
    weights = {"star": 200.0, **{f"p{i}": 5.0 for i in range(9)}}
    result = allocate_minutes(weights, config)
    assert all(entry.minutes <= 30.0 + 1e-6 for entry in result.entries)
    assert _total_minutes(result.entries) == pytest.approx(240.0, abs=1e-6)
    assert any("capped" in repair for repair in result.repairs)


def test_configurable_rotation_size_is_enforced() -> None:
    config = MinutesAllocationConfig(maximum_rotation_size=5, max_player_minutes=60.0)
    weights = {f"p{i}": float(10 - i) for i in range(10)}
    result = allocate_minutes(weights, config)
    assert len(result.entries) == 5
    active_ids = {entry.player_id for entry in result.entries}
    assert active_ids == {"p0", "p1", "p2", "p3", "p4"}
    assert _total_minutes(result.entries) == pytest.approx(240.0, abs=1e-9)
    assert any("rotation size limit" in repair for repair in result.repairs)


_THREE_PLAYER_CONFIG = MinutesAllocationConfig(max_player_minutes=100.0)


def test_deterministic_output() -> None:
    weights_a = {"p1": 10.0, "p2": 20.0, "p3": 30.0}
    weights_b = {"p3": 30.0, "p1": 10.0, "p2": 20.0}
    result_a = allocate_minutes(weights_a, _THREE_PLAYER_CONFIG)
    result_b = allocate_minutes(weights_b, _THREE_PLAYER_CONFIG)
    assert result_a.entries == result_b.entries


def test_tied_weights_break_ties_by_player_id() -> None:
    weights = {"zeta": 10.0, "alpha": 10.0, "mid": 10.0}
    result = allocate_minutes(weights, _THREE_PLAYER_CONFIG)
    ordered_ids = [entry.player_id for entry in result.entries]
    assert ordered_ids == ["alpha", "mid", "zeta"]


def test_invalid_configuration_fails() -> None:
    with pytest.raises(InvalidRotationError):
        allocate_minutes({"p1": 10.0}, MinutesAllocationConfig(max_player_minutes=0))
    with pytest.raises(InvalidRotationError):
        allocate_minutes({"p1": 10.0}, MinutesAllocationConfig(maximum_rotation_size=0))
    with pytest.raises(InvalidRotationError):
        # 5 players * 30 max minutes = 150 < 240 total: infeasible.
        allocate_minutes(
            {f"p{i}": 10.0 for i in range(5)},
            MinutesAllocationConfig(max_player_minutes=30.0, maximum_rotation_size=5),
        )


def test_repair_metadata_preserved_when_no_repair_needed() -> None:
    weights = {f"p{i}": float(20 - i) for i in range(10)}
    config = MinutesAllocationConfig(maximum_rotation_size=10, max_player_minutes=40.0)
    result = allocate_minutes(weights, config)
    assert result.repairs == ()


def test_impossible_rotation_fails_clearly() -> None:
    with pytest.raises(InvalidRotationError):
        allocate_minutes({}, DEFAULT_CONFIG)
    with pytest.raises(InvalidRotationError):
        allocate_minutes({"p1": 0.0, "p2": -1.0}, DEFAULT_CONFIG)


def test_max_minutes_never_violated_when_active_pool_too_small() -> None:
    # Regression test: a pool of active players too small to reach the total
    # without exceeding the per-player cap must raise InvalidRotationError
    # rather than silently exceeding the cap (found during post-implementation
    # review — a single player previously received all 240 minutes despite a
    # 40-minute configured maximum).
    with pytest.raises(InvalidRotationError):
        allocate_minutes({"solo": 1000.0}, DEFAULT_CONFIG)

    weights = {f"p{i}": float(10 - i) for i in range(5)}
    with pytest.raises(InvalidRotationError):
        allocate_minutes(
            weights, MinutesAllocationConfig(max_player_minutes=40.0, maximum_rotation_size=10)
        )


def test_max_minutes_respected_across_many_random_configurations() -> None:
    import random

    rng = random.Random(20260720)
    violations = 0
    trials = 0
    for _ in range(500):
        num_players = rng.randint(1, 15)
        weights = {f"p{i}": rng.uniform(0.1, 2000.0) for i in range(num_players)}
        max_minutes = rng.uniform(10.0, 60.0)
        rotation_size = rng.randint(1, 12)
        config = MinutesAllocationConfig(
            max_player_minutes=max_minutes, maximum_rotation_size=rotation_size
        )
        try:
            result = allocate_minutes(weights, config)
        except InvalidRotationError:
            continue
        trials += 1
        if any(entry.minutes > max_minutes + 1e-6 for entry in result.entries):
            violations += 1
        assert _total_minutes(result.entries) == pytest.approx(240.0, abs=1e-4)
    assert trials > 0
    assert violations == 0


def test_below_minimum_players_are_dropped_and_redistributed() -> None:
    # c's weight share (1 / 106 * 240 ≈ 2.26) falls below the 6.0 minimum and
    # must be dropped; a and b then get rescaled to still sum to exactly 240,
    # in the same 100:5 ratio as their original weights.
    config = MinutesAllocationConfig(
        maximum_rotation_size=3, minimum_rotation_minutes=6.0, max_player_minutes=240.0
    )
    weights = {"a": 100.0, "b": 5.0, "c": 1.0}
    result = allocate_minutes(weights, config)
    active_ids = {entry.player_id for entry in result.entries}
    assert active_ids == {"a", "b"}
    assert _total_minutes(result.entries) == pytest.approx(240.0, abs=1e-6)
    assert any("below minimum" in repair for repair in result.repairs)
    minutes_by_id = {entry.player_id: entry.minutes for entry in result.entries}
    assert minutes_by_id["a"] == pytest.approx(minutes_by_id["b"] * 20, rel=1e-3)
