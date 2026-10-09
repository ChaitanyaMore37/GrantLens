> Integration update (2026-10-09): see [parent README](../README.md) and [updated API contract](../docs/api/UPDATED_API_CONTRACT.md). The historical documentation below describes the original component; API mode is now the frontend default and the supplied dataset needs no regeneration.

# GrantLens

A working React + TypeScript frontend prototype for scholarship forensic auditing. The visual design follows the supplied institutional dashboard reference, with original GrantLens branding, INR amounts, and explicit synthetic-data labels. It has no government affiliation.

## Run locally

Use Node.js 22.12+ (Node 24 LTS recommended; verified here with Node 26.9).

```sh
npm install
npm run dev
```

Open http://localhost:5173. No backend or credentials are needed in default mock mode.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The production build is written to `dist/`. Production hosting must rewrite application routes to `index.html` for React Router deep links.

## Implemented screens

| Route              | Features                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                | Scheme, district, batch and reporting-period filters; six metrics; Recharts trend, risk distribution and anomaly charts; live Cytoscape preview; searchable priority table |
| `/new-audit`       | Three CSV selectors/drop zones, sample downloads, record counts, schema validation, removal, simulated analysis, progress, success and recoverable failure                 |
| `/clusters`        | Search, scheme/district/risk/status filters, min/max score range, sortable columns and pagination                                                                          |
| `/clusters/CL-017` | Case summary, interactive graph, evidence inspector, score contributions, confirmed status changes, notes and real JSON export                                             |
| `/network`         | Cluster selection, entity/account lookup, node and relationship selection, filters, 1–3 hops, path highlighting, labels, legend, zoom, reset and collapsible inspector     |
| `/beneficiaries`   | Search, filters, sorting, pagination, record detail modal, applications, transactions, possible identity links, JSON export and network deep links                         |
| `/investigations`  | Case register and status tabs; links into the case workspace for notes and status changes                                                                                  |
| `/reports`         | Audit selection, dataset summary, risk distribution, evidence, reviewer findings and browser Print / Save as PDF                                                           |
| `/settings`        | Data connection details, persisted compact-table/reduced-motion preferences, INR/date format and risk legend                                                               |

## Demo walkthrough

1. Open **Risk Clusters**, search `CL-017`, and open the case.
2. Select `BEN-001` using the graph entity selector or click its node.
3. Inspect its source record and three disbursements. Select `COL-01` as a path target and highlight the connection.
4. Select the AC-1 → COL-01 relationship to inspect the transfer evidence.
5. Start an investigation, confirm the change, and save an auditor note. The case register and reports reflect the same session state.
6. Download the three CSV samples from **New Audit**, select them, validate, and run **Demo Analysis**.
7. The simulation opens the reference CL-017 fixture. It does **not** analyze uploaded data for fraud.

## Project structure

- `src/types/`: domain models and graph contract
- `src/services/mock/data.ts`: single deterministic fixture source
- `src/services/api/index.ts`: typed API interface, mock adapter, provisional HTTP adapter and central configuration
- `src/components/`: shared shell, accessible controls, cluster table and Cytoscape graph/inspector
- `src/pages/`: nine workflow screens
- `src/utils/`: currency/status formatting, CSV schema validation and file downloads
- `src/styles.css`: Tailwind theme tokens, institutional styles, responsive breakpoints and print stylesheet
- `public/samples/`: valid synthetic CSV files
- `tests/`: Vitest and React Testing Library checks

The chart, graph and framework dependencies are split into production bundles. No external fonts, images, analytics or accounts are required.

## Persistence and scope

Mock notes, statuses, and audit jobs persist across client-side navigation during the running session and reset on a full reload. Display preferences persist in localStorage. Uploaded records are parsed locally for previews only; mock mode does not send files anywhere. Schema headers are exact mappings, not backend forensic validation.

Graphs and risk evidence are fixed demonstration fixtures. The frontend does not implement entity resolution, identity matching, Louvain detection, centrality, cycle detection or fraud scoring. Graph traversal only highlights existing supplied edges. Scores are review-priority indices, not probabilities of fraud.

The HTTP adapter is a scaffold pending the real `../docs/api/API_CONTRACT.md`; it is not a verified FastAPI integration. See `FRONTEND_INTEGRATION.md` and `MOCK_DATA_REFERENCE.md`. Verification details are recorded in `TEST_RESULTS.md`.

## Structural refactor

Application composition is in src/app/; page directories have index.tsx entry points. Shared components are grouped by common/layout/tables/graphs. services/api/client.ts owns HTTP handling, contracts.ts owns the Api interface, services/mock/api.ts owns mock behavior, and config/index.ts owns Vite settings. Global styles moved unchanged to styles/global.css. src/main.tsx remains the Vite entry. See the [module map](../docs/architecture/MODULE_MAP.md).
