> Integration update (2026-10-09): see [parent README](../README.md) and [updated API contract](../UPDATED_API_CONTRACT.md). The historical documentation below describes the original component; API mode is now the frontend default and the supplied dataset needs no regeneration.

# FastAPI integration preparation

## Current status

No backend was connected. All endpoint paths and response shapes below are **provisional frontend expectations**, not a confirmed backend contract. The UI consumes the `Api` interface in `src/services/api.ts`; domain interfaces are in `src/types/index.ts`.

## Switching adapters

Copy `.env.example` to `.env`, update it, and restart Vite:

```dotenv
VITE_DATA_SOURCE=mock
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Use `VITE_DATA_SOURCE=api` only after aligning the HTTP adapter with the backend. Vite environment values are public build-time configuration; never place secrets here. The interface defaults to mock unless the value is exactly `api`.

## Provisional endpoint mapping

All paths below are relative to the configured base URL.

| Service                                         | Provisional request                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| `getAuditSummary(filters)`                      | GET `/audits/summary?scheme=&district=&batch=&period=`                           |
| `getAudits()` / `getAudit(id)`                  | GET `/audits` / `/audits/{id}`                                                   |
| `uploadAuditFiles(files)`                       | POST `/audits`, multipart fields `beneficiaries`, `applications`, `transactions` |
| `runAudit(id)`                                  | POST `/audits/{id}/run`                                                          |
| `getBeneficiaries()` / `getBeneficiaryById(id)` | GET `/beneficiaries` / `/beneficiaries/{id}`                                     |
| `getApplications(id)`                           | GET `/beneficiaries/{id}/applications`                                           |
| `getTransactions(entityId?)`                    | GET `/graph/transactions?entity_id=`                                             |
| `getClusters()` / `getClusterById(id)`          | GET `/clusters` / `/clusters/{id}`                                               |
| `getClusterGraph(id)`                           | GET `/clusters/{id}/graph`                                                       |
| `getGraphNeighbors(cluster,id,hops)`            | GET `/graph/neighbors?cluster_id=&entity_id=&hops=`                              |
| `getGraphPath(cluster,source,target)`           | GET `/graph/path?cluster_id=&source=&target=`                                    |
| `getInvestigations()`                           | GET `/cases`                                                                     |
| `updateInvestigation(id,patch)`                 | PATCH `/cases/{id}` with `{status?, note?}`                                      |

The expected `/health` family is reserved for future backend connectivity checking; no fake health status is displayed. Authentication, server pagination, audit-scoped result endpoints and SSE/WebSocket processing updates are not implemented yet.

## Frontend model mapping

Map backend responses to the named `Beneficiary`, `ScholarshipApplication`, `FinancialTransaction`, `AuditJob`, `AuditSummary`, `Cluster`, `RiskEvidence`, `InvestigationCase`, `GraphNode`, `GraphEdge`, and `GraphResponse` interfaces. The current HTTP scaffold assumes response bodies directly match those interfaces. It rejects HTTP failures and null bodies but does not yet validate every response field at runtime.

- Monetary values are numeric INR rupees, not paise or formatted strings.
- IDs are stable strings; do not regenerate identifiers in the UI.
- Dates are ISO date strings or ISO timestamps.
- `Cluster.score` is independent of investigation status and equals its evidence contributions in the fixture.
- Case statuses are `NEEDS_REVIEW`, `IN_INVESTIGATION`, `VERIFICATION_REQUESTED`, `CLEARED`.
- Lists are plain arrays. Convert backend `{items,total,...}` envelopes in the adapter and add server pagination when the real contract is known.
- `AuditSummary.payments` counts beneficiary disbursements; downstream account transfers are separate graph evidence.
- `underReview` includes disbursements for any case not cleared. Active investigations include investigation and verification-requested statuses.
- Reporting period currently supports the fixture's full 2024 calendar year or Q4. General date bounds and fiscal years should be added when the contract is supplied.

## Graph JSON

Cytoscape consumes exactly the provided nodes and edges, without invented relationships:

```json
{
  "nodes": [
    {
      "data": {
        "id": "BEN-001",
        "label": "Aarav · 001",
        "type": "beneficiary",
        "maskedInfo": "Synthetic masked identity",
        "sourceRecords": ["beneficiaries.csv:row:2"]
      },
      "position": { "x": 150, "y": 180 }
    },
    {
      "data": {
        "id": "AC-1",
        "label": "A/c ••4101",
        "type": "account",
        "maskedInfo": "Synthetic account •••• 4101",
        "sourceRecords": ["account-reference:AC-1"]
      },
      "position": { "x": 300, "y": 180 }
    }
  ],
  "edges": [
    {
      "data": {
        "id": "BEN-001-AC-1-payout",
        "source": "BEN-001",
        "target": "AC-1",
        "type": "payout",
        "label": "Payout account",
        "records": ["TX-0001"]
      }
    }
  ]
}
```

Supported node types: `beneficiary`, `account`, `phone`, `address`, `institution`, `scheme`, `collector`. The last type represents a downstream transaction account. Node shapes and colors both encode type. Edges support optional numeric `confidence`; the fixture uses it for identity-match links only. Positions are optional in the type but the current renderer uses preset layout: supply positions or adapt the renderer to a layout when backend positions are absent.

Path and neighbor traversal in mock mode is undirected relationship exploration. Transfer arrowheads retain the transaction direction. A displayed connection path is not a claim about the direction of money flow. The service interface can be replaced with backend graph queries without changing entity IDs.

## Integration sequence

1. Obtain `API_CONTRACT.md` and representative successful, empty, missing-record and failed-job responses.
2. Replace provisional paths and add response mapping/runtime validation in the HTTP adapter.
3. Map file requirements and job progress to the backend contract. Polling currently uses an 800 ms interval; adapt this to server guidance.
4. Connect result views to the completed audit ID. The current demo explicitly routes uploaded jobs to a fixed reference fixture.
5. Add CORS for the development origin and align credentials/authentication with the backend owner.
6. Replace client-side list filtering with server pagination and query filters for production-scale datasets.
7. Test against the backend before enabling API mode. Existing mock tests remain useful regression coverage.

The demo-specific reporting period, narrative and result labels are intentionally visible. They must be mapped to real audit metadata as part of integration; toggling API mode alone does not make this a production application.
