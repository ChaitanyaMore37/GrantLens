# GrantLens V2 feature parity matrix

PASS denotes the listed behavior was executed, not universal production readiness. Prior checkpoint: `v1-integration-checkpoint-20261009`; accuracy checkpoint: `bfbd4e8`. Detailed limits are in UPGRADE_REPORT.md.

| Feature | Existing implementation / backend service | Frontend route / API | Persistence | Executed coverage | Status | Remaining work |
|---|---|---|---|---|---|---|
| CSV ingestion and references | ingestion.py, upload | /new-audit; /audits/upload | source copies + validation | API, browser sample upload, dataset tests | PASS | Optional formats deferred |
| Explicit header mapping | upload + ColumnMappings | /new-audit; multipart column_mapping | raw bytes + mapping JSON | API rename/raw-byte/unsafe-name test; UI controls rendered | PASS | Value conversions intentionally unsupported |
| Linkage and graph | linkage.py, graphs.py | /network; /graph/* | Record graph/matches | pipeline/API, browser identity/path checks | PASS | External identity verification unavailable |
| Detection safeguards | risk.py | all evidence views | Record risks | focused safeguards + seed202/main/stress evaluation | PASS | Four legacy collector misses; no real-world validation |
| Community context | risk.py + SQL cluster list | /clusters | mean/fraction/indicator type count | API test, browser table | PASS | Not a calibrated community fraud probability |
| Demo login/logout | Login/Protected/sessionStorage | /login | browser tab session | component and browser invalid/login/logout | PASS | API authentication deliberately absent |
| Transaction anomalies | db.persist materialization | /anomalies; /anomalies/{id} | anomaly Records | API + browser directed sequence | PARTIAL | Cycle-edge highlight absent; old audits lack materialization |
| Priority queue / directory | SQL Record filters | /review-queue, /beneficiaries | beneficiary metadata | API paging/filtering + component + browser detail | PASS | Old audits may lack scheme/case/source metadata |
| Analysis history | Audit SQL listing | /history | SQLite audit/status/summary | API isolation/order validation, browser listing | PASS | Concurrent multi-worker execution unsupported |
| Audit trail | Event table and hooks | /audit-trail; /events | SQLite events | API lifecycle/status/notes/report, browser timeline | PASS | Not immutable; historical events not backfilled |
| Evaluation dashboard | saved offline JSON reader | /evaluation; /evaluations | versioned artifacts | API schema/results + browser chart/metrics | PASS | Shared-generator evaluation only |
| Investigation workflow | Case JSON/status/notes | /clusters/:id; PATCH /cases/{id} | SQLite reviewer/priority/resolution/notes | API rerun preservation + browser refresh | PASS | Demo actors; no external verification messages |
| Dataset initialization | ingest supplied paths | /settings; /demo/initialize | new/reused Audit | API dedupe + browser sample completion | PASS | Sequential dedupe only |
| Diagnostics | health/config | /settings | none | API health, browser outage/recovery | PASS | No production security monitoring |
| Registry pagination | SQL queries/index | queue/clusters/history/events/anomalies | SQLite index + payloads | 50k stress, bounded API pages | PARTIAL | Legacy overview/detail/report still use snapshots |
| Job stages/recovery | process/Lock/pipeline callbacks | New Audit/history; /audits/* | stage/timestamps/errors | failed job/retry/restart tests, real browser polling | PARTIAL | Single-worker process-local lock; no durable queue/cancellation |
| Graph progressive exploration | existing Cytoscape + neighbors/path | /network and case graph | bounded cached graph | browser 2-node path and 7-node neighborhood | PARTIAL | Dedicated cycle highlighting absent |
| Reporting/archive | Report Record + CSV | /reports; /reports/{id}, /csv | persisted JSON snapshot | API archive/isolation/rerun + browser create + live retrieval | PARTIAL | Native download delivery and newly printed PDF unverified |
| Optional XLSX/PDF/OCR | none | none | none | none | NOT IMPLEMENTED | Deferred behind core CSV scope |
