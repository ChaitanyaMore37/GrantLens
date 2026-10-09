# GrantLens API contract v1

Base URL: `http://127.0.0.1:8000/api/v1`. Interactive schemas: `/docs`; machine-readable schemas: `/openapi.json` and the checked-in `openapi.json`. JSON request/response unless multipart is specified. No authentication for this local prototype.

## Common conventions

All beneficiaries, clusters, cases and graph queries accept optional `audit_id`. If omitted, the most recently created completed audit is selected. Explicitly supply it in a frontend session. IDs are strings, never array indices. A missing audit/resource is 404; a requested unfinished audit is 409.

List query parameters: `offset` (integer >=0, default 0), `limit` (1–200, default 50). Envelope:

```json
{"items":[],"total":0,"offset":0,"limit":50}
```

Risk levels are `Low`, `Medium`, `High`, `Critical`. Scores are review priorities in [0,100], not probabilities. Investigation statuses are `Needs Review`, `In Investigation`, `Verification Requested`, `Cleared`. Clearing a case is a reviewer decision and does not rewrite the algorithmic score.

Error envelope:

```json
{"error":{"code":"404","message":"Case not found"}}
```

422 validation errors use `validation_error` or `dataset_invalid` plus `details`. Dataset details contain errors, warnings, accepted counts and rejected row information with table/row/record ID and reasons. 413 means an upload exceeded 50 MiB per file; 409 means the audit is unfinished or another job holds the local processing lock; 500 is an unexpected server error. Request validation omits sensitive input values.

## System and audit lifecycle

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | None | `{"status":"ok","version":"1.0.0"}`; checks DB access |
| GET | `/config` | None | Rule thresholds, projection weights, exclusive schemes and score meaning |
| POST | `/demo/seed` | JSON `{"count":10000,"seed":17}`; count 300–50000 | 201 audit envelope, Ready |
| POST | `/audits/upload` | multipart `beneficiaries`, `applications`, `transactions` CSV files | 201 audit envelope with validation summary, Ready |
| POST | `/audits/{audit_id}/run` | No body | 202 audit envelope, Running |
| GET | `/audits/{audit_id}/status` | None | Audit envelope; Ready, Running, Completed or Failed |
| GET | `/audits/{audit_id}/summary` | None | Completed dashboard summary |

Audit envelope example:

```json
{"audit_id":"a3ff9e64-8e91-4660-947d-d18ba05d3d5d","status":"Ready","summary":{}}
```

Processing runs in an in-process background task. Poll status about once per second; on Failed inspect `summary.error`. Run can be retried; prior case statuses and notes persist. One job at a time and one Uvicorn worker are supported. Seeding only creates files; it does not automatically run detection.

Summary includes `beneficiary_count`, `application_count`, `transaction_count`, `identity_match_count`, `suspicious_cluster_count`, `cycle_count`, `risk_distribution`, `flagged_beneficiaries`, `total_disbursed`, `processing_seconds`, `records_per_second`, `graph_nodes`, `graph_edges`, `linkage`, `safeguards`, `validation`, `notice`.

CSV columns are defined in `app/services/ingestion.py::FIELDS` and match generated files. `transactions.application_id` may be blank only for TRANSFER records; DISBURSEMENT requires an existing application. Application beneficiary references must exist. Amounts must be positive, finite and have at most two decimals. Duplicate primary IDs and invalid dates reject the upload. Unknown columns are not detector features.

## Beneficiaries

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/beneficiaries` | audit_id, offset, limit, optional `risk_level`, optional `q` (name or ID substring) | Page of beneficiary records with evidence and masked account/phone |
| GET | `/beneficiaries/{beneficiary_id}` | audit_id | Beneficiary with applications |
| GET | `/beneficiaries/{beneficiary_id}/matches` | audit_id, offset, limit | Page of potential identity matches |

Beneficiary response fields include the ingested columns, normalized dates, `risk_score`, `risk_level`, `evidence`, masked `phone`, masked `bank_account_id`, and stable `bank_account_id_node_id`. Detail additionally includes `applications`. Original raw rows and internal normalization fields are withheld.

Representative evidence:

```json
{
  "indicator":"payout_concentration",
  "contribution":40,
  "explanation":"16 records share one payout account.",
  "related_beneficiary_ids":["BEN-000001","BEN-000002"],
  "related_account_ids":["BANK_ACCOUNT-<stable-hash>"],
  "source_record_ids":["BEN-000001","BEN-000002"]
}
```

The abbreviated related-ID arrays above illustrate structure; actual evidence returns all relevant IDs. Contributions can be zero when overlapping evidence has been suppressed. Sum contributions and cap at 100 only for inspection; frontend should use the returned score.

Match entries contain `first_beneficiary_id`, `second_beneficiary_id`, `match_score`, `name_similarity`, `matching_attributes`, `conflicting_attributes`, `confidence` (`Strong` or `Tentative`), `explanation`, `verified_merge` (always false). Potential matches never merge beneficiary nodes.

## Clusters

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/clusters` | audit_id, offset, limit, optional risk_level | Page, descending risk score |
| GET | `/clusters/{cluster_id}` | audit_id | Cluster detail |
| GET | `/clusters/{cluster_id}/graph` | audit_id, `limit` (1–500, default 200) | Cytoscape graph |

Cluster details include `cluster_id`, `beneficiary_ids`, `size`, `risk_score`, `risk_level`, `score_method`, `related_account_ids`, `account_concentration` (largest account owner fraction), `total_disbursed`, `strong_identity_links`, and `evidence` with each originating beneficiary ID. Cluster IDs are hashes of sorted community members and may change if membership changes. `CL-017` is a case ID, not a cluster ID: fetch its `cluster_ids` through `/cases/CL-017`.

## Graph explorer

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/graph/neighbors` | required `node_id`; audit_id; `hops` 1–3 default 1; `limit` 1–500 default 100 | Bounded neighborhood |
| GET | `/graph/path` | required `source`, `target`; audit_id; `max_hops` 1–6 default 6; `limit` 2–500 default 500 | Shortest path within bounded search |

Path 404 can mean no path within the search budget; it does not establish that no global path exists. The entity explorer is undirected and can traverse institutional context. Financial cycle findings are computed separately on actual directed transfers. Do not infer transfer direction from the explorer edge orientation.

```json
{
  "nodes":[
    {"data":{"id":"BEN-000001","label":"Synthetic Student","type":"BENEFICIARY","risk_score":40}},
    {"data":{"id":"BANK_ACCOUNT-<stable-hash>","label":"••••-017","type":"BANK_ACCOUNT","risk_score":0}}
  ],
  "edges":[
    {"data":{"id":"EDGE-<stable-hash>","source":"BEN-000001","target":"BANK_ACCOUNT-<stable-hash>","relationship":"USES_ACCOUNT","weight":1,"confidence":1.0,"source_record_ids":["BEN-000001"],"supporting_evidence":["bank_account_id"]}}
  ],
  "truncated":false
}
```

Node types: BENEFICIARY, BANK_ACCOUNT, PHONE, ADDRESS, INSTITUTION, SCHEME. Relationships: USES_ACCOUNT, HAS_PHONE, RESIDES_AT, ENROLLED_AT, APPLIED_FOR, POSSIBLE_IDENTITY_MATCH, TRANSFER. Graph API weight 1 denotes an entity relationship, not a Louvain projection weight. Non-beneficiary node risk defaults to zero; it is not a scored assessment of the account itself. `truncated=true` means more graph context exists beyond the response budget.

## Investigations and reports

| Method | Path | Request/query | Response |
|---|---|---|---|
| GET | `/cases` | audit_id, offset, limit, optional `status` | Page of investigation cases |
| GET | `/cases/{case_id}` | audit_id | Case detail |
| PATCH | `/cases/{case_id}` | audit_id; JSON below | Updated case detail |
| GET | `/cases/{case_id}/report` | audit_id | Case plus generated timestamp, cycle evidence and review notice |

```json
{"status":"In Investigation","note":"Verify guardian arrangement with institution."}
```

Both patch fields are optional; note appends to the review log, with a UTC timestamp, maximum 4000 characters. Case detail contains `case_id`, `beneficiary_ids`, `risk_score`, `risk_level`, `evidence`, `status`, `notes` and, where relevant, cluster metadata. Reports are JSON, not PDF. Cycle entries include hashed account IDs, closed `cycle_path`, original transaction IDs, amounts, timestamps, masked sender/receiver values and stable account node IDs.

## React integration

```javascript
const base = 'http://127.0.0.1:8000/api/v1';
const seed = await fetch(`${base}/demo/seed`, {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({count: 10000, seed: 17})
}).then(r => r.json());
await fetch(`${base}/audits/${seed.audit_id}/run`, {method: 'POST'});
// Poll /status until Completed; show Failed errors. Then:
const rows = await fetch(`${base}/beneficiaries?audit_id=${seed.audit_id}&limit=50`).then(r => r.json());
```

Check `response.ok` and display the error envelope in application code. For CSV upload use FormData and let the browser set the multipart boundary. CORS allows `http://localhost:5173` and `http://127.0.0.1:5173`. Send selected audit_id with all data requests. Cytoscape elements are `[...graph.nodes, ...graph.edges]`. Store stable node IDs separately from display labels.

Screen mapping: Overview uses summary; New Audit uses seed/upload/run/status; Beneficiaries uses list/detail/matches; Risk Clusters uses clusters/detail/graph; Network Explorer uses neighbors/path; Investigations uses cases and patch; Reports uses case report. Scores, evidence, relationships and totals are computed by the backend.
