"""Versioned CSV contract; no third-party dependencies."""
import csv
from pathlib import Path

SCHEMAS = {
    'main/beneficiaries.csv': 'beneficiary_id full_name dob gender phone address district state pincode bank_account_id ifsc_code institution_id registration_date'.split(),
    'main/applications.csv': 'application_id beneficiary_id scheme_id academic_year institution_id enrollment_status income_band application_status approved_amount application_date'.split(),
    'main/transactions.csv': 'transaction_id timestamp sender_account receiver_account amount transaction_type application_id'.split(),
    'main/reference/institutions.csv': 'institution_id fictional_institution_name district institution_type'.split(),
    'main/reference/scheme_rules.csv': 'scheme_id scheme_name eligibility_description minimum_amount maximum_amount exclusivity_group allowed_enrollment_statuses allowed_income_bands exclusivity_scope award_frequency'.split(),
    'main/reference/accounts.csv': 'bank_account_id account_type fictional_bank_name account_role'.split(),
    'main/reference/account_authorizations.csv': 'beneficiary_id bank_account_id relationship authorization_date'.split(),
    'ground_truth/ground_truth.csv': 'record_id actual_person_id scenario_type is_injected_suspicious fraud_ring_id description'.split(),
    'ground_truth/ground_truth_pairs.csv': 'beneficiary_id_1 beneficiary_id_2 same_actual_person'.split(),
    'ground_truth/fraud_rings.csv': 'fraud_ring_id scenario_type member_ids intended_suspicious_behavior expected_evidence'.split(),
    'ground_truth/scenario_memberships.csv': 'record_id fraud_ring_id scenario_type'.split(),
    'ground_truth/lookalike_cases.csv': 'case_id case_type member_ids explanation'.split(),
    'ground_truth/intentional_anomalies.csv': 'application_id anomaly_type explanation'.split(),
}
SCENARIOS = ('IDENTITY_CLONING', 'SHARED_PAYOUT_ACCOUNT', 'INCOMPATIBLE_SCHEME_CLAIMS',
             'GHOST_IDENTITY', 'COMMON_COLLECTION_ACCOUNT', 'CIRCULAR_TRANSFERS', 'BATCH_FABRICATION')
YEARS = ('2023-24', '2024-25', '2025-26')
STATUSES = ('APPROVED', 'REJECTED', 'PENDING', 'CANCELLED')
ENROLLMENT = ('ENROLLED', 'COMPLETED', 'UNVERIFIED', 'NOT_FOUND')
INCOME = ('UP_TO_100K', '100K_TO_250K', '250K_TO_500K')

def read_csv(path):
    with Path(path).open(encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        return reader.fieldnames, list(reader)

def write_csv(path, columns, rows):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=columns, lineterminator='\n')
        writer.writeheader()
        writer.writerows({c: row.get(c, '') for c in columns} for row in rows)
