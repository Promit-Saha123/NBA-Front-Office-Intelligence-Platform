"""Synthetic contribution provider (decision 0007).

Produces deterministic, clearly labeled demo values for tests, unsupported
seasons, and scenario edge cases. It is never selected automatically — a
caller must construct and pass this provider explicitly. It never claims to
represent a real player's value.
"""

from __future__ import annotations

import hashlib
from collections.abc import Mapping
from dataclasses import dataclass

from backend.domain.models import EpistemicType, PlayerImpactProfile, ProviderType
from backend.providers.base import ContributionProvider

DEFAULT_ATTRIBUTION = (
    "Synthetic contribution estimate — generated demo value, not derived from real player data."
)


@dataclass(frozen=True)
class SyntheticContributionConfig:
    seed: int = 0
    low: float = -5.0
    high: float = 5.0
    provider_version: str = "synthetic-v1"
    data_version: str = "synthetic-fixtures-v1"
    attribution: str = DEFAULT_ATTRIBUTION


def _deterministic_unit_fraction(key: str) -> float:
    """A reproducible float in [0, 1) derived from ``key`` via SHA-256.

    Uses hashlib rather than the builtin ``hash()`` because Python randomizes
    string hashes per process by default, which would break determinism
    across runs.
    """
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


class SyntheticContributionProvider(ContributionProvider):
    def __init__(
        self,
        config: SyntheticContributionConfig | None = None,
        explicit_values: Mapping[tuple[str, str], float] | None = None,
    ) -> None:
        self._config = config or SyntheticContributionConfig()
        self._explicit_values: dict[tuple[str, str], float] = (
            dict(explicit_values) if explicit_values else {}
        )

    def get_player_contribution(self, player_id: str, season_label: str) -> float:
        key = (player_id, season_label)
        if key in self._explicit_values:
            return self._explicit_values[key]
        fraction = _deterministic_unit_fraction(f"{self._config.seed}:{player_id}:{season_label}")
        return self._config.low + fraction * (self._config.high - self._config.low)

    def get_player_profile(self, player_id: str, season_label: str) -> PlayerImpactProfile:
        # Two distinctly-salted keys, not a split of the single contribution
        # value — a genuinely separate deterministic dimension per key.
        offense_fraction = _deterministic_unit_fraction(
            f"{self._config.seed}:{player_id}:{season_label}:offense"
        )
        defense_fraction = _deterministic_unit_fraction(
            f"{self._config.seed}:{player_id}:{season_label}:defense"
        )
        low, high = self._config.low, self._config.high
        return PlayerImpactProfile(
            offensive_impact=low + offense_fraction * (high - low),
            defensive_impact=low + defense_fraction * (high - low),
        )

    def get_provider_type(self) -> ProviderType:
        return ProviderType.SYNTHETIC

    def get_provider_version(self) -> str:
        return self._config.provider_version

    def get_data_version(self) -> str:
        return self._config.data_version

    def get_epistemic_type(self) -> EpistemicType:
        return EpistemicType.SYNTHETIC_ESTIMATE

    def get_attribution(self) -> str:
        return self._config.attribution
