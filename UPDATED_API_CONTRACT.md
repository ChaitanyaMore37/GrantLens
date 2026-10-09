# Integrated API contract

Base: `http://127.0.0.1:8000/api/v1`. Current machine-readable schema: `integration-results/openapi.json`, or live `/openapi.json`. Currency is numeric INR rupees. Dates retain source timezones. Error envelope: `{ "error": { "code": "...", "message": "...", "details": ... } }`.

## Audit lifecycle

| Method / path | Request | Response |
|---|---|---|
| GET `/health` | none | `{status:"ok",version:"1.0.0"}` |
| GET `/config` | none | engine settings and risk thresholds |
| GET `/audits` | none | array of `{audit_id,status,created_at,summary}` newest first |
| POST `/audits/upload` | multipart fields `beneficiaries`, `applications`, `transactions`; optional all four `institutions`, `accounts`, `scheme_rules`, `account_authorizations` | 201 `{audit_id,status:"Ready",summary:{accepted_counts,errors,warnings,rejected_rows}}` |
| POST `/audits/{id}/run` | no body | 202 `{audit_id,status:"Running",summary:{}}`; 409 if another audit is running |
| GET `/audits/{id}/status` | none | `{audit_id,status,summary}`; failed summary includes `error` |
| GET `/audits/{id}/summary` | completed audit | raw engine totals, risk distribution, safeguards, linkage and validation statistics |
| GET `/dataset/sample/{filename}` | allowlisted primary CSV filename | existing 1,000-beneficiary sample CSV |
| POST `/demo/seed` | `{count:300..50000,seed:17}` | legacy generator, retained but unused by integrated normal workflow |

Upload: 50 MiB backend limit per file; browser primary-file preview limit is 10 MB. Missing/inconsistent CSV data returns 422. Ground-truth fields are never accepted as detection inputs. Uploads are copied under `data/audits/{id}`. Legacy transaction types TRANSFER/DISBURSEMENT and supplied ACCOUNT_TRANSFER/DBT_DISBURSEMENT normalize to the former, preserving original records. Application status casing normalizes; zero awards are valid for unapproved claims.

## Detection and investigation resources

Always pass `audit_id` in the frontend. Legacy endpoints may default to newest completed audit; the integrated client does not rely on that default.

| GET path | Other query parameters / response |
|---|---|
| `/beneficiaries` | `offset=0`, `limit=50` (max 200), `risk_level`, `q`; Page envelope |
| `/beneficiaries/{id}` | masked original-domain record, `risk_score`, `risk_level`, `evidence`, applications |
| `/beneficiaries/{id}/matches` | offset/limit; Page of first/second beneficiary IDs, match_score, matching/conflicting attributes, confidence |
| `/clusters` | offset/limit, risk_level; Page of computed Louvain clusters |
| `/clusters/{id}` | cluster_id, beneficiary_ids, related_account_ids, total_disbursed, risk_score, evidence, score_method |
| `/clusters/{id}/graph` | limit max 500; also accepts standalone CASE-BEN-* IDs for their actual graph context |
| `/graph/neighbors` | node_id, hops 1..3, limit max 500 |
| `/graph/path` | source, target, max_hops 1..6, limit max 500; 404 when no path within bound |
| `/cases` | status, offset, limit max 200; database-paginated Page |
| `/cases/{id}` | case_id, beneficiary_ids, risk_score, risk_level, status, notes, evidence |
| `/cases/{id}/report` | case detail plus generated_at, related cycles and notice |

Page: `{items:[...],total,offset,limit}`. PATCH `/cases/{id}?audit_id=...` accepts `{status?,note?}`. Status values: `Needs Review`, `In Investigation`, `Verification Requested`, `Cleared`. Notes: 1–4000 characters, appended with UTC `created_at`. No external verification message is sent.

Graph: `{nodes:[{data:{id,type,label,risk_score}}],edges:[{data:{id,source,target,relationship,source_record_ids,...}}],truncated}`. BANK_ACCOUNT IDs are stable hashed tokens. TRANSFER edges serialize each actual transaction in its original direction, with amount and timestamp. Other graph relationships are undirected associations. Graph traversal is bounded; truncation is explicit.

## Narrow UI adapters

GET `/ui/results?audit_id=ID` returns one immutable-detection snapshot:

- `beneficiaries`: `{id,name,district,institution,scheme,account,phone,address,score,clusterId,sourceId,evidence}`. Account/phone display values are masked. Scheme is a comma-separated display list; no review case is represented by empty clusterId.
- `applications`: `{id,beneficiaryId,scheme,academicYear,amount,status}`.
- `transactions`: `{id,beneficiaryId,scheme,source,target,amount,date,reference}`. Only disbursements have beneficiaryId/scheme, attributed through application_id; transfers have null beneficiaryId.
- `clusters`: computed Louvain review groups `{id,name,beneficiaryIds,district,scheme,score,accountIds,identityMatches,transactionPatterns,amount,indicator,evidence,batch}`.
- `reviewCases`: standalone flagged records mapped to the same detail-view shape, kept separate from cluster counts.

Cluster evidence in this projection belongs to the highest-scoring member. `min(100,sum(contributions))` equals its score. The raw API preserves every member's evidence. No synthetic UI score is substituted.

GET `/ui/summary?audit_id=ID&scheme=&district=&batch=&period=` returns `{beneficiaries,payments,clusters,underReview,investigations,duplicates,monthly,distribution,anomalies}`. Monthly bins are actual YYYY-MM values. Risk bands: Low <30, Medium 30–59, High 60–79, Critical >=80. Scheme filtering selects matching beneficiary records and matching scheme payments. Period is an optional date prefix; the integrated UI currently offers all dataset dates. Under-review totals deduplicate beneficiaries belonging to uncleared cases. Community membership itself is not evidence.

## Frontend integration

`src/services/api.ts` centralizes URL configuration, multipart requests, explicit audit scoping, response mappings, pagination for cases/matches, and errors. The snapshot supplies client-side beneficiary/cluster filtering and pagination at the verified 10,000-record scale. Selecting a different audit reloads the application, resetting all query caches. Case mutations refresh case/summary queries; detection snapshots remain immutable until reload or rerun. Graph types map to the existing Cytoscape styles; missing coordinates use the built-in cose layout. Mock mode requires explicit `VITE_DATA_SOURCE=mock` and never acts as an error fallback.
