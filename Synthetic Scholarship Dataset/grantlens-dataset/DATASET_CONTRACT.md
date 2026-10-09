# GrantLens dataset compatibility contract

Version: 1.0. Main dataset root: `data/`. Only `data/main/` and its references are detection inputs. `ground_truth.csv` is provided for offline evaluation, not engine input. No mandatory column has been renamed or added.

## Exact CSV headers

### `main/beneficiaries.csv`

```csv
beneficiary_id,full_name,dob,gender,phone,address,district,state,pincode,bank_account_id,ifsc_code,institution_id,registration_date
```

### `main/applications.csv`

```csv
application_id,beneficiary_id,scheme_id,academic_year,institution_id,enrollment_status,income_band,application_status,approved_amount,application_date
```

### `main/transactions.csv`

```csv
transaction_id,timestamp,sender_account,receiver_account,amount,transaction_type,application_id
```

### `main/reference/institutions.csv`

```csv
institution_id,fictional_institution_name,district,institution_type
```

### `main/reference/scheme_rules.csv`

```csv
scheme_id,scheme_name,eligibility_description,minimum_amount,maximum_amount,exclusivity_group,allowed_enrollment_statuses,allowed_income_bands,exclusivity_scope,award_frequency
```

### `main/reference/accounts.csv`

```csv
bank_account_id,account_type,fictional_bank_name,account_role
```

### `main/reference/account_authorizations.csv`

```csv
beneficiary_id,bank_account_id,relationship,authorization_date
```

### `ground_truth/ground_truth.csv`

```csv
record_id,actual_person_id,scenario_type,is_injected_suspicious,fraud_ring_id,description
```

### `ground_truth/ground_truth_pairs.csv`

```csv
beneficiary_id_1,beneficiary_id_2,same_actual_person
```

### `ground_truth/fraud_rings.csv`

```csv
fraud_ring_id,scenario_type,member_ids,intended_suspicious_behavior,expected_evidence
```

### `ground_truth/scenario_memberships.csv`

```csv
record_id,fraud_ring_id,scenario_type
```

### `ground_truth/lookalike_cases.csv`

```csv
case_id,case_type,member_ids,explanation
```

### `ground_truth/intentional_anomalies.csv`

```csv
application_id,anomaly_type,explanation
```

## Types, categorical values and nullability

`DATA_DICTIONARY.md` defines every field, allowed enum and null rule in every CSV. Load IDs, phone and PIN as strings. Use decimal arithmetic (or integer paise) for production finance. All amounts in this fixture are whole rupees serialized with `.00`; installment halves are also whole rupees. Never strip identifiers or coerce PINs to integers. Empty transfer `application_id` cells are CSV nulls, not the strings "None" or "null".

Date-only fields use `YYYY-MM-DD`. Registration and transaction timestamps use `YYYY-MM-DDTHH:MM:SS+05:30`. Preserve timezone awareness. The snapshot ends on 2026-06-30. Transaction rows are chronologically sorted; beneficiary, application, account and label rows are shuffled. IDs do not imply time or class.

## Keys and relationships

| File | Primary or composite key | Foreign keys |
|---|---|---|
| beneficiaries | beneficiary_id | bank_account_id → accounts; institution_id → institutions |
| applications | application_id | beneficiary_id → beneficiaries; institution_id → institutions; scheme_id → scheme_rules |
| transactions | transaction_id | sender_account and receiver_account → accounts; non-empty application_id → applications |
| institutions | institution_id | none |
| scheme_rules | scheme_id | none |
| accounts | bank_account_id | none |
| account_authorizations | beneficiary_id + bank_account_id | both → corresponding tables |
| ground_truth | record_id | record_id → beneficiaries; non-empty fraud_ring_id → fraud_rings |
| ground_truth_pairs | beneficiary_id_1 + beneficiary_id_2 | both → beneficiaries |
| fraud_rings | fraud_ring_id | each pipe-delimited member_id → beneficiaries |
| scenario_memberships | record_id + fraud_ring_id + scenario_type | record_id → beneficiaries; fraud_ring_id → fraud_rings |
| lookalike_cases | case_id | each member_id → beneficiaries |
| intentional_anomalies | application_id | application_id → applications |

`actual_person_id` is a repeated offline entity key, not a beneficiary key. All alias combinations are positive linkage pairs, including pairs with separate payout accounts. Detection must infer identity linkage from ordinary fields. `ground_truth.csv` gives one primary scenario per record. Use `scenario_memberships.csv` for overlapping scenario labels; CL-017 has five scenario memberships per member.

## Loading order

1. Load reference institutions, scheme rules and accounts from `main/reference/`.
2. Load `main/beneficiaries.csv`, then account authorizations and `main/applications.csv`.
3. Load `main/transactions.csv`. Left-join applications only for DBT rows.
4. Run detection using these files only. `detection_manifest.json` is the allowlist. Do not recursively glob `data/`, which also contains independent sample/stress datasets and evaluation artifacts.
5. In a separate evaluation process, load `ground_truth/ground_truth.csv`, pairs, rings, memberships and control metadata. Never merge them into detection features.

## Financial and administrative assumptions

- Six schemes are entirely fictional. No official MahaDBT or NSP eligibility rule is asserted. No caste, religion, Aadhaar, real bank-account number, or real student dataset is used.
- Academic years run June 1 to May 31. Every application follows registration and every payment follows application. Approved status is the only modeled approval evidence; no approval-date column is implied.
- All beneficiaries in this paid-recipient cohort receive at least one approved award. Rejected, pending and cancelled applications appear as additional claims. This is not a random sample of all applicants.
- A scheme's min/max bounds apply to the total approved award, not each installment. Each approved application is fully paid within its academic year; non-approved applications have zero approved_amount and no payment.
- Schemes SCH-01/SCH-02 are mutually exclusive within TUITION. SCH-04/SCH-05 are exclusive within MAINTENANCE. Exclusivity is per underlying person and academic year. Different exclusive groups are compatible; empty exclusivity groups impose no cross-scheme restriction. The same scheme cannot be awarded twice to the same person in one year. Multiple installments under one application are permitted.
- These rules use ENROLLED plus scheme-specific annual income bands. No academic mark, disability, caste or real-world entitlement is inferred from omitted data.
- All customer accounts start at zero for this closed ledger. GOV-DBT-001 is an externally funded treasury source. Debits never exceed balances available at transaction time. No overdrafts, fees, refunds, interest, cash deposits or hidden opening balances are needed.
- A payout account may belong to multiple beneficiaries. DBT-to-beneficiary attribution must follow application_id, not assume account_id is unique per person. Collector inflows from pooled payout accounts must not be attributed to one person without accounting for that pooling.
- `account_authorizations.csv` provides ordinary guardian permissions. Account reference roles are neutral CUSTOMER/GOVERNMENT; they do not identify fraud or collectors.
- Internal account and phone namespaces prevent actual banking or dialing. Synthetic PINs and IFSC-shaped tokens are not usable for postal/banking operations.

## Known intentional anomalies

- Identity aliases collect multiple same-scheme awards in the same person/year under distinct records.
- Incompatible claims receive awards from both explicitly exclusive tuition schemes; CL-017 also exhibits this behavior across aliases.
- Some GHOST_IDENTITY applications are APPROVED with NOT_FOUND enrollment and paid normally. Every affected application is enumerated in `intentional_anomalies.csv`. There are no unapproved DBT payments and no deliberately unfunded transfers in this release.
- Batch/common-payout/collection/cycle patterns are constructed from actual ordinary records. They are suspicious by injection intent, not proof that any single shared attribute means real-world fraud.
- Corrected claims are cancellation-plus-reapplication on the same beneficiary record. The cancelled application remains unpaid.

## Actual saved examples

### `main/beneficiaries.csv`

```csv
beneficiary_id,full_name,dob,gender,phone,address,district,state,pincode,bank_account_id,ifsc_code,institution_id,registration_date
BEN-008796,Sanjay Akash Iyer,2002-03-20,M,+91-000-5191718,"Flat 80, Building 162, Uday Society, Satara",Satara,Maharashtra,415055,ACC-010144,SYNB0027251,INST-0049,2023-06-18T14:14:57+05:30
```

### `main/applications.csv`

```csv
application_id,beneficiary_id,scheme_id,academic_year,institution_id,enrollment_status,income_band,application_status,approved_amount,application_date
APP-0006448,BEN-004145,SCH-04,2023-24,INST-0056,ENROLLED,100K_TO_250K,APPROVED,16250.00,2023-08-03
```

### `main/transactions.csv`

```csv
transaction_id,timestamp,sender_account,receiver_account,amount,transaction_type,application_id
TXN-00012857,2023-07-31T10:50:32+05:30,GOV-DBT-001,ACC-004861,6000.00,DBT_DISBURSEMENT,APP-0008562
TXN-00008105,2023-08-22T12:46:44+05:30,ACC-022267,ACC-005501,516.00,ACCOUNT_TRANSFER,
```

### `ground_truth/ground_truth.csv`

```csv
record_id,actual_person_id,scenario_type,is_injected_suspicious,fraud_ring_id,description
BEN-004074,PERSON-001663,IDENTITY_CLONING,1,RING-0010,Aliases of the same people claim multiple awards using spelling/initial variants.
```

## Python loading

```python
from scripts.load_dataset import load_detection_data, load_evaluation_labels

beneficiaries, applications, transactions = load_detection_data("data")
# Feed ONLY the three frames above plus ordinary reference data to the engine.

# Separate offline evaluator, after predictions have been saved:
ground_truth = load_evaluation_labels("data")
```

The loader uses Pandas, preserves string identifiers, parses dates and timestamps, and makes transfer application IDs nullable. The generator and validator use only the Python standard library. Run `python scripts/load_dataset.py --data data --with-evaluation-labels` to exercise all four primary CSV loads without joining labels to features.

## Supplementary JSON contracts

`generation_metadata.json`: schema/generator versions, seed/configuration, snapshot cutoff, row counts, unique person count, pair-sampling description and per-CSV SHA-256. It is release metadata, not engine input.

`detection_manifest.json`: schema version and an exact array of allowed ordinary relative CSV paths.

`ground_truth/ring_evidence.json`: `rings` and `benign_cycles` arrays. Ring entries contain fraud_ring_id, exact member_ids, scenario list, payout_accounts, optional collector_account, ordered cycle_accounts and referenced transfer_ids. CL-017 also has target_disbursement_inr. Benign entries contain case_id, cycle_accounts and transfer_ids. These are offline expectations, never precomputed detector scores or community IDs.

`reports/validation_report.json`: PASS/FAIL, executed check groups and computed statistics. Sample/stress reports have the same schema. A FAIL causes a nonzero process exit.
