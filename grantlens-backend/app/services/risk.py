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
    authorizations={(a['beneficiary_id'],a['bank_account_id']):a for a in dataset.references.get('account_authorizations',[]) if a.get('relationship','').upper() in ['GUARDIAN','PARENT','FAMILY']}
    for (field,value),ids in groups.items():
        if field=='bank_account_id' and len(ids)>=config.shared_account_min:
            authorized=all((bid,value) in authorizations and authorizations[(bid,value)]['authorization_date'] <= records[bid]['registration_date'][:10] for bid in ids)
            add(ids,'payout_concentration',0 if authorized else config.account_points,
                f'{len(ids)} records share one payout account.'+(' All have dated guardian/family authorizations; concentration alone contributes zero, independent indicators remain active.' if authorized else ' Authorization does not explain the full group; verify ownership.'),[value])
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
        qualified=[]; sources=[]; contextual=[]
        for source in transfers.predecessors(collector):
            legs=[]
            for t in transfers[source][collector]['transactions']:
                prior=[r for r in receipts[source] if pd.Timestamp(r['timestamp'])<=pd.Timestamp(t['timestamp'])]
                if not prior: continue
                contextual.append(t)
                total=sum(r['amount'] for r in prior)
                age=(pd.Timestamp(t['timestamp'])-max(pd.Timestamp(r['timestamp']) for r in prior)).total_seconds()/86400
                if t['amount']/total >= config.collector_min_fraction and age>=0:
                    legs.append(t)
            if source in owners and legs:
                qualified.append(source); sources.extend(t['transaction_id'] for t in legs)
        times=[pd.Timestamp(t['timestamp']) for source in qualified for t in transfers[source][collector]['transactions'] if t['transaction_id'] in sources]
        coordinated=bool(times) and (max(times)-min(times)).total_seconds()<=config.collector_window_days*86400
        if len(qualified)>=config.collector_min and coordinated:
            add([b for account in qualified for b in owners[account]],'collector',config.collector_points,
                f'{len(qualified)} funded recipient accounts each transfer at least {config.collector_min_fraction:.0%} of prior scholarship receipts to one receiver in a coordinated {config.collector_window_days}-day window after funding. Shared-account attribution remains uncertain.',qualified+[collector],sources)
    for cycle in cycles:
        ids=[b for a in cycle['accounts'] for b in owners.get(a,[])]
        legs=cycle['transactions']; amounts=[t['amount'] for t in legs]
        hours=(pd.Timestamp(legs[-1]['timestamp'])-pd.Timestamp(legs[0]['timestamp'])).total_seconds()/3600
        fractions=[]
        for a in cycle['accounts']:
            prior=sum(t['amount'] for t in receipts[a] if pd.Timestamp(t['timestamp'])<=pd.Timestamp(legs[0]['timestamp']))
            if prior: fractions.append(min(amounts)/prior)
        corroboration=any(any(e['contribution']>0 for e in evidence[b].values()) for b in ids)
        substantial=bool(fractions) and max(fractions)>=config.cycle_min_fraction
        suspicious=hours<=config.cycle_window_hours and min(amounts)/max(amounts)>=.8 and (substantial or corroboration)
        cycle['assessment']='Suspicious' if suspicious else 'Context only'
        cycle['duration_hours']=round(hours,2)
        cycle['maximum_receipt_fraction']=round(max(fractions),4) if fractions else None
        cycle['explanation']+=f' Duration {hours:.2f} hours; '+('substantial receipt fraction or independent corroboration supports review.' if suspicious else 'insufficient independent or proportional evidence; no risk contribution.')
        add(ids,'circular_transfer',config.cycle_points if suspicious else 0,cycle['explanation'],cycle['accounts'],[t['transaction_id'] for t in legs])
    # Direct strong links only: do not transitively merge tentative identities.
    rules={r['scheme_id']:r for r in dataset.references.get('scheme_rules',[])}
    for match in matches:
        if match['confidence']!='Strong': continue
        a,b=match['first_beneficiary_id'],match['second_beneficiary_id']
        years={year for bid,year in apps if bid in [a,b]}
        for year in years:
            left,right=apps[(a,year)],apps[(b,year)]
            allrows=left+right
            schemes={r['scheme_id'] for r in allrows}
            conflict=any(len(group & schemes)>1 for group in exclusive)
            repeated={r['scheme_id'] for r in left}&{r['scheme_id'] for r in right}
            repeated={s for s in repeated if rules.get(s,{}).get('award_frequency')=='ONE_AWARD_PER_SCHEME_PER_PERSON_PER_YEAR'}
            if left and right and (conflict or repeated):
                add([a,b],'alias_award_conflict',config.scheme_points,f'Strong tentative identity link ({match["match_score"]}) has incompatible or repeated scheme awards in {year}; identities remain separate pending review.',sources=[r['application_id'] for r in allrows])
    paid=defaultdict(float)
    payment_ids=defaultdict(list)
    for t in dataset.transactions:
        if t['transaction_type']=='DISBURSEMENT':
            paid[t['application_id']]+=t['amount'];payment_ids[t['application_id']].append(t['transaction_id'])
    for a in dataset.applications:
        if not paid[a['application_id']]: continue
        rule=rules.get(a['scheme_id'],{}); violations=[]
        for field,allowed in [('enrollment_status','allowed_enrollment_statuses'),('income_band','allowed_income_bands')]:
            if rule.get(allowed) and a[field].upper() not in rule[allowed].split('|'): violations.append(field+' conflicts with explicit scheme rule')
        if rule.get('minimum_amount') and not float(rule['minimum_amount'])<=a['approved_amount']<=float(rule['maximum_amount']): violations.append('approved award outside scheme bounds')
        if a['institution_id']!=records[a['beneficiary_id']]['institution_id']: violations.append('application institution differs from beneficiary record')
        if violations: add([a['beneficiary_id']],'eligibility',config.eligibility_points,'; '.join(violations),sources=[a['application_id']])
        if paid[a['application_id']]>a['approved_amount']+.005:
            add([a['beneficiary_id']],'overpayment',config.scheme_points,'Aggregate disbursements exceed the approved award; multiple installments alone are not suspicious.',sources=payment_ids[a['application_id']])
    for (bid,year),rows in apps.items():
        byscheme=defaultdict(list)
        for a in rows: byscheme[a['scheme_id']].append(a)
        for scheme,awards in byscheme.items():
            if len(awards)>1 and rules.get(scheme,{}).get('award_frequency')=='ONE_AWARD_PER_SCHEME_PER_PERSON_PER_YEAR':
                add([bid],'repeat_award',config.scheme_points,f'Multiple approved applications for the same scheme and academic year {year}.',sources=[a['application_id'] for a in awards])
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
        if evidence[bid].get('payout_concentration',{}).get('contribution',0)>0 and 'correlated_batch' in evidence[bid]:
            for item in items:
                if item['indicator']=='correlated_batch':
                    item['contribution']=0
                    item['explanation']+=' Contribution suppressed because payout concentration already contributes.'
        if 'alias_award_conflict' in evidence[bid] and 'scheme_conflict' in evidence[bid]:
            evidence[bid]['scheme_conflict']['contribution']=0
            evidence[bid]['scheme_conflict']['explanation']+=' Overlap suppressed; alias award conflict already contributes.'
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
                         'mean_member_score':round(sum(risks[b]['risk_score'] for b in ids)/len(ids),2), 'flagged_member_fraction':sum(risks[b]['risk_score']>=30 for b in ids)/len(ids), 'independent_indicator_count':len({e['indicator'] for b in ids for e in risks[b]['evidence'] if e['contribution']>0}), 'size':len(ids),'risk_score':priority,'risk_level':level(priority),
                         'score_method':'Maximum member review priority; community membership is not evidence of wrongdoing.',
                         'related_account_ids':[node_id('BANK_ACCOUNT',a) for a in sorted(accounts)],
                         'account_concentration':max(counts)/len(ids),'total_disbursed':paid,
                         'strong_identity_links':sum(m['confidence']=='Strong' and m['first_beneficiary_id'] in members and m['second_beneficiary_id'] in members for m in matches),
                         'evidence':[{'beneficiary_id':b,**e} for b in ids for e in risks[b]['evidence']]})
    return risks,clusters
