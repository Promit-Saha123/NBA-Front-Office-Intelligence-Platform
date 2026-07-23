"""Typed, machine-readable domain errors.

Each error carries a stable ``code`` class attribute so callers (and a future
API layer) never need to parse message text or catch pandas/filesystem
exceptions directly (scenario-engine.md §31).
"""

from __future__ import annotations


class DomainError(Exception):
    """Base class for all typed domain errors. Never raised directly."""

    code: str = "DOMAIN_ERROR"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class UnsupportedSeasonError(DomainError):
    code = "UNSUPPORTED_SEASON"


class TeamNotFoundError(DomainError):
    code = "TEAM_NOT_FOUND"


class PlayerNotFoundError(DomainError):
    code = "PLAYER_NOT_FOUND"


class PlayerNotOnRosterError(DomainError):
    code = "PLAYER_NOT_ON_ROSTER"


class PlayerAlreadyOnRosterError(DomainError):
    code = "PLAYER_ALREADY_ON_ROSTER"


class SamePlayerSwapError(DomainError):
    code = "SAME_PLAYER_SWAP"


class MissingContributionError(DomainError):
    code = "MISSING_CONTRIBUTION"


class InvalidRosterError(DomainError):
    code = "INVALID_ROSTER"


class InvalidRotationError(DomainError):
    code = "INVALID_ROTATION"


class InvalidManualMinutesError(DomainError):
    code = "INVALID_MANUAL_MINUTES"


class MissingSourceFileError(DomainError):
    code = "MISSING_SOURCE_FILE"


class MissingRequiredColumnError(DomainError):
    code = "MISSING_REQUIRED_COLUMN"


class IncompatibleDataVersionError(DomainError):
    code = "INCOMPATIBLE_DATA_VERSION"


class InvalidProviderConfigurationError(DomainError):
    code = "INVALID_PROVIDER_CONFIGURATION"
