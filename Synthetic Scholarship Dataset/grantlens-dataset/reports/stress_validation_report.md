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
  "beneficiaries": 50000,
  "unique_actual_people": 49392,
  "applications": 72254,
  "approved_applications": 62954,
  "dbt_disbursements": 67500,
  "account_transfers": 11655,
  "total_disbursed_inr": "1391198250.00",
  "suspicious_beneficiaries": 5416,
  "planted_rings": 901,
  "ring_sizes": {
    "3": 300,
    "4": 100,
    "5": 100,
    "8": 200,
    "10": 200,
    "16": 1
  },
  "directed_simple_cycles": 252,
  "cyclic_financial_components": 251,
  "verified_suspicious_cycle_sequences": 101,
  "verified_benign_cycle_sequences": 150,
  "legitimate_lookalike_cases": 1500,
  "legitimate_lookalike_beneficiaries": 12886,
  "lookalike_cases_by_type": {
    "FAMILY_CONTACT": 150,
    "BENIGN_COLLECTION": 150,
    "COMMON_SURNAME": 150,
    "BENIGN_CYCLE": 150,
    "HOSTEL_ADDRESS": 150,
    "COMPATIBLE_SCHEMES": 150,
    "REGISTRATION_CAMP": 150,
    "GUARDIAN_ACCOUNT": 150,
    "CORRECTED_APPLICATION": 150,
    "IDENTICAL_NAME": 150
  },
  "primary_scenario_counts": {
    "SHARED_PAYOUT_ACCOUNT": 1000,
    "NORMAL": 40834,
    "LEGIT_CORRECTED_APPLICATION": 300,
    "CIRCULAR_TRANSFERS": 400,
    "IDENTITY_CLONING": 916,
    "LEGIT_IDENTICAL_NAME": 300,
    "LEGIT_FAMILY_CONTACT": 450,
    "LEGIT_REGISTRATION_CAMP": 450,
    "GHOST_IDENTITY": 800,
    "INCOMPATIBLE_SCHEME_CLAIMS": 500,
    "COMMON_COLLECTION_ACCOUNT": 800,
    "LEGIT_COMMON_SURNAME": 450,
    "LEGIT_BENIGN_CYCLE": 450,
    "BATCH_FABRICATION": 1000,
    "LEGIT_HOSTEL_ADDRESS": 750,
    "LEGIT_GUARDIAN_ACCOUNT": 300,
    "LEGIT_COMPATIBLE_SCHEMES": 300
  },
  "multi_label_scenario_counts": {
    "SHARED_PAYOUT_ACCOUNT": 1016,
    "INCOMPATIBLE_SCHEME_CLAIMS": 516,
    "BATCH_FABRICATION": 1000,
    "GHOST_IDENTITY": 800,
    "IDENTITY_CLONING": 916,
    "COMMON_COLLECTION_ACCOUNT": 816,
    "CIRCULAR_TRANSFERS": 416
  },
  "applications_by_scheme": {
    "SCH-06": 9893,
    "SCH-04": 10365,
    "SCH-03": 11367,
    "SCH-01": 18280,
    "SCH-02": 14464,
    "SCH-05": 7885
  },
  "beneficiaries_by_district": {
    "Amravati": 3084,
    "Kolhapur": 3486,
    "Thane": 5965,
    "Latur": 1504,
    "Mumbai": 5116,
    "Nanded": 1924,
    "Pune": 8083,
    "Nashik": 4904,
    "Satara": 3536,
    "Solapur": 3952,
    "Nagpur": 5519,
    "Jalgaon": 2927
  },
  "applications_by_status": {
    "APPROVED": 62954,
    "REJECTED": 4540,
    "CANCELLED": 2080,
    "PENDING": 2680
  },
  "applications_by_academic_year": {
    "2023-24": 26164,
    "2025-26": 21098,
    "2024-25": 24992
  },
  "duplicate_identity_groups": 308,
  "positive_identity_pairs": 908,
  "sampled_negative_pairs": 53898,
  "intentional_enrollment_anomalies": 569,
  "incompatible_person_years": 516,
  "duplicate_scheme_person_years": 300,
  "reused_fields": {
    "bank_account_id": {
      "reused_values": 723,
      "records_in_reused_values": 3368,
      "maximum_multiplicity": 10
    },
    "phone": {
      "reused_values": 908,
      "records_in_reused_values": 2974,
      "maximum_multiplicity": 5
    },
    "address": {
      "reused_values": 1945,
      "records_in_reused_values": 6575,
      "maximum_multiplicity": 10
    }
  },
  "cl017": {
    "members": [
      "BEN-010787",
      "BEN-041070",
      "BEN-013435",
      "BEN-028293",
      "BEN-029048",
      "BEN-020289",
      "BEN-033898",
      "BEN-005168",
      "BEN-013785",
      "BEN-006391",
      "BEN-036881",
      "BEN-002591",
      "BEN-039491",
      "BEN-049558",
      "BEN-015029",
      "BEN-023083"
    ],
    "disbursed_inr": "820000.00",
    "payout_accounts": [
      "ACC-003450",
      "ACC-063973"
    ],
    "collector_account": "ACC-115092",
    "cycle_accounts": [
      "ACC-003450",
      "ACC-115092",
      "ACC-063973"
    ]
  },
  "identity_financial_graph": {
    "beneficiary_components": 33797,
    "largest_beneficiary_component": 9316,
    "excluded_context_nodes": [
      "GOVERNMENT_SOURCE",
      "INSTITUTION",
      "SCHEME"
    ]
  },
  "suspicious_by_beneficiary_id_decile": {
    "0": 523,
    "1": 535,
    "2": 544,
    "3": 536,
    "4": 578,
    "5": 498,
    "6": 585,
    "7": 544,
    "8": 520,
    "9": 553
  }
}
```
