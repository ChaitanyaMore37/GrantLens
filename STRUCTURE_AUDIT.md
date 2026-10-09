# Structure audit — 9 October 2026

Baseline: Git commit `22ef2ba`. Working tree was clean before inspection. The three component directories, dataset release archive, historical evaluation artifacts and ignored local environments are present. No AGENTS.md was found. See the existing feature parity matrix for implemented and partial V2 behavior; this refactor adds no product features.

## Existing organization and dependencies

Frontend: `src/main.tsx` mounts `src/App.tsx`; App combines providers and routes. Five shared components are flat under components/. Ten page files include the 809-line Intelligence.tsx combining five unrelated routes. services/api.ts (658 lines) mixes the Api contract, mock behavior, HTTP requests and wire adapters; services/data.ts contains mock records. No import aliases: all local imports are relative. Vite serves index.html, tests use Vitest/jsdom, TypeScript uses Bundler resolution. Global CSS is src/styles.css.

Backend: app.main:app is the Uvicorn entry. main.py (535 lines) combines all endpoints, masking/query helpers, exception handlers and background job execution. db.py (142 lines) combines SQLAlchemy models, connection and persistence. schemas.py is a cohesive 169-line typed contract. core.py is a 41-line detector configuration module. Existing services are cohesive ingestion/normalization/validation, linkage, graphs/community/cycles, risk, pipeline, presentation, synthetic fixtures and offline evaluation; keep these small, coupled algorithms intact. Imports use app.*. Tests use pytest and reload app.db and app.main for isolated temporary databases; the failure test patches main.run and must follow the relocated job runner.

Data: Synthetic Scholarship Dataset/grantlens-dataset contains config/, scripts/, tests/, reports/ and data/. data/main/reference and data/ground_truth belong to the main release; sample/ and stress/ each have their own main/reference and ground_truth directories. Preserve generator paths, manifests, raw CSVs and release archive. Backend data/grantlens.db and data/audits contain existing persisted results and uploads; do not move them. A SQLite online backup is at /tmp/grantlens-pre-structure.db. Checksums for dataset and algorithms and logical database table digests are in refactor-results/.

Configuration: .env.example exists in each application; no local .env files were found and no GRANTLENS_* or VITE_* variables were exported in the inspection shell. Frontend defaults to API localhost:8000/api/v1; mock is explicit. Backend GRANTLENS_DATA/GRANTLENS_DB remain working-directory-relative; startup must cd to backend. GRANTLENS_CORS retains localhost/127.0.0.1:5173. Dependencies (.venv/node_modules), ports and build output stay in place. Source-relative dataset/evaluation paths currently rely on main.py depth and must be centralized before moving handlers. Stored audit directories are absolute provenance and must remain valid.

## Relocation plan

| Existing | Destination / change |
|---|---|
| src/App.tsx | src/app/App.tsx; extract router/AppRoutes.tsx and providers/AppProviders.tsx |
| src/components/{Layout,Common,GraphView,*Table}.tsx | components/{layout,common,graphs,tables}/, same filenames |
| src/pages/*.tsx | pages/<existing page name>/index.tsx |
| pages/Intelligence.tsx | PriorityQueue, TransactionAnomalies, AnalysisHistory, AuditTrail, DetectionEvaluation page directories; retain queue-only detail helpers with queue |
| services/api.ts | services/api/index.ts plus contracts.ts and client.ts; mock implementation to services/mock/api.ts; config to config/index.ts |
| services/data.ts, services/v2.ts | services/mock/data.ts, services/api/v2.ts |
| src/styles.css | src/styles/global.css |
| app/main.py handlers | api/routes/{system,audits,beneficiaries,clusters,graphs,investigations,reports}.py |
| main.py shared helpers and process | api/dependencies.py and services/jobs.py; errors to api/errors.py |
| db.py model classes | models.py; db.py retains connection/session/persistence public API |
| main.py relative dataset roots | paths.py workspace constants independent of router depth |
| Root integration/API/evaluation/performance reports | docs/{integration,api,testing}/; preserve content and update references |

No duplicate implementation shims, unused placeholder folders or aliases will be added. Retain main.tsx, app.main:app, backend schemas/core/services names, tests and dataset paths where moving offers little benefit. Keep current overview/detail API adapters together initially; isolate HTTP transport and mock behavior rather than fragmenting every function.

## Risks and verification

Update all frontend imports, test imports, mocks and stylesheet entry. Preserve route paths, JSX, provider lifetime and CSS content. Maintain backend handler names so generated OpenAPI operation IDs stay stable. Prevent dependencies from importing routers or main. Repoint failure-injection tests to jobs.run without weakening assertions. Compare full OpenAPI and deterministic sample/main pipeline outputs before/after (excluding measured elapsed time/throughput). Run frontend tests/typecheck/build, backend tests, dataset tests, source checksums, SQLite digests and live workflow checks. Never regenerate supplied data or run an existing audit again for this structural task.
