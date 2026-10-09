# GrantLens structural refactor report

Completed 10 October 2026 (work began 9 October). Recovery checkpoint: `bb39ea3`, tag `pre-structure-refactor-20261009`; original V2 source: `22ef2ba`. SQLite backup: `/tmp/grantlens-pre-structure.db` (local only, not committed).

## Implemented organization

- Frontend App composition moved to app/, with dedicated router and provider modules. The existing main.tsx entry and every route URL remain valid.
- Reusable components moved into common/, layout/, tables/ and graphs/. All implemented pages now have individual directories. The five unrelated Intelligence.tsx screens were separated; queue-only beneficiary/evidence helpers remain with PriorityQueue.
- API contract and HTTP error/transport code were extracted from the old combined api.ts; mock implementation/data now live in services/mock/. Vite configuration lives in config/. Currency formatting is reused from the existing identical utility. No duplicate source shims or empty placeholder directories were created.
- Backend main.py now only composes the application. Thirty-five existing HTTP handlers were grouped into seven routers, with shared lookups/masking, error registration and job execution extracted. Table definitions moved to models.py; db.py retains the established public model names, connection/session and persistence behavior.
- The original small algorithm modules, schemas.py and core.py remain cohesive and unchanged. Tests remain in their existing directories because arbitrary subdivision would disrupt shared fixtures without improving this scope.
- Integration/API/test/evaluation/performance documents moved under docs/, preserving historical content. Architecture, module map and dataset-location guidance were added. Root and component READMEs link to the new locations.

Exact frontend and document relocation maps are in refactor-results/frontend-moves.json and document-moves.json. Backend handler grouping is documented in docs/architecture/MODULE_MAP.md. The actual filesystem tree is in FINAL_FOLDER_TREE.md.

## Preserved behavior and state

No feature, scoring threshold, detection algorithm, dataset or ground-truth content was changed. The 88 protected dataset/release/algorithm files retain identical SHA-256 checksums. Global CSS is byte-identical and the built CSS asset hash is unchanged. No database or upload directory was moved. Audit, Record, Case and Event table contents retain their pre-refactor logical digests; no existing audit was rerun. Historical report snapshots, reviewer assignments, notes and statuses remain intact.

API paths, operation IDs and schemas compare exactly against the original OpenAPI contract. Sample (1,000) and main (10,000) pipeline summaries, per-beneficiary scores/evidence, identity matches, clusters and cycles compare exactly with the original code under PYTHONHASHSEED=0, excluding only runtime/throughput. Initial runs without a fixed hash seed differed in set-dependent ordering; that pre-existing nondeterminism was controlled for the comparison, not changed in the detector. Original unseeded comparison artifacts remain for transparency.

## Executed verification

Before and after: 19 backend tests, 28 frontend tests, 15 dataset tests plus four subtests passed. Frontend typecheck/production build and Python import/compile checks passed. One existing Starlette/httpx deprecation warning remains. `scripts.verify_structure` reproduces the protected-file, deterministic result and API-contract checks.

Both servers started on unchanged localhost ports 8000 and 5173. Browser login, overview, beneficiary directory, queue, clusters, cluster detail/graph selection, anomalies, history, trail, evaluation, reports, settings, upload screen and network page were inspected against the existing selected audit. Live API checks verified 1,000 beneficiaries, 18 clusters, the 31-node investigation graph, 19 findings, six saved audits, ten events and four evaluation runs. The saved reviewer and report were retrieved intact. Reviewer mutations/rerun persistence were tested through the existing isolated API tests; existing live investigations were not modified solely for the refactor. Browser route evidence and dashboard screenshot are in refactor-results/.

## Remaining limitations

This does not complete previously partial V2 product features. Frontend demo access is not API authentication; the job lock remains single-process; some legacy adapters still load full snapshots; optional document ingestion and dedicated cycle highlighting remain absent. No new native download/PDF-delivery verification or stress benchmark was needed for file moves. Persisted source paths remain absolute provenance, while executable source paths use workspace-relative resolution. Start the backend from its own directory to preserve its established default SQLite path. Environment variable names, ports and ignore rules are unchanged.

The supplied main release also passed its independent validator: from the dataset directory, `../../grantlens-backend/.venv/bin/python scripts/validate_dataset.py --data data --report ../../refactor-results/supplied-data-validation.json`. This checks schema, reference/financial consistency and release hashes, writing reports outside the dataset.
