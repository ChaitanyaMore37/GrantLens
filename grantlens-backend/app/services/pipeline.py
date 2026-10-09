from dataclasses import dataclass
from time import perf_counter
from collections import Counter
from app.services.ingestion import ingest
from app.services.linkage import link
from app.services.graphs import build
from app.services.risk import score
from app.core import CONFIG


@dataclass
class Result:
    dataset: object
    matches: list
    graph: object
    risks: dict
    clusters: list
    cycles: list
    summary: dict


def run(directory, config=CONFIG):
    start=perf_counter()
    dataset=ingest(directory)
    matches,link_stats=link(dataset.beneficiaries,config)
    graph,projection,transfers,communities,cycles,groups,graph_stats=build(dataset,matches,config)
    risks,clusters=score(dataset,matches,transfers,communities,cycles,groups,config)
    for bid,risk in risks.items():
        graph.nodes[bid]['risk_score']=risk['risk_score']
    elapsed=perf_counter()-start
    return Result(dataset,matches,graph,risks,clusters,cycles,{
        'beneficiary_count':len(dataset.beneficiaries),'application_count':len(dataset.applications),
        'transaction_count':len(dataset.transactions),'identity_match_count':len(matches),
        'suspicious_cluster_count':len(clusters),'cycle_count':len(cycles),
        'risk_distribution':dict(Counter(r['risk_level'] for r in risks.values())),
        'flagged_beneficiaries':sum(r['risk_score']>=30 for r in risks.values()),
        'total_disbursed':sum(t['amount'] for t in dataset.transactions if t['transaction_type']=='DISBURSEMENT'),
        'processing_seconds':round(elapsed,4),'records_per_second':round(len(dataset.beneficiaries)/elapsed,2),
        'graph_nodes':graph.number_of_nodes(),'graph_edges':graph.number_of_edges(),
        'linkage':link_stats,'safeguards':graph_stats,'validation':dataset.report,
        'notice':'Potentially suspicious activity for auditor review; no determination of fraud.'})
