from types import SimpleNamespace
from copy import deepcopy
import networkx as nx
from app.services.risk import score


def fixture():
    bs=[{'beneficiary_id':f'B{i}','bank_account_id':f'A{i}','registration_date':'2024-01-01T00:00:00','address_normalized':f'address{i}','institution_id':'I','phone':str(10000+i)} for i in range(4)]
    apps=[{'application_id':f'P{i}','beneficiary_id':f'B{i}','academic_year':'2024','scheme_id':'S1','approved_amount':1000,'application_status':'Paid','enrollment_status':'ENROLLED','income_band':'LOW','institution_id':'I'} for i in range(4)]
    ts=[{'transaction_id':f'D{i}','application_id':f'P{i}','transaction_type':'DISBURSEMENT','receiver_account':f'A{i}','sender_account':'GOV','timestamp':'2024-01-02','amount':1000} for i in range(4)]
    refs={'scheme_rules':[{'scheme_id':'S1','exclusivity_group':'','award_frequency':'ONE_AWARD_PER_SCHEME_PER_PERSON_PER_YEAR','allowed_enrollment_statuses':'ENROLLED','allowed_income_bands':'LOW','minimum_amount':'500','maximum_amount':'1500'}]}
    d=SimpleNamespace(beneficiaries=bs,applications=apps,transactions=ts,references=refs)
    return d


def run(d,transfers=None,cycles=None,matches=None,groups=None):
    groups=groups or {('bank_account_id',b['bank_account_id']):[b['beneficiary_id']] for b in d.beneficiaries}
    return score(d,matches or [],transfers if transfers is not None else nx.DiGraph(),[],cycles or [],groups)[0]


def test_guardian_context_never_suppresses_independent_identity():
    d=fixture(); groups={('bank_account_id','A0'):[f'B{i}' for i in range(4)]}
    d.references['account_authorizations']=[{'beneficiary_id':f'B{i}','bank_account_id':'A0','relationship':'GUARDIAN','authorization_date':'2023-01-01'} for i in range(4)]
    assert all(r['risk_score']==0 for r in run(d,groups=groups).values())
    match={'first_beneficiary_id':'B0','second_beneficiary_id':'B1','match_score':80,'confidence':'Possible'}
    assert run(d,groups=groups,matches=[match])['B0']['risk_score']==35
    d.references['account_authorizations'][-1]['authorization_date']='2025-01-01'
    assert run(d,groups=groups)['B0']['risk_score']==40


def test_collectors_need_proportion_and_coordination():
    d=fixture();g=nx.DiGraph()
    for i in range(4):
        t={'transaction_id':f'T{i}','timestamp':'2024-01-04','amount':50}
        g.add_edge(f'A{i}','C',transactions=[t])
    assert all(r['risk_score']==0 for r in run(d,g).values())
    for i in range(4):g[f'A{i}']['C']['transactions'][0]['amount']=300
    assert all(r['risk_score']==40 for r in run(d,g).values())
    g['A3']['C']['transactions'][0]['timestamp']='2024-03-01'
    assert all(r['risk_score']==0 for r in run(d,g).values())


def test_cycle_context_and_substantial_fast_flow():
    d=fixture();cycle={'accounts':['A0','A1','A2'],'transactions':[{'transaction_id':f'C{i}','timestamp':f'2024-01-03T0{i}:00:00','amount':100} for i in range(3)],'explanation':'Chronological directed cycle.'}
    assert run(d,cycles=[deepcopy(cycle)])['B0']['risk_score']==0
    for i,t in enumerate(cycle['transactions']):t.update(amount=300,timestamp=f'2024-01-03T00:{i*10:02}:00')
    assert run(d,cycles=[cycle])['B0']['risk_score']==45
    assert cycle['assessment']=='Suspicious'


def test_alias_conflict_eligibility_and_installments():
    d=fixture();strong={'first_beneficiary_id':'B0','second_beneficiary_id':'B1','match_score':90,'confidence':'Strong'}
    assert any(e['indicator']=='alias_award_conflict' for e in run(d,matches=[strong])['B0']['evidence'])
    weak={**strong,'confidence':'Possible'}
    assert not any(e['indicator']=='alias_award_conflict' for e in run(d,matches=[weak])['B0']['evidence'])
    d.transactions[0]['amount']=400;d.transactions.append({**d.transactions[0],'transaction_id':'Dextra','amount':600})
    assert run(d)['B0']['risk_score']==0
    d.transactions[-1]['amount']=700
    assert any(e['indicator']=='overpayment' for e in run(d)['B0']['evidence'])
    d.applications[1]['enrollment_status']='TERMINATED'
    assert any(e['indicator']=='eligibility' for e in run(d)['B1']['evidence'])
