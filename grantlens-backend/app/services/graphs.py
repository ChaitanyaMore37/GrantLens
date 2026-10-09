from collections import defaultdict
from hashlib import sha256
from itertools import combinations, islice
import networkx as nx
from app.core import CONFIG


def node_id(kind, value):
    return value if kind == 'BENEFICIARY' else f'{kind}-{sha256(value.encode()).hexdigest()[:20]}'


def build(dataset, matches, config=CONFIG):
    graph, projection, transfers = nx.Graph(), nx.Graph(), nx.DiGraph()
    groups = defaultdict(list)
    relations = [('bank_account_id','BANK_ACCOUNT','USES_ACCOUNT'),('phone','PHONE','HAS_PHONE'),
                 ('address_normalized','ADDRESS','RESIDES_AT'),('institution_id','INSTITUTION','ENROLLED_AT')]
    for r in dataset.beneficiaries:
        bid = r['beneficiary_id']
        projection.add_node(bid)
        graph.add_node(bid, type='BENEFICIARY', label=r['full_name'])
        for field,kind,relation in relations:
            value = r[field]
            nid = node_id(kind,value)
            label = '••••'+value[-4:] if kind in ['BANK_ACCOUNT','PHONE'] else value
            graph.add_node(nid,type=kind,label=label)
            graph.add_edge(bid,nid,relationship=relation,confidence=1.0,source_record_ids=[bid],supporting_evidence=[field])
            groups[(field,value)].append(bid)
    for r in dataset.applications:
        nid = node_id('SCHEME',r['scheme_id'])
        graph.add_node(nid,type='SCHEME',label=r['scheme_id'])
        if graph.has_edge(r['beneficiary_id'],nid):
            graph[r['beneficiary_id']][nid]['source_record_ids'].append(r['application_id'])
        else:
            graph.add_edge(r['beneficiary_id'],nid,relationship='APPLIED_FOR',confidence=1.,source_record_ids=[r['application_id']],supporting_evidence=['application'])

    def weighted(a,b,weight):
        projection.add_edge(a,b,weight=projection.get_edge_data(a,b,{}).get('weight',0)+weight)
    weights = {'bank_account_id':config.shared_account_weight,'phone':config.shared_phone_weight,'address_normalized':config.shared_address_weight}
    skipped = 0
    for (field,_),members in groups.items():
        if field not in weights:
            continue
        if len(members)>config.common_attribute_limit:
            skipped += 1
            continue
        for a,b in combinations(members,2):
            weighted(a,b,weights[field]/max(1,(len(members)-1)**.5))
    for m in matches:
        a,b=m['first_beneficiary_id'],m['second_beneficiary_id']
        weighted(a,b,config.identity_weight*m['match_score']/100)
        graph.add_edge(a,b,relationship='POSSIBLE_IDENTITY_MATCH',confidence=m['match_score']/100,
                       source_record_ids=[a,b],supporting_evidence=m['matching_attributes'])
    for t in dataset.transactions:
        a,b=t['sender_account'],t['receiver_account']
        for account in [a,b]:
            graph.add_node(node_id('BANK_ACCOUNT',account),type='BANK_ACCOUNT',label='••••'+account[-4:])
        if t['transaction_type'] == 'TRANSFER':
            if not transfers.has_edge(a,b):
                transfers.add_edge(a,b,transactions=[])
            transfers[a][b]['transactions'].append(t)
            na,nb=node_id('BANK_ACCOUNT',a),node_id('BANK_ACCOUNT',b)
            if not graph.has_edge(na,nb):
                graph.add_edge(na,nb,relationship='TRANSFER',confidence=1.,source_record_ids=[],supporting_evidence=['Directed transfer; see transaction evidence'], directed_transactions=[])
            graph[na][nb]['source_record_ids'].append(t['transaction_id'])
            graph[na][nb]['directed_transactions'].append({'id':t['transaction_id'],'source':na,'target':nb,'amount':t['amount'],'timestamp':t['timestamp']})
    active = projection.subgraph([n for n,d in projection.degree if d>0])
    communities = nx.community.louvain_communities(active,weight='weight',seed=17) if active.number_of_edges() else []
    cycles, skipped_components = [], 0
    for component in nx.strongly_connected_components(transfers):
        if len(component)<3:
            continue
        if len(component)>config.cycle_component_limit:
            skipped_components+=1
            continue
        remaining = config.cycle_limit-len(cycles)
        if remaining<=0:
            break
        for cycle in islice(nx.simple_cycles(transfers.subgraph(component),length_bound=6),remaining):
            if len(cycle)<3:
                continue
            legs = [transfers[a][b]['transactions'] for a,b in zip(cycle,cycle[1:]+cycle[:1])]
            # Seek one chronological traversal, allowing rotation of the start account.
            chosen, ordered = None, None
            for rotation in range(len(cycle)):
                trial, previous = [], ''
                for leg in legs[rotation:]+legs[:rotation]:
                    eligible = sorted((t for t in leg if t['timestamp']>=previous),key=lambda t:t['timestamp'])
                    if not eligible:
                        break
                    trial.append(eligible[0]); previous=eligible[0]['timestamp']
                if len(trial)==len(cycle):
                    chosen=trial; ordered=cycle[rotation:]+cycle[:rotation]; break
            if chosen:
                cycles.append({'accounts':ordered,'cycle_path':ordered+[ordered[0]],
                               'transactions':[{k:t[k] for k in ['transaction_id','amount','timestamp','sender_account','receiver_account']} for t in chosen],
                               'explanation':'Chronological circular transfer pattern; not proof of kickback fraud.'})
    return graph, projection, transfers, communities, cycles, groups, {'suppressed_common_attributes':skipped,'skipped_cycle_components':skipped_components,'cycle_limit_reached':len(cycles)>=config.cycle_limit}


def serialize(graph, nodes, risks, limit=200):
    selected = sorted(set(nodes))[:limit]
    sub = graph.subgraph(selected)
    edges = []
    for a,b,d in sub.edges(data=True):
        if d.get('relationship') == 'TRANSFER':
            for t in d.get('directed_transactions',[]):
                edges.append({'data':{**t,'relationship':'TRANSFER','source_record_ids':[t['id']], 'supporting_evidence':['Directed ledger transfer']}})
        else:
            edges.append({'data':{'id':'EDGE-'+sha256(f'{a}|{b}'.encode()).hexdigest()[:16], 'source':a,'target':b,'weight':d.get('weight',1),**d}})
    return {'nodes':[{'data':{'id':n,**d,'risk_score':risks.get(n,{}).get('risk_score',d.get('risk_score',0))}} for n,d in sub.nodes(data=True)], 'edges':edges, 'truncated':len(set(nodes))>limit}



def neighbors(graph, start, hops, limit):
    if start not in graph:
        raise KeyError(start)
    seen, frontier, truncated = {start}, [start], False
    for _ in range(hops):
        following=[]
        for n in frontier:
            for other in graph.neighbors(n):
                if other in seen:
                    continue
                if len(seen)>=limit:
                    truncated=True
                    break
                seen.add(other); following.append(other)
        frontier=following
        if truncated:
            break
    return seen,truncated
