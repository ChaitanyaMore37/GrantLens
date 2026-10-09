# Synthetic dataset reference

`src/services/data.ts` is the single source of truth. The provided CSV files are generated from the same records and used by tests to verify schema and row counts.

## Initial totals

- 32 beneficiaries and 32 applications, across Pune, Nashik, Nagpur, Mumbai and Satara.
- 96 scholarship disbursements: three per beneficiary, dated August, September and October 2024.
- Four downstream account transfers, for 100 total transaction rows.
- Five clusters, five cases, and one completed reference audit (`AUD-2024-012`).
- ₹12,96,000 total scholarship disbursements; initially ₹11,52,000 under review (the cleared CL-021 is excluded).
- Two initially active investigations; four supplied identity-match pairs.
- Beneficiary risk distribution: 20 high/critical, 8 medium, 4 low.

These totals change consistently when filters or session case decisions change. The period selector changes disbursement counts and amounts; entity-level risk scores are fixed for the reference audit.

| Cluster | Beneficiaries   | Score | Disbursements | Initial status         |
| ------- | --------------- | ----- | ------------- | ---------------------- |
| CL-017  | BEN-001–BEN-016 | 95    | ₹7,20,000     | Needs review           |
| CL-018  | BEN-017–BEN-020 | 89    | ₹1,44,000     | In investigation       |
| CL-019  | BEN-021–BEN-024 | 78    | ₹1,44,000     | Verification requested |
| CL-020  | BEN-025–BEN-028 | 64    | ₹1,44,000     | Needs review           |
| CL-021  | BEN-029–BEN-032 | 42    | ₹1,44,000     | Cleared                |

## Primary network: CL-017

16 beneficiaries share AC-1, AC-2 and AC-3. Phone and address relationships connect subsets; institution and scheme nodes supply context. BEN-001, BEN-006 and BEN-016 have three supplied pairwise identity-match links. Graphs intentionally show a bounded set of contextual relationships, not every field in every record.

The collector account COL-01 has a directed transfer cycle:

`AC-1 → COL-01 → AC-2 → AC-1`

Each transfer is ₹18,000, supported by TX-C1, TX-C2 and TX-C3. CL-019 contains TX-C4 (AC-21 → COL-02, ₹12,000). CL-018 has one supplied identity link; CL-020 demonstrates a common phone; CL-021 a common address.

The graph uses `payout`, `phone`, `address`, `enrolled`, `application`, `identity` and `transfer` relationship types. Evidence record IDs, node IDs and transaction IDs remain stable across screens. Context nodes may be reused within separately scoped cluster graphs.

## Score contributions

CL-017's fixed review-priority score is 95:

| Indicator                               | Contribution |
| --------------------------------------- | ------------ |
| Shared payout account                   | 30           |
| Strong identity similarity              | 25           |
| Common collector account                | 20           |
| Scheme conflict (synthetic source flag) | 10           |
| Transaction cycle                       | 10           |

Other demo clusters have one aggregate contribution matching their supplied score. These are interface fixtures, not calculated forensic results. Source flags require independent verification. The UI never recalculates scores when a case is cleared.

## Sample summary response

```json
{
  "beneficiaries": 32,
  "payments": 96,
  "clusters": 5,
  "underReview": 1152000,
  "investigations": 2,
  "duplicates": 4,
  "monthly": [{ "month": "Aug", "high": 20, "medium": 8, "low": 4 }],
  "distribution": [
    { "name": "High / critical", "value": 20, "color": "#c94c55" }
  ],
  "anomalies": [{ "name": "Shared payout accounts", "value": 16 }]
}
```

Arrays above are abbreviated; the actual summary has 12 monthly records, three risk bands and five cluster-category records. `duplicates` counts supplied identity-match pairs, not confirmed duplicate people. Anomaly chart counts are beneficiaries in clusters with that primary indicator.

## Session state

Investigations map INV-104 through INV-108 to CL-017 through CL-021. Notes and status changes are shared via the mock adapter and TanStack Query invalidation. Refreshing the document resets mock state. Uploaded CSVs never replace the fixture or generate scores: Demo Analysis stores only file summaries, simulates six stages and opens the reference case.
