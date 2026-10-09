# Data dictionary

Schema version 1.0. UTF-8 CSV, comma delimiter, RFC-style double-quote escaping, LF line endings. Monetary values are numeric INR with two decimal places. IDs, phones and PIN codes are strings. Empty CSV cells mean null only where stated below.

## `main/beneficiaries.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| beneficiary_id | string | No | Beneficiary-record key; aliases have different keys. |
| full_name | string | No | Constructed Indian-style full name or a deliberately abbreviated variant. |
| dob | ISO date | No | Birth date; plausible student age at registration. |
| gender | string | No | Synthetic gender category: F, M or X. |
| phone | string | No | Non-dialable synthetic token formatted +91-000-XXXXXXX; shared contacts are intentional. |
| address | string | No | Constructed flat/building/locality/district text. No real address was sourced. |
| district | string | No | Maharashtra district label. See distribution table for the 12 values. |
| state | string | No | Maharashtra for every record. |
| pincode | string | No | Six-digit synthetic geographic token, inspired by regional prefixes; not verified for mail delivery. |
| bank_account_id | string | No | Internal synthetic bank-account node. Never a real bank account number. |
| ifsc_code | string | No | Synthetic 11-character bank/branch token, SYNB0 plus six digits; consistent per account. |
| institution_id | string | No | Local fictional educational institution key. |
| registration_date | ISO timestamp +05:30 | No | Registration timestamp including +05:30 offset; time retained for batch analysis. |

## `main/applications.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| application_id | string | No | Application-record key; empty only for account transfers. |
| beneficiary_id | string | No | Beneficiary-record key; aliases have different keys. |
| scheme_id | string | No | Fictional demonstration scheme key SCH-01 through SCH-06. |
| academic_year | string | No | 2023-24, 2024-25 or 2025-26; June 1 through May 31 in this demonstration. |
| institution_id | string | No | Local fictional educational institution key. |
| enrollment_status | string | No | ENROLLED, COMPLETED, UNVERIFIED or NOT_FOUND. |
| income_band | string | No | UP_TO_100K, 100K_TO_250K or 250K_TO_500K. Annual household INR: <=100000, >100000 to <=250000, >250000 to <=500000. |
| application_status | string | No | APPROVED, REJECTED, PENDING or CANCELLED. |
| approved_amount | decimal INR | No | Total approved award in INR, paid once or in two installments; 0.00 for non-approved applications. |
| application_date | ISO date | No | Application submission date, on or after registration. Approval date is not modeled. |

## `main/transactions.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| transaction_id | string | No | Unique ledger-event identifier, randomized independently of chronological sort order. |
| timestamp | ISO timestamp +05:30 | No | Ledger-event timestamp including +05:30 offset. |
| sender_account | string | No | Account sending money. GOV-DBT-001 for DBT; ACC-* for transfers. |
| receiver_account | string | No | ACC-* account receiving money. |
| amount | decimal INR | No | Positive transaction amount in INR; two decimal places; no grouping or currency symbols. |
| transaction_type | string | No | DBT_DISBURSEMENT or ACCOUNT_TRANSFER. |
| application_id | string | Only ACCOUNT_TRANSFER | Application-record key; empty only for account transfers. |

## `main/reference/institutions.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| institution_id | string | No | Local fictional educational institution key. |
| fictional_institution_name | string | No | Explicitly fictional institution name prefixed Synthetic. |
| district | string | No | Maharashtra district label. See distribution table for the 12 values. |
| institution_type | string | No | DEGREE_COLLEGE, POLYTECHNIC, UNIVERSITY or VOCATIONAL_COLLEGE. |

## `main/reference/scheme_rules.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| scheme_id | string | No | Fictional demonstration scheme key SCH-01 through SCH-06. |
| scheme_name | string | No | Name prefixed Demo; no official scholarship is represented. |
| eligibility_description | string | No | Human-readable fictional rule, not an official government rule. |
| minimum_amount | decimal INR | No | Minimum total approved award in INR for the scheme, inclusive. |
| maximum_amount | decimal INR | No | Maximum total approved award in INR for the scheme, inclusive. |
| exclusivity_group | string | No exclusive group | TUITION, MAINTENANCE or empty. Different schemes in the same non-empty group conflict. |
| allowed_enrollment_statuses | string | No | Pipe-delimited eligibility values; ENROLLED in this release. |
| allowed_income_bands | string | No | Pipe-delimited allowed income categories. |
| exclusivity_scope | string | No | ACTUAL_PERSON_ACADEMIC_YEAR. Engine must infer person linkage; actual person IDs stay offline. |
| award_frequency | string | No | ONE_AWARD_PER_SCHEME_PER_PERSON_PER_YEAR. Installments of one application are not separate awards. |

## `main/reference/accounts.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| bank_account_id | string | No | Internal synthetic bank-account node. Never a real bank account number. |
| account_type | string | No | SAVINGS or TREASURY. |
| fictional_bank_name | string | No | Synthetic Sahyadri Bank 1 through 6. Shared by all kinds of customer accounts. |
| account_role | string | No | CUSTOMER or GOVERNMENT; does not label collectors or suspicious accounts. |

## `main/reference/account_authorizations.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| beneficiary_id | string | No | Beneficiary-record key; aliases have different keys. |
| bank_account_id | string | No | Internal synthetic bank-account node. Never a real bank account number. |
| relationship | string | No | GUARDIAN; ordinary authorization evidence for legitimate guardian account use. |
| authorization_date | ISO date | No | Date guardian payout permission was recorded; on or before application. |

## `ground_truth/ground_truth.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| record_id | string | No | Beneficiary-record foreign key; exactly one offline truth row per beneficiary. |
| actual_person_id | string | No | Underlying simulated person identity. Ghosts each have a distinct fabricated persona; aliases share a key. |
| scenario_type | string | No | Primary scenario in ground_truth/fraud_rings; one scenario per membership row. See README for values. |
| is_injected_suspicious | integer {0,1} | No | 0 for normal/legitimate lookalikes, 1 for deliberately injected suspicious records. |
| fraud_ring_id | string | Only non-suspicious rows | Offline planted-group key, including CL-017; empty only for non-suspicious ground-truth rows. |
| description | string | No | Offline explanation; must never enter model features. |

## `ground_truth/ground_truth_pairs.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| beneficiary_id_1 | string | No | Lexically smaller member of an unordered identity pair. |
| beneficiary_id_2 | string | No | Lexically larger member of an unordered identity pair. |
| same_actual_person | integer {0,1} | No | 0 or 1; verified against the complete person mapping. |

## `ground_truth/fraud_rings.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| fraud_ring_id | string | No | Offline planted-group key, including CL-017; empty only for non-suspicious ground-truth rows. |
| scenario_type | string | No | Primary scenario in ground_truth/fraud_rings; one scenario per membership row. See README for values. |
| member_ids | string | No | Pipe-delimited beneficiary IDs; use split("\|"). This is offline evaluation metadata. |
| intended_suspicious_behavior | string | No | Offline case narrative explaining the planted behavior. |
| expected_evidence | string | No | Pointer to the matching entry in ground_truth/ring_evidence.json. |

## `ground_truth/scenario_memberships.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| record_id | string | No | Beneficiary-record foreign key; exactly one offline truth row per beneficiary. |
| fraud_ring_id | string | No | Offline planted-group key, including CL-017; empty only for non-suspicious ground-truth rows. |
| scenario_type | string | No | Primary scenario in ground_truth/fraud_rings; one scenario per membership row. See README for values. |

## `ground_truth/lookalike_cases.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| case_id | string | No | Unique legitimate control-group key CONTROL-XXXX. |
| case_type | string | No | HOSTEL_ADDRESS, FAMILY_CONTACT, GUARDIAN_ACCOUNT, IDENTICAL_NAME, COMMON_SURNAME, REGISTRATION_CAMP, BENIGN_CYCLE, COMPATIBLE_SCHEMES, CORRECTED_APPLICATION or BENIGN_COLLECTION. |
| member_ids | string | No | Pipe-delimited beneficiary IDs; use split("\|"). This is offline evaluation metadata. |
| explanation | string | No | Offline control/anomaly explanation; exception: authorization is ordinary evidence, not an evaluation label. |

## `ground_truth/intentional_anomalies.csv`

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| application_id | string | No | Application-record key; empty only for account transfers. |
| anomaly_type | string | No | APPROVED_WITHOUT_ENROLLMENT; all such instances are explicitly enumerated. |
| explanation | string | No | Offline control/anomaly explanation; exception: authorization is ordinary evidence, not an evaluation label. |
