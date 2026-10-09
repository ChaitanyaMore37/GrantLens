# Verification results

Verified on 9 October 2026 using Node 26.9.0, npm 11.19.1, Vite 7.3.7, TypeScript and Vitest 5.0.3.

## Executed commands

| Check                          | Result                               |
| ------------------------------ | ------------------------------------ |
| Dependency installation        | Passed; lockfile included            |
| Final dependency install audit | 0 reported vulnerabilities           |
| `npm test`                     | 21 tests passed across 3 files       |
| `npm run typecheck`            | Passed                               |
| `npm run build`                | Passed; production assets in `dist/` |
| Local Vite server              | Running at http://127.0.0.1:5173     |

Final production chunks: application 318.25 kB, framework 86.76 kB, charts 403.07 kB, graph 443.04 kB, stylesheet 45.38 kB (uncompressed). The build has no oversized-chunk warning.

## Automated coverage

`tests/api.test.ts` (14 tests):

- Dashboard totals agree with beneficiary, cluster and payment records.
- District and reporting-period filtering.
- Returned fixtures cannot be mutated by callers.
- Graph IDs, endpoint integrity, identity-link counts and score contributions.
- Recorded transfer cycle and bounded neighborhood/path exploration.
- Status/note persistence with independent risk scores and updated review totals.
- Missing-record errors.
- CSV samples, quoted values, missing fields, invalid amounts/dates and duplicate IDs.
- Simulated success, failure and recovery.
- HTTP failure, null response and empty-list handling.

`tests/components.test.tsx` (5 tests):

- Cluster search, filters and opening CL-017.
- Score sorting and independent status filtering.
- Navigation across all eight sidebar destinations.
- Required upload files and schema-error feedback.
- Loading, empty and retry states.

`tests/graph.test.tsx` (2 tests):

- A beneficiary deep link remains selected when the graph is already cached.
- Node/relationship selection updates the inspector and the inspector can collapse.

The graph tests use the real Cytoscape engine in headless mode, avoiding jsdom canvas rendering. Real canvas rendering was checked in the browser.

## Browser checks completed

- Desktop Overview and three-panel CL-017 workspace visually inspected.
- Cluster search and pagination (including CL-020 / CL-021 on page 2).
- Cytoscape node selection, account evidence, transaction records, relationship inspector and multi-hop/path controls.
- Confirmed investigation status change and saved a note; report shows the same finding.
- Beneficiary detail modal and network deep link.
- Three real CSV file selections, schema validation, simulated processing completion and View demo results navigation to CL-017.
- Reporting-period switch: Q4 under review becomes ₹3.84L and CL-017 disbursements become ₹2.40L; annual values restore correctly.
- Desktop 1440px, tablet 1024px and mobile 390px layouts inspected. Mobile page width equals content width (390px), while dense tables scroll within their panels.
- No new browser console errors during the final verification interval.

Saved screenshots:

- `screenshots/overview-desktop.jpg`
- `screenshots/overview-mobile.jpg`
- `screenshots/investigation-desktop.jpg`
- `screenshots/audit-complete.jpg`

## Remaining integration/manual checks

The real FastAPI contract and backend were unavailable, so HTTP integration has not been verified. Authentication, backend authorization, live forensic processing and production-scale pagination are outside this frontend prototype. Print styles and the browser print action are implemented; a physical print or saved PDF was not inspected. A full screen-reader audit and exhaustive browser/device matrix were not performed.

An early graph deep-link selection issue was found in browser testing, fixed, and covered by a regression test. Early dependency-audit findings were resolved by updating the test runner. Historical Vite hot-reload errors while files were being reformatted did not recur after the final reload/build.
