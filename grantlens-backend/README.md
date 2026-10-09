> Integration update (2026-10-09): see [parent README](../README.md) and [updated API contract](../UPDATED_API_CONTRACT.md). The historical documentation below describes the original component; API mode is now the frontend default and the supplied dataset needs no regeneration.

# GrantLens backend

Local Government Scholarship Forensic Intelligence Platform. Python 3.11+, FastAPI, SQLAlchemy/SQLite, NetworkX, RapidFuzz and Jellyfish. No frontend, external service, GPU, trained classifier or authentication is needed.

Every generated identity, institution, scheme and financial identifier is fictional. Phones use a TEST prefix and accounts use SYN to avoid operational identifiers. Names are synthetic Indian-style combinations and may coincidentally resemble real names. No Aadhaar data is generated.

## Windows quick start

Run from this project directory in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m scripts.generate_dataset --count 10000
.\.venv\Scripts\python -m scripts.run_pipeline
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The pipeline prints the audit ID and persists its results. Open [Swagger](http://127.0.0.1:8000/docs) or [health](http://127.0.0.1:8000/api/v1/health). Use one server worker: the local job lock is process-local. Stop the server with Ctrl+C.

In a second PowerShell terminal:

```powershell
$base = 'http://127.0.0.1:8000/api/v1'
Invoke-RestMethod "$base/cases/CL-017"
$clusters = Invoke-RestMethod "$base/clusters"
$clusterId = $clusters.items[0].cluster_id
Invoke-RestMethod "$base/clusters/$clusterId/graph?limit=100"
Invoke-RestMethod "$base/graph/neighbors?node_id=BEN-000001&hops=2&limit=100"
```

Resource endpoints default to the newest completed audit. Always pass `audit_id` from the frontend to keep a selected audit stable. CL-017 is a separate analyst case mapping containing 16 beneficiaries; computed Louvain community IDs are not forced to equal it.

API-only flow: `POST /api/v1/demo/seed` with `{"count":10000,"seed":17}`, then `POST /api/v1/audits/{audit_id}/run`, poll `/status`, then `/summary`. CSV uploads accept three multipart fields: beneficiaries, applications, transactions. All three are required; ground truth is never accepted as a detection input.

## Architecture and files

- `app/services/synthetic.py`: seeded generator, seven injected scenarios, legitimate controls and evaluation labels.
- `app/services/ingestion.py`: CSV adapter, schema/money/date/reference validation, normalization and retained originals. Add XLSX by providing another table reader; detector inputs stay unchanged.
- `app/services/linkage.py`: blocked matching, Levenshtein/token/phonetic/initial signals and corroboration. Links remain tentative; no automatic merges.
- `app/services/graphs.py`: heterogeneous graph, weighted beneficiary projection, Louvain, separate directed transfer graph, bounded cycles and Cytoscape serialization.
- `app/services/risk.py`: explainable rules, per-indicator contributions and overlap suppression.
- `app/services/pipeline.py`: independent command-line/HTTP orchestration; no ground-truth import.
- `app/services/evaluation.py`: offline truth-based metrics only.
- `app/db.py`: SQLAlchemy audit, record and case tables. Normalized records, original evidence, matches, clusters, graph, cycles and scores persist as JSON payloads scoped by audit. Notes and status persist independently of reruns.
- `app/main.py`, `app/schemas.py`: API, request/response contracts, local CORS and error handling.
- `scripts/`: generator, pipeline and benchmark entry points. `tests/`: detection, validation, ground-truth isolation and complete API workflow.
- `API_CONTRACT.md`, `openapi.json`: frontend integration references.

The initial SQLite model favors a compact prototype. A PostgreSQL move can reuse the SQLAlchemy models and JSON payloads, but requires a PostgreSQL driver, migrations and appropriate connection configuration. It is not a deployed production architecture.

## Initial rules and safeguards

`app/core.py` holds the configurable settings. `GET /api/v1/config` returns them. The pipeline accepts a `Settings` instance for experiments.

Identity score: up to 30 name-similarity points, 25 DOB, 20 phone, 10 account, 10 address, 5 phonetic; conflicting DOB subtracts 25. Initial-compatible tokens receive a name score floor of 90. Minimum score is 76, with at least two corroborating attributes; 85 is Strong. Large blocks above 100 are skipped and counted. This trades recall for bounded computation and must be monitored on real datasets.

Projection weights start at account 5, phone 2, address 1, identity 4. Common attributes are downweighted by the square root of group size minus one; groups above 40 are suppressed. Institution and scheme nodes provide graph context but never connect the beneficiary community projection. Address projection uses normalized exact addresses; fuzzy address evidence is used for identity linkage.

Review points: identity 35; payout account shared by at least four records 40; explicit SCH-01/SCH-02 same-year conflict 35; collector receiving subsequent transfers from at least four recipient accounts 40; chronological transfer cycle 45; correlated batch 35. A correlated batch requires same address/institution/day, an hour-long registration window, near-sequential phones and concentrated payout accounts. Overlapping batch/payout evidence contributes only once. Evidence types contribute once per beneficiary. Scores cap at 100; weak shared phone/address alone add no risk points.

Risk bands: Low 0–29; Medium 30–59; High 60–79; Critical 80–100. A cluster's score is the maximum member score, explicitly not a sum of repeated evidence. Louvain communities are not themselves suspicious evidence. Shared guardian accounts with two records remain below the concentration threshold, but large legitimate arrangements can still need review. No verified legitimacy field or automatic exoneration exists.

Cycles use only directed TRANSFER rows, lengths 3–6, chronological legs and at most 500 candidate cycles per considered component, with an overall returned-cycle limit of 500. Components larger than 100 are skipped and reported. The system records one chronological traversal per discovered account cycle, not every possible transaction combination. Collector checks establish sequence and receipt/transfer amount plausibility, not provenance of fungible funds.

Graph endpoints return at most 500 nodes. Bank/phone display values are masked; stable account graph IDs are hashes of internal identifiers. Do not interpret hashing as anonymization. Originals remain in local CSV and SQLite for auditor evidence.

## Validation and storage

Uploads are atomic at the dataset level: invalid rows cause rejection of the whole dataset, with row identifiers and errors. Nothing is silently removed. Rejected input and a full validation report remain under `data/audits/{uuid}` locally; API validation responses omit original row values. There is no automatic retention cleanup. Individual CSVs are limited to 50 MiB and 250,000 rows.

`GRANTLENS_DATA`, `GRANTLENS_DB` and `GRANTLENS_CORS` can be set as environment variables; `.env.example` documents them but is not automatically loaded. Default SQLite path is `data/grantlens.db`. Local API origins include localhost and 127.0.0.1 port 5173. Bind to loopback; no authentication is implemented.

## Tests and measured benchmarks

```powershell
.\.venv\Scripts\python -m pytest -q
.\.venv\Scripts\python -m scripts.benchmark --count 10000
.\.venv\Scripts\python -m scripts.benchmark --count 50000
```

On this Windows/Python 3.11.6 environment, the eight-test suite passed. The environment's sandbox blocked the Windows asyncio local socket pair; API tests passed when run with permission outside the sandbox. A Starlette/httpx deprecation warning remains; it does not fail the tests.

Measured on 2026-10-09, seed 17:

| Beneficiaries | Pipeline seconds | Beneficiaries/sec | Identity P/R/F1 | Suspicious-record P/R | False-positive rate |
|---:|---:|---:|---:|---:|---:|
| 10,000 | 2.5385 | 3,939.28 | 1.0 / 1.0 / 1.0 | 1.0 / 1.0 | 0.0 |
| 50,000 | 22.6328 | 2,209.18 | 1.0 / 1.0 / 1.0 | 1.0 / 1.0 | 0.0 |

Results are saved in `benchmark-results/`. Both contain 96 injected suspicious records, 30 true duplicate pairs and two chronological cycles. Ring recall was 1.0, defined as flagging at least half of each ring's members, not exact recovery of its community. The 10,000-record data contains 13,340 disbursements and 16 downstream transfers.

Timing includes ingestion and forensic processing, excludes generation, database writes and HTTP overhead, and uses beneficiary count as the throughput denominator. These are simple deterministic fixtures tuned for demonstration, not independent or representative validation data. The identical injection count at 50,000 tests background scaling rather than more complex fraud. Perfect fixture metrics do not imply production accuracy.

## Remaining prototype limits

No real authentication, distributed job queue, resumable jobs, verified identity merges, full PDF reports, migrations, encrypted storage or XLSX import. Reports are structured JSON. Jobs interrupted by restart are marked Failed and can be rerun. List filtering currently reads audit-scoped JSON records into memory, so database pagination/index optimization is needed beyond this scale. The graph is persisted and loaded as one audit snapshot even though responses are bounded. Dense-block and cycle safeguards can miss relationships. Synthetic exclusive scheme rules are examples, not Indian policy claims. Analysts must verify potentially suspicious records before taking action.
