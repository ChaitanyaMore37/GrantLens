# Integration test report

Executed 2026-10-09 on the local workspace. Results below are observed; raw logs are retained in `integration-results/`.

## Automated checks

| Check | Result | Evidence |
|---|---|---|
| Backend pytest | 12 passed | backend-tests.txt |
| Frontend Vitest | 23 passed, 3 files | frontend-tests.txt |
| TypeScript + Vite production build | Passed | frontend-build.txt |
| Dataset unittest suite | 15 passed | dataset-tests.txt |
| Supplied full dataset independent validator | PASS | dataset-validation.json / .txt |
| All supplied data-file SHA-256 checks | 49 checked, 0 changed | source-integrity.json |
| Live HTTP sample then main workflow | Passed | api-workflow.json, sample-results.json, main-results.json |

The dataset unit suite creates temporary test fixtures; it did not replace the supplied release. The independent validator reads labels to validate the release in a separate process; those labels never enter the forensic engine.

Backend tests include source-schema normalization, unchanged-original retention, invalid reference rejection, directed graph transfer consistency, money totals, matched identities, bounded graph paths, score contributions, API errors, case actions, rerun persistence, UI projection consistency, scheme-filtered payment counts and separate audit scopes. Frontend checks cover mock regression behavior, graph consistency, controls, validation, HTTP error handling, typed mapping, scoped requests and case status mappings.

One dependency warning remains: the installed Starlette TestClient deprecates its httpx integration. All tests passed; no warning was suppressed. Early checks found a TypeScript enum-narrowing error and three outdated frontend test expectations; those were corrected to the actual API/risk contract before the final passing run.

## Live workflow

A real uvicorn server accepted the supplied 1,000-record sample and then 10,000-record main dataset through multipart HTTP, including all four references. Each completed through the real pipeline. Assertions checked source financial totals, disbursement counts, risk distributions, monthly counts, capped score contributions, graph endpoints/directions, beneficiary details, paths, notes/status, report output and CORS. After the main audit completed, an explicit request for the sample still returned 1,000 records.

Browser verification used the running React app:

1. Observed main dashboard: 10,000 beneficiaries, 13,500 scholarship payments, 251 detected clusters, 171 identity links.
2. Opened `CLU-af7bca6c2c32`: 16 beneficiaries, 2 payout accounts, INR 820,000, 29 displayed graph nodes and real transfer relationships.
3. Selected BEN-000955: source IDs, two real disbursements and 35/40/45 risk contributions appeared, capped at 100.
4. Selected its bank account: masked account, connected entities and actual ledger transfer amounts/timestamps appeared.
5. Started an investigation, confirmed the action, saved a marked local reviewer note; report subsequently displayed both the status and note.
6. Uploaded all three sample primary files and four references in React. Schema preview showed 1,000 / 1,442 / 1,588 rows. Real pipeline completed; View results selected the new sample audit.
7. Report showed that sample's 1,000 beneficiaries, 1,350 payments and 24 clusters. Switching Reports to the main audit restored 10,000 / 13,500 / 251 and the main note.
8. Opened beneficiary BEN-003291: actual approved and rejected applications, INR 43,000 disbursement, masked account and two backend identity matches (92 and 85) appeared.

9. Verified standalone CASE-BEN-* investigations display actual score 40 (Medium) and “No notes,” then selected a beneficiary and highlighted its bank-account path in Network Explorer.

Browser evidence: `audit-complete.jpg`, `investigation.jpg`, and the final browser state. The report was viewed; saving a PDF file through the operating-system print dialog was not tested. A report-switch wait initially expired while the large audit loaded; subsequent rendered state verified the correct report with no console errors. Case pagination was then moved into SQL. Initial dependency download and port binding needed the environment's approved network execution path; both succeeded.

## Separate offline evaluation

Predictions were loaded from completed SQLite audits and evaluated in a separate process using `scripts/evaluate_saved.py`.

| Metric | Sample | Main |
|---|---:|---:|
| Identity precision | 100% | 100% |
| Identity recall | 100% | 90.96% |
| Flagged-record precision | 37.24% | 34.43% |
| Flagged-record recall | 100% | 99.36% |
| False positives | 209 | 2,074 |
| False negatives | 0 | 7 |
| False-positive rate | 23.86% | 23.29% |

Ring-surfacing recall was 100% under the existing definition “at least half of labeled members flagged”; this is not exact community recovery or perfect detection. No scores were adjusted to match UI fixtures. The main engine time was approximately 1.02 seconds, excluding upload, database persistence and UI loading; this is not an end-to-end performance guarantee.

## Not tested / remaining limitations

The 50,000-record stress run, production deployment, multiple server workers, external real-world records, cross-browser matrix and actual PDF-file saving were not tested. UI registries still retrieve a whole result snapshot before client pagination. Precision and rule gaps are documented in `FEATURE_GAP_REPORT.md`.
