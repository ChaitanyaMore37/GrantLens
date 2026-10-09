# Integration compatibility inspection

All three directories inspected before editing. Projects remain separate.

- React has nine routes and a centralized mock/API service; HTTP paths and payloads are provisional. Upload headers, risk thresholds, account rendering, fixed CL-017 links and report metadata disagree with the engine.
- FastAPI implements ingestion, linkage, weighted projection, Louvain, cycles, scoring, SQLite persistence and case actions. Missing audit listing, transaction listing and UI summary adapters. Requests must explicitly retain audit_id.
- Supplied sample/main contain 1,000/10,000 beneficiaries plus four ordinary reference tables. Primary headers match backend, but DBT_DISBURSEMENT/ACCOUNT_TRANSFER and uppercase statuses need normalization; unapproved zero awards are valid.
- Ground truth uses 1/0 rather than true/false. Evaluation parser needs correction independently of detection. CL-017 is only an evaluation label in this supplied dataset, so detection must expose computed IDs without importing that label.
- Graph serialization currently loses transfer direction in an undirected graph, and the frontend preset layout requires positions. Both need targeted corrections.
- Existing tests cover separately generated fixtures and mock UI only. Python dependencies are incomplete in the system runtime; use a project virtual environment.

Implementation and verification results are appended after execution.

## Completed integration — 2026-10-09

- Existing source directories, branding, styles, charts, tables and Cytoscape views preserved. All edits are targeted integration work; dataset source tree unchanged (49 file hashes checked).
- Ingestion accepts both transaction vocabularies, normalizes status casing, permits zero unapproved awards, checks reference keys, and persists ordinary references. Original rows remain in per-audit storage.
- Existing scheme-conflict logic reads supplied exclusivity groups. Guardian authorizations remain available as ordinary records but do not alter detector scores.
- Existing undirected entity graph remains the exploration graph; each financial transfer now serializes with its actual source, target, timestamp and amount, including opposite-direction transfers between the same accounts.
- Added audit listing, UI result/summary projections, and safe sample CSV downloads. Existing resource contracts remain available. Case pagination now occurs in SQL rather than repeatedly materializing every case.
- Frontend defaults to API mode, maps statuses and graph fields, uses explicit audit IDs, supports ordinary reference uploads, propagates actionable errors, and never substitutes mocks. Audit changes reload the view and caches. Risk thresholds match the backend.
- Dashboard, upload, beneficiaries, clusters, investigation detail, network explorer, investigation register and reports all connect to real results. Standalone flagged cases are distinct from Louvain clusters. Unflagged records display “No review case.” Identity matches come directly from the match endpoint.
- New tests cover supplied schemas, transfer direction, reference rejection, ground-truth isolation, frontend mapping, audit isolation and filtered payment counts. Existing tests also run successfully.

## Actual findings

| Metric | Sample | Main |
|---|---:|---:|
| Beneficiaries | 1,000 | 10,000 |
| Applications | 1,442 | 14,441 |
| Transactions | 1,588 | 15,835 |
| Disbursement records | 1,350 | 13,500 |
| Total disbursed (INR) | 27,324,250 | 279,365,250 |
| Detected Louvain review clusters | 24 | 251 |
| Identity links | 26 | 171 |
| Chronological cycles | 6 | 51 |
| Flagged beneficiaries | 333 | 3,163 |

The main engine independently recovered the 16-member, two-payout-account group as `CLU-af7bca6c2c32`, with INR 820,000 in DBT payments. It has score 100: the maximum member's 35 identity + 40 payout + 45 cycle contributions cap at 100. The corresponding supplied evaluation label is CL-017; it is not a detector input or UI hardcode. The sample's computed group is `CLU-9729df5ab457`.

## Persistence and retained artifacts

API verification created main audit `7671a831-e005-4744-8b9a-584a52da8e8b` and sample audit `99e630d8-9ab7-421d-803e-1b8b945e0604`. Browser upload created sample audit `6f69555a-d8c6-4816-bac8-2d4557333205`. Marked integration-test notes are retained. The main group was left In Investigation after the browser action test. No external messages were sent.

Detailed machine-readable outputs and screenshots are in `integration-results/`. The app is available at http://127.0.0.1:5173 with backend at http://127.0.0.1:8000. The existing frontend process on 5173 was reused; a redundant verification process on 5174 was stopped.

## Remaining blockers and limits

There is no blocker to the verified local audit-to-investigation workflow. This does not make the detector operationally validated: flagged-record precision is 34.43% on the main fixture, with 2,074 false positives. Server-side compound registry pagination, richer rule safeguards, report archiving and production deployment remain gaps. See `FEATURE_GAP_REPORT.md` for priorities. Ground truth and source records were not changed to improve results.
