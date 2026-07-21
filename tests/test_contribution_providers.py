"""Tests for the ContributionProvider contract and its two implementations."""

import pytest

from backend.domain.errors import MissingContributionError
from backend.domain.models import EpistemicType, ProviderType
from backend.fixtures.historical_loader import HistoricalSeasonData, load_historical_season
from backend.providers.base import ContributionProvider
from backend.providers.raptor_benchmark import HistoricalRaptorBenchmarkProvider
from backend.providers.synthetic import SyntheticContributionConfig, SyntheticContributionProvider

SEASON_LABEL = "2014-15"


@pytest.fixture(scope="module")
def season_data() -> HistoricalSeasonData:
    return load_historical_season(SEASON_LABEL)


@pytest.fixture
def raptor_provider(season_data: HistoricalSeasonData) -> HistoricalRaptorBenchmarkProvider:
    return HistoricalRaptorBenchmarkProvider(season_data)


def test_both_providers_implement_the_interface(
    raptor_provider: HistoricalRaptorBenchmarkProvider,
) -> None:
    synthetic_provider = SyntheticContributionProvider()
    for provider in (raptor_provider, synthetic_provider):
        assert isinstance(provider, ContributionProvider)
        provider.get_provider_type()
        provider.get_provider_version()
        provider.get_data_version()
        provider.get_epistemic_type()
        provider.get_attribution()


def test_historical_provider_metadata(raptor_provider: HistoricalRaptorBenchmarkProvider) -> None:
    assert raptor_provider.get_provider_type() == ProviderType.HISTORICAL_RAPTOR_BENCHMARK
    assert raptor_provider.get_provider_version() == "historical-raptor-benchmark-v1"
    assert raptor_provider.get_data_version() == "fivethirtyeight-nba-raptor-2022-11-29"
    assert "FiveThirtyEight" in raptor_provider.get_attribution()


def test_historical_values_labeled_historical_benchmark(
    raptor_provider: HistoricalRaptorBenchmarkProvider,
) -> None:
    assert raptor_provider.get_epistemic_type() == EpistemicType.HISTORICAL_BENCHMARK


def test_historical_values_never_labeled_pce_or_prediction(
    raptor_provider: HistoricalRaptorBenchmarkProvider,
) -> None:
    epistemic = raptor_provider.get_epistemic_type()
    assert epistemic != EpistemicType.MODEL_PREDICTION
    assert "pce" not in raptor_provider.get_provider_version().lower()
    assert "pce" not in epistemic.value.lower()


def test_historical_provider_matches_pinned_snapshot_exactly(
    raptor_provider: HistoricalRaptorBenchmarkProvider,
) -> None:
    # afflaar01's season-2015 raptor_total, verified directly against the CSV.
    value = raptor_provider.get_player_contribution("afflaar01", SEASON_LABEL)
    assert value == pytest.approx(-2.659069, abs=1e-5)


def test_historical_provider_missing_contribution_fails_explicitly(
    raptor_provider: HistoricalRaptorBenchmarkProvider,
) -> None:
    with pytest.raises(MissingContributionError):
        raptor_provider.get_player_contribution("not-a-real-player", SEASON_LABEL)


def test_historical_provider_unsupported_season_fails_explicitly(
    raptor_provider: HistoricalRaptorBenchmarkProvider,
) -> None:
    with pytest.raises(MissingContributionError):
        raptor_provider.get_player_contribution("afflaar01", "2013-14")


def test_synthetic_provider_deterministic() -> None:
    provider_a = SyntheticContributionProvider(SyntheticContributionConfig(seed=42))
    provider_b = SyntheticContributionProvider(SyntheticContributionConfig(seed=42))
    value_a = provider_a.get_player_contribution("anyone", SEASON_LABEL)
    value_b = provider_b.get_player_contribution("anyone", SEASON_LABEL)
    assert value_a == value_b


def test_synthetic_provider_different_seeds_differ() -> None:
    provider_a = SyntheticContributionProvider(SyntheticContributionConfig(seed=1))
    provider_b = SyntheticContributionProvider(SyntheticContributionConfig(seed=2))
    assert provider_a.get_player_contribution(
        "anyone", SEASON_LABEL
    ) != provider_b.get_player_contribution("anyone", SEASON_LABEL)


def test_synthetic_provider_explicitly_labeled_synthetic() -> None:
    provider = SyntheticContributionProvider()
    assert provider.get_epistemic_type() == EpistemicType.SYNTHETIC_ESTIMATE
    assert provider.get_provider_type() == ProviderType.SYNTHETIC
    assert "synthetic" in provider.get_attribution().lower()


def test_synthetic_provider_never_raises_missing_contribution() -> None:
    provider = SyntheticContributionProvider()
    # Synthetic always produces a labeled value — it never signals "missing".
    value = provider.get_player_contribution("no-such-player", "3000-01")
    assert isinstance(value, float)


def test_synthetic_explicit_values_override_generated() -> None:
    provider = SyntheticContributionProvider(explicit_values={("demo-player", SEASON_LABEL): 7.5})
    assert provider.get_player_contribution("demo-player", SEASON_LABEL) == 7.5


def test_no_automatic_fallback_from_historical_to_synthetic(
    raptor_provider: HistoricalRaptorBenchmarkProvider,
) -> None:
    # The historical provider has no knowledge of or path to the synthetic
    # provider; a missing value must raise, never silently substitute.
    with pytest.raises(MissingContributionError):
        raptor_provider.get_player_contribution("not-a-real-player", SEASON_LABEL)
