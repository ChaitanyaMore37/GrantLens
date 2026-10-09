# GrantLens integrated local application

The existing React frontend, FastAPI engine and synthetic dataset remain in their original separate directories. API mode is now the frontend default. No supplied dataset or ground-truth file was regenerated or changed.

## Install and start

Requirements: Python 3.11+ and Node 22.12+. Tested here with Python 3.13 and Node 26. The application is a local synthetic-data prototype, with no authentication or government affiliation.

Backend terminal, from this parent workspace:

```sh
cd grantlens-backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Use one backend worker. SQLite and uploaded job copies live under `grantlens-backend/data/`. Installed versions from this integration are recorded in `requirements-integration-tested.txt`. On Windows, use `.venv\Scripts\python` instead of `.venv/bin/python`.

Frontend terminal:

```sh
cd "GrantLens Frontend"
npm ci
npm run dev
```

Open [GrantLens](http://127.0.0.1:5173) and [FastAPI documentation](http://127.0.0.1:8000/docs). The frontend defaults to `http://127.0.0.1:8000/api/v1`. `.env.example` documents overrides. CORS permits localhost and 127.0.0.1 on port 5173; changing ports requires updating `GRANTLENS_CORS` and restarting FastAPI.

## Use the supplied dataset

1. Open **New Audit**. Start with `Synthetic Scholarship Dataset/grantlens-dataset/data/sample/main/` (1,000 beneficiaries).
2. Choose `beneficiaries.csv`, `applications.csv`, and `transactions.csv` in their respective controls.
3. In **Reference CSV files**, select all four files from that same dataset's `main/reference/`: institutions, accounts, scheme rules, account authorizations.
4. Validate the schema preview, then **Run analysis**. The backend validates relationships and runs the actual engine. **View results** selects that completed audit.
5. Open Risk Clusters, select a computed `CLU-*` case, inspect beneficiary/account nodes, save notes or change review status, and open Reports.
6. Repeat with `data/main/` for the 10,000-beneficiary dataset. The global audit selector and Reports selector retain explicit audit scope; switching reloads the view to prevent stale results.

Never upload `ground_truth/`, generation metadata or evaluation reports. The shipped data is ready to use; no generator command is needed. Download-sample links serve the supplied sample primary CSVs. Supply the references from its reference directory.

Alternative initialization, from the backend directory:

```sh
.venv/bin/python -m scripts.run_pipeline --input "../Synthetic Scholarship Dataset/grantlens-dataset/data/main"
```

This reads existing files and persists a completed audit. It does not regenerate data. The browser upload route additionally keeps immutable source copies per audit.

## Tests and evaluation

```sh
# Backend directory
.venv/bin/python -m pytest -q
# Requires the backend running; creates separate sample/main test audits and marked review notes
.venv/bin/python scripts/verify_integration.py
# Separate offline evaluation of a completed audit; substitute its actual ID
.venv/bin/python -m scripts.evaluate_saved --audit-id AUDIT_ID --truth "../Synthetic Scholarship Dataset/grantlens-dataset/data/ground_truth/ground_truth.csv" --output ../integration-results/evaluation.json

# Frontend directory
npm test
npm run build

# Dataset directory (tests generate temporary test fixtures, not the supplied release)
python3 -m unittest discover -s tests -v
```

For isolated UI development only, set `VITE_DATA_SOURCE=mock` in the frontend `.env` and restart Vite. API errors never fall back to fixtures. Existing component documentation describes the pre-integration versions; this README and `UPDATED_API_CONTRACT.md` describe the integrated application.

## Troubleshooting

- **No completed audit:** upload and run one, or execute the initialization command above.
- **Connection/HTTP error:** check `/api/v1/health`, the selected audit, backend console and CORS origin. Validation responses include representative rejected rows; source CSVs are not rewritten.
- **Port 5173 in use:** reuse the existing frontend server or stop it yourself before starting another. The dev command fails on a conflicting port rather than silently using a CORS-incompatible origin.
- **Interrupted job:** restart marks a previously Running job Failed. Upload again or call its `/run` endpoint. Source copies are retained.
- **Slow first load:** this local adapter retrieves a complete result snapshot for client-side registry filtering; investigations use paginated requests. This is verified at 10,000 beneficiaries, not production scale.
- **Missing CL-017 route:** supplied CL-017 is an offline evaluation label. The engine independently discovered `CLU-af7bca6c2c32` in the main dataset (16 members, ₹8,20,000). The UI uses computed IDs and does not feed evaluation labels into detection.

See `INTEGRATION_REPORT.md`, `FEATURE_GAP_REPORT.md`, and `TEST_REPORT.md` for implementation details and measured limitations.
