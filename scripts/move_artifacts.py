"""
Move artifacts (models & data) into centralized `artifacts/` folder.
Run from project root:
    python scripts/move_artifacts.py

This will move:
 - Backend/backend/models/saved/*.pkl -> artifacts/models/saved/
 - Backend/backend/data/raw/*.csv         -> artifacts/data/raw/

It is a safe local move; verify files before committing or deleting originals.
"""

import shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_MODELS = PROJECT_ROOT / "Backend" / "backend" / "models" / "saved"
SRC_DATA = PROJECT_ROOT / "Backend" / "backend" / "data" / "raw"
DST_MODELS = PROJECT_ROOT / "artifacts" / "models" / "saved"
DST_DATA = PROJECT_ROOT / "artifacts" / "data" / "raw"

DST_MODELS.mkdir(parents=True, exist_ok=True)
DST_DATA.mkdir(parents=True, exist_ok=True)

moved = []

if SRC_MODELS.exists():
    for p in SRC_MODELS.glob("*.pkl"):
        dest = DST_MODELS / p.name
        print(f"Moving {p} -> {dest}")
        shutil.move(str(p), str(dest))
        moved.append(dest)

if SRC_DATA.exists():
    for p in SRC_DATA.glob("*.csv"):
        dest = DST_DATA / p.name
        print(f"Moving {p} -> {dest}")
        shutil.move(str(p), str(dest))
        moved.append(dest)

if not moved:
    print("No artifacts found to move.")
else:
    print(f"Moved {len(moved)} files.")
