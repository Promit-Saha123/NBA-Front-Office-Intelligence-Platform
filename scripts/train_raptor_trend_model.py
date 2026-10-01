"""Train the RAPTOR-trend projection model (decision 0013) and save it as the
active artifact under ml/artifacts/.

Usage:
    uv run python scripts/train_raptor_trend_model.py
"""

from __future__ import annotations

import json
import sys

from ml.train import run_training


def main() -> int:
    report = run_training()
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
