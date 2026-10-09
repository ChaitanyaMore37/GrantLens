# GrantLens project architecture

The React application, FastAPI backend and synthetic dataset remain separate projects. This is a structural refactor of the existing local prototype, not a feature expansion or detector revision.

## Request and persistence flow

`index.html → src/main.tsx → app/App.tsx → AppProviders + AppRoutes → pages → services/api → FastAPI app.main → api/routes → services + db → SQLite`.

AppProviders owns one React Query client and toast provider. AppRoutes retains all URLs, demo protection and the existing Layout. Shared components are grouped into common, layout, tables and graphs. Each page has its own directory; PriorityQueue retains its tightly coupled beneficiary detail/evidence components. Global CSS is unchanged at styles/global.css. No custom import alias is required.

The API service contract is services/api/contracts.ts. client.ts owns fetch/error handling; index.ts owns audit selection, wire adapters and legacy snapshot caching; v2.ts owns paginated V2 endpoint calls. services/mock contains explicit fixture mode; config/index.ts reads Vite configuration. Shared pure helpers stay in utils. HTTP errors never select mock mode automatically.

FastAPI main.py configures lifespan, CORS, exception handlers and seven routers. api/dependencies.py provides audit-scoped lookups, public masking and the bounded single-audit graph cache. services/jobs.py runs the unchanged pipeline with persisted stage/failure updates and a process-local lock. models.py defines tables and the existing expression index; db.py retains engine/session configuration, initialization and transactional result persistence. Pydantic contracts remain in schemas.py. No database migration or connection-path change occurred.

## Forensic boundary

The unchanged pipeline performs ingestion/validation/normalization, record linkage, graph/projection/community/transfer-cycle construction, and risk scoring. These small services remain at their existing paths, with byte-identical algorithms and detector configuration. Graph construction and community/cycle analysis remain together because they share the same graph inputs; ingestion and validation likewise stay cohesive. Creating empty service packages would not improve those boundaries.

Offline evaluation remains services/evaluation.py plus scripts/evaluate_v2.py. The operational pipeline does not load ground truth. The evaluation HTTP endpoint reads previously saved metric artifacts only. Dataset main/sample/stress layouts and generator-relative paths are unchanged; app/paths.py centralizes source-relative workspace asset lookup used by routers.

## Preserved operating limits

Demo login is browser-only; API authentication is absent. Run one backend worker. No durable job queue or genuine cancellation was added. Some overview/detail/report adapters still read legacy full snapshots. Existing detector and feature limitations remain in the integration and testing documents. Existing database rows and reviewer notes were compared before and after refactoring, not regenerated.
