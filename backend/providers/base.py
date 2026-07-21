"""The ContributionProvider contract.

The scenario service depends only on this interface — never on a specific
provider's source schema. Provider selection must always be an explicit
choice made by the caller; nothing in this package silently falls back from
one provider to another.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from backend.domain.models import EpistemicType, ProviderType


class ContributionProvider(ABC):
    @abstractmethod
    def get_player_contribution(self, player_id: str, season_label: str) -> float:
        """Return the contribution value for a player-season.

        Raises MissingContributionError if no value is available. Must never
        silently substitute a value from a different provider.
        """

    @abstractmethod
    def get_provider_type(self) -> ProviderType: ...

    @abstractmethod
    def get_provider_version(self) -> str: ...

    @abstractmethod
    def get_data_version(self) -> str: ...

    @abstractmethod
    def get_epistemic_type(self) -> EpistemicType: ...

    @abstractmethod
    def get_attribution(self) -> str: ...
