# Dataset validation report

Status: **PASS**

Each listed check ran against the saved CSV files.

- Exact schemas, required fields, identifiers, categorical values, eligibility and foreign keys
- Positive amounts, approved awards fully reconciled, chronological zero-opening-balance ledger and money conservation
- All seven scenarios, exact ring members, multi-label coverage, observed collector edges and CL-017 topology/INR 820000
- Legitimate lookalikes, guardian authorizations, corrected claims and exhaustive positive identity-pair truth
- CSV SHA-256 integrity against generation metadata

## Statistics

```json
{
  "beneficiaries": 10000,
  "unique_actual_people": 9872,
  "applications": 14441,
  "approved_applications": 12581,
  "dbt_disbursements": 13500,
  "account_transfers": 2335,
  "total_disbursed_inr": "279365250.00",
  "suspicious_beneficiaries": 1096,
  "planted_rings": 181,
  "ring_sizes": {
    "3": 60,
    "4": 20,
    "5": 20,
    "8": 40,
    "10": 40,
    "16": 1
  },
  "directed_simple_cycles": 52,
  "cyclic_financial_components": 51,
  "verified_suspicious_cycle_sequences": 21,
  "verified_benign_cycle_sequences": 30,
  "legitimate_lookalike_cases": 300,
  "legitimate_lookalike_beneficiaries": 2566,
  "lookalike_cases_by_type": {
    "BENIGN_CYCLE": 30,
    "IDENTICAL_NAME": 30,
    "REGISTRATION_CAMP": 30,
    "COMMON_SURNAME": 30,
    "COMPATIBLE_SCHEMES": 30,
    "GUARDIAN_ACCOUNT": 30,
    "FAMILY_CONTACT": 30,
    "HOSTEL_ADDRESS": 30,
    "CORRECTED_APPLICATION": 30,
    "BENIGN_COLLECTION": 30
  },
  "primary_scenario_counts": {
    "IDENTITY_CLONING": 196,
    "NORMAL": 8154,
    "LEGIT_IDENTICAL_NAME": 60,
    "GHOST_IDENTITY": 160,
    "COMMON_COLLECTION_ACCOUNT": 160,
    "LEGIT_GUARDIAN_ACCOUNT": 60,
    "LEGIT_BENIGN_CYCLE": 90,
    "LEGIT_FAMILY_CONTACT": 90,
    "SHARED_PAYOUT_ACCOUNT": 200,
    "INCOMPATIBLE_SCHEME_CLAIMS": 100,
    "LEGIT_COMPATIBLE_SCHEMES": 60,
    "LEGIT_HOSTEL_ADDRESS": 150,
    "BATCH_FABRICATION": 200,
    "CIRCULAR_TRANSFERS": 80,
    "LEGIT_COMMON_SURNAME": 90,
    "LEGIT_CORRECTED_APPLICATION": 60,
    "LEGIT_REGISTRATION_CAMP": 90
  },
  "multi_label_scenario_counts": {
    "BATCH_FABRICATION": 200,
    "SHARED_PAYOUT_ACCOUNT": 216,
    "IDENTITY_CLONING": 196,
    "CIRCULAR_TRANSFERS": 96,
    "COMMON_COLLECTION_ACCOUNT": 176,
    "GHOST_IDENTITY": 160,
    "INCOMPATIBLE_SCHEME_CLAIMS": 116
  },
  "applications_by_scheme": {
    "SCH-04": 2052,
    "SCH-06": 1985,
    "SCH-02": 2825,
    "SCH-05": 1563,
    "SCH-01": 3746,
    "SCH-03": 2270
  },
  "beneficiaries_by_district": {
    "Satara": 705,
    "Kolhapur": 734,
    "Pune": 1586,
    "Jalgaon": 578,
    "Amravati": 638,
    "Solapur": 859,
    "Mumbai": 961,
    "Nagpur": 1153,
    "Thane": 1087,
    "Latur": 295,
    "Nashik": 994,
    "Nanded": 410
  },
  "applications_by_status": {
    "APPROVED": 12581,
    "REJECTED": 898,
    "PENDING": 534,
    "CANCELLED": 428
  },
  "applications_by_academic_year": {
    "2023-24": 5257,
    "2025-26": 4285,
    "2024-25": 4899
  },
  "duplicate_identity_groups": 68,
  "positive_identity_pairs": 188,
  "sampled_negative_pairs": 10778,
  "intentional_enrollment_anomalies": 113,
  "incompatible_person_years": 116,
  "duplicate_scheme_person_years": 60,
  "reused_fields": {
    "bank_account_id": {
      "reused_values": 139,
      "records_in_reused_values": 668,
      "maximum_multiplicity": 10
    },
    "phone": {
      "reused_values": 184,
      "records_in_reused_values": 606,
      "maximum_multiplicity": 5
    },
    "address": {
      "reused_values": 345,
      "records_in_reused_values": 1231,
      "maximum_multiplicity": 6
    }
  },
  "cl017": {
    "members": [
      "BEN-008404",
      "BEN-005652",
      "BEN-008120",
      "BEN-007320",
      "BEN-000955",
      "BEN-009681",
      "BEN-005050",
      "BEN-001226",
      "BEN-007709",
      "BEN-007128",
      "BEN-002669",
      "BEN-007699",
      "BEN-007479",
      "BEN-009051",
      "BEN-005546",
      "BEN-009260"
    ],
    "disbursed_inr": "820000.00",
    "payout_accounts": [
      "ACC-007792",
      "ACC-012911"
    ],
    "collector_account": "ACC-027730",
    "cycle_accounts": [
      "ACC-007792",
      "ACC-027730",
      "ACC-012911"
    ]
  },
  "identity_financial_graph": {
    "beneficiary_components": 6799,
    "largest_beneficiary_component": 1817,
    "excluded_context_nodes": [
      "GOVERNMENT_SOURCE",
      "INSTITUTION",
      "SCHEME"
    ]
  },
  "suspicious_by_beneficiary_id_decile": {
    "0": 111,
    "1": 113,
    "2": 96,
    "3": 94,
    "4": 106,
    "5": 112,
    "6": 115,
    "7": 111,
    "8": 117,
    "9": 121
  }
}
```
