"""Fictional fixtures; labels are written only to the evaluation file."""
import json
from pathlib import Path
import numpy as np
import pandas as pd


def generate(directory, count=10000, seed=17):
    if count < 300:
        raise ValueError('At least 300 records are needed for all scenarios')
    path = Path(directory)
    path.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(seed)
    first = ['Ramesh', 'Asha', 'Kiran', 'Meera', 'Sanjay', 'Nisha', 'Arun', 'Priya', 'Rohit', 'Neha']
    last = ['Pawar', 'Patil', 'Sharma', 'Rao', 'Das', 'Singh', 'Joshi', 'Iyer', 'Nair', 'Sen']
    b, truth = [], []
    for i in range(count):
        b.append(dict(beneficiary_id=f'BEN-{i+1:06}', full_name=f'{rng.choice(first)} {chr(65+i%26)} {rng.choice(last)}',
                      dob=str(pd.Timestamp('1998-01-01')+pd.Timedelta(days=int(rng.integers(0,3000))))[:10],
                      gender='F' if i%2 else 'M', phone=f'TEST-{i+1000000000}', address=f'{i+1} Fictional Lane',
                      district=f'Demo District {i%12}', state='Demo Maharashtra', pincode=f'{410000+i%200}',
                      bank_account_id=f'SYN-ACC-{i+1:08}', ifsc_code='TEST0000001', institution_id=f'INST-{i%30:03}',
                      registration_date=f'2024-{1+i%9:02}-{1+i%27:02}T10:00:00'))
        truth.append(dict(record_id=b[-1]['beneficiary_id'], actual_person_id=f'PERSON-{i}', scenario_type='ordinary',
                          is_injected_suspicious=False, fraud_ring_id='', description='Entirely fictional test record'))

    def label(indices, scenario, ring):
        for i in indices:
            truth[i].update(scenario_type=scenario, is_injected_suspicious=True, fraud_ring_id=ring)

    # Stable demo case is an analyst mapping, never an algorithmic community ID.
    for i in range(16):
        b[i]['bank_account_id'] = 'SYN-DEMO-PAYOUT-017'
    label(range(16), 'shared_payout', 'RING-SHARED')
    for start in range(20, 50, 3):
        for j in range(3):
            i = start+j
            for key in ['dob', 'phone', 'address', 'district', 'pincode']:
                b[i][key] = b[start][key]
            b[i]['full_name'] = ['Ramesh Shivaji Pawar', 'Ramesh S Pawar', 'R. Shivaji Pawar'][j]
            truth[i]['actual_person_id'] = f'PERSON-{start}'
        label(range(start,start+3), 'identity_cloning', f'RING-ID-{start}')
    label(range(60,70), 'scheme_overlap', 'RING-SCHEME')
    for start, scenario in [(80,'ghost_identity'), (100,'batch_fabrication')]:
        for i in range(start,start+12):
            b[i].update(full_name=f'Kiran {chr(65+i-start)} Patil', address=f'Fictional Compound {start}',
                        institution_id='INST-029', registration_date=f'2024-10-01T09:00:{i-start:02}',
                        bank_account_id=f'SYN-BATCH-{start}-{(i-start)//4}', phone=f'TEST-{9000000000+i-start}')
        label(range(start,start+12), scenario, f'RING-{start}')
    label(range(120,130), 'collector', 'RING-COLLECTOR')
    label(range(140,146), 'circular_transfer', 'RING-CYCLE')
    # Legitimate controls: hostel, family, guardian, identical names and valid awards.
    for i in range(160,180):
        b[i]['address'] = 'Fictional Student Hostel'
        truth[i]['scenario_type'] = 'legitimate_hostel'
    for i in [180,181]:
        b[i]['phone'] = 'TEST-8888888888'
        b[i]['bank_account_id'] = 'SYN-GUARDIAN-001'
        truth[i]['scenario_type'] = 'legitimate_guardian'
    b[182]['full_name'] = b[183]['full_name'] = 'Asha N Patil'
    truth[182]['scenario_type'] = truth[183]['scenario_type'] = 'legitimate_same_name'
    apps, tx = [], []
    def application(i, scheme):
        aid = f'APP-{len(apps)+1:07}'
        apps.append(dict(application_id=aid, beneficiary_id=b[i]['beneficiary_id'], scheme_id=scheme,
                         academic_year=f'{2024+i%2}-{str(2025+i%2)[-2:]}', institution_id=b[i]['institution_id'],
                         enrollment_status='Enrolled', income_band='Below 2 lakh', application_status='Approved',
                         approved_amount=12000, application_date='2024-10-10'))
        tx.append(dict(transaction_id=f'TXN-{len(tx)+1:07}', timestamp='2024-11-01T09:00:00',
                       sender_account='SYN-GOV-TREASURY', receiver_account=b[i]['bank_account_id'], amount=12000,
                       transaction_type='DISBURSEMENT', application_id=aid))
    for i in range(count):
        application(i, 'SCH-01' if 60 <= i < 70 else f'SCH-{1+i%4:02}')
        if i%3 == 0 and not 60 <= i < 70:
            application(i, 'SCH-05')
        if 60 <= i < 70:
            application(i, 'SCH-02')
    def transfer(source, target, minute):
        tx.append(dict(transaction_id=f'TXN-{len(tx)+1:07}', timestamp=f'2024-11-02T10:{minute:02}:00',
                       sender_account=source, receiver_account=target, amount=3000, transaction_type='TRANSFER', application_id=''))
    for i in range(120,130):
        transfer(b[i]['bank_account_id'], 'SYN-COLLECTOR-001', i-120)
    for start in [140,143]:
        for j in range(3):
            transfer(b[start+j]['bank_account_id'], b[start+(j+1)%3]['bank_account_id'], j)
    for name, rows in [('beneficiaries',b),('applications',apps),('transactions',tx),('ground_truth',truth)]:
        pd.DataFrame(rows).to_csv(path/f'{name}.csv', index=False)
    (path/'demo_cases.json').write_text(json.dumps({'CL-017':[x['beneficiary_id'] for x in b[:16]]}), encoding='utf-8')
    (path/'DATA_NOTICE.txt').write_text('Entirely fictional. TEST phones and SYN accounts are deliberately non-operational. No Aadhaar identifiers. Institutions and schemes are fictional.', encoding='utf-8')
    return path
