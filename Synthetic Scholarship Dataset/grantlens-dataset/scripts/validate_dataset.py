#!/usr/bin/env python3
"""Independent contract, financial, scenario and distribution checks. Exit nonzero on failure."""
import argparse
from collections import Counter, defaultdict
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
import hashlib
from itertools import combinations
import json
from pathlib import Path
import re

from schema import SCHEMAS, SCENARIOS, YEARS, STATUSES, ENROLLMENT, INCOME, read_csv

class ValidationError(ValueError):
    pass

def require(condition, message):
    if not condition: raise ValidationError(message)

def money(value):
    require(bool(re.fullmatch(r'\d+\.\d{2}',value or '')),f'Invalid money {value!r}')
    return Decimal(value)

def parse_time(value):
    parsed = datetime.fromisoformat(value)
    require(parsed.utcoffset() is not None and parsed.utcoffset().total_seconds()==19800,f'Expected ISO +05:30 timestamp: {value}')
    return parsed

def simple_cycles(edges):
    """Iterative SCC decomposition, then enumerate cycles inside small SCCs only.

    This is ledger validation, not a fraud classifier. Enumeration is bounded to
    20-node components to avoid exponential work on arbitrary external datasets.
    """
    graph, rev = defaultdict(set),defaultdict(set)
    for a,b in edges: graph[a].add(b); rev[b].add(a)
    nodes = sorted(set(graph)|set(rev)); seen=set(); order=[]
    for node in nodes:
        if node in seen: continue
        stack=[(node,False)]
        while stack:
            u,exit_ = stack.pop()
            if exit_: order.append(u); continue
            if u in seen: continue
            seen.add(u); stack.append((u,True))
            stack.extend((v,False) for v in sorted(graph[u],reverse=True) if v not in seen)
    seen=set(); components=[]
    for node in reversed(order):
        if node in seen: continue
        comp=set(); stack=[node]; seen.add(node)
        while stack:
            u=stack.pop(); comp.add(u)
            for v in rev[u]:
                if v not in seen: seen.add(v); stack.append(v)
        if len(comp)>1: components.append(comp)
    cycles=[]
    for comp in components:
        require(len(comp)<=20,'Financial SCC too large for bounded exact cycle validation (20 nodes)')
        for start in sorted(comp):
            stack=[(start,[start])]
            while stack:
                u,path=stack.pop()
                for v in graph[u] & comp:
                    if v==start and len(path)>1: cycles.append(path)
                    elif v>start and v not in path: stack.append((v,path+[v]))
    return components,cycles

def validate(root, verify_hashes=True):
    root=Path(root); tables={}; checks=[]
    for path,expected in SCHEMAS.items():
        require((root/path).is_file(),f'Missing file {path}')
        headers,rows=read_csv(root/path)
        require(headers==expected,f'Exact header mismatch: {path}')
        for row in rows:
            require(None not in row and all(v is not None for v in row.values()),f'Malformed CSV row: {path}')
            for c,v in row.items():
                allow_null=(c=='application_id' and path=='main/transactions.csv' and row['transaction_type']=='ACCOUNT_TRANSFER') or (c=='fraud_ring_id' and path=='ground_truth/ground_truth.csv' and row['is_injected_suspicious']=='0') or (c=='exclusivity_group' and path.endswith('scheme_rules.csv'))
                require(v!='' or allow_null,f'Missing required {path}.{c}')
        tables[path]=rows
    def index(path,key):
        rows=tables[path]; ix={r[key]:r for r in rows}
        require(len(ix)==len(rows),f'Duplicate key {path}.{key}')
        return ix
    b=index('main/beneficiaries.csv','beneficiary_id')
    apps=index('main/applications.csv','application_id')
    txs=index('main/transactions.csv','transaction_id')
    accounts=index('main/reference/accounts.csv','bank_account_id')
    inst=index('main/reference/institutions.csv','institution_id')
    rules=index('main/reference/scheme_rules.csv','scheme_id')
    gt=index('ground_truth/ground_truth.csv','record_id')
    rings=index('ground_truth/fraud_rings.csv','fraud_ring_id')
    looks=index('ground_truth/lookalike_cases.csv','case_id')
    meta=json.loads((root/'generation_metadata.json').read_text())
    require(len(b)==meta['config']['beneficiaries'],'Beneficiary count differs from configuration')
    require(set(gt)==set(b),'Ground truth must cover beneficiaries exactly once')
    blocked={'scenario_type','fraud_ring_id','actual_person_id','is_injected_suspicious','risk_score','description','same_actual_person'}
    for path,headers in SCHEMAS.items():
        if path.startswith('main/'): require(not blocked & set(headers),f'Leaked evaluation columns: {path}')
    manifest=json.loads((root/'detection_manifest.json').read_text())
    require(set(manifest['files'])=={p for p in SCHEMAS if p.startswith('main/')},'Detection allowlist includes missing or unsafe files')
    patterns={'beneficiary_id':r'BEN-\d{6}','application_id':r'APP-\d{7}','transaction_id':r'TXN-\d{8}','institution_id':r'INST-\d{4}','actual_person_id':r'PERSON-\d{6}'}
    for path,rows in tables.items():
        for row in rows:
            for c,p in patterns.items():
                if row.get(c): require(re.fullmatch(p,row[c]),f'Invalid {c}: {row[c]}')
    for a in accounts.values():
        require(re.fullmatch(r'(ACC-\d{6}|GOV-DBT-001)',a['bank_account_id']),'Account format')
        require(a['account_type'] in ('SAVINGS','TREASURY') and a['account_role'] in ('CUSTOMER','GOVERNMENT'),'Account enum')
        require((a['account_role']=='GOVERNMENT')==(a['bank_account_id']=='GOV-DBT-001'),'Government role mismatch')
    for row in inst.values():
        require(row['institution_type'] in ('DEGREE_COLLEGE','POLYTECHNIC','UNIVERSITY','VOCATIONAL_COLLEGE'),'Institution type enum')
    account_ifsc={}
    for r in b.values():
        require(r['bank_account_id'] in accounts and r['institution_id'] in inst,'Beneficiary foreign key')
        require(r['district']==inst[r['institution_id']]['district'],'Institution must be local in this fixture')
        require(r['district'] in r['address'] and r['state']=='Maharashtra','Address geography')
        require(r['gender'] in ('F','M','X'),'Gender enum')
        require(re.fullmatch(r'\d{6}',r['pincode']) and re.fullmatch(r'SYNB0\d{6}',r['ifsc_code']),'PIN/IFSC format')
        require(re.fullmatch(r'\+91-000-\d{7}',r['phone']),'Phone must use synthetic non-dialable namespace')
        dob=date.fromisoformat(r['dob']); reg=parse_time(r['registration_date'])
        require(16<=(reg.date()-dob).days/365.2425<=30,'Student age at registration')
        require(reg.date()<=date(2025,12,31),'Registration outside snapshot')
        if r['bank_account_id'] in account_ifsc: require(account_ifsc[r['bank_account_id']]==r['ifsc_code'],'Account IFSC disagreement')
        account_ifsc[r['bank_account_id']]=r['ifsc_code']
    for r in rules.values():
        require(0<Decimal(r['minimum_amount'])<=Decimal(r['maximum_amount']),'Scheme bounds')
        require(r['exclusivity_scope']=='ACTUAL_PERSON_ACADEMIC_YEAR' and r['award_frequency']=='ONE_AWARD_PER_SCHEME_PER_PERSON_PER_YEAR','Scheme scope')
        require(set(r['allowed_income_bands'].split('|'))<=set(INCOME),'Scheme income enum')
    anomaly_rows=tables['ground_truth/intentional_anomalies.csv']
    anomaly_ids={a['application_id'] for a in anomaly_rows}
    require(len(anomaly_ids)==len(anomaly_rows),'Duplicate anomaly label')
    actual_anomalies=set(); claims=defaultdict(list); apps_by_ben=defaultdict(list)
    for a in apps.values():
        require(a['beneficiary_id'] in b and a['scheme_id'] in rules and a['institution_id'] in inst,'Application foreign key')
        r=b[a['beneficiary_id']]; rule=rules[a['scheme_id']]
        require(a['institution_id']==r['institution_id'],'Application institution mismatch')
        require(a['academic_year'] in YEARS and a['application_status'] in STATUSES and a['enrollment_status'] in ENROLLMENT and a['income_band'] in INCOME,'Application enum')
        day=date.fromisoformat(a['application_date']); year=int(a['academic_year'][:4])
        require(date(year,6,1)<=day<=date(year+1,5,31),'Application academic-year boundary')
        require(parse_time(r['registration_date']).date()<=day,'Application predates registration')
        amount=money(a['approved_amount'])
        if a['application_status']=='APPROVED':
            require(Decimal(rule['minimum_amount'])<=amount<=Decimal(rule['maximum_amount']),'Award outside scheme range')
            require(a['income_band'] in rule['allowed_income_bands'].split('|'),'Income eligibility violation')
            if a['enrollment_status'] not in rule['allowed_enrollment_statuses'].split('|'): actual_anomalies.add(a['application_id'])
            claims[(gt[a['beneficiary_id']]['actual_person_id'],a['academic_year'])].append(a)
        else: require(amount==0,'Unapproved amount must be zero')
        apps_by_ben[a['beneficiary_id']].append(a)
    require(actual_anomalies==anomaly_ids,'Unexplained or stale enrollment anomaly labels')
    for a in anomaly_rows:
        require(a['anomaly_type']=='APPROVED_WITHOUT_ENROLLMENT','Unknown anomaly type')
        require(gt[apps[a['application_id']]['beneficiary_id']]['scenario_type']=='GHOST_IDENTITY','Enrollment anomaly outside ghost case')
    conflicts=set(); duplicate_claims=set()
    for key,group in claims.items():
        counts=Counter(a['scheme_id'] for a in group)
        exclusive=defaultdict(set)
        for a in group:
            ex=rules[a['scheme_id']]['exclusivity_group']
            if ex: exclusive[ex].add(a['scheme_id'])
        conflict=any(len(s)>1 for s in exclusive.values())
        duplicate=any(c>1 for c in counts.values())
        if conflict: conflicts.add(key)
        if duplicate: duplicate_claims.add(key)
        if conflict or duplicate:
            require(all(gt[a['beneficiary_id']]['is_injected_suspicious']=='1' for a in group),'Accidental fraud-like claims in legitimate people')
    checks.append('Exact schemas, required fields, identifiers, categorical values, eligibility and foreign keys')
    balances=defaultdict(Decimal); paid=defaultdict(Decimal); paid_by_ben=defaultdict(Decimal)
    previous=None; transfer_edges=set(); transfers_by_receiver=defaultdict(list)
    for t in tables['main/transactions.csv']:
        when=parse_time(t['timestamp']); amount=money(t['amount'])
        require(amount>0,'Nonpositive transaction amount')
        require(previous is None or when>=previous,'Unsorted transaction ledger'); previous=when
        require(when.date()<=date.fromisoformat(meta['as_of']),'Transaction after as-of snapshot')
        s,r=t['sender_account'],t['receiver_account']
        require(s in accounts and r in accounts and s!=r,'Invalid transaction endpoints')
        if t['transaction_type']=='DBT_DISBURSEMENT':
            require(s=='GOV-DBT-001' and t['application_id'] in apps,'Invalid DBT source/application')
            a=apps[t['application_id']]
            require(a['application_status']=='APPROVED','Unapproved disbursement')
            require(r==b[a['beneficiary_id']]['bank_account_id'],'Disbursement beneficiary account mismatch')
            require(when.date()>date.fromisoformat(a['application_date']),'Payment precedes application')
            year=int(a['academic_year'][:4]); require(when.date()<=date(year+1,5,31),'Payment after academic-year cutoff')
            paid[t['application_id']]+=amount; paid_by_ben[a['beneficiary_id']]+=amount
        else:
            require(t['transaction_type']=='ACCOUNT_TRANSFER' and t['application_id']=='','Transfer enum/nullability')
            require(s!='GOV-DBT-001' and r!='GOV-DBT-001','Government account in ordinary transfer')
            require(balances[s]>=amount,f'Unfunded transfer {t["transaction_id"]}')
            balances[s]-=amount; transfer_edges.add((s,r)); transfers_by_receiver[r].append(t)
        balances[r]+=amount
    for a in apps.values():
        require(paid[a['application_id']]==money(a['approved_amount']),f'Award payment reconciliation: {a["application_id"]}')
    require(sum(balances.values())==sum(paid.values()),'Ledger conservation failure')
    dbt_count=sum(t['transaction_type']=='DBT_DISBURSEMENT' for t in txs.values())
    require(dbt_count==round(len(b)*meta['config']['disbursements_per_beneficiary']),'Target disbursement count')
    checks.append('Positive amounts, approved awards fully reconciled, chronological zero-opening-balance ledger and money conservation')
    evidence=json.loads((root/'ground_truth/ring_evidence.json').read_text())
    evmap={r['fraud_ring_id']:r for r in evidence['rings']}
    require(set(evmap)==set(rings),'Ring evidence coverage')
    membership_set=set()
    for m in tables['ground_truth/scenario_memberships.csv']:
        require(m['record_id'] in b and m['fraud_ring_id'] in rings and m['scenario_type'] in SCENARIOS,'Scenario membership foreign key/enum')
        key=tuple(m[c] for c in ('record_id','fraud_ring_id','scenario_type'))
        require(key not in membership_set,'Duplicate scenario membership'); membership_set.add(key)
    expected_memberships=set(); suspicious=set()
    for rid,ring in rings.items():
        ev=evmap[rid]; ids=ring['member_ids'].split('|')
        require(len(ids)==len(set(ids)) and set(ids)==set(ev['member_ids']),'Ring membership disagreement')
        require(ring['scenario_type'] in SCENARIOS,'Ring scenario enum')
        require(all(i in gt for i in ids),'Unknown ring member')
        for bid in ids:
            require(gt[bid]['fraud_ring_id']==rid and gt[bid]['is_injected_suspicious']=='1' and gt[bid]['scenario_type']==ring['scenario_type'],'Ring truth disagreement')
            suspicious.add(bid)
            for scenario in ev['scenarios']: expected_memberships.add((bid,rid,scenario))
        rows=[b[i] for i in ids]; accts={r['bank_account_id'] for r in rows}
        require(accts==set(ev['payout_accounts']),'Payout-account evidence disagreement')
        for t in ev['transfer_ids']: require(t in txs and txs[t]['transaction_type']=='ACCOUNT_TRANSFER','Missing ring transfer')
        if 'IDENTITY_CLONING' in ev['scenarios']:
            people=Counter(gt[i]['actual_person_id'] for i in ids)
            require(min(people.values())>=2,'Identity cloning lacks duplicate people')
            require(len({r['full_name'] for r in rows})>1,'Cloning lacks name variants')
            for person in people:
                aliases=[b[i] for i in ids if gt[i]['actual_person_id']==person]
                require(len({r['dob'] for r in aliases})==1 and len({r['gender'] for r in aliases})==1,'Alias demographic inconsistency')
                require(len({r['phone'] for r in aliases})==1,'Alias common contact evidence missing')
        if 'SHARED_PAYOUT_ACCOUNT' in ev['scenarios'] or 'GHOST_IDENTITY' in ev['scenarios'] or 'BATCH_FABRICATION' in ev['scenarios']:
            require(1<=len(accts)<=2 and len(ids)>=8,'No payout concentration')
        if 'INCOMPATIBLE_SCHEME_CLAIMS' in ev['scenarios']:
            require(all(any((gt[i]['actual_person_id'],a['academic_year']) in conflicts for a in apps_by_ben[i]) for i in ids),'Missing incompatible paid claims')
        if 'GHOST_IDENTITY' in ev['scenarios']:
            require(any(a['application_id'] in actual_anomalies for i in ids for a in apps_by_ben[i]),'Ghost ring missing enrollment inconsistency')
            require(len({r['phone'] for r in rows})<=2,'Ghost contact hub absent')
        if 'BATCH_FABRICATION' in ev['scenarios']:
            times=[parse_time(r['registration_date']) for r in rows]
            require((max(times)-min(times)).total_seconds()<=600,'Batch registration timing')
            nums=sorted(int(r['phone'][-7:]) for r in rows)
            require(nums==list(range(nums[0],nums[0]+len(rows))),'Batch phone sequence')
            require(len({r['address'] for r in rows})<=2 and len({r['institution_id'] for r in rows})==1,'Batch relational evidence')
        if ev['collector_account']:
            incoming=transfers_by_receiver[ev['collector_account']]
            require(accts <= {t['sender_account'] for t in incoming},'Collector missing recipient transfers')
        if ev['cycle_accounts']: verify_cycle(ev,txs)
    require(expected_memberships==membership_set,'Multi-label scenario coverage mismatch')
    for bid,g in gt.items():
        require(g['is_injected_suspicious'] in ('0','1'),'Truth flag enum')
        require((bid in suspicious)==(g['is_injected_suspicious']=='1'),'Orphan suspicious label')
        require((g['fraud_ring_id']!='')==(bid in suspicious),'Orphan ring label')
        require(g['scenario_type'] in SCENARIOS or g['scenario_type']=='NORMAL' or g['scenario_type'].startswith('LEGIT_'),'Truth scenario enum')
    require(set(SCENARIOS)<={s for _,_,s in membership_set},'Missing required scenario')
    demo=evmap['CL-017']; rows=[b[i] for i in demo['member_ids']]
    require(len(rows)==16 and len({r['bank_account_id'] for r in rows})==2 and len({r['phone'] for r in rows})==4 and len({r['address'] for r in rows})==3,'CL-017 topology')
    require(sum(paid_by_ben[i] for i in demo['member_ids'])==Decimal('820000'),'CL-017 amount')
    require(len({gt[i]['actual_person_id'] for i in demo['member_ids']})==8,'CL-017 underlying people')
    checks.append('All seven scenarios, exact ring members, multi-label coverage, observed collector edges and CL-017 topology/INR 820000')
    auth_pairs=set()
    for a in tables['main/reference/account_authorizations.csv']:
        require(a['beneficiary_id'] in b and a['bank_account_id']==b[a['beneficiary_id']]['bank_account_id'],'Authorization foreign key')
        require(a['relationship']=='GUARDIAN','Authorization enum')
        require(date.fromisoformat(a['authorization_date'])<=min(date.fromisoformat(x['application_date']) for x in apps_by_ben[a['beneficiary_id']]),'Late guardian authorization')
        key=(a['beneficiary_id'],a['bank_account_id']); require(key not in auth_pairs,'Duplicate authorization'); auth_pairs.add(key)
    for case in looks.values():
        ids=case['member_ids'].split('|'); require(all(i in b and i not in suspicious for i in ids),'Suspicious member in legitimate control')
        require(len(ids)==len(set(ids)),'Duplicate control member')
        rows=[b[i] for i in ids]; kind=case['case_type']
        if kind=='HOSTEL_ADDRESS': require(len(ids)==5 and len({r['address'] for r in rows})==1,'Hostel control')
        if kind=='FAMILY_CONTACT': require(len({r['phone'] for r in rows})==1,'Family control')
        if kind=='GUARDIAN_ACCOUNT': require(len({r['bank_account_id'] for r in rows})==1 and all((i,b[i]['bank_account_id']) in auth_pairs for i in ids),'Guardian control')
        if kind=='IDENTICAL_NAME': require(len({r['full_name'] for r in rows})==1 and len({r['dob'] for r in rows})==len(rows),'Same-name control')
        if kind=='COMPATIBLE_SCHEMES':
            for i in ids:
                group=[a for a in apps_by_ben[i] if a['application_status']=='APPROVED']
                require(len({a['scheme_id'] for a in group})>=2,'Compatible claims control')
        if kind=='CORRECTED_APPLICATION':
            for i in ids:
                group=apps_by_ben[i]
                require(any(c['application_status']=='CANCELLED' and a['application_status']=='APPROVED' and c['scheme_id']==a['scheme_id'] and c['academic_year']==a['academic_year'] and c['application_date']<a['application_date'] for c in group for a in group),'Corrected application control')
    expected_looks={'HOSTEL_ADDRESS','FAMILY_CONTACT','GUARDIAN_ACCOUNT','IDENTICAL_NAME','COMMON_SURNAME','REGISTRATION_CAMP','BENIGN_CYCLE','COMPATIBLE_SCHEMES','CORRECTED_APPLICATION','BENIGN_COLLECTION'}
    require({c['case_type'] for c in looks.values()}==expected_looks,'Missing legitimate control type')
    for ev in evidence['benign_cycles']:
        require(ev['case_id'] in looks and looks[ev['case_id']]['case_type']=='BENIGN_CYCLE','Benign cycle case reference')
        verify_cycle(ev,txs)
    people=defaultdict(list)
    for bid,g in gt.items(): people[g['actual_person_id']].append(bid)
    require(len(people)==meta['unique_actual_people'],'Metadata person count mismatch')
    positives={pair for ids in people.values() for pair in combinations(sorted(ids),2)}
    seen_pairs=set(); labelled_positive=set()
    for p in tables['ground_truth/ground_truth_pairs.csv']:
        x,y=p['beneficiary_id_1'],p['beneficiary_id_2']
        require(x in b and y in b and x<y and (x,y) not in seen_pairs,'Invalid/duplicate pair')
        seen_pairs.add((x,y)); require(p['same_actual_person'] in ('0','1'),'Pair boolean')
        require(int(p['same_actual_person'])==int(gt[x]['actual_person_id']==gt[y]['actual_person_id']),'Identity pair truth inconsistency')
        if p['same_actual_person']=='1': labelled_positive.add((x,y))
    require(positives==labelled_positive,'Positive identity pairs are incomplete')
    checks.append('Legitimate lookalikes, guardian authorizations, corrected claims and exhaustive positive identity-pair truth')
    components,cycles=simple_cycles(transfer_edges)
    require(len(cycles)>0,'No observed directed financial cycles')
    if verify_hashes:
        for path,digest in meta['files_sha256'].items():
            require(hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,f'Checksum mismatch {path}')
        checks.append('CSV SHA-256 integrity against generation metadata')
    for path,rows in tables.items(): require(meta['row_counts'][path]==len(rows),'Metadata count mismatch')
    def reuse(col):
        counts=Counter(r[col] for r in b.values())
        return {'reused_values':sum(v>1 for v in counts.values()),'records_in_reused_values':sum(v for v in counts.values() if v>1),'maximum_multiplicity':max(counts.values())}
    stats=dict(beneficiaries=len(b),unique_actual_people=len(people),applications=len(apps),approved_applications=sum(a['application_status']=='APPROVED' for a in apps.values()),dbt_disbursements=dbt_count,account_transfers=len(txs)-dbt_count,total_disbursed_inr=str(sum(paid.values())),suspicious_beneficiaries=len(suspicious),planted_rings=len(rings),ring_sizes=dict(sorted(Counter(len(r['member_ids'].split('|')) for r in rings.values()).items())),directed_simple_cycles=len(cycles),cyclic_financial_components=len(components),verified_suspicious_cycle_sequences=sum(bool(ev['cycle_accounts']) for ev in evidence['rings']),verified_benign_cycle_sequences=len(evidence['benign_cycles']),legitimate_lookalike_cases=len(looks),legitimate_lookalike_beneficiaries=len({i for c in looks.values() for i in c['member_ids'].split('|')}),lookalike_cases_by_type=dict(Counter(c['case_type'] for c in looks.values())),primary_scenario_counts=dict(Counter(g['scenario_type'] for g in gt.values())),multi_label_scenario_counts=dict(Counter(s for _,_,s in membership_set)),applications_by_scheme=dict(Counter(a['scheme_id'] for a in apps.values())),beneficiaries_by_district=dict(Counter(r['district'] for r in b.values())),applications_by_status=dict(Counter(a['application_status'] for a in apps.values())),applications_by_academic_year=dict(Counter(a['academic_year'] for a in apps.values())),duplicate_identity_groups=sum(len(v)>1 for v in people.values()),positive_identity_pairs=len(positives),sampled_negative_pairs=len(seen_pairs)-len(positives),intentional_enrollment_anomalies=len(actual_anomalies),incompatible_person_years=len(conflicts),duplicate_scheme_person_years=len(duplicate_claims),reused_fields={c:reuse(c) for c in ('bank_account_id','phone','address')},cl017={'members':demo['member_ids'],'disbursed_inr':'820000.00','payout_accounts':demo['payout_accounts'],'collector_account':demo['collector_account'],'cycle_accounts':demo['cycle_accounts']})
    # Quantify graph connectivity without ubiquitous scheme/institution/government hubs.
    # This is a deterministic union-find integrity summary, not community detection.
    parents={}
    def find(x):
        parents.setdefault(x,x)
        while parents[x]!=x:
            parents[x]=parents[parents[x]]; x=parents[x]
        return x
    def union(x,y):
        x,y=find(x),find(y)
        if x!=y: parents[x]=y
    for bid,r in b.items():
        for col in ('bank_account_id','phone','address'): union('BEN:'+bid,col+':'+r[col])
    for src,dst in transfer_edges: union('bank_account_id:'+src,'bank_account_id:'+dst)
    component_sizes=Counter(find('BEN:'+bid) for bid in b)
    stats['identity_financial_graph']={'beneficiary_components':len(component_sizes),'largest_beneficiary_component':max(component_sizes.values()),'excluded_context_nodes':['GOVERNMENT_SOURCE','INSTITUTION','SCHEME']}
    stats['suspicious_by_beneficiary_id_decile']=dict(sorted(Counter(str(min(9,(int(i.split('-')[1])-1)*10//len(b))) for i in suspicious).items()))
    return dict(status='PASS',schema_version='1.0',checks=checks,statistics=stats)

def verify_cycle(ev,txs):
    cycle=ev['cycle_accounts']; require(len(cycle)>=3 and len(set(cycle))==len(cycle),'Malformed cycle specification')
    last=None
    for i,src in enumerate(cycle):
        dst=cycle[(i+1)%len(cycle)]
        matches=[txs[t] for t in ev['transfer_ids'] if t in txs and txs[t]['sender_account']==src and txs[t]['receiver_account']==dst and (last is None or parse_time(txs[t]['timestamp'])>last)]
        require(bool(matches),f'Missing chronological cycle edge {src} -> {dst}')
        last=min(parse_time(t['timestamp']) for t in matches)

def write_reports(report,json_path,markdown_path):
    json_path=Path(json_path); json_path.parent.mkdir(parents=True,exist_ok=True)
    json_path.write_text(json.dumps(report,indent=2)+'\n')
    lines=['# Dataset validation report','',f"Status: **{report['status']}**",'']
    if report['status']=='PASS':
        lines+=['Each listed check ran against the saved CSV files.','']+['- '+c for c in report['checks']]
        lines+=['','## Statistics','','```json',json.dumps(report['statistics'],indent=2),'```']
    else: lines+=['Error: '+report['error']]
    Path(markdown_path).write_text('\n'.join(lines)+'\n')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,default=Path('data'))
    parser.add_argument('--report',type=Path,default=Path('reports/validation_report.json'))
    parser.add_argument('--no-hashes',action='store_true',help='Run semantic checks on intentionally edited data')
    args=parser.parse_args()
    try: report=validate(args.data,not args.no_hashes)
    except (ValidationError,ValueError,KeyError,OSError,InvalidOperation) as exc: report=dict(status='FAIL',error=str(exc))
    write_reports(report,args.report,args.report.with_suffix('.md'))
    print(json.dumps(report,indent=2))
    raise SystemExit(0 if report['status']=='PASS' else 1)

if __name__=='__main__': main()
