"""Historical RAPTOR benchmark contribution provider (decision 0007).

Returns FiveThirtyEight RAPTOR values (CC BY 4.0) verbatim as a labeled
historical benchmark. These values are never PCE, never validated, and never
a prediction — see decision 0007 §2 and CLAUDE.md's product-claims rules.
"""

from __future__ import annotations

from backend.domain.errors import MissingContributionError
from backend.domain.models import EpistemicType, ProviderType
from backend.fixtures.historical_loader import HistoricalSeasonData
from backend.providers.base import ContributionProvider

PROVIDER_VERSION = "historical-raptor-benchmark-v1"


class HistoricalRaptorBenchmarkProvider(ContributionProvider):
    """Looks up contribution values already loaded by the fixture loader.

    Takes a pre-loaded HistoricalSeasonData so the CSV snapshot is read
    exactly once regardless of how many providers or scenarios use it.
    """

    def __init__(self, season_data: HistoricalSeasonData) -> None:
        self._season_data = season_data

    def get_player_contribution(self, player_id: str, season_label: str) -> float:
        if season_label != self._season_data.season.label:
            raise MissingContributionError(
                f"No RAPTOR benchmark loaded for season {season_label!r} "
                f"(this provider was built for {self._season_data.season.label!r})"
            )
        value = self._season_data.contribution_values.get(player_id)
        if value is None:
            raise MissingContributionError(
                f"No historical RAPTOR benchmark value for player {player_id!r} "
                f"in season {season_label!r}"
            )
        return value

    def get_provider_type(self) -> ProviderType:
        return ProviderType.HISTORICAL_RAPTOR_BENCHMARK

    def get_provider_version(self) -> str:
        return PROVIDER_VERSION

    def get_data_version(self) -> str:
        return self._season_data.data_version

    def get_epistemic_type(self) -> EpistemicType:
        return EpistemicType.HISTORICAL_BENCHMARK

    def get_attribution(self) -> str:
        return self._season_data.attribution
