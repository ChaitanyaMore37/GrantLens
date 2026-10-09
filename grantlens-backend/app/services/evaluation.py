"""Offline only. Production pipeline does not import this module or ground truth."""
from collections import defaultdict
from itertools import combinations
import pandas as pd


def evaluate(result, truth_file):
    rows=pd.read_csv(truth_file,keep_default_na=False).to_dict('records')
    people=defaultdict(list)
    for r in rows:
        people[r['actual_person_id']].append(r['record_id'])
    actual={tuple(sorted(p)) for ids in people.values() for p in combinations(ids,2)}
    predicted={tuple(sorted([m['first_beneficiary_id'],m['second_beneficiary_id']])) for m in result.matches}
    def metrics(pred,actual):
        tp=len(pred & actual)
        precision=tp/len(pred) if pred else 0
        recall=tp/len(actual) if actual else 0
        return {'precision':precision,'recall':recall,'f1':2*precision*recall/(precision+recall) if precision+recall else 0,
                'true_positives':tp,'false_positives':len(pred-actual),'false_negatives':len(actual-pred)}
    flagged={b for b,r in result.risks.items() if r['risk_score']>=30}
    positive={r['record_id'] for r in rows if str(r['is_injected_suspicious']).lower() in ['true','1']}
    rings=defaultdict(set)
    scenarios=defaultdict(set)
    for r in rows:
        scenarios[r['scenario_type']].add(r['record_id'])
        if r['fraud_ring_id']:
            rings[r['fraud_ring_id']].add(r['record_id'])
    # Explicit definition: a ring is surfaced when >= half of its members are flagged.
    surfaced=sum(len(ids & flagged)/len(ids)>=.5 for ids in rings.values())
    return {'identity_matching':metrics(predicted,actual),'suspicious_records':metrics(flagged,positive),
            'fraud_ring_detection_recall':surfaced/len(rings) if rings else 0,
            'ring_metric_definition':'At least 50% of labeled ring members flagged, not exact community recovery',
            'false_positive_rate':len(flagged-positive)/max(1,len(rows)-len(positive)),
            'scenario_flag_rates':{s:len(ids & flagged)/len(ids) for s,ids in scenarios.items()},
            'processing_seconds':result.summary['processing_seconds'],'records_per_second':result.summary['records_per_second']}
