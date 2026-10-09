#!/usr/bin/env python3
"""Build current counts, examples and the schema dictionary from a validated release."""
import csv
import io
import json
from pathlib import Path

from schema import SCHEMAS, read_csv

ROOT=Path(__file__).resolve().parents[1]

DESCRIPTIONS={
 'beneficiary_id':'Beneficiary-record key; aliases have different keys.',
 'full_name':'Constructed Indian-style full name or a deliberately abbreviated variant.',
 'dob':'Birth date; plausible student age at registration.',
 'gender':'Synthetic gender category: F, M or X.',
 'phone':'Non-dialable synthetic token formatted +91-000-XXXXXXX; shared contacts are intentional.',
 'address':'Constructed flat/building/locality/district text. No real address was sourced.',
 'district':'Maharashtra district label. See distribution table for the 12 values.',
 'state':'Maharashtra for every record.',
 'pincode':'Six-digit synthetic geographic token, inspired by regional prefixes; not verified for mail delivery.',
 'bank_account_id':'Internal synthetic bank-account node. Never a real bank account number.',
 'ifsc_code':'Synthetic 11-character bank/branch token, SYNB0 plus six digits; consistent per account.',
 'institution_id':'Local fictional educational institution key.',
 'registration_date':'Registration timestamp including +05:30 offset; time retained for batch analysis.',
 'application_id':'Application-record key; empty only for account transfers.',
 'scheme_id':'Fictional demonstration scheme key SCH-01 through SCH-06.',
 'academic_year':'2023-24, 2024-25 or 2025-26; June 1 through May 31 in this demonstration.',
 'enrollment_status':'ENROLLED, COMPLETED, UNVERIFIED or NOT_FOUND.',
 'income_band':'UP_TO_100K, 100K_TO_250K or 250K_TO_500K. Annual household INR: <=100000, >100000 to <=250000, >250000 to <=500000.',
 'application_status':'APPROVED, REJECTED, PENDING or CANCELLED.',
 'approved_amount':'Total approved award in INR, paid once or in two installments; 0.00 for non-approved applications.',
 'application_date':'Application submission date, on or after registration. Approval date is not modeled.',
 'transaction_id':'Unique ledger-event identifier, randomized independently of chronological sort order.',
 'timestamp':'Ledger-event timestamp including +05:30 offset.',
 'sender_account':'Account sending money. GOV-DBT-001 for DBT; ACC-* for transfers.',
 'receiver_account':'ACC-* account receiving money.',
 'amount':'Positive transaction amount in INR; two decimal places; no grouping or currency symbols.',
 'transaction_type':'DBT_DISBURSEMENT or ACCOUNT_TRANSFER.',
 'record_id':'Beneficiary-record foreign key; exactly one offline truth row per beneficiary.',
 'actual_person_id':'Underlying simulated person identity. Ghosts each have a distinct fabricated persona; aliases share a key.',
 'scenario_type':'Primary scenario in ground_truth/fraud_rings; one scenario per membership row. See README for values.',
 'is_injected_suspicious':'0 for normal/legitimate lookalikes, 1 for deliberately injected suspicious records.',
 'fraud_ring_id':'Offline planted-group key, including CL-017; empty only for non-suspicious ground-truth rows.',
 'description':'Offline explanation; must never enter model features.',
 'fictional_institution_name':'Explicitly fictional institution name prefixed Synthetic.',
 'institution_type':'DEGREE_COLLEGE, POLYTECHNIC, UNIVERSITY or VOCATIONAL_COLLEGE.',
 'scheme_name':'Name prefixed Demo; no official scholarship is represented.',
 'eligibility_description':'Human-readable fictional rule, not an official government rule.',
 'minimum_amount':'Minimum total approved award in INR for the scheme, inclusive.',
 'maximum_amount':'Maximum total approved award in INR for the scheme, inclusive.',
 'exclusivity_group':'TUITION, MAINTENANCE or empty. Different schemes in the same non-empty group conflict.',
 'allowed_enrollment_statuses':'Pipe-delimited eligibility values; ENROLLED in this release.',
 'allowed_income_bands':'Pipe-delimited allowed income categories.',
 'exclusivity_scope':'ACTUAL_PERSON_ACADEMIC_YEAR. Engine must infer person linkage; actual person IDs stay offline.',
 'award_frequency':'ONE_AWARD_PER_SCHEME_PER_PERSON_PER_YEAR. Installments of one application are not separate awards.',
 'account_type':'SAVINGS or TREASURY.',
 'fictional_bank_name':'Synthetic Sahyadri Bank 1 through 6. Shared by all kinds of customer accounts.',
 'account_role':'CUSTOMER or GOVERNMENT; does not label collectors or suspicious accounts.',
 'relationship':'GUARDIAN; ordinary authorization evidence for legitimate guardian account use.',
 'authorization_date':'Date guardian payout permission was recorded; on or before application.',
 'beneficiary_id_1':'Lexically smaller member of an unordered identity pair.',
 'beneficiary_id_2':'Lexically larger member of an unordered identity pair.',
 'same_actual_person':'0 or 1; verified against the complete person mapping.',
 'member_ids':'Pipe-delimited beneficiary IDs; use split("|"). This is offline evaluation metadata.',
 'intended_suspicious_behavior':'Offline case narrative explaining the planted behavior.',
 'expected_evidence':'Pointer to the matching entry in ground_truth/ring_evidence.json.',
 'case_id':'Unique legitimate control-group key CONTROL-XXXX.',
 'case_type':'HOSTEL_ADDRESS, FAMILY_CONTACT, GUARDIAN_ACCOUNT, IDENTICAL_NAME, COMMON_SURNAME, REGISTRATION_CAMP, BENIGN_CYCLE, COMPATIBLE_SCHEMES, CORRECTED_APPLICATION or BENIGN_COLLECTION.',
 'explanation':'Offline control/anomaly explanation; exception: authorization is ordinary evidence, not an evaluation label.',
 'anomaly_type':'APPROVED_WITHOUT_ENROLLMENT; all such instances are explicitly enumerated.',
}

def dtype(col):
    if col in ('approved_amount','amount','minimum_amount','maximum_amount'): return 'decimal INR'
    if col in ('same_actual_person','is_injected_suspicious'): return 'integer {0,1}'
    if col in ('dob','application_date','authorization_date'): return 'ISO date'
    if col in ('timestamp','registration_date'): return 'ISO timestamp +05:30'
    return 'string'

def write(name,text): (ROOT/name).write_text(text.strip()+'\n',encoding='utf-8')

def table(mapping,label='Category'):
    return '\n'.join([f'| {label} | Count |','|---|---:|']+[f'| {k} | {v:,} |' for k,v in sorted(mapping.items())])

def main():
    report=json.loads((ROOT/'reports/validation_report.json').read_text())
    assert report['status']=='PASS'
    s=report['statistics']
    dictionary=['# Data dictionary','', 'Schema version 1.0. UTF-8 CSV, comma delimiter, RFC-style double-quote escaping, LF line endings. Monetary values are numeric INR with two decimal places. IDs, phones and PIN codes are strings. Empty CSV cells mean null only where stated below.','']
    for path,columns in SCHEMAS.items():
        dictionary += [f'## `{path}`','', '| Column | Type | Nullable | Meaning |','|---|---|---|---|']
        for col in columns:
            null='No'
            if path=='main/transactions.csv' and col=='application_id': null='Only ACCOUNT_TRANSFER'
            if path=='ground_truth/ground_truth.csv' and col=='fraud_ring_id': null='Only non-suspicious rows'
            if col=='exclusivity_group': null='No exclusive group'
            meaning=DESCRIPTIONS[col].replace('|','\\|')
            dictionary.append(f'| {col} | {dtype(col)} | {null} | {meaning} |')
        dictionary.append('')
    write('DATA_DICTIONARY.md','\n'.join(dictionary))

    headers=[]
    for path,cols in SCHEMAS.items(): headers += [f'### `{path}`','', '```csv',','.join(cols),'```','']
    examples=[]
    for path in ('main/beneficiaries.csv','main/applications.csv','main/transactions.csv','ground_truth/ground_truth.csv'):
        columns,rows=read_csv(ROOT/'data'/path)
        selected=[rows[0]]
        if path.endswith('transactions.csv'): selected.append(next(r for r in rows if r['transaction_type']=='ACCOUNT_TRANSFER'))
        buf=io.StringIO(); writer=csv.DictWriter(buf,fieldnames=columns,lineterminator='\n'); writer.writeheader(); writer.writerows(selected)
        examples += [f'### `{path}`','', '```csv',buf.getvalue().strip(),'```','']
    contract='''# GrantLens dataset compatibility contract

Version: 1.0. Main dataset root: `data/`. Only `data/main/` and its references are detection inputs. `ground_truth.csv` is provided for offline evaluation, not engine input. No mandatory column has been renamed or added.

## Exact CSV headers

'''+ '\n'.join(headers)+'''
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

'''+ '\n'.join(examples)+'''
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
'''
    write('DATASET_CONTRACT.md',contract)

    summary=['# GrantLens dataset summary','', 'Computed from the validated, saved 10,000-beneficiary release with seed 42. No fraud detection model was run and no accuracy is claimed.','',
       '| Metric | Value |','|---|---:|']
    for title,key in [('Beneficiary records','beneficiaries'),('Underlying synthetic personas','unique_actual_people'),('Applications','applications'),('Approved applications','approved_applications'),('DBT disbursements','dbt_disbursements'),('Account transfers','account_transfers'),('Intentionally suspicious beneficiaries','suspicious_beneficiaries'),('Planted rings','planted_rings'),('Duplicate identity groups','duplicate_identity_groups'),('Known positive identity pairs','positive_identity_pairs'),('Sampled negative identity pairs','sampled_negative_pairs'),('Directed simple cycles in aggregate transfer graph','directed_simple_cycles'),('Chronologically verified suspicious cycle sequences','verified_suspicious_cycle_sequences'),('Chronologically verified benign cycle sequences','verified_benign_cycle_sequences'),('Legitimate lookalike cases','legitimate_lookalike_cases'),('Distinct beneficiaries in legitimate controls','legitimate_lookalike_beneficiaries'),('Explicit enrollment anomalies','intentional_enrollment_anomalies')]:
        summary.append(f'| {title} | {s[key]:,} |')
    summary+= [f'| Total disbursed INR | {s["total_disbursed_inr"]} |','', '## Suspicious scenario counts','', 'Primary counts partition suspicious records. Multi-label counts include overlapping CL-017 memberships; do not add them to get unique beneficiaries.','',table({k:v for k,v in s['primary_scenario_counts'].items() if not k.startswith('LEGIT_') and k!='NORMAL'},'Primary scenario'),'',table(s['multi_label_scenario_counts'],'All scenario memberships'),'', '## Planted ring sizes','',table(s['ring_sizes'],'Beneficiaries per ring'),'', '## Applications by scheme','',table(s['applications_by_scheme'],'Scheme'),'', '## Approval statuses','',table(s['applications_by_status'],'Status'),'', '## Academic years','',table(s['applications_by_academic_year'],'Academic year'),'', '## District distribution','',table(s['beneficiaries_by_district'],'District'),'', '## Legitimate controls','',table(s['lookalike_cases_by_type'],'Control type'),'', 'There are 30 documented guardian-account cases (60 genuine students) and 30 hostel-address cases (150 students), plus family and registration-camp address sharing. Control groups can overlap service-payment controls; case counts and beneficiary counts are different. Many other ordinary students share institutions and surnames.','', '## Reused identifiers','', '| Field | Reused values | Records sharing values | Maximum group |','|---|---:|---:|---:|']
    for col,counts in s['reused_fields'].items(): summary.append(f'| {col} | {counts["reused_values"]} | {counts["records_in_reused_values"]} | {counts["maximum_multiplicity"]} |')
    summary+=['','## Demo CL-017','', 'Sixteen beneficiary records represent eight underlying personas. Exactly two payout accounts, four phones and three addresses connect them. Thirty-two paid awards across 2023-24 and 2024-25 total INR 820000.00. Each record receives 25000.00 then 26250.00.','',f'Payout accounts: {", ".join(s["cl017"]["payout_accounts"])}. Collector: {s["cl017"]["collector_account"]}.','',f'Funded directed cycle: {" → ".join(s["cl017"]["cycle_accounts"]+[s["cl017"]["cycle_accounts"][0]])}.','', 'Exact members:','']+['- '+bid for bid in s['cl017']['members']]
    summary+=['','CL-017 is an offline case label, never an expected Louvain community number. The aggregate graph has 52 simple cycles but 51 explicitly staged chronological cycle sequences: CL-017 adds a second aggregate graph cycle through its collection edges. Cycle existence alone is not a fraud label.','', '## Graph connectivity and leakage checks','',f'The identity/contact/address plus customer-transfer graph has {s["identity_financial_graph"]["beneficiary_components"]:,} beneficiary components; its largest contains {s["identity_financial_graph"]["largest_beneficiary_component"]:,} records. Government source, institution and scheme nodes are excluded from this investigative view. Shared benign service accounts can legitimately form large components. Keep those context nodes in the full heterogeneous graph for explanation; see README for graph-view guidance.','', 'Suspicious records by beneficiary-ID decile (0 = lowest IDs):','',table(s['suspicious_by_beneficiary_id_decile'],'ID decile'),'', 'Detection inputs contain no ground-truth fields or labels. IDs and row order are randomized. This design check is not an empirical guarantee against all synthetic artifacts; validate on unseen generator seeds and real permitted data before deployment.','', '## Evaluation protocol','', 'See `EVALUATION.md` for pairwise precision/recall, beneficiary false-positive rates, scenario metrics, ring discovery and leakage-safe splits. Ground truth is complete at the beneficiary/person level; negative pairs are sampled and must not be mistaken for the full pair universe.','', '## Execution evidence','', 'Main, 1,000-row sample and 50,000-row stress datasets were generated and validated. `reports/release_checks.json` records actual timings and hashes; `reports/test_results.txt` records the automated test run. Re-run the commands in README after changing configuration.']
    write('dataset_summary.md','\n'.join(summary))

if __name__=='__main__': main()
