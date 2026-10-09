# GrantLens V2 upgrade report

## Delivered and preserved

The three original projects remain separate. Existing React styling, Vite, FastAPI, SQLite, linkage, NetworkX communities, Cytoscape graphs, CSV contracts, notes/status, browser printing and legacy APIs remain. All 49 files in the original dataset checksum manifest are unchanged, including ground truth. The pre-upgrade checkpoint is tag `v1-integration-checkpoint-20261009`; the accuracy checkpoint is `bfbd4e8`.

Milestone A: revised evidence safeguards, cross-alias award checks, reference-based eligibility and overpayment checks, descriptive community context, independent seeded evaluation and preserved V1 scoring. See ../testing/DETECTION_EVALUATION_REPORT.md for measured results and the known four-record legacy collector recall regression.

Milestones B/C: Transaction Anomalies, Priority Review Queue, Analysis History, Audit Trail, Detection Evaluation; demo login/logout; persisted reviewer assignment, priority and resolution; supplied dataset initialization; health diagnostics; explicit header mapping with raw-byte preservation; separate server validation before analysis. Reviewer changes remain internal, demo-only actions.

Milestone D: SQL pagination/filtering for the beneficiary and cluster registries and new screens; bounded graph neighborhood loading; real processing stages and start/completion timestamps; failed-job restart handling; archived JSON report snapshots and server CSV exports; 50,000-record pipeline/persistence/query benchmark.

## Implementation and storage

Backend changes: app/core.py, db.py, main.py, schemas.py, services/risk.py, pipeline.py, ingestion.py; updated OpenAPI; scripts/evaluate_v2.py, baseline_risk_v1.py, benchmark_v2.py; focused API/risk/recovery tests. Frontend changes: routes/layout, centralized API client/types, new Login/Intelligence/ServerClusterTable modules, upload, graph, case, report and settings workflows, component tests.

Additive SQLite `audit_events` table stores genuine timestamped events with audit/case references and a demo actor. An index covers Record audit/kind/risk/id. Existing JSON payloads gain source rows, schemes, disbursement totals, cluster/case links, workflow metadata and anomalies. Reports are stored as `Record(kind='report')` snapshots and survive reruns. Existing audit rows and reviewer notes are preserved. No destructive migration or data replacement is performed.

New endpoint details are in ../api/API_CONTRACT.md and grantlens-backend/openapi.json. Operational results remain scoped by audit_id; evaluation files are read only by the offline-results endpoint. Sensitive-style accounts/phones remain masked. Upload filenames are checked and never used as arbitrary destination paths.

## Verified workflow

Browser sample initialization and a separate upload completed. Uploaded audit `595a9671-bd97-4770-850c-a37930759f82` contains 1,000 beneficiaries. BEN-000042 evidence and CLU-9729df5ab457 were inspected; a note, demo assignment, priority, resolution and investigation status persisted after refresh. A two-node path highlighted and progressive exploration loaded seven entities. A four-leg suspicious cycle displayed actual masked transfers and source transaction IDs. Report `4b01a6ec-8ebb-448c-bd12-2798815ede66` was generated, archived and retrieved through live JSON/CSV APIs. History, trail, evaluation and outage/recovery were inspected. Login rejection, login and logout were browser-tested.

## Remaining limitations / partial scope

- This is frontend demo access, not API authentication. There are no real reviewer identities, messages, signatures or government certification.
- One process and one worker remain required. Ready/Running/Completed/Failed are retained for compatibility; there is no durable queue or cancellation. Restart marks interrupted jobs failed. Initialization deduplicates normal sequential requests; concurrent initialization is not protected by a database uniqueness constraint.
- Registry tables are server-paged, but legacy overview/detail/report projections and some graph inspectors still load audit snapshots. Pipeline/persistence reached about 1.88 GiB peak RSS at 50,000 records. This is not a low-memory or multi-user production architecture.
- Existing V1 audits keep their old results. New anomaly/provenance fields require a new V2 audit or deliberate API rerun. New V2 features do not silently fabricate missing historical events.
- Cycle detail shows directed sequences and case graph links; dedicated cycle-edge highlighting is not implemented. Generic graph paths represent entity connections, not proof of traced money flow.
- Mapping is explicit CSV header mapping only. No value conversion, arbitrary document extraction or automatic data repair. Uploaded failed-validation files remain local for inspection; there is no cleanup UI.
- Reports are local snapshots, not tamper-proof archives. Browser print remains available, but a new PDF file was not generated in this V2 verification. The browser download observer timed out on the initial client-blob CSV attempt; CSV was then moved to a server attachment and its contents/headers were verified through tests and live HTTP. Native browser download delivery remains unverified.
- Optional XLSX/PDF/OCR ingestion and production roles are not implemented. They were deferred to preserve the mandatory CSV workflow.
- Synthetic seed independence is not distribution independence; zero measured false positives must not be advertised as real-world precision. See the evaluation report for missed records and heuristic weaknesses.
