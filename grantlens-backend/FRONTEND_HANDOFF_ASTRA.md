# GrantLens — frontend integration handoff for Astra

## Task

Implement the separately designed Google Stitch screens as a React frontend and connect them to this working Python backend. Preserve the supplied visual design. Build the seven screens below using real API responses. The backend already performs detection, scoring, graph analysis and case persistence.

Start by reading this document, `API_CONTRACT.md`, and `openapi.json`. Read `README.md` for backend setup and known limitations. Do not assume an endpoint exists unless it is documented. No frontend source or Stitch export is included in this package; use the user's separately supplied design/export, or request it if unavailable.

## Runtime and connection requirements

- Frontend: React; use the existing frontend project's tooling and styling. If starting from a Stitch HTML export, port it into reusable React components. TypeScript is preferred for API contracts.
- Graph rendering: Cytoscape.js or the graph library already used by the frontend, with an adapter for the supplied Cytoscape JSON.
- HTTP: browser fetch is sufficient. An existing query/cache library can be retained; no new state library is required.
- Configure `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` for a Vite project. Put this in the frontend's `.env.local`; access via `import.meta.env.VITE_API_BASE_URL`.
- Frontend local origin: `http://localhost:5173` or `http://127.0.0.1:5173`. These are allowed by backend CORS. Set backend `GRANTLENS_CORS` explicitly if another origin is needed.
- Backend: Python 3.11+, one Uvicorn worker, port 8000. No API key, bearer token, login or paid service is required.
- A hosted frontend cannot use this laptop's localhost backend. For remote integration, deploy the backend separately, configure its reachable URL and CORS, and address authentication before exposing real data.

Backend setup after extracting the ZIP:

```powershell
cd grantlens-backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-tested.txt
.\.venv\Scripts\python -m scripts.run_pipeline --input data/synthetic
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The bundled `data/synthetic` directory contains the fictional 10,000-record demo. Regenerate it with `python -m scripts.generate_dataset --count 10000` if needed. Save the audit ID printed by the pipeline. Swagger is at `http://127.0.0.1:8000/docs`.

## Shared frontend behavior

Keep `selectedAuditId` in application state and persist it in localStorage. Send `audit_id` on every beneficiary, cluster, graph and case request. Validate a restored ID via its status endpoint. Include it in query-cache keys and clear dependent selections when it changes. An audit created on another computer will have a different UUID; never hardcode an existing UUID.

There is no audit-list endpoint. The entry screen should allow creating a demo audit, uploading files, or entering a known audit ID. The backend can default data endpoints to the latest completed audit, but explicit audit selection is safer. Show a setup state if no completed audit exists.

Use backend pagination: `offset=0&limit=50`, maximum 200. Display `total`; do not treat a page as the complete dataset. Reset offset when filters change. Debounce search and cancel stale requests.

Every screen needs loading, empty, API-error and retry states. Never replace a failed API response with invented demo values. Label synthetic data clearly. Use “potentially suspicious,” “review priority,” and “possible identity match”; never “confirmed fraud.” Format monetary values as INR for presentation without modifying numeric API values. Display risk scores as an index out of 100, never a probability percentage.

## Screen requirements

| Screen | Required API calls | Required UI |
|---|---|---|
| Overview | `GET /audits/{id}/summary`, `GET /config` | Beneficiary/application/transaction totals, total disbursed, flagged beneficiaries, risk distribution, identity matches, clusters, cycles, processing duration and safeguard notices. Treat absent risk-distribution keys as zero. |
| New Audit | `POST /demo/seed`, `POST /audits/upload`, `POST /audits/{id}/run`, `GET /audits/{id}/status` | Demo button, three named CSV inputs, validation errors, run action, polling state and completion navigation. |
| Beneficiaries | `GET /beneficiaries`, `GET /beneficiaries/{id}`, `GET /beneficiaries/{id}/matches` | Paginated searchable table; risk filter; detail panel with applications, masked identifiers, evidence contributions, matching/conflicting attributes and source IDs. |
| Risk Clusters | `GET /clusters`, `GET /clusters/{id}`, `GET /clusters/{id}/graph` | Paginated risk-filtered list, member count, account concentration, disbursed amount, explanations and bounded network preview. |
| Network Explorer | `GET /graph/neighbors`, `GET /graph/path` | Node selection, hop selector, node limit, legend, evidence inspector, path search and truncation notice. |
| Investigations | `GET /cases`, `GET /cases/{id}`, `PATCH /cases/{id}` | Status filter, evidence panel, status editor, append-only note form, saved-state feedback and error handling. |
| Reports | `GET /cases/{id}/report` | Case report view, evidence and cycle table, timestamps and review notice. Offer JSON download; any browser print/PDF feature is frontend-only. |

There are no dedicated trend, district aggregation, institution analytics, export-PDF, delete-case, merge-identity or authentication endpoints. If the visual design includes unsupported widgets, explain the gap and adapt the view rather than inventing metrics or silently deriving totals from a partial page.

## Audit lifecycle

1. Demo: `POST /demo/seed` with `{"count":10000,"seed":17}`. Or upload the three CSV files as FormData fields `beneficiaries`, `applications`, `transactions`.
2. Save the returned `audit_id`. The initial status is `Ready`; seeding/uploading does not start detection.
3. `POST /audits/{audit_id}/run` with no body. Expect HTTP 202 and `Running`.
4. Poll `/audits/{audit_id}/status` about once per second, with a cancellable timer. Stop on `Completed` or `Failed`; stop polling on component unmount.
5. On completion, load summary and navigate to Overview. On failure, show `summary.error` and an explicit retry action.

Only one processing job runs at a time. HTTP 409 can mean another job is active. Do not invent a progress percentage: no numeric progress is provided. Upload limit is 50 MiB per CSV. Ground-truth files are for offline evaluation and must not be uploaded through the audit UI.

## Minimal API client pattern

```ts
const API = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API}${path}`, {...init, headers});
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message ?? `HTTP ${response.status}`);
    throw Object.assign(error, {status: response.status, details: body?.error?.details});
  }
  return body as T;
}

export function scoped(path: string, auditId: string, params: Record<string, string> = {}) {
  return `${path}?${new URLSearchParams({...params, audit_id: auditId})}`;
}

// Encode IDs used in URL path segments with encodeURIComponent.
// Use AbortController through request's signal option to cancel stale fetches.
```

Never set Content-Type manually for FormData: the browser must create its boundary. List responses are `{items,total,offset,limit}`, not bare arrays. API errors use `{error:{code,message,details?}}`; handle 404, 409, 413, 422 and 500 distinctly.

## Graph and investigation details

- Graph shape: `{nodes:[{data:{id,label,type,risk_score}}], edges:[{data:{id,source,target,relationship,...}}], truncated}`. Pass `[...nodes, ...edges]` to Cytoscape. Deduplicate by element ID when expanding neighborhoods.
- Use stable graph IDs as selection keys. Masked account labels are display-only and are not unique. Beneficiary IDs can be used directly; account node IDs come from `bank_account_id_node_id` or evidence `related_account_ids`.
- Neighborhood hops: 1–3; maximum 500 returned nodes. Start with 100–200. Show a clear notice when `truncated` is true.
- Entity explorer edges are undirected. Do not render their orientation as financial flow. Directed cycle evidence in case reports supplies sender, receiver, amount, timestamp and transaction IDs.
- Non-beneficiary node risk zero means unscored; do not label accounts “safe.” Weak phone/address links are relationships, not proof of suspicious activity.
- `CL-017` is a stable demonstration **case ID**, not a cluster ID. Fetch `/cases/CL-017`, then use its `cluster_ids` to request cluster graphs. It exists for seeded/generated demos, not arbitrary uploads.
- Case statuses: `Needs Review`, `In Investigation`, `Verification Requested`, `Cleared`. PATCH accepts `{"status":"In Investigation","note":"Check supporting documents."}`. Either field may be omitted. A note appends; it does not replace earlier notes. Limit notes to 4000 characters.
- Render successful PATCH results, then invalidate case list/detail/report caches. Clearing a case leaves the historical algorithmic risk score intact.
- Scores and risk bands come from the backend. A zero evidence contribution can represent deliberate overlap suppression; keep its explanation visible.

## Integration acceptance checklist

1. Start backend and frontend independently; verify no CORS errors.
2. Seed 10,000 records through the UI, run the job, poll to completion and show actual summary values.
3. Upload the three bundled CSV files and complete the same workflow. Show a useful row-level error for a malformed CSV.
4. Search beneficiaries, paginate, filter risk and inspect possible duplicate matches without merging records.
5. Open CL-017 and its computed cluster graph; display 16 case members and the returned score, without hardcoding either value.
6. Expand a bounded neighborhood; visibly handle truncation and missing paths.
7. Change case status and append a note; reload the page and verify persistence.
8. Display a cycle-bearing case report with transaction IDs, amounts and timestamps, and download JSON.
9. Verify backend-offline, no-audit, empty-filter, invalid-input, processing and failed-job states.
10. Confirm every table, KPI and graph uses live data, masks stay masked, and no unsupported trend or probability is fabricated.

## Prompt to give Astra

“Integrate my Google Stitch frontend with the attached GrantLens backend. Read FRONTEND_HANDOFF_ASTRA.md, API_CONTRACT.md and openapi.json first. Preserve the supplied design and implement the seven React screens against the real API. Keep the selected audit ID explicit, handle asynchronous audit processing, use bounded graph queries, and persist case status/notes through PATCH. Do not recalculate risk scores or invent unsupported metrics. Run the backend and frontend, test the acceptance checklist, and report any remaining integration gaps.”
