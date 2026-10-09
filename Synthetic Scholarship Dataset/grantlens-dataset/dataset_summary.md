# GrantLens dataset summary

Computed from the validated, saved 10,000-beneficiary release with seed 42. No fraud detection model was run and no accuracy is claimed.

| Metric | Value |
|---|---:|
| Beneficiary records | 10,000 |
| Underlying synthetic personas | 9,872 |
| Applications | 14,441 |
| Approved applications | 12,581 |
| DBT disbursements | 13,500 |
| Account transfers | 2,335 |
| Intentionally suspicious beneficiaries | 1,096 |
| Planted rings | 181 |
| Duplicate identity groups | 68 |
| Known positive identity pairs | 188 |
| Sampled negative identity pairs | 10,778 |
| Directed simple cycles in aggregate transfer graph | 52 |
| Chronologically verified suspicious cycle sequences | 21 |
| Chronologically verified benign cycle sequences | 30 |
| Legitimate lookalike cases | 300 |
| Distinct beneficiaries in legitimate controls | 2,566 |
| Explicit enrollment anomalies | 113 |
| Total disbursed INR | 279365250.00 |

## Suspicious scenario counts

Primary counts partition suspicious records. Multi-label counts include overlapping CL-017 memberships; do not add them to get unique beneficiaries.

| Primary scenario | Count |
|---|---:|
| BATCH_FABRICATION | 200 |
| CIRCULAR_TRANSFERS | 80 |
| COMMON_COLLECTION_ACCOUNT | 160 |
| GHOST_IDENTITY | 160 |
| IDENTITY_CLONING | 196 |
| INCOMPATIBLE_SCHEME_CLAIMS | 100 |
| SHARED_PAYOUT_ACCOUNT | 200 |

| All scenario memberships | Count |
|---|---:|
| BATCH_FABRICATION | 200 |
| CIRCULAR_TRANSFERS | 96 |
| COMMON_COLLECTION_ACCOUNT | 176 |
| GHOST_IDENTITY | 160 |
| IDENTITY_CLONING | 196 |
| INCOMPATIBLE_SCHEME_CLAIMS | 116 |
| SHARED_PAYOUT_ACCOUNT | 216 |

## Planted ring sizes

| Beneficiaries per ring | Count |
|---|---:|
| 10 | 40 |
| 16 | 1 |
| 3 | 60 |
| 4 | 20 |
| 5 | 20 |
| 8 | 40 |

## Applications by scheme

| Scheme | Count |
|---|---:|
| SCH-01 | 3,746 |
| SCH-02 | 2,825 |
| SCH-03 | 2,270 |
| SCH-04 | 2,052 |
| SCH-05 | 1,563 |
| SCH-06 | 1,985 |

## Approval statuses

| Status | Count |
|---|---:|
| APPROVED | 12,581 |
| CANCELLED | 428 |
| PENDING | 534 |
| REJECTED | 898 |

## Academic years

| Academic year | Count |
|---|---:|
| 2023-24 | 5,257 |
| 2024-25 | 4,899 |
| 2025-26 | 4,285 |

## District distribution

| District | Count |
|---|---:|
| Amravati | 638 |
| Jalgaon | 578 |
| Kolhapur | 734 |
| Latur | 295 |
| Mumbai | 961 |
| Nagpur | 1,153 |
| Nanded | 410 |
| Nashik | 994 |
| Pune | 1,586 |
| Satara | 705 |
| Solapur | 859 |
| Thane | 1,087 |

## Legitimate controls

| Control type | Count |
|---|---:|
| BENIGN_COLLECTION | 30 |
| BENIGN_CYCLE | 30 |
| COMMON_SURNAME | 30 |
| COMPATIBLE_SCHEMES | 30 |
| CORRECTED_APPLICATION | 30 |
| FAMILY_CONTACT | 30 |
| GUARDIAN_ACCOUNT | 30 |
| HOSTEL_ADDRESS | 30 |
| IDENTICAL_NAME | 30 |
| REGISTRATION_CAMP | 30 |

There are 30 documented guardian-account cases (60 genuine students) and 30 hostel-address cases (150 students), plus family and registration-camp address sharing. Control groups can overlap service-payment controls; case counts and beneficiary counts are different. Many other ordinary students share institutions and surnames.

## Reused identifiers

| Field | Reused values | Records sharing values | Maximum group |
|---|---:|---:|---:|
| bank_account_id | 139 | 668 | 10 |
| phone | 184 | 606 | 5 |
| address | 345 | 1231 | 6 |

## Demo CL-017

Sixteen beneficiary records represent eight underlying personas. Exactly two payout accounts, four phones and three addresses connect them. Thirty-two paid awards across 2023-24 and 2024-25 total INR 820000.00. Each record receives 25000.00 then 26250.00.

Payout accounts: ACC-007792, ACC-012911. Collector: ACC-027730.

Funded directed cycle: ACC-007792 → ACC-027730 → ACC-012911 → ACC-007792.

Exact members:

- BEN-008404
- BEN-005652
- BEN-008120
- BEN-007320
- BEN-000955
- BEN-009681
- BEN-005050
- BEN-001226
- BEN-007709
- BEN-007128
- BEN-002669
- BEN-007699
- BEN-007479
- BEN-009051
- BEN-005546
- BEN-009260

CL-017 is an offline case label, never an expected Louvain community number. The aggregate graph has 52 simple cycles but 51 explicitly staged chronological cycle sequences: CL-017 adds a second aggregate graph cycle through its collection edges. Cycle existence alone is not a fraud label.

## Graph connectivity and leakage checks

The identity/contact/address plus customer-transfer graph has 6,799 beneficiary components; its largest contains 1,817 records. Government source, institution and scheme nodes are excluded from this investigative view. Shared benign service accounts can legitimately form large components. Keep those context nodes in the full heterogeneous graph for explanation; see README for graph-view guidance.

Suspicious records by beneficiary-ID decile (0 = lowest IDs):

| ID decile | Count |
|---|---:|
| 0 | 111 |
| 1 | 113 |
| 2 | 96 |
| 3 | 94 |
| 4 | 106 |
| 5 | 112 |
| 6 | 115 |
| 7 | 111 |
| 8 | 117 |
| 9 | 121 |

Detection inputs contain no ground-truth fields or labels. IDs and row order are randomized. This design check is not an empirical guarantee against all synthetic artifacts; validate on unseen generator seeds and real permitted data before deployment.

## Evaluation protocol

See `EVALUATION.md` for pairwise precision/recall, beneficiary false-positive rates, scenario metrics, ring discovery and leakage-safe splits. Ground truth is complete at the beneficiary/person level; negative pairs are sampled and must not be mistaken for the full pair universe.

## Execution evidence

Main, 1,000-row sample and 50,000-row stress datasets were generated and validated. `reports/release_checks.json` records actual timings and hashes; `reports/test_results.txt` records the automated test run. Re-run the commands in README after changing configuration.
