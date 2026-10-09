# Module map

Paths below are relative to their component unless prefixed docs/.

| Module | Responsibility / main files | Dependencies | Related endpoints |
|---|---|---|---|
| Frontend application | src/main.tsx, app/App.tsx, app/router/AppRoutes.tsx, app/providers/AppProviders.tsx | React Router, React Query, shared layout | All UI routes |
| Shared presentation | src/components/common, layout, tables, graphs | domain types, utilities, centralized API | Queue, clusters, graph |
| Route pages | src/pages/*/index.tsx | shared components, API services | Existing overview, login, audit, investigation and intelligence routes |
| HTTP transport | src/services/api/client.ts, contracts.ts | config/index.ts, browser fetch | /api/v1/* |
| Audit state and adapters | src/services/api/index.ts, v2.ts | transport, types; explicit mock selection | audit-scoped operational and V2 endpoints |
| Mock fixtures | src/services/mock/api.ts, data.ts | contracts, types, requireItem utility | None; explicit mock mode only |
| Application composition | app/main.py, api/errors.py | FastAPI, db, routers | /docs, /openapi.json |
| System routes | app/api/routes/system.py | config, paths, saved offline artifacts | /health, /config, /dataset/sample/*, /evaluations |
| Audit routes | app/api/routes/audits.py | ingestion, jobs, db | /audits/*, /demo/*, /history, /events |
| Beneficiary routes | app/api/routes/beneficiaries.py | db, shared lookups | /beneficiaries/*, /review-queue, /anomalies/* |
| Cluster routes | app/api/routes/clusters.py | db, presentation adapters | /clusters, /clusters/{id}, /ui/* |
| Graph routes | app/api/routes/graphs.py | graph service, shared lookups, case lookup | /clusters/{id}/graph, /graph/* |
| Investigations | app/api/routes/investigations.py | db, case schemas | /cases/* |
| Reporting | app/api/routes/reports.py | db, masking, snapshot schemas | /reports/* |
| Query helpers | app/api/dependencies.py | db, NetworkX, graph node IDs | Used by routers and job runner |
| Persistence | app/models.py, app/db.py | SQLAlchemy, SQLite | Audit, Record, Case, Event tables |
| Jobs | app/services/jobs.py | pipeline, db, shared lookup/cache | /audits/{id}/run |
| Ingestion | app/services/ingestion.py | pandas, canonical fields | Upload, initialization and pipeline |
| Linkage | app/services/linkage.py | RapidFuzz, Jellyfish, core config | Pipeline and stored matches |
| Graph algorithms | app/services/graphs.py | NetworkX, core config | Pipeline and graph traversal |
| Risk engine | app/services/risk.py, core.py | pandas, graph identifiers | Pipeline; unchanged scores |
| Orchestration | app/services/pipeline.py | ingestion, linkage, graphs, risk | Job and command-line pipeline |
| Evaluation | app/services/evaluation.py, scripts/evaluate_v2.py | results + offline truth | No operational scoring dependency |
| Dataset release | Synthetic Scholarship Dataset/grantlens-dataset | own scripts/config/manifests | Read by ingestion; truth only offline |

Small cohesive files (core.py, schemas.py and algorithm services) retain their names. Tests remain in existing component test directories to preserve fixture imports and dataset-relative references. No empty unit/integration/evaluation directories were created.
