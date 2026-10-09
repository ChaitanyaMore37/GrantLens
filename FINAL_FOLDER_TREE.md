# Actual final folder tree

Generated from the filesystem on 10 October 2026. Excludes .git, .venv, node_modules, caches, dist, OS files, logs and TypeScript build metadata; these were not moved. Existing audit artifact contents are omitted. No proposed or empty placeholder directories are shown.

```text
ChatGPT/
├── docs/
│   ├── api/
│   │   ├── API_CONTRACT.md
│   │   └── UPDATED_API_CONTRACT.md
│   ├── architecture/
│   │   ├── MODULE_MAP.md
│   │   └── PROJECT_ARCHITECTURE.md
│   ├── dataset/
│   │   └── README.md
│   ├── integration/
│   │   ├── FEATURE_GAP_REPORT.md
│   │   ├── FEATURE_PARITY_MATRIX.md
│   │   ├── INTEGRATION_REPORT.md
│   │   └── UPGRADE_REPORT.md
│   └── testing/
│       ├── DETECTION_EVALUATION_REPORT.md
│       ├── PERFORMANCE_REPORT.md
│       └── TEST_REPORT.md
├── GrantLens Frontend/
│   ├── public/
│   │   └── samples/
│   │       ├── applications.csv
│   │       ├── beneficiaries.csv
│   │       └── transactions.csv
│   ├── screenshots/
│   │   ├── audit-complete.jpg
│   │   ├── investigation-desktop.jpg
│   │   ├── overview-desktop.jpg
│   │   └── overview-mobile.jpg
│   ├── src/
│   │   ├── app/
│   │   │   ├── providers/
│   │   │   │   └── AppProviders.tsx
│   │   │   ├── router/
│   │   │   │   └── AppRoutes.tsx
│   │   │   └── App.tsx
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   └── Common.tsx
│   │   │   ├── graphs/
│   │   │   │   └── GraphView.tsx
│   │   │   ├── layout/
│   │   │   │   └── Layout.tsx
│   │   │   └── tables/
│   │   │       ├── ClusterTable.tsx
│   │   │       └── ServerClusterTable.tsx
│   │   ├── config/
│   │   │   └── index.ts
│   │   ├── pages/
│   │   │   ├── AnalysisHistory/
│   │   │   │   └── index.tsx
│   │   │   ├── AuditTrail/
│   │   │   │   └── index.tsx
│   │   │   ├── Beneficiaries/
│   │   │   │   └── index.tsx
│   │   │   ├── ClusterDetail/
│   │   │   │   └── index.tsx
│   │   │   ├── DetectionEvaluation/
│   │   │   │   └── index.tsx
│   │   │   ├── Investigations/
│   │   │   │   └── index.tsx
│   │   │   ├── Login/
│   │   │   │   └── index.tsx
│   │   │   ├── NetworkExplorer/
│   │   │   │   └── index.tsx
│   │   │   ├── NewAudit/
│   │   │   │   └── index.tsx
│   │   │   ├── Overview/
│   │   │   │   └── index.tsx
│   │   │   ├── PriorityQueue/
│   │   │   │   └── index.tsx
│   │   │   ├── Reports/
│   │   │   │   └── index.tsx
│   │   │   ├── Settings/
│   │   │   │   └── index.tsx
│   │   │   └── TransactionAnomalies/
│   │   │       └── index.tsx
│   │   ├── services/
│   │   │   ├── api/
│   │   │   │   ├── client.ts
│   │   │   │   ├── contracts.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── v2.ts
│   │   │   └── mock/
│   │   │       ├── api.ts
│   │   │       └── data.ts
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── index.ts
│   │   │   └── requireItem.ts
│   │   └── main.tsx
│   ├── tests/
│   │   ├── api.test.ts
│   │   ├── components.test.tsx
│   │   ├── graph.test.tsx
│   │   ├── setup.ts
│   │   └── v2.test.tsx
│   ├── .env.example
│   ├── .gitignore
│   ├── FRONTEND_INTEGRATION.md
│   ├── GrantLens-Frontend.zip
│   ├── index.html
│   ├── MOCK_DATA_REFERENCE.md
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── TEST_RESULTS.md
│   ├── tsconfig.json
│   └── vite.config.ts
├── grantlens-backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── audits.py
│   │   │   │   ├── beneficiaries.py
│   │   │   │   ├── clusters.py
│   │   │   │   ├── graphs.py
│   │   │   │   ├── investigations.py
│   │   │   │   ├── reports.py
│   │   │   │   └── system.py
│   │   │   ├── __init__.py
│   │   │   ├── dependencies.py
│   │   │   └── errors.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── evaluation.py
│   │   │   ├── graphs.py
│   │   │   ├── ingestion.py
│   │   │   ├── jobs.py
│   │   │   ├── linkage.py
│   │   │   ├── pipeline.py
│   │   │   ├── presentation.py
│   │   │   ├── risk.py
│   │   │   └── synthetic.py
│   │   ├── __init__.py
│   │   ├── core.py
│   │   ├── db.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── paths.py
│   │   └── schemas.py
│   ├── benchmark-results/
│   │   ├── 10000.json
│   │   └── 50000.json
│   ├── data/
│   │   ├── audits/
│   │   │   [existing per-audit artifacts retained; contents omitted]
│   │   ├── synthetic/
│   │   │   ├── applications.csv
│   │   │   ├── beneficiaries.csv
│   │   │   ├── DATA_NOTICE.txt
│   │   │   ├── demo_cases.json
│   │   │   ├── ground_truth.csv
│   │   │   └── transactions.csv
│   │   └── grantlens.db
│   ├── scripts/
│   │   ├── __init__.py
│   │   ├── baseline_risk_v1.py
│   │   ├── benchmark.py
│   │   ├── benchmark_v2.py
│   │   ├── evaluate_saved.py
│   │   ├── evaluate_v2.py
│   │   ├── generate_dataset.py
│   │   ├── package_backend.py
│   │   ├── run_pipeline.py
│   │   ├── verify_integration.py
│   │   └── verify_structure.py
│   ├── tests/
│   │   ├── test_api.py
│   │   ├── test_integration.py
│   │   ├── test_pipeline.py
│   │   ├── test_v2.py
│   │   └── test_v2_risk.py
│   ├── v2-results/
│   ├── .env.example
│   ├── .gitignore
│   ├── API_CONTRACT.md
│   ├── FRONTEND_HANDOFF_ASTRA.md
│   ├── openapi.json
│   ├── README.md
│   ├── requirements-integration-tested.txt
│   ├── requirements-tested.txt
│   └── requirements.txt
├── integration-results/
│   ├── api-workflow.json
│   ├── audit-complete.jpg
│   ├── backend-tests.txt
│   ├── dataset-tests.txt
│   ├── dataset-validation.json
│   ├── dataset-validation.md
│   ├── dataset-validation.txt
│   ├── frontend-build.txt
│   ├── frontend-tests.txt
│   ├── investigation.jpg
│   ├── main-evaluation.json
│   ├── main-results.json
│   ├── openapi.json
│   ├── sample-evaluation.json
│   ├── sample-evaluation.txt
│   ├── sample-results.json
│   ├── source-checksums.json
│   ├── source-integrity.json
│   └── v2-baseline-tests.txt
├── refactor-results/
│   ├── after-backend.txt
│   ├── after-dataset.txt
│   ├── after-frontend.txt
│   ├── after-openapi.json
│   ├── after-pipeline.json
│   ├── before-backend.txt
│   ├── before-dataset.txt
│   ├── before-frontend.txt
│   ├── before-openapi.json
│   ├── before-pipeline.json
│   ├── browser-routes.json
│   ├── controlled-after-openapi.json
│   ├── controlled-after-pipeline.json
│   ├── controlled-before-openapi.json
│   ├── controlled-before-pipeline.json
│   ├── dashboard.png
│   ├── database-after.json
│   ├── database-before.json
│   ├── document-moves.json
│   ├── frontend-format.txt
│   ├── frontend-moves.json
│   ├── integrity.json
│   ├── live-api.json
│   ├── regression.json
│   ├── regression.txt
│   ├── source-checksums.json
│   ├── supplied-data-validation.json
│   ├── supplied-data-validation.md
│   └── supplied-data-validation.txt
├── Synthetic Scholarship Dataset/
│   ├── grantlens-dataset/
│   │   ├── config/
│   │   │   └── generation_config.json
│   │   ├── data/
│   │   │   ├── ground_truth/
│   │   │   │   ├── fraud_rings.csv
│   │   │   │   ├── ground_truth.csv
│   │   │   │   ├── ground_truth_pairs.csv
│   │   │   │   ├── intentional_anomalies.csv
│   │   │   │   ├── lookalike_cases.csv
│   │   │   │   ├── ring_evidence.json
│   │   │   │   └── scenario_memberships.csv
│   │   │   ├── main/
│   │   │   │   ├── reference/
│   │   │   │   │   ├── account_authorizations.csv
│   │   │   │   │   ├── accounts.csv
│   │   │   │   │   ├── institutions.csv
│   │   │   │   │   └── scheme_rules.csv
│   │   │   │   ├── applications.csv
│   │   │   │   ├── beneficiaries.csv
│   │   │   │   └── transactions.csv
│   │   │   ├── sample/
│   │   │   │   ├── ground_truth/
│   │   │   │   │   ├── fraud_rings.csv
│   │   │   │   │   ├── ground_truth.csv
│   │   │   │   │   ├── ground_truth_pairs.csv
│   │   │   │   │   ├── intentional_anomalies.csv
│   │   │   │   │   ├── lookalike_cases.csv
│   │   │   │   │   ├── ring_evidence.json
│   │   │   │   │   └── scenario_memberships.csv
│   │   │   │   ├── main/
│   │   │   │   │   ├── reference/
│   │   │   │   │   │   ├── account_authorizations.csv
│   │   │   │   │   │   ├── accounts.csv
│   │   │   │   │   │   ├── institutions.csv
│   │   │   │   │   │   └── scheme_rules.csv
│   │   │   │   │   ├── applications.csv
│   │   │   │   │   ├── beneficiaries.csv
│   │   │   │   │   └── transactions.csv
│   │   │   │   ├── detection_manifest.json
│   │   │   │   └── generation_metadata.json
│   │   │   ├── stress/
│   │   │   │   ├── ground_truth/
│   │   │   │   │   ├── fraud_rings.csv
│   │   │   │   │   ├── ground_truth.csv
│   │   │   │   │   ├── ground_truth_pairs.csv
│   │   │   │   │   ├── intentional_anomalies.csv
│   │   │   │   │   ├── lookalike_cases.csv
│   │   │   │   │   ├── ring_evidence.json
│   │   │   │   │   └── scenario_memberships.csv
│   │   │   │   ├── main/
│   │   │   │   │   ├── reference/
│   │   │   │   │   │   ├── account_authorizations.csv
│   │   │   │   │   │   ├── accounts.csv
│   │   │   │   │   │   ├── institutions.csv
│   │   │   │   │   │   └── scheme_rules.csv
│   │   │   │   │   ├── applications.csv
│   │   │   │   │   ├── beneficiaries.csv
│   │   │   │   │   └── transactions.csv
│   │   │   │   ├── detection_manifest.json
│   │   │   │   └── generation_metadata.json
│   │   │   ├── detection_manifest.json
│   │   │   └── generation_metadata.json
│   │   ├── reports/
│   │   │   ├── pandas_loading.txt
│   │   │   ├── release_checks.json
│   │   │   ├── sample_validation_report.json
│   │   │   ├── sample_validation_report.md
│   │   │   ├── stress_validation_report.json
│   │   │   ├── stress_validation_report.md
│   │   │   ├── test_results.txt
│   │   │   ├── validation_report.json
│   │   │   └── validation_report.md
│   │   ├── scripts/
│   │   │   ├── build_documentation.py
│   │   │   ├── generate_dataset.py
│   │   │   ├── load_dataset.py
│   │   │   ├── package_release.py
│   │   │   ├── run_release_checks.py
│   │   │   ├── schema.py
│   │   │   └── validate_dataset.py
│   │   ├── tests/
│   │   │   └── test_dataset.py
│   │   ├── .gitignore
│   │   ├── DATA_DICTIONARY.md
│   │   ├── DATASET_CONTRACT.md
│   │   ├── dataset_summary.md
│   │   ├── EVALUATION.md
│   │   ├── README.md
│   │   └── requirements.txt
│   ├── grantlens-dataset.zip
│   └── grantlens-dataset.zip.sha256
├── v2-results/
│   ├── accuracy-tests.txt
│   ├── anomaly-detail.png
│   ├── backend-tests.txt
│   ├── backend-unavailable.png
│   ├── baseline-frontend-tests.txt
│   ├── baseline-heldout.json
│   ├── baseline-main.json
│   ├── browser-audit-report.csv
│   ├── dataset-tests.txt
│   ├── development-generation.txt
│   ├── evaluation-dashboard.png
│   ├── formatting.txt
│   ├── frontend-build.txt
│   ├── frontend-tests.txt
│   ├── frontend-typecheck.txt
│   ├── live-report-check.json
│   ├── performance.json
│   ├── revised-development.json
│   ├── revised-heldout.json
│   ├── revised-main.json
│   ├── revised-stress.json
│   ├── revised-validation.json
│   ├── source-integrity.json
│   └── validation-generation.txt
├── .gitignore
├── FINAL_FOLDER_TREE.md
├── README.md
├── REFACTOR_REPORT.md
└── STRUCTURE_AUDIT.md
```

Entry points: frontend index.html → src/main.tsx → src/app/App.tsx; backend app.main:app; dataset scripts remain under Synthetic Scholarship Dataset/grantlens-dataset/scripts/. Start commands are in README.md.
