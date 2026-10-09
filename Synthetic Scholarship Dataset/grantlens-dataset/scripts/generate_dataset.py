#!/usr/bin/env python3
"""Generate a reproducible, funded synthetic scholarship ledger using only stdlib."""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
from itertools import combinations
import json
from pathlib import Path
import random

from schema import SCHEMAS, SCENARIOS, YEARS, INCOME, write_csv

IST = timezone(timedelta(hours=5, minutes=30))
DISTRICTS = [('Pune','411',16), ('Nagpur','440',11), ('Nashik','422',10),
             ('Thane','400',12), ('Mumbai','400',10), ('Kolhapur','416',7),
             ('Satara','415',7), ('Solapur','413',8), ('Amravati','444',6),
             ('Jalgaon','425',6), ('Nanded','431',4), ('Latur','413',3)]
MALE = 'Aarav Aditya Akash Akshay Amol Aniket Ashwin Atharva Avinash Chirag Darshan Dev Dhruv Farhan Gaurav Harsh Hemant Ishan Jay Karan Kunal Madhav Manish Mihir Mohan Nikhil Omkar Pranav Rahul Raj Ramesh Rohan Rohit Sachin Sahil Sameer Sanjay Shaurya Siddharth Soham Suraj Tanmay Tejas Tushar Varun Vedant Vijay Vikram Vishal Yash Yusuf Zaid'.split()
FEMALE = 'Aarti Aditi Aishwarya Akanksha Amruta Ananya Anjali Ankita Aparna Ayesha Deepa Diya Fatima Gauri Isha Janhavi Juhi Kavya Kirti Madhura Manasi Meera Mukta Neha Nidhi Pallavi Pooja Prachi Priya Radhika Riya Sakshi Sana Sanika Sayali Shreya Shruti Simran Sneha Sonali Supriya Swara Tanvi Vaishnavi Vidya Zara'.split()
SURNAMES = 'Patil Pawar Jadhav Shinde Deshmukh Kulkarni Joshi More Chavan Bhosale Wagh Kadam Sawant Kale Gaikwad Khot Shah Jain Khan Shaikh Ansari Qureshi Dsouza Fernandes Thomas Naik Salunkhe Gawande Banerjee Gupta Yadav Singh Iyer Nair Menon Reddy Mishra Verma Suryawanshi Ingale'.split()
AREAS = ['Kalpataru Enclave', 'Neelkamal Nagar', 'Abhinav Colony', 'Sahyadri Gardens', 'Uday Society', 'Chaitra Vihar', 'Suman Layout', 'Tarang Nagar']

def ts(d):
    return d.isoformat(timespec='seconds')

def dt(year, month=6, day=1):
    return datetime(year, month, day, 9, tzinfo=IST)

def generate(beneficiaries=10000, seed=42, output='data', disbursements_per_beneficiary=1.35):
    if beneficiaries < 1000:
        raise ValueError('At least 1000 beneficiaries are required for the complete scenario suite.')
    if not 1.25 <= disbursements_per_beneficiary <= 1.5:
        raise ValueError('disbursements_per_beneficiary must be between 1.25 and 1.5')
    n, rng, out = beneficiaries, random.Random(seed), Path(output)
    tables = {p: [] for p in SCHEMAS}
    b = tables['main/beneficiaries.csv']
    apps = tables['main/applications.csv']
    transactions = tables['main/transactions.csv']
    accounts = tables['main/reference/accounts.csv']
    institutions = tables['main/reference/institutions.csv']
    rules = tables['main/reference/scheme_rules.csv']
    truth, rings, memberships = {}, [], []
    evidence, lookalikes, anomalies, authorizations = [], [], [], []
    scale = max(1, n // 1000)
    # IDs are assigned independently of row position and all scenario choices.
    ben_ids = rng.sample(range(1, n + 1), n)
    person_ids = rng.sample(range(1, n + 1), n)
    acc_pool = iter(rng.sample(range(1, n * 3 + 1), n * 3))
    phone_pool = iter(rng.sample(range(1000000, 9999999), n * 2))
    account_ifsc = {}

    def new_account(government=False):
        a = 'GOV-DBT-001' if government else f'ACC-{next(acc_pool):06d}'
        bank = rng.randrange(1, 7)
        accounts.append(dict(bank_account_id=a, account_type='TREASURY' if government else 'SAVINGS',
                             fictional_bank_name=f'Synthetic Sahyadri Bank {bank}',
                             account_role='GOVERNMENT' if government else 'CUSTOMER'))
        account_ifsc[a] = f'SYNB0{bank:02d}{rng.randrange(1, 10000):04d}'
        return a

    gov = new_account(True)
    inst_by_district = defaultdict(list)
    for d, _, _ in DISTRICTS:
        for j in range(8):
            iid = f'INST-{len(institutions)+1:04d}'
            typ = ['DEGREE_COLLEGE','POLYTECHNIC','UNIVERSITY','VOCATIONAL_COLLEGE'][j % 4]
            institutions.append(dict(institution_id=iid, fictional_institution_name=f'Synthetic {d} {AREAS[j].split()[0]} Institute {j+1}', district=d, institution_type=typ))
            inst_by_district[d].append(iid)
    for sid, name, lo, hi, group, bands in [
        ('SCH-01','Demo Tuition Support',15000,60000,'TUITION',INCOME[:2]),
        ('SCH-02','Demo Fee Reimbursement',20000,65000,'TUITION',INCOME),
        ('SCH-03','Demo Study Materials Grant',3000,12000,'',INCOME),
        ('SCH-04','Demo Maintenance Assistance',8000,24000,'MAINTENANCE',INCOME[:2]),
        ('SCH-05','Demo Residential Study Assistance',12000,30000,'MAINTENANCE',INCOME[:2]),
        ('SCH-06','Demo Education Progress Award',6000,18000,'',INCOME),
    ]:
        rules.append(dict(scheme_id=sid, scheme_name=name, eligibility_description='Fictional demonstration rule: enrolled student with an allowed household income band. No official government eligibility claim.', minimum_amount=lo, maximum_amount=hi, exclusivity_group=group, allowed_enrollment_statuses='ENROLLED', allowed_income_bands='|'.join(bands), exclusivity_scope='ACTUAL_PERSON_ACADEMIC_YEAR', award_frequency='ONE_AWARD_PER_SCHEME_PER_PERSON_PER_YEAR'))
    rule_map = {r['scheme_id']: r for r in rules}
    for i in range(n):
        district, prefix, _ = rng.choices(DISTRICTS, weights=[d[2] for d in DISTRICTS])[0]
        gender = rng.choices(['F','M','X'], weights=[49,50,1])[0]
        first = rng.choice(FEMALE if gender == 'F' else MALE)
        full_name = ' '.join([first, rng.choice(MALE), rng.choice(SURNAMES)])
        acc = new_account()
        reg_year = rng.choices([2023,2024,2025], weights=[45,35,20])[0]
        bid = f'BEN-{ben_ids[i]:06d}'
        record = dict(beneficiary_id=bid, full_name=full_name,
                      dob=f'{rng.choices(range(1999,2007), weights=[2,4,10,18,22,20,16,8])[0]}-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}', gender=gender,
                      phone=f'+91-000-{next(phone_pool):07d}',
                      address=f'Flat {rng.randint(1,80)}, Building {rng.randint(1,400)}, {rng.choice(AREAS)}, {district}',
                      district=district, state='Maharashtra', pincode=prefix+f'{rng.randint(1,99):03d}',
                      bank_account_id=acc, ifsc_code=account_ifsc[acc], institution_id=rng.choice(inst_by_district[district]),
                      registration_date=ts(dt(reg_year)+timedelta(days=rng.randrange(35),seconds=rng.randrange(8*3600))))
        b.append(record)
        truth[bid] = dict(record_id=bid, actual_person_id=f'PERSON-{person_ids[i]:06d}', scenario_type='NORMAL', is_injected_suspicious=0, fraud_ring_id='', description='Distinct synthetic scholarship student; no injected suspicious behavior.')
    by_id = {r['beneficiary_id']: r for r in b}
    available = list(b)
    rng.shuffle(available)

    def take(count):
        result = available[-count:]
        del available[-count:]
        return result

    def share_account(rows, count=1):
        shared = [r['bank_account_id'] for r in rows[:count]]
        for j, r in enumerate(rows):
            r['bank_account_id'] = shared[j % count]
            r['ifsc_code'] = account_ifsc[r['bank_account_id']]

    def colocate(rows, timing=False):
        anchor = rows[0]
        for j, r in enumerate(rows):
            r['address'] = r['address'].replace(r['district'],anchor['district'])
            for col in ['district','pincode','institution_id']:
                r[col] = anchor[col]
            if timing:
                r['registration_date'] = ts(datetime.fromisoformat(anchor['registration_date'])+timedelta(seconds=45*j))

    def set_aliases(rows, group_size):
        for start in range(0, len(rows), group_size):
            part = rows[start:start+group_size]
            base = part[0]
            first, middle, last = base['full_name'].split()
            variants = [base['full_name'], f'{first} {middle[0]} {last}', f'{first[0]}. {middle[0]}. {last}']
            for j, r in enumerate(part):
                for col in ['dob','gender','district','pincode','institution_id','registration_date']:
                    r[col] = base[col]
                r['full_name'] = variants[j % 3]
                r['phone'] = base['phone']
                r['address'] = base['address'] if j < 2 else base['address'].replace('Building', 'Bldg')
                truth[r['beneficiary_id']]['actual_person_id'] = truth[base['beneficiary_id']]['actual_person_id']

    def add_ring(rows, scenario, rid=None, extra=()):
        rid = rid or f'RING-{len(rings)+1:04d}'
        desc = {
            'IDENTITY_CLONING':'Aliases of the same people claim multiple awards using spelling/initial variants.',
            'SHARED_PAYOUT_ACCOUNT':'Unrelated identities concentrate awards in a small payout-account hub.',
            'INCOMPATIBLE_SCHEME_CLAIMS':'Connected students receive both mutually exclusive tuition awards in one academic year.',
            'GHOST_IDENTITY':'Fabricated claims share payout/contact infrastructure; some receive approval despite missing enrollment.',
            'COMMON_COLLECTION_ACCOUNT':'Recipients forward a portion of funded scholarships to a common downstream account.',
            'CIRCULAR_TRANSFERS':'A chronological funded sequence returns money to its origin.',
            'BATCH_FABRICATION':'Closely timed registrations, related names/contacts and common payouts indicate coordinated creation.',
        }[scenario]
        ring = dict(fraud_ring_id=rid, scenario_type=scenario, member_ids='|'.join(r['beneficiary_id'] for r in rows), intended_suspicious_behavior=desc, expected_evidence=f'ground_truth/ring_evidence.json: {rid}')
        rings.append(ring)
        for r in rows:
            g = truth[r['beneficiary_id']]
            g.update(scenario_type=scenario,is_injected_suspicious=1,fraud_ring_id=rid,description=desc)
            for s in (scenario, *extra):
                memberships.append(dict(record_id=r['beneficiary_id'],fraud_ring_id=rid,scenario_type=s))
        ev = dict(fraud_ring_id=rid, member_ids=[r['beneficiary_id'] for r in rows], scenarios=[scenario,*extra], collector_account=None, cycle_accounts=[], transfer_ids=[])
        evidence.append(ev)
        return ev

    demo = take(16)
    colocate(demo)
    for r in demo:
        r['registration_date'] = ts(dt(2023)+timedelta(days=rng.randrange(30),seconds=rng.randrange(3600)))
    set_aliases(demo,2)
    share_account(demo,2)
    demo_phones = [demo[i]['phone'] for i in [0,2,4,6]]
    demo_addresses = [demo[i]['address'] for i in [0,2,4]]
    for j, r in enumerate(demo):
        r['phone'] = demo_phones[(j//2) % 4]
        r['address'] = demo_addresses[(j//2) % 3]
    demo_ev = add_ring(demo,'IDENTITY_CLONING','CL-017',('SHARED_PAYOUT_ACCOUNT','INCOMPATIBLE_SCHEME_CLAIMS','COMMON_COLLECTION_ACCOUNT','CIRCULAR_TRANSFERS'))
    demo_ev['target_disbursement_inr'] = 820000
    demo_ev['collector_account'] = new_account()
    demo_ev['cycle_accounts'] = [demo[0]['bank_account_id'],demo_ev['collector_account'],demo[1]['bank_account_id']]
    demo_ids = {r['beneficiary_id'] for r in demo}
    ghost_leaders = set()
    for scenario, groups, size in [('IDENTITY_CLONING',6,3),('SHARED_PAYOUT_ACCOUNT',2,10),('INCOMPATIBLE_SCHEME_CLAIMS',2,5),('GHOST_IDENTITY',2,8),('COMMON_COLLECTION_ACCOUNT',2,8),('CIRCULAR_TRANSFERS',2,4),('BATCH_FABRICATION',2,10)]:
        for _ in range(groups*scale):
            rows = take(size)
            colocate(rows, scenario in ('GHOST_IDENTITY','BATCH_FABRICATION'))
            if scenario == 'IDENTITY_CLONING':
                set_aliases(rows,3)
                if rng.random() < .4:
                    share_account(rows,2)
            elif scenario in ('SHARED_PAYOUT_ACCOUNT','GHOST_IDENTITY','BATCH_FABRICATION'):
                share_account(rows, rng.choice([1,2]))
                for j, r in enumerate(rows):
                    r['address'] = rows[j % 2]['address']
                    if scenario == 'GHOST_IDENTITY':
                        r['phone'] = rows[j % 2]['phone']
                    elif scenario == 'BATCH_FABRICATION':
                        r['phone'] = f'+91-000-{int(rows[0]["phone"][-7:])+j:07d}'
                        first, middle, last = rows[0]['full_name'].split()
                        r['full_name'] = f'{first} {rng.choice(MALE)} {last}'
            elif scenario == 'INCOMPATIBLE_SCHEME_CLAIMS':
                for r in rows:
                    r['phone'] = rows[0]['phone']
                    r['address'] = rows[0]['address']
            ev = add_ring(rows,scenario)
            if scenario == 'GHOST_IDENTITY':
                ghost_leaders.add(rows[0]['beneficiary_id'])
            if scenario == 'COMMON_COLLECTION_ACCOUNT':
                ev['collector_account'] = new_account()
            if scenario == 'CIRCULAR_TRANSFERS':
                ev['cycle_accounts'] = [r['bank_account_id'] for r in rows]

    def add_look(rows, typ, explanation):
        lookalikes.append(dict(case_id=f'CONTROL-{len(lookalikes)+1:04d}',case_type=typ,member_ids='|'.join(r['beneficiary_id'] for r in rows),explanation=explanation))
        for r in rows:
            truth[r['beneficiary_id']].update(scenario_type=f'LEGIT_{typ}',description=explanation)

    benign_cycles = []
    compatible_ids, corrected_ids = set(), set()
    for _ in range(3*scale):
        rows = take(5); colocate(rows)
        for r in rows: r['address'] = rows[0]['address']
        add_look(rows,'HOSTEL_ADDRESS','Five distinct residents share a hostel address; individual accounts and contacts.')
        rows = take(3); colocate(rows)
        for r in rows:
            r['phone'],r['address'] = rows[0]['phone'],rows[0]['address']
        add_look(rows,'FAMILY_CONTACT','Distinct family members share their household contact and residence.')
        rows = take(2); colocate(rows); share_account(rows)
        for r in rows:
            r['address'],r['phone'] = rows[0]['address'],rows[0]['phone']
            authorizations.append(dict(beneficiary_id=r['beneficiary_id'],bank_account_id=r['bank_account_id'],relationship='GUARDIAN',authorization_date=r['registration_date'][:10]))
        add_look(rows,'GUARDIAN_ACCOUNT','Two distinct students have recorded guardian payout authorization.')
        rows = take(2); colocate(rows)
        rows[1]['full_name'] = rows[0]['full_name']
        rows[1]['dob'] = ('2000' if rows[0]['dob'][:4] != '2000' else '2001')+rows[0]['dob'][4:]
        add_look(rows,'IDENTICAL_NAME','Same full name, distinct birth dates, contacts and accounts.')
        rows = take(3); colocate(rows)
        for r in rows:
            r['full_name'] = ' '.join(r['full_name'].split()[:2]+[rows[0]['full_name'].split()[-1]])
        add_look(rows,'COMMON_SURNAME','Distinct local students share a common surname and institution.')
        rows = take(3); colocate(rows,True)
        for r in rows: r['address'] = rows[0]['address']
        add_look(rows,'REGISTRATION_CAMP','Genuine campus enrollment camp produces a short registration burst.')
        rows = take(3); colocate(rows)
        cycle = [r['bank_account_id'] for r in rows]
        benign_cycles.append(dict(case_id=f'CONTROL-{len(lookalikes)+1:04d}',cycle_accounts=cycle,transfer_ids=[]))
        add_look(rows,'BENIGN_CYCLE','A funded roommate expense advance is repaid through three accounts.')
        rows = take(2)
        compatible_ids.update(r['beneficiary_id'] for r in rows)
        add_look(rows,'COMPATIBLE_SCHEMES','Tuition and study-material support are permitted together in the same year.')
        rows = take(2)
        corrected_ids.update(r['beneficiary_id'] for r in rows)
        add_look(rows,'CORRECTED_APPLICATION','An earlier cancelled application is replaced by one approved claim; cancelled claim is unpaid.')

    app_by_ben = defaultdict(list)
    person_claims = defaultdict(set)
    income_by_person = {}
    for r in b:
        pid = truth[r['beneficiary_id']]['actual_person_id']
        if pid not in income_by_person:
            income_by_person[pid] = rng.choices(INCOME,weights=[45,40,15])[0]

    def application(r, scheme, year, status='APPROVED', amount=None, bad_enrollment=False, offset=None):
        rule = rule_map[scheme]
        reg = datetime.fromisoformat(r['registration_date'])
        date = max(dt(year,7,15)+timedelta(days=rng.randrange(110) if offset is None else offset), reg+timedelta(days=7))
        pid = truth[r['beneficiary_id']]['actual_person_id']
        inc = income_by_person[pid]
        if inc not in rule['allowed_income_bands'].split('|'):
            income_by_person[pid] = inc = '100K_TO_250K'
        amount = (amount if amount is not None else int(rng.triangular(rule['minimum_amount'],rule['maximum_amount'],rule['minimum_amount']*1.3)//250)*250) if status == 'APPROVED' else 0
        a = dict(application_id=f'TEMP-{len(apps)}',beneficiary_id=r['beneficiary_id'],scheme_id=scheme,academic_year=f'{year}-{str(year+1)[2:]}',institution_id=r['institution_id'],enrollment_status='NOT_FOUND' if bad_enrollment else ('ENROLLED' if status=='APPROVED' else rng.choice(['ENROLLED','UNVERIFIED','NOT_FOUND','COMPLETED'])),income_band=inc,application_status=status,approved_amount=f'{amount:.2f}',application_date=date.date().isoformat())
        apps.append(a); app_by_ben[r['beneficiary_id']].append(a)
        if status == 'APPROVED': person_claims[(pid,year)].add(scheme)
        if bad_enrollment:
            anomalies.append(dict(application_id=a['application_id'],anomaly_type='APPROVED_WITHOUT_ENROLLMENT',explanation='Planted ghost claim approved and paid despite NOT_FOUND enrollment.'))
        return a

    for r in b:
        bid = r['beneficiary_id']; scenario = truth[bid]['scenario_type']
        year = int(r['registration_date'][:4])
        if bid in demo_ids:
            scheme = 'SCH-01' if demo.index(r) % 2 == 0 else 'SCH-02'
            application(r,scheme,2023,amount=25000)
            application(r,scheme,2024,amount=26250)
        elif scenario == 'INCOMPATIBLE_SCHEME_CLAIMS':
            application(r,'SCH-01',year); application(r,'SCH-02',year)
        elif bid in compatible_ids:
            application(r,'SCH-01',year); application(r,'SCH-03',year)
        else:
            scheme = rng.choices(list(rule_map),weights=[28,22,15,14,9,12])[0]
            if scenario == 'IDENTITY_CLONING': scheme = 'SCH-01'
            if bid in corrected_ids:
                application(r,scheme,year,status='CANCELLED',offset=0)
                application(r,scheme,year,offset=35)
            else:
                application(r,scheme,year,bad_enrollment=scenario=='GHOST_IDENTITY' and (bid in ghost_leaders or rng.random()<.65))
    # Make household income stable across every claim of an underlying person.
    def align_income():
        for a in apps: a['income_band'] = income_by_person[truth[a['beneficiary_id']]['actual_person_id']]

    # Every approved award is paid completely, sometimes in two installments.
    approved = [a for a in apps if a['application_status']=='APPROVED']
    split_ids = {a['application_id'] for a in approved if a['beneficiary_id'] not in demo_ids and rng.random()<.09}
    target = round(n*disbursements_per_beneficiary)
    needed = target-len(approved)-len(split_ids)
    if needed < 0: raise ValueError('Configuration leaves too few disbursements for required scenarios')
    candidates = [r for r in b if not truth[r['beneficiary_id']]['is_injected_suspicious'] and r['beneficiary_id'] not in corrected_ids]
    for _ in range(needed):
        for attempt in range(100):
            r = rng.choice(candidates)
            year = rng.randint(int(r['registration_date'][:4]),2025)
            pid = truth[r['beneficiary_id']]['actual_person_id']
            prior = person_claims[(pid,year)]
            choices = [s for s in rule_map if s not in prior and not any(rule_map[s]['exclusivity_group'] and rule_map[s]['exclusivity_group']==rule_map[p]['exclusivity_group'] for p in prior)]
            if choices:
                application(r,rng.choice(choices),year)
                break
        else: raise RuntimeError('Could not find a compatible extra application')
    for r in rng.sample(b,round(n*.18)):
        year = rng.randint(int(r['registration_date'][:4]),2025)
        application(r,rng.choice(list(rule_map)),year,status=rng.choices(['REJECTED','PENDING','CANCELLED'],weights=[50,30,20])[0])
    align_income()
    app_ids = rng.sample(range(1,len(apps)+1),len(apps))
    app_remap = {a['application_id']:f'APP-{num:07d}' for a,num in zip(apps,app_ids)}
    split_ids = {app_remap[x] for x in split_ids}
    for a in apps: a['application_id'] = app_remap[a['application_id']]
    for a in anomalies: a['application_id'] = app_remap[a['application_id']]

    def tx(when,sender,receiver,amount,app=''):
        t = dict(transaction_id=f'TEMP-{len(transactions)}',timestamp=ts(when),sender_account=sender,receiver_account=receiver,amount=f'{amount:.2f}',transaction_type='DBT_DISBURSEMENT' if app else 'ACCOUNT_TRANSFER',application_id=app)
        transactions.append(t)
        return t['transaction_id']

    for a in apps:
        if a['application_status']!='APPROVED': continue
        r = by_id[a['beneficiary_id']]
        when = datetime.fromisoformat(a['application_date']).replace(hour=10,tzinfo=IST)+timedelta(days=rng.randint(15,60),seconds=rng.randrange(6*3600))
        amount = int(float(a['approved_amount']))
        if a['application_id'] in split_ids:
            half = amount//2
            tx(when,gov,r['bank_account_id'],half,a['application_id'])
            tx(when+timedelta(days=rng.randint(20,60)),gov,r['bank_account_id'],amount-half,a['application_id'])
        else: tx(when,gov,r['bank_account_id'],amount,a['application_id'])
    incoming = defaultdict(list)
    for t in transactions: incoming[t['receiver_account']].append(t)
    latest = {a:max(datetime.fromisoformat(t['timestamp']) for t in ts_) for a,ts_ in incoming.items()}
    totals = {a:sum(int(float(t['amount'])) for t in ts_) for a,ts_ in incoming.items()}
    for ev in evidence:
        rows = [by_id[x] for x in ev['member_ids']]
        accs = sorted({r['bank_account_id'] for r in rows})
        ev['payout_accounts'] = accs
        if ev['collector_account']:
            when = max(latest[a] for a in accs)+timedelta(days=2)
            for j, a in enumerate(accs):
                ev['transfer_ids'].append(tx(when+timedelta(minutes=j),a,ev['collector_account'],int(totals[a]*.35)))
        if ev['cycle_accounts']:
            cycle = ev['cycle_accounts']
            when = max(latest[a] for a in accs)+timedelta(days=5)
            amount = 5000 if ev['fraud_ring_id']=='CL-017' else min(totals[a] for a in accs)//4
            for j,a in enumerate(cycle):
                ev['transfer_ids'].append(tx(when+timedelta(minutes=12*j),a,cycle[(j+1)%len(cycle)],amount))
    for ev in benign_cycles:
        cycle = ev['cycle_accounts']; when = max(latest[a] for a in cycle)+timedelta(days=3)
        amount = min(totals[a] for a in cycle)//10
        for j,a in enumerate(cycle):
            ev['transfer_ids'].append(tx(when+timedelta(hours=j*5),a,cycle[(j+1)%3],amount))
    # Legitimate collectors (e.g. housing/tuition services) give graph hubs hard negatives.
    normal_rows = [r for r in b if not truth[r['beneficiary_id']]['is_injected_suspicious']]
    merchants = [new_account() for _ in range(max(8,scale*3))]
    ordinary_members = defaultdict(list)
    for r in rng.sample(normal_rows,round(n*.2)):
        a = r['bank_account_id']; receiver = rng.choice(merchants)
        tx(latest[a]+timedelta(days=rng.randrange(8,25)),a,receiver,int(totals[a]*rng.uniform(.015,.06)))
        ordinary_members[receiver].append(r['beneficiary_id'])
    # These service payments may overlap other legitimate controls; keep all controls in the case table.
    for acc, ids in ordinary_members.items():
        lookalikes.append(dict(case_id=f'CONTROL-{len(lookalikes)+1:04d}',case_type='BENIGN_COLLECTION',member_ids='|'.join(ids),explanation=f'Routine low-value synthetic service payments to {acc}; not an injected suspicious collector.'))
    tx_ids = rng.sample(range(1,len(transactions)+1),len(transactions))
    remap = {t['transaction_id']:f'TXN-{num:08d}' for t,num in zip(transactions,tx_ids)}
    for t in transactions: t['transaction_id'] = remap[t['transaction_id']]
    for ev in evidence+benign_cycles: ev['transfer_ids'] = [remap[t] for t in ev['transfer_ids']]
    transactions.sort(key=lambda t:(t['timestamp'],t['transaction_id']))
    # Remove retired accounts after payout reassignment; retain every referenced node.
    used = {r['bank_account_id'] for r in b}|{t[c] for t in transactions for c in ('sender_account','receiver_account')}
    tables['main/reference/accounts.csv'] = [a for a in accounts if a['bank_account_id'] in used]
    people = defaultdict(list)
    for bid,g in truth.items(): people[g['actual_person_id']].append(bid)
    pairs = {}
    for ids in people.values():
        for x,y in combinations(sorted(ids),2): pairs[x,y] = 1
    # Complete within-control negatives plus random negatives. The full person mapping is authoritative.
    for case in lookalikes:
        ids = case['member_ids'].split('|')
        if len(ids)<=5:
            for x,y in combinations(sorted(ids),2):
                pairs[x,y] = int(truth[x]['actual_person_id']==truth[y]['actual_person_id'])
    for _ in range(n):
        x,y = sorted((b[rng.randrange(n)]['beneficiary_id'],b[rng.randrange(n)]['beneficiary_id']))
        if x!=y: pairs[x,y] = int(truth[x]['actual_person_id']==truth[y]['actual_person_id'])
    tables['ground_truth/ground_truth.csv'] = list(truth.values())
    tables['ground_truth/ground_truth_pairs.csv'] = [dict(beneficiary_id_1=x,beneficiary_id_2=y,same_actual_person=v) for (x,y),v in sorted(pairs.items())]
    tables['ground_truth/fraud_rings.csv'] = rings
    tables['ground_truth/scenario_memberships.csv'] = memberships
    tables['ground_truth/lookalike_cases.csv'] = lookalikes
    tables['ground_truth/intentional_anomalies.csv'] = anomalies
    tables['main/reference/account_authorizations.csv'] = authorizations
    for path, rows in tables.items():
        if path!='main/transactions.csv': rng.shuffle(rows)
        write_csv(out/path,SCHEMAS[path],rows)
    (out/'ground_truth/ring_evidence.json').write_text(json.dumps(dict(rings=evidence,benign_cycles=benign_cycles),indent=2)+'\n',encoding='utf-8')
    detection_files = sorted(p for p in SCHEMAS if p.startswith('main/'))
    (out/'detection_manifest.json').write_text(json.dumps(dict(schema_version='1.0',files=detection_files),indent=2)+'\n')
    metadata = dict(schema_version='1.0',generator_version='1.0.0',config=dict(beneficiaries=n,seed=seed,disbursements_per_beneficiary=disbursements_per_beneficiary),as_of='2026-06-30',timezone='Asia/Kolkata',fictional=True,academic_years=list(YEARS),row_counts={p:len(rows) for p,rows in tables.items()},unique_actual_people=len(people),pair_sampling='All positive identity pairs, all pairs within small explicit legitimate controls, and n attempted random pairs. Not an exhaustive negative universe.',files_sha256={p:hashlib.sha256((out/p).read_bytes()).hexdigest() for p in SCHEMAS})
    (out/'generation_metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    return metadata

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config',type=Path)
    parser.add_argument('--beneficiaries',type=int)
    parser.add_argument('--seed',type=int)
    parser.add_argument('--output',type=Path,default=Path('data'))
    parser.add_argument('--disbursements-per-beneficiary',type=float)
    args = parser.parse_args()
    config = json.loads(args.config.read_text()) if args.config else {}
    for key in ('beneficiaries','seed','disbursements_per_beneficiary'):
        value = getattr(args,key)
        if value is not None: config[key] = value
    result = generate(output=args.output,**config)
    print(json.dumps({'output':str(args.output),'counts':result['row_counts']},indent=2))

if __name__=='__main__': main()
