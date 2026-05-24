**Artifacts management**

- Place production models and data in the top-level `artifacts/` folder.
- Default structure:
  - `artifacts/models/saved/*.pkl`
  - `artifacts/data/raw/*.csv`

Why:
- Keeps large binary artifacts out of source paths and makes them easier to mount in deployments.

Quick steps to migrate local artifacts into `artifacts/`:

1. From project root, run:

```bash
python scripts/move_artifacts.py
```

2. Verify files in `artifacts/` and update your environment to set `ARTIFACTS_DIR` if desired:

```bash
export ARTIFACTS_DIR=$(pwd)/artifacts
# or on Windows PowerShell:
$env:ARTIFACTS_DIR = "$PWD/artifacts"
```

3. Start the API. The server will prefer `ARTIFACTS_DIR` if set, otherwise it will fall back to `Backend/backend/...` paths for backward compatibility.

Optional: after verifying everything works, remove old backend artifact directories and commit `.gitignore` (we already ignore these paths).
