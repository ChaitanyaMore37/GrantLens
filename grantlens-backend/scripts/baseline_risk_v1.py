from collections import defaultdict
from hashlib import sha256
import pandas as pd
from app.core import CONFIG, level
from app.services.graphs import node_id


def score(dataset, matches, transfers, communities, cycles, groups, config=CONFIG):
    records={r['beneficiary_id']:r for r in dataset.beneficiaries}
    evidence=defaultdict(dict)
    def add(ids, code, points, explanation, accounts=(), sources=()):
        ids=sorted(ids)
        for bid in ids:
            evidence[bid][code]={'indicator':code,'contribution':points,'explanation':explanation,
                'related_beneficiary_ids':ids,'related_account_ids':[node_id('BANK_ACCOUNT',x) for x in accounts],
                'source_record_ids':list(sources) or ids}
    for m in matches:
        add([m['first_beneficiary_id'],m['second_beneficiary_id']], 'identity',config.identity_points,
            f"Potential duplicate identity: match score {m['match_score']}; verification needed.")
    for (field,value),ids in groups.items():
        if field=='bank_account_id' and len(ids)>=config.shared_account_min:
            add(ids,'payout_concentration',config.account_points,f'{len(ids)} records share one payout account.',[value])
    apps=defaultdict(list)
    for a in dataset.applications:
        if a['application_status'] in ['Approved','Paid']:
            apps[(a['beneficiary_id'],a['academic_year'])].append(a)
    exclusive = [{'SCH-01','SCH-02'}]
    if dataset.references.get('scheme_rules'):
        grouped=defaultdict(set)
        for rule in dataset.references['scheme_rules']:
            if rule['exclusivity_group']: grouped[rule['exclusivity_group']].add(rule['scheme_id'])
        exclusive=list(grouped.values())
    for (bid,year),rows in apps.items():
        if any(len(group & {r['scheme_id'] for r in rows})>1 for group in exclusive):
            add([bid],'scheme_conflict',config.scheme_points,f'Mutually exclusive scheme awards in {year}.',sources=[r['application_id'] for r in rows])
    owners={account:ids for (field,account),ids in groups.items() if field=='bank_account_id'}
    receipts=defaultdict(list)
    for t in dataset.transactions:
        if t['transaction_type']=='DISBURSEMENT':
            receipts[t['receiver_account']].append(t)
    for collector in transfers.nodes:
        qualified=[]
        sources=[]
        for source in transfers.predecessors(collector):
            legs=[t for t in transfers[source][collector]['transactions'] if any(r['timestamp']<=t['timestamp'] and r['amount']>=t['amount'] for r in receipts[source])]
            if source in owners and legs:
                qualified.append(source); sources.extend(t['transaction_id'] for t in legs)
        if len(qualified)>=config.collector_min:
            add([b for account in qualified for b in owners[account]],'collector',config.collector_points,
                f'{len(qualified)} scholarship recipient accounts subsequently transfer to one collector.',qualified+[collector],sources)
    for cycle in cycles:
        add([b for a in cycle['accounts'] for b in owners.get(a,[])],'circular_transfer',config.cycle_points,
            cycle['explanation'],cycle['accounts'],[t['transaction_id'] for t in cycle['transactions']])
    # Conjunction: address + institution + registration time + sequential numbers + concentrated destinations.
    batches=defaultdict(list)
    for r in records.values():
        batches[(r['address_normalized'],r['institution_id'],r['registration_date'][:10])].append(r)
    for rows in batches.values():
        if len(rows)<6:
            continue
        times=[pd.Timestamp(r['registration_date']) for r in rows]
        phones=sorted(int(''.join(filter(str.isdigit,r['phone'])) or '0') for r in rows)
        accounts={r['bank_account_id'] for r in rows}
        if (max(times)-min(times)).total_seconds()<=3600 and phones[-1]-phones[0]<=2*len(rows) and len(accounts)<=len(rows)//3:
            add([r['beneficiary_id'] for r in rows],'correlated_batch',config.batch_points,
                'Registration burst, related address, same institution, sequential phones and concentrated payout destinations coincide.',accounts)
    risks={}
    for bid in records:
        items=list(evidence[bid].values())
        # Shared accounts and batch concentration overlap; only the stronger contributes.
        if 'payout_concentration' in evidence[bid] and 'correlated_batch' in evidence[bid]:
            for item in items:
                if item['indicator']=='correlated_batch':
                    item['contribution']=0
                    item['explanation']+=' Contribution suppressed because payout concentration already contributes.'
        total=min(100,sum(e['contribution'] for e in items))
        risks[bid]={'risk_score':total,'risk_level':level(total),'evidence':items}
    clusters=[]
    for members in communities:
        ids=sorted(members)
        priority=max(risks[b]['risk_score'] for b in ids)
        if priority<30:
            continue
        accounts={records[b]['bank_account_id'] for b in ids}
        counts=[len(set(owners[a]) & set(ids)) for a in accounts]
        sources={a['application_id'] for a in dataset.applications if a['beneficiary_id'] in members}
        paid=sum(t['amount'] for t in dataset.transactions if t['application_id'] in sources and t['transaction_type']=='DISBURSEMENT')
        clusters.append({'cluster_id':'CLU-'+sha256('|'.join(ids).encode()).hexdigest()[:12], 'beneficiary_ids':ids,
                         'size':len(ids),'risk_score':priority,'risk_level':level(priority),
                         'score_method':'Maximum member review priority; community membership is not evidence of wrongdoing.',
                         'related_account_ids':[node_id('BANK_ACCOUNT',a) for a in sorted(accounts)],
                         'account_concentration':max(counts)/len(ids),'total_disbursed':paid,
                         'strong_identity_links':sum(m['confidence']=='Strong' and m['first_beneficiary_id'] in members and m['second_beneficiary_id'] in members for m in matches),
                         'evidence':[{'beneficiary_id':b,**e} for b in ids for e in risks[b]['evidence']]})
    return risks,clusters
