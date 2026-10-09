# Feature gap report

## Working

All eight requested screens consume the selected audit's real output. CSV upload accepts the three primary tables and four optional, all-or-none references. Validation, normalization, fuzzy/phonetic linkage, weighted projection, Louvain, payout concentration, collection accounts, chronological cycles and rule-based scoring execute in the existing engine. SQLite stores outputs, case statuses and notes. Browser report viewing/printing and case JSON export work. Graph nodes, directed transfer edges, paths, masked accounts, source IDs and member risk contributions use detector output. Individual flagged records without a Louvain cluster remain accessible as `CASE-BEN-*` investigations, with their actual scores.

## Partial functionality and priorities

| Priority | Area | Current limitation / suggested next step |
|---|---|---|
| 1 | Detector precision | Main dataset: 2,074 false positives, 34.43% flagged-record precision, 99.36% recall. Collector and cycle heuristics flag legitimate controls. Evaluate ordinary evidence safeguards and calibrate on separate fixtures before operational use. No thresholds or truth labels were tuned for this integration. |
| 1 | Reference use | All four reference tables are validated and persisted. Institutions label records and scheme exclusivity groups drive the existing conflict check. Guardian permissions are not used to suppress risk; enrollment anomalies have no dedicated rule. |
| 1 | Cross-alias scheme claims | Conflict scoring checks a beneficiary/year. It does not resolve exclusive awards across all tentative identity aliases or detect repeated same-scheme awards. |
| 2 | Registry scale | Beneficiary/cluster filtering, sorting and visible pagination run in React after one complete, audit-scoped result snapshot. Cases and match retrieval use server pages. Move registries to server-side compound filtering and pagination for larger data. |
| 2 | Graph scope | Views cap at 500 nodes and display truncation. Hop highlighting operates within the displayed graph. Path queries are bounded and undirected relationship exploration; transfer arrows preserve ledger direction. Institution/scheme context can connect broad neighborhoods. |
| 2 | Risk explanations | Cluster score is maximum member score, capped at 100. The case score panel shows the highest-scoring member's contributing evidence; other members' evidence is available by selecting them. Raw case endpoints retain all evidence. Shared account flows are not claims of individual ownership. |
| 2 | Reports | Browser print/Save as PDF and JSON export only. No server-generated signed PDF, report archive, or background report task. Report summary counts all beneficiaries; priority tables list detected clusters, while standalone cases remain in Investigations. |
| 2 | Job management | Single worker, process-local lock, Ready/Running/Completed/Failed states. No stage percentage, queue, cancellation, or automatic polling recovery after navigation. Failed/restarted jobs remain inspectable through the API. |
| 3 | Review workflow | Status and notes persist. Verification requests are local status changes; no messages are sent. No reviewer assignment or identity system. Latest-note timestamps are shown rather than invented update timestamps. |
| 3 | Validation breadth | The supplied release passed its independent financial/chronology validator. API ingestion checks schemas, required values, money, core foreign keys and payout attribution, but is not a general replacement for full ledger reconciliation or reference-policy validation. References are optional for legacy three-file compatibility and produce a warning if absent. |

## Intentionally unavailable

No login/roles, production security deployment, OCR, XLSX import, external bank/government data, automated fraud adjudication, notifications, or new forensic algorithms were introduced. CL-017 remains an evaluation label; computed case IDs are shown in the application. The 50,000-record stress release was preserved but not executed during integration.
