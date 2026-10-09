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
  "beneficiaries": 1000,
  "unique_actual_people": 980,
  "applications": 1442,
  "approved_applications": 1256,
  "dbt_disbursements": 1350,
  "account_transfers": 238,
  "total_disbursed_inr": "27324250.00",
  "suspicious_beneficiaries": 124,
  "planted_rings": 19,
  "ring_sizes": {
    "3": 6,
    "4": 2,
    "5": 2,
    "8": 4,
    "10": 4,
    "16": 1
  },
  "directed_simple_cycles": 7,
  "cyclic_financial_components": 6,
  "verified_suspicious_cycle_sequences": 3,
  "verified_benign_cycle_sequences": 3,
  "legitimate_lookalike_cases": 35,
  "legitimate_lookalike_beneficiaries": 259,
  "lookalike_cases_by_type": {
    "FAMILY_CONTACT": 3,
    "COMMON_SURNAME": 3,
    "HOSTEL_ADDRESS": 3,
    "IDENTICAL_NAME": 3,
    "CORRECTED_APPLICATION": 3,
    "BENIGN_COLLECTION": 8,
    "BENIGN_CYCLE": 3,
    "REGISTRATION_CAMP": 3,
    "COMPATIBLE_SCHEMES": 3,
    "GUARDIAN_ACCOUNT": 3
  },
  "primary_scenario_counts": {
    "NORMAL": 801,
    "GHOST_IDENTITY": 16,
    "LEGIT_BENIGN_CYCLE": 9,
    "LEGIT_FAMILY_CONTACT": 9,
    "LEGIT_HOSTEL_ADDRESS": 15,
    "LEGIT_REGISTRATION_CAMP": 9,
    "SHARED_PAYOUT_ACCOUNT": 20,
    "IDENTITY_CLONING": 34,
    "LEGIT_IDENTICAL_NAME": 6,
    "BATCH_FABRICATION": 20,
    "INCOMPATIBLE_SCHEME_CLAIMS": 10,
    "LEGIT_COMMON_SURNAME": 9,
    "LEGIT_COMPATIBLE_SCHEMES": 6,
    "LEGIT_GUARDIAN_ACCOUNT": 6,
    "COMMON_COLLECTION_ACCOUNT": 16,
    "CIRCULAR_TRANSFERS": 8,
    "LEGIT_CORRECTED_APPLICATION": 6
  },
  "multi_label_scenario_counts": {
    "GHOST_IDENTITY": 16,
    "BATCH_FABRICATION": 20,
    "COMMON_COLLECTION_ACCOUNT": 32,
    "SHARED_PAYOUT_ACCOUNT": 36,
    "INCOMPATIBLE_SCHEME_CLAIMS": 26,
    "IDENTITY_CLONING": 34,
    "CIRCULAR_TRANSFERS": 24
  },
  "applications_by_scheme": {
    "SCH-01": 378,
    "SCH-04": 226,
    "SCH-02": 291,
    "SCH-03": 213,
    "SCH-05": 139,
    "SCH-06": 195
  },
  "beneficiaries_by_district": {
    "Nanded": 64,
    "Pune": 202,
    "Nagpur": 103,
    "Solapur": 74,
    "Nashik": 75,
    "Kolhapur": 70,
    "Amravati": 47,
    "Thane": 130,
    "Mumbai": 84,
    "Jalgaon": 62,
    "Satara": 67,
    "Latur": 22
  },
  "applications_by_status": {
    "APPROVED": 1256,
    "CANCELLED": 44,
    "REJECTED": 100,
    "PENDING": 42
  },
  "applications_by_academic_year": {
    "2024-25": 481,
    "2025-26": 419,
    "2023-24": 542
  },
  "duplicate_identity_groups": 14,
  "positive_identity_pairs": 26,
  "sampled_negative_pairs": 1075,
  "intentional_enrollment_anomalies": 13,
  "incompatible_person_years": 26,
  "duplicate_scheme_person_years": 6,
  "reused_fields": {
    "bank_account_id": {
      "reused_values": 16,
      "records_in_reused_values": 82,
      "maximum_multiplicity": 10
    },
    "phone": {
      "reused_values": 22,
      "records_in_reused_values": 75,
      "maximum_multiplicity": 5
    },
    "address": {
      "reused_values": 36,
      "records_in_reused_values": 135,
      "maximum_multiplicity": 6
    }
  },
  "cl017": {
    "members": [
      "BEN-000232",
      "BEN-000137",
      "BEN-000737",
      "BEN-000756",
      "BEN-000230",
      "BEN-000042",
      "BEN-000347",
      "BEN-000398",
      "BEN-000395",
      "BEN-000605",
      "BEN-000226",
      "BEN-000997",
      "BEN-000086",
      "BEN-000437",
      "BEN-000422",
      "BEN-000673"
    ],
    "disbursed_inr": "820000.00",
    "payout_accounts": [
      "ACC-001045",
      "ACC-001694"
    ],
    "collector_account": "ACC-001026",
    "cycle_accounts": [
      "ACC-001694",
      "ACC-001026",
      "ACC-001045"
    ]
  },
  "identity_financial_graph": {
    "beneficiary_components": 672,
    "largest_beneficiary_component": 83,
    "excluded_context_nodes": [
      "GOVERNMENT_SOURCE",
      "INSTITUTION",
      "SCHEME"
    ]
  },
  "suspicious_by_beneficiary_id_decile": {
    "0": 16,
    "1": 7,
    "2": 13,
    "3": 13,
    "4": 13,
    "5": 15,
    "6": 13,
    "7": 9,
    "8": 13,
    "9": 12
  }
}
```
