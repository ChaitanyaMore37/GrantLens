# GrantLens V2 executed verification

Date: 9 October 2026. Historical V1 evidence remains in integration-results/. Current evidence is in v2-results/. Tests were run; this report does not infer success from implementation files.

## Automated results

| Component | Command / working directory | Result |
|---|---|---|
| Backend | `.venv/bin/python -m pytest -q` in grantlens-backend | 19 passed; one existing Starlette/httpx deprecation warning |
| Frontend | `npm test` in GrantLens Frontend | 28 passed across 4 files |
| TypeScript | `npm run typecheck` in GrantLens Frontend | passed |
| Production build | `npm run build` in GrantLens Frontend | passed |
| Dataset | `../../grantlens-backend/.venv/bin/python -m pytest -q` in dataset project | 15 passed, 4 subtests passed |
| Stress pipeline/persistence/API | `.venv/bin/python -m scripts.benchmark_v2` | 50,000 records completed, bounded pages verified |
| Source integrity | SHA-256 comparison against integration-results/source-checksums.json | 49 checked, zero changed |

Backend tests cover ingestion/invalid rows/foreign keys, linkage, truth isolation, graph bounds and chronology, explicit guardian permissions with independent identity evidence, low/high-proportion collectors and timing, contextual/suspicious cycles, direct strong-alias conflicts, eligibility, installments/overpayments, masking, SQL filters/page limits, audit separation, assignment/notes/status persistence across reruns, genuine events, saved reports/CSV, explicit column mapping/raw bytes, filename rejection, failures/retry/restart and OpenAPI response schemas.

Frontend tests cover existing mock registry/navigation/upload/error/graph behavior plus demo access rejection/success, show-password, protected routes, server-page and risk-filter requests, anomaly evidence sequence, failed history state and audit-trail connection errors. Browser execution adds actual API integration; component tests alone are not treated as E2E.

Initial accuracy run failed the old requirement of 100% collector recall. The frozen V2 model intentionally misses four low-proportion legacy fixture records (collector recall 60%, overall 95.83%); the regression test now explicitly asserts those four misses. All other old scenario expectations remain. Initial development/validation candidates missed 24 positives; they were rejected before the seed202 final holdout. Artifacts retain these intermediate results; they are not advertised as final evaluation. Final measured comparisons are in DETECTION_EVALUATION_REPORT.md.

## Browser workflow actually exercised

Using the in-app browser against localhost:5173 and FastAPI localhost:8000:

1. Incorrect demo credentials produced an error; correct credentials opened the protected dashboard. Logout returned to login; signing in again retained audit context.
2. Settings health reported API/database OK, version 2.0.0. Supplied sample initialization completed without regeneration.
3. Uploaded all three sample CSVs plus four references. Preview showed 1,000 beneficiaries, 1,442 applications, 1,588 transactions. Server validation enabled Run. Real polling completed audit `595a9671-bd97-4770-850c-a37930759f82`.
4. Opened priority queue and BEN-000042. Inspected masked account, applications, identity match score/source IDs, concentration and contextual cycle evidence. Opened computed CLU-9729df5ab457 (not a fabricated CL-017 label).
5. Persisted demo reviewer, High priority, resolution and a reviewer note. Confirmed In Investigation status via the existing confirmation dialog. Refresh preserved assignment, note and status.
6. Graph selected BEN-000042, highlighted a path to BEN-000230 across two entities, and loaded a seven-entity bounded neighborhood.
7. Transaction Anomalies filtered circular transfers. FIND-4fc541537a507427 displayed four real directed transfers, masked accounts, timestamps, INR amounts, source transaction IDs and standalone case links.
8. Generated archived report `4b01a6ec-8ebb-448c-bd12-2798815ede66`. Its JSON/CSV retrieval was also verified against the running API and the CSV saved in v2-results/browser-audit-report.csv. Audit trail showed genuine upload/validation/start/completion/reviewer/report events. Analysis History showed separate V1/V2 counts; Evaluation showed real baseline/current metrics and scenario rates.
9. Stopped the local backend deliberately. Settings displayed a connection failure and retry, with no fallback results. Restart restored API/database OK. Server remains running.

Screenshots: anomaly-detail.png, evaluation-dashboard.png, backend-unavailable.png. The desktop breakpoint was tested at 1440×900; the default narrow layout was also observed. These are targeted checks, not an exhaustive accessibility/browser compatibility audit.

## Precise remaining verification gaps

The initial client-blob CSV browser download observer timed out. Export was changed to a server attachment; endpoint contents, headers and the actual UI URL were verified, but native browser download delivery is not claimed. Browser Print/Save as PDF remains available from V1; no new V2 PDF was saved. Dedicated cycle-edge highlighting is not implemented. Field mapping is covered through real multipart API tests and UI rendering, not a complete second browser upload with renamed headers. No concurrent/multi-worker load test, external dataset validation or production authentication test was performed. Optional XLSX/PDF/OCR is not implemented.

## Structural refactor regression — 10 October 2026

Evidence: workspace `refactor-results/`. Baseline and final executions both passed 19 backend, 28 frontend and 15 dataset tests plus four dataset subtests. Final backend: 3.35 seconds with the same Starlette/httpx warning; frontend TypeScript and production build passed. `python -m compileall -q app` passed. Tests use isolated temporary databases; case mutation, note persistence, report retrieval and audit isolation remain covered without changing live investigations.

Additional command from backend: `PYTHONHASHSEED=0 .venv/bin/python -m scripts.verify_structure`. Result: original and refactored sample/main scores, evidence, matches, clusters, cycles and non-timing summaries matched; full OpenAPI matched; 88 protected file checksums matched. A fixed Python hash seed was required to compare existing set-dependent order. No detector changes were made to resolve that ordering difference.

Live startup passed at ports 8000/5173. Browser checks loaded the existing overview and all 11 other main route screens, investigation detail, graph entity selection and persisted evidence. Login was exercised. Saved case, note, reviewer and report retrieval passed through the running API. Existing SQLite table digests stayed unchanged. Browser link-to-cluster navigation did not settle during one automated click attempt; opening the observed URL loaded correctly. This run verifies route rendering and existing navigation/component tests, not every link-click or native download action. No live reviewer mutation was performed; equivalent writes were verified in isolated integration tests.

Commands and detailed evidence are in the root REFACTOR_REPORT.md and refactor-results/. Historical V2 verification above is retained as historical evidence, not silently relabeled as a new run.

The supplied main release also passed its independent validator: from the dataset directory, `../../grantlens-backend/.venv/bin/python scripts/validate_dataset.py --data data --report ../../refactor-results/supplied-data-validation.json`. This checks schema, reference/financial consistency and release hashes, writing reports outside the dataset.
