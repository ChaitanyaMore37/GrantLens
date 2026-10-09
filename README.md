# GrantLens V2 integrated local application

The existing React frontend, FastAPI engine and synthetic dataset remain in their original separate directories. API mode is now the frontend default. No supplied dataset or ground-truth file was regenerated or changed.

## Install and start

Requirements: Python 3.11+ and Node 22.12+. Tested here with Python 3.13 and Node 26. The application is a local synthetic-data prototype, with frontend-only demo login and no API authentication or government affiliation.

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

1. Sign in with `auditor@grantlens.demo` / `GrantLens123` (demo credentials). Open **New Audit**. Start with `Synthetic Scholarship Dataset/grantlens-dataset/data/sample/main/` (1,000 beneficiaries).
2. Choose `beneficiaries.csv`, `applications.csv`, and `transactions.csv` in their respective controls.
3. In **Reference CSV files**, select all four files from that same dataset's `main/reference/`: institutions, accounts, scheme rules, account authorizations.
4. Review the schema preview and explicit header mappings, click **Validate on server**, inspect backend findings, then **Run analysis**. The backend validates relationships and runs the actual engine. **View results** selects that completed audit.
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

For isolated UI development only, set `VITE_DATA_SOURCE=mock` in the frontend `.env` and restart Vite. API errors never fall back to fixtures. Existing component documentation describes the pre-integration versions; this README and `docs/api/API_CONTRACT.md` describe the current application; UPDATED_API_CONTRACT.md remains the V1 reference.

## Troubleshooting

- **No completed audit:** upload and run one, or execute the initialization command above.
- **Connection/HTTP error:** check `/api/v1/health`, the selected audit, backend console and CORS origin. Validation responses include representative rejected rows; source CSVs are not rewritten.
- **Port 5173 in use:** reuse the existing frontend server or stop it yourself before starting another. The dev command fails on a conflicting port rather than silently using a CORS-incompatible origin.
- **Interrupted job:** restart marks a previously Running job Failed. Upload again or call its `/run` endpoint. Source copies are retained.
- **Slow first load:** this local adapter retrieves a complete result snapshot for client-side registry filtering; investigations use paginated requests. This is verified at 10,000 beneficiaries, not production scale.
- **Missing CL-017 route:** supplied CL-017 is an offline evaluation label. The engine independently discovered `CLU-af7bca6c2c32` in the main dataset (16 members, ₹8,20,000). The UI uses computed IDs and does not feed evaluation labels into detection.

See `docs/integration/INTEGRATION_REPORT.md`, `docs/integration/FEATURE_GAP_REPORT.md`, and `docs/testing/TEST_REPORT.md` for implementation details and measured limitations.


## V2 auditor workflow

Settings → Initialize supplied dataset can create/reuse a sample or main audit without generating data. For independent uploads use New Audit. Analysis History preserves separate runs and offers Ready/Failed job retries. The selected audit scopes the priority queue, clusters, anomalies, cases, graphs, events and reports.

Priority Review Queue and the beneficiary directory use server pagination and compound filters. Open a beneficiary for source references, applications, account transactions, identity candidates, evidence and related case/graph links. Transaction Anomalies includes zero-contribution contextual cycles as well as review findings. Investigation assignment and verification actions are demo-only, internal workflow changes. Reports → Generate and archive report persists a JSON snapshot; download its JSON or CSV case register. Browser print is an unsigned local output.

Detection Evaluation shows recorded offline synthetic results. On the 10,000-record regression set, V2 reduced 2,074 false positives to zero with 99.36% recall; seven positives remain missed. This does not establish real-world accuracy. The legacy backend collector fixture loses four low-proportion records. See docs/testing/DETECTION_EVALUATION_REPORT.md.

V2 adds tables/indexes automatically at startup without replacing existing audits. Old V1 results remain unchanged; initialize a new supplied audit or deliberately rerun through the API for V2 materialized metadata. Use a single backend worker. Interrupted jobs are marked Failed and can be retried; there is no durable queue or cancellation. Optional XLSX/PDF/OCR ingestion is not implemented.

Upgrade details: docs/integration/UPGRADE_REPORT.md, docs/integration/FEATURE_PARITY_MATRIX.md, docs/api/API_CONTRACT.md, docs/testing/DETECTION_EVALUATION_REPORT.md, docs/testing/PERFORMANCE_REPORT.md and docs/testing/TEST_REPORT.md. Executed test/evaluation evidence is in v2-results/. The original integration reports remain historical baselines.

## Reorganized source layout

- `GrantLens Frontend/src/app/`: composition, router and providers.
- `GrantLens Frontend/src/pages/`: one directory per implemented page.
- `GrantLens Frontend/src/components/`: common, layout, tables and graphs.
- `GrantLens Frontend/src/services/api/`: HTTP client, contracts, adapters and V2 endpoints; `services/mock/`: explicit fixtures.
- `grantlens-backend/app/api/`: routers, request helpers and errors; `models.py`: table definitions; `db.py`: sessions and persistence.
- `grantlens-backend/app/services/`: unchanged forensic modules plus the extracted job runner.
- `Synthetic Scholarship Dataset/grantlens-dataset/`: unchanged dataset release.
- `docs/`: architecture, API, dataset, integration and testing documentation.
- `integration-results/`, `v2-results/`, `refactor-results/`: historical and current executed evidence.

See [architecture](docs/architecture/PROJECT_ARCHITECTURE.md), [module map](docs/architecture/MODULE_MAP.md), [actual source tree](FINAL_FOLDER_TREE.md), [structure audit](STRUCTURE_AUDIT.md) and [refactor report](REFACTOR_REPORT.md).

Existing startup commands and ports above are unchanged. With dependencies already installed, use two terminals from the parent directory:

```sh
(cd grantlens-backend && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000)
```

```sh
(cd "GrantLens Frontend" && npm run dev -- --port 5173)
```

Refactor regression (reads supplied sample/main, never persists or regenerates them):

```sh
(cd grantlens-backend && PYTHONHASHSEED=0 .venv/bin/python -m scripts.verify_structure)
(cd "GrantLens Frontend" && npm test && npm run typecheck && npm run build)
```
