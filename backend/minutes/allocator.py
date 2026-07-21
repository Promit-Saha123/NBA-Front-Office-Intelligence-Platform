"""Transparent heuristic minutes allocator (scenario-engine.md §10-§13).

This is a heuristic assumption engine, not a rotation-prediction model — it
does not claim to predict a coach's real decisions.

## Method

Given a weight (real historical minutes, or a provisional weight for a newly
added player) per candidate player:

1. Reject configurations that cannot possibly satisfy the hard constraints
   (e.g. ``max_player_minutes * maximum_rotation_size < total_team_minutes``).
2. Drop non-positive weights (a player with no recorded playing time is not
   part of the active rotation).
3. Rank remaining players by weight descending, tie-broken by player ID
   ascending for full determinism, and keep the top
   ``maximum_rotation_size`` as the active rotation; everyone else is
   recorded as excluded (a visible repair) and receives no minutes.
4. Scale the active rotation's weights so they sum to exactly
   ``total_team_minutes``.
5. Repeatedly cap any player above ``max_player_minutes`` at the cap and
   redistribute the excess proportionally among uncapped players (a visible
   repair), until no one exceeds the cap.
6. Repeatedly drop any active player below ``minimum_rotation_minutes`` from
   the rotation (a visible repair) and redistribute their minutes, then
   re-run steps 4-5, until the rotation is stable or no players remain.
7. Snap floating-point drift so the stored total resolves to exactly
   ``total_team_minutes`` (scenario-engine.md §12): any residual is applied
   to the highest-weight player.

Positional viability (scenario-engine.md §13) is not implemented in this
slice: the pinned RAPTOR/nba-elo snapshots carry no position field, so there
is no legally usable position data to enforce it against yet.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from backend.domain.errors import InvalidRotationError
from backend.domain.models import MinutesAllocationResult, RotationEntry

_FLOAT_TOLERANCE = 1e-6
_MAX_REPAIR_ITERATIONS = 50


@dataclass(frozen=True)
class MinutesAllocationConfig:
    total_team_minutes: float = 240.0
    max_player_minutes: float = 40.0
    minimum_rotation_minutes: float = 6.0
    maximum_rotation_size: int = 10


DEFAULT_MINUTES_CONFIG = MinutesAllocationConfig()


def allocate_minutes(
    player_weights: Mapping[str, float],
    config: MinutesAllocationConfig = DEFAULT_MINUTES_CONFIG,
) -> MinutesAllocationResult:
    """Allocate exactly ``config.total_team_minutes`` across the given players.

    ``player_weights`` maps player_id to a non-negative seed weight (real
    historical minutes for most players; a provisional weight — typically the
    outgoing player's weight — for a newly added player). Only players present
    in this mapping can ever receive minutes.

    Raises InvalidRotationError if the configuration cannot be satisfied.
    """
    _validate_config(config)

    repairs: list[str] = []
    positive_weights = {pid: w for pid, w in player_weights.items() if w > 0}
    dropped_zero = sorted(set(player_weights) - set(positive_weights))
    if dropped_zero:
        repairs.append(f"excluded (non-positive weight): {dropped_zero}")

    ranked = sorted(positive_weights.items(), key=lambda item: (-item[1], item[0]))
    active = dict(ranked[: config.maximum_rotation_size])
    excluded_by_size = [pid for pid, _ in ranked[config.maximum_rotation_size :]]
    if excluded_by_size:
        repairs.append(f"excluded (rotation size limit): {excluded_by_size}")

    if not active:
        raise InvalidRotationError("No players with positive weight are available for allocation")
    _validate_pool_can_reach_total(active, config)

    minutes = _scale_to_total(active, config.total_team_minutes)

    for _ in range(_MAX_REPAIR_ITERATIONS):
        capped = _cap_excess(
            minutes, config.max_player_minutes, config.total_team_minutes, repairs
        )
        dropped = _drop_below_minimum(capped, config.minimum_rotation_minutes, repairs)
        if dropped.keys() == minutes.keys():
            minutes = capped
            break
        if not dropped:
            raise InvalidRotationError(
                "Minimum-minutes repair removed every active player; "
                "configuration cannot produce a valid rotation"
            )
        _validate_pool_can_reach_total(dropped, config)
        minutes = _scale_to_total(dropped, config.total_team_minutes)
    else:
        raise InvalidRotationError(
            "Minutes allocation did not converge within the repair-iteration limit"
        )

    minutes = _snap_to_exact_total(minutes, config.total_team_minutes)
    if any(m > config.max_player_minutes + _FLOAT_TOLERANCE for m in minutes.values()):
        # Should be unreachable given _validate_pool_can_reach_total above; kept as a
        # final invariant check because a cap violation is a hard constraint, not a
        # best-effort one (this exact class of bug shipped once already — see the
        # allocate_minutes docstring "Method" step 5 note on permanent capping).
        raise InvalidRotationError(
            "Final allocation would exceed max_player_minutes; this indicates a bug in "
            "the allocator, not an unsatisfiable caller configuration"
        )
    entries = tuple(
        RotationEntry(player_id=pid, minutes=minutes[pid])
        for pid in sorted(minutes, key=lambda pid: (-minutes[pid], pid))
    )
    return MinutesAllocationResult(entries=entries, repairs=tuple(repairs))


def _validate_pool_can_reach_total(
    pool: Mapping[str, float], config: MinutesAllocationConfig
) -> None:
    """Verify the active pool can reach the total without violating the per-player cap.

    This is the per-call complement to ``_validate_config``'s configuration-level
    check: ``maximum_rotation_size`` bounds the largest the pool could ever be, but
    the actual pool (fewer players on a small roster, or fewer after a
    below-minimum drop) can be smaller. If ``len(pool) * max_player_minutes >=
    total_team_minutes`` holds for the pool handed to ``_cap_excess``, capping is
    guaranteed to converge without a shortfall: capping any k players at the max
    leaves ``len(pool) - k`` players who must together absorb
    ``total - k * max_player_minutes`` minutes, and per this same inequality their
    capacity ``(len(pool) - k) * max_player_minutes`` is always at least that much.
    """
    if len(pool) * config.max_player_minutes < config.total_team_minutes:
        raise InvalidRotationError(
            f"Cannot allocate {config.total_team_minutes} minutes across only "
            f"{len(pool)} active player(s) without exceeding "
            f"max_player_minutes={config.max_player_minutes}"
        )


def _validate_config(config: MinutesAllocationConfig) -> None:
    if config.total_team_minutes <= 0:
        raise InvalidRotationError("total_team_minutes must be positive")
    if config.max_player_minutes <= 0:
        raise InvalidRotationError("max_player_minutes must be positive")
    if config.maximum_rotation_size <= 0:
        raise InvalidRotationError("maximum_rotation_size must be positive")
    if config.minimum_rotation_minutes < 0:
        raise InvalidRotationError("minimum_rotation_minutes must not be negative")
    if config.minimum_rotation_minutes > config.max_player_minutes:
        raise InvalidRotationError("minimum_rotation_minutes cannot exceed max_player_minutes")
    if config.max_player_minutes * config.maximum_rotation_size < config.total_team_minutes:
        raise InvalidRotationError(
            "max_player_minutes * maximum_rotation_size cannot satisfy total_team_minutes"
        )


def _scale_to_total(weights: Mapping[str, float], total: float) -> dict[str, float]:
    weight_sum = sum(weights.values())
    return {pid: (weight / weight_sum) * total for pid, weight in weights.items()}


def _cap_excess(
    minutes: Mapping[str, float], max_minutes: float, total: float, repairs: list[str]
) -> dict[str, float]:
    """Cap any player above ``max_minutes`` and redistribute the excess.

    Capped players are permanently fixed at the cap and never reconsidered
    (removed from the pool being redistributed into) — this is what
    guarantees termination. Redistributing back into an already-capped
    player would risk oscillation: capping A to feed B, then B exceeding the
    cap and being capped in turn, feeding the excess back to A, and so on.
    """
    remaining = dict(minutes)
    capped: dict[str, float] = {}
    for _ in range(_MAX_REPAIR_ITERATIONS):
        over = {pid: m for pid, m in remaining.items() if m > max_minutes + _FLOAT_TOLERANCE}
        if not over:
            break
        for pid in over:
            capped[pid] = max_minutes
            del remaining[pid]
        if not remaining:
            break
        remaining_total = total - len(capped) * max_minutes
        remaining = _scale_to_total(remaining, remaining_total)
    else:
        raise InvalidRotationError("Minutes capping did not converge within the iteration limit")

    if capped:
        repairs.append(f"capped at {max_minutes} and redistributed: {sorted(capped)}")
    return {**capped, **remaining}


def _drop_below_minimum(
    minutes: Mapping[str, float], minimum_minutes: float, repairs: list[str]
) -> dict[str, float]:
    below = [pid for pid, m in minutes.items() if m < minimum_minutes - _FLOAT_TOLERANCE]
    if not below:
        return dict(minutes)
    repairs.append(f"dropped (below minimum {minimum_minutes}): {sorted(below)}")
    return {pid: m for pid, m in minutes.items() if pid not in below}


def _snap_to_exact_total(minutes: Mapping[str, float], total: float) -> dict[str, float]:
    result = dict(minutes)
    if not result:
        return result
    drift = total - sum(result.values())
    top_player = sorted(result, key=lambda pid: (-result[pid], pid))[0]
    result[top_player] = result[top_player] + drift
    return result
