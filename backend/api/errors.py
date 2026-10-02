"""Maps backend.domain.errors.DomainError subclasses to HTTP status codes.

Every DomainError already carries a stable machine-readable `.code`
(backend/domain/errors.py) — this module only decides the HTTP status, it
never invents a new error string.
"""

from __future__ import annotations

from backend.domain.errors import (
    DomainError,
    InvalidCustomRosterError,
    InvalidManualMinutesError,
    InvalidRosterError,
    InvalidRotationError,
    MissingContributionError,
    PlayerAlreadyOnRosterError,
    PlayerNotFoundError,
    PlayerNotOnRosterError,
    SamePlayerSwapError,
    TeamNotFoundError,
    UnsupportedSeasonError,
)
from ml.artifact import ModelArtifactNotFoundError
from ml.inference import PlayerProjectionNotFoundError

# Errors reachable through the scenario endpoint's normal request handling.
# Anything not listed here (e.g. the fixture-loading errors, or the
# defensive InvalidRosterError invariant) is a server-side condition, not a
# client mistake, and falls back to 500 below.
DOMAIN_ERROR_STATUS: dict[type[DomainError], int] = {
    UnsupportedSeasonError: 422,
    TeamNotFoundError: 404,
    PlayerNotFoundError: 404,
    PlayerNotOnRosterError: 422,
    PlayerAlreadyOnRosterError: 409,
    SamePlayerSwapError: 422,
    MissingContributionError: 422,
    InvalidRotationError: 422,
    InvalidManualMinutesError: 422,
    InvalidCustomRosterError: 422,
    InvalidRosterError: 500,
    # The projection model's gitignored artifact may simply not exist in this
    # environment yet (decision 0013: "would need a lazy-load-with-graceful-
    # 503 pattern") — a client-correctable 404 would wrongly imply the
    # player/season itself is the problem.
    ModelArtifactNotFoundError: 503,
    PlayerProjectionNotFoundError: 404,
}

DEFAULT_DOMAIN_ERROR_STATUS = 500


def status_for(error: DomainError) -> int:
    return DOMAIN_ERROR_STATUS.get(type(error), DEFAULT_DOMAIN_ERROR_STATUS)
