"""Fetch the pinned FiveThirtyEight RAPTOR snapshot, verified against its manifest.

data/raw/**/*.csv is gitignored (data-rules: raw source files aren't committed,
only the checksummed manifest is) — retrieval was previously a manual `curl`
step, undocumented in any script (see manifest.json's own "retrieval_method").
This formalizes it so a fresh checkout (CI, or a new local clone) can
reproduce the exact pinned snapshot: downloads from the pinned commit URL in
manifest.json, verifies every file's sha256 and byte count match, and never
overwrites a file that's already present and already verified.

Usage:
    uv run python scripts/fetch_raptor_snapshot.py
    uv run python scripts/fetch_raptor_snapshot.py --snapshot-dir <path-to-snapshot-dir>
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SNAPSHOT_DIR = _REPO_ROOT / "data" / "raw" / "fivethirtyeight-nba-raptor" / "2026-07-19"

# manifest.json's files are keyed by their on-disk name; most live under the
# pinned commit's nba-raptor/ folder, but LICENSE_fivethirtyeight_data is a
# repository-wide file preserved under a renamed local filename.
_SOURCE_PATH_OVERRIDES = {"LICENSE_fivethirtyeight_data": "LICENSE"}


def _source_path(filename: str) -> str:
    return _SOURCE_PATH_OVERRIDES.get(filename, f"nba-raptor/{filename}")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _already_verified(path: Path, expected: dict[str, object]) -> bool:
    if not path.is_file():
        return False
    if path.stat().st_size != expected["bytes"]:
        return False
    return _sha256(path) == expected["sha256"]


def fetch_snapshot(snapshot_dir: Path) -> None:
    manifest_path = snapshot_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    base_url = manifest["base_url"]

    for filename, expected in manifest["files"].items():
        target = snapshot_dir / filename
        if _already_verified(target, expected):
            print(f"OK (already present, verified): {filename}")
            continue

        url = f"{base_url}/{_source_path(filename)}"
        print(f"Fetching {filename} from {url}")
        with urllib.request.urlopen(url) as response:  # noqa: S310 — fixed, pinned-commit HTTPS URL
            data = response.read()
        target.write_bytes(data)

        if not _already_verified(target, expected):
            actual_sha256 = _sha256(target)
            raise SystemExit(
                f"Checksum mismatch for {filename}: "
                f"expected sha256={expected['sha256']} bytes={expected['bytes']}, "
                f"got sha256={actual_sha256} bytes={target.stat().st_size}"
            )
        print(f"Verified: {filename}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot-dir", type=Path, default=DEFAULT_SNAPSHOT_DIR)
    args = parser.parse_args(argv)
    fetch_snapshot(args.snapshot_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
