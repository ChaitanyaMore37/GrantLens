"""UI projections of persisted detector output. No fixtures or evaluation inputs."""
from collections import defaultdict, Counter
from app.services.graphs import node_id
from app import db
from sqlalchemy import select

STATUS={'Needs Review':'NEEDS_REVIEW','In Investigation':'IN_INVESTIGATION','Verification Requested':'VERIFICATION_REQUESTED','Cleared':'CLEARED'}

def evidence(items):
    return [{'id':f"{e.get('beneficiary_id','')}-{e['indicator']}-{i}", 'label':e['indicator'].replace('_',' ').title(), 'description':(f"{e['beneficiary_id']}: " if e.get('beneficiary_id') else '')+e['explanation'], 'contribution':e['contribution'],'records':e['source_record_ids']} for i,e in enumerate(items)]

def results(aid, records, unused=None):
    bs=records(aid,'beneficiary'); apps=records(aid,'application'); ts=records(aid,'transaction'); cs=records(aid,'cluster')
    refs=records(aid,'reference'); refs=refs[0] if refs else {}
    institutions={r['institution_id']:r['fictional_institution_name'] for r in refs.get('institutions',[])}
    byid={b['beneficiary_id']:b for b in bs}
    appbyid={a['application_id']:a for a in apps}
    schemes=defaultdict(set)
    for a in apps: schemes[a['beneficiary_id']].add(a['scheme_id'])
    membership={b:c['cluster_id'] for c in cs for b in c['beneficiary_ids']}
    with db.Session() as session:
        cases=list(session.scalars(select(db.Case).where(db.Case.audit_id==aid)))
    paid=defaultdict(float)
    for t in ts:
        if t['transaction_type']=='DISBURSEMENT': paid[appbyid[t['application_id']]['beneficiary_id']]+=t['amount']
    groups=list(cs)
    # Single-record review cases use the same investigation screen without pretending to be Louvain communities.
    for case in cases:
        if case.id.startswith('CASE-'):
            c=case.payload; ids=c['beneficiary_ids']; accounts={byid[b]['bank_account_id'] for b in ids}
            groups.append({**c,'cluster_id':case.id,'related_account_ids':[node_id('BANK_ACCOUNT',a) for a in accounts], 'total_disbursed':sum(paid[b] for b in ids)})
            membership.update({b:case.id for b in ids})
    beneficiaries=[{'id':b['beneficiary_id'],'name':b['full_name'],'district':b['original']['district'],'institution':institutions.get(b['institution_id'],b['institution_id']), 'scheme':', '.join(sorted(schemes[b['beneficiary_id']])),'account':'••••'+b['bank_account_id'][-4:],'phone':'••••'+b['phone'][-4:], 'address':b['address'],'score':b['risk_score'],'clusterId':membership.get(b['beneficiary_id'],''),'sourceId':b['beneficiary_id'],'evidence':evidence(b['evidence'])} for b in bs]
    clusters=[]
    for c in groups:
        ids=c['beneficiary_ids']; members=[byid[b] for b in ids]
        top=max(members,key=lambda b:b['risk_score'])
        clusters.append({'id':c['cluster_id'],'name':'Computed review group' if c['cluster_id'].startswith('CLU-') else 'Individual review case','beneficiaryIds':ids,'district':', '.join(sorted({b['original']['district'] for b in members})), 'scheme':', '.join(sorted(set.union(*(schemes[b] for b in ids)))),'score':c['risk_score'],'accountIds':c['related_account_ids'], 'identityMatches':c.get('strong_identity_links',0),'transactionPatterns':len({e['indicator'] for e in c['evidence'] if e['indicator'] in ['collector','circular_transfer']}),'amount':c['total_disbursed'],'indicator':', '.join(sorted({e['indicator'].replace('_',' ') for e in c['evidence']})), 'evidence':evidence([{'beneficiary_id':top['beneficiary_id'],**e} for e in top['evidence']]),'batch':aid})
    return {'beneficiaries':beneficiaries,'clusters':sorted([c for c in clusters if c['id'].startswith('CLU-')],key=lambda c:-c['score']), 'reviewCases':[c for c in clusters if c['id'].startswith('CASE-')],
        'applications':[{'id':a['application_id'],'beneficiaryId':a['beneficiary_id'],'scheme':a['scheme_id'],'academicYear':a['academic_year'],'amount':a['approved_amount'],'status':a['application_status']} for a in apps],
        'transactions':[{'id':t['transaction_id'],'beneficiaryId':appbyid[t['application_id']]['beneficiary_id'] if t['transaction_type']=='DISBURSEMENT' else None,'scheme':appbyid[t['application_id']]['scheme_id'] if t['transaction_type']=='DISBURSEMENT' else None,'source':node_id('BANK_ACCOUNT',t['sender_account']),'target':node_id('BANK_ACCOUNT',t['receiver_account']),'amount':t['amount'],'date':t['timestamp'],'reference':t['application_id']} for t in ts]}

def summary(aid,records,scheme='',district='',batch='',period=''):
    data=results(aid,records)
    bs=[b for b in data['beneficiaries'] if (not district or b['district']==district) and (not scheme or scheme in b['scheme'].split(', ')) and (not batch or batch==aid)]
    ids={b['id'] for b in bs}; scores={b['id']:b['score'] for b in bs}
    ts=[t for t in data['transactions'] if t['beneficiaryId'] in ids and (not scheme or t.get('scheme')==scheme) and (not period or t['date'].startswith(period))]
    cs=[c for c in data['clusters'] if ids.intersection(c['beneficiaryIds'])]
    with db.Session() as s:
        cases=list(s.scalars(select(db.Case).where(db.Case.audit_id==aid)))
    open_ids={b for c in cases if c.status!='Cleared' for b in c.payload['beneficiary_ids']}
    monthly=defaultdict(lambda:{'high':0,'medium':0,'low':0})
    for t in ts:
        score=scores[t['beneficiaryId']]; monthly[t['date'][:7]]['high' if score>=60 else 'medium' if score>=30 else 'low']+=1
    anomalies=Counter(e['label'] for b in bs for e in b['evidence'])
    matches=records(aid,'match')
    return {'beneficiaries':len(bs),'payments':len(ts),'clusters':len(cs),'underReview':sum(t['amount'] for t in ts if t['beneficiaryId'] in open_ids),'investigations':sum(c.status in ['In Investigation','Verification Requested'] and bool(ids.intersection(c.payload['beneficiary_ids'])) for c in cases),'duplicates':sum(m['first_beneficiary_id'] in ids and m['second_beneficiary_id'] in ids for m in matches),'monthly':[{'month':k,**v} for k,v in sorted(monthly.items())], 'distribution':[{'name':name,'value':sum(lo<=b['score']<hi for b in bs),'color':color} for name,lo,hi,color in [('High / critical',60,101,'#c94c55'),('Medium',30,60,'#d28b30'),('Low',0,30,'#168a80')]],'anomalies':[{'name':k,'value':v} for k,v in anomalies.items()]}
