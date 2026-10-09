# GrantLens V2 API contract

Base: `http://127.0.0.1:8000/api/v1`. Interactive schema: `/docs`; committed full schema: `grantlens-backend/openapi.json`. Existing V1 endpoints remain; prior details are in UPDATED_API_CONTRACT.md and grantlens-backend/API_CONTRACT.md.

All operational V2 read APIs require audit_id (except history and evaluation). Missing audits return 404; incomplete audits return 409 where completed data is required. Invalid parameters return 422. Account and phone values are masked; raw originals are excluded. Frontend demo login does not authenticate API requests.

| Method/path | Inputs | Response / behavior |
|---|---|---|
| GET /review-queue | audit_id, q, risk_level, district, scheme, cluster_id, case_status, sort=risk/amount/name/id, offset>=0, limit=1..200 | ReviewPage: items,total,offset,limit. Stable ID tie-break; SQL filtering. Includes source_file/source_row, schemes, total_disbursed, cluster_id, case_id and evidence. |
| GET /clusters | audit_id, q, risk_level, district, scheme, status, sort=risk/amount/size, minimum/maximum=0..100, offset, limit<=200 | Existing Page, SQL filtering and stable sort; adds mean_member_score, flagged_member_fraction, independent_indicator_count and review status. |
| GET /beneficiaries/{id}/transactions | audit_id, offset, limit<=200 | Page of masked source-account transactions. Shared-account ownership is uncertain; not all account transfers are individually attributable. |
| GET /anomalies | audit_id, q, kind, offset, limit<=200 | FindingPage of persisted circular_transfer/collector/payout_concentration/overpayment evidence. Context-only findings have zero contribution. |
| GET /anomalies/{id} | audit_id | FinancialFinding with transactions, beneficiaries, related hashed accounts, source IDs, case IDs, gross transfer-leg amount and assessment. |
| GET /history | q, status, sort=newest/oldest, offset, limit<=200 | HistoryPage of separate audit metadata and summaries. |
| GET /events | audit_id, event_type, offset, limit<=200 | EventPage: id,time,type,audit,case,actor,summary. New genuine events only; not immutable. |
| GET /evaluations | none | EvaluationResponse of four saved offline benchmark runs; synthetic labels never enter the operational pipeline. |
| POST /demo/initialize | JSON dataset: sample/main | AuditResponse; validates supplied files, reuses existing audit for the same supplied directory. Does not regenerate data or automatically rerun completed results. |
| POST /reports | audit_id query | 201 ReportSnapshot with audit/version/configuration/validation, cases/evidence/notes, anomalies, generation timestamp, methodology and limitations. Persisted atomically with generation event. |
| GET /reports | audit_id, offset, limit<=100 | Page of archive metadata. |
| GET /reports/{id} | audit_id | ReportSnapshot; cannot retrieve another audit's report. |
| GET /reports/{id}/csv | audit_id | text/csv attachment: archived case register, audit ID and generation time. Quoted CSV with formula-leading cells escaped. |
| PATCH /cases/{id} | audit_id; JSON status/note/assigned_reviewer/priority/resolution | Existing CaseDetail with optional metadata; priority Normal/High/Urgent; reviewer <=100 chars, resolution <=2000, note <=4000. Status Needs Review/In Investigation/Verification Requested/Cleared. Changes persist and generate events. |

## Upload / mapping

POST /audits/upload retains multipart beneficiaries/applications/transactions and optional four reference CSV files supplied together. Plain CSV filenames only; 50 MiB backend limit per file, 10 MiB browser preview limit. Reference and foreign-key validation remain mandatory when references are supplied.

Optional multipart `column_mapping` is a JSON string matching `ColumnMappings`: `{"tables":{"beneficiaries":{"full_name":"applicant_name"}}}`. Keys are canonical fields; values are uploaded source headers. Unknown tables/fields, missing mapped sources, duplicate target headers and ambiguous mappings are rejected. Only headers change. Original uploaded bytes are preserved under the audit's raw/ directory and mapping metadata is saved. Values and row order remain unchanged. Source file and row references are retained. Validation errors exclude raw personal-style values and report source rows where available.

UI now uploads/validates first, displays backend findings, and enables Run only for a Ready/Failed job. Run uses the existing background task and lock. Status summaries contain stage, started_at, completed_at, validation, detector_version/configuration and real processing_seconds; no invented progress percentages. There is no cancellation endpoint or persistent queue.

## Compatibility / limits

Old audits retain old outputs and may lack V2 metadata. Legacy /ui/results remains for existing detailed views, while new registries use bounded pages. Evaluation and report JSON payloads have flexible nested evidence/configuration objects; scalar and top-level response models are in schemas.py. Report CSV is explicitly documented as text/csv rather than a JSON model.
