"""Offline comparison only. Labels never imported by detector services."""
import argparse,json,csv,resource
from pathlib import Path
from collections import Counter
from datetime import datetime,timezone
from app.services import pipeline
from app.services.evaluation import evaluate
from scripts.baseline_risk_v1 import score as baseline
p=argparse.ArgumentParser();p.add_argument('--data',required=True);p.add_argument('--output',required=True);p.add_argument('--baseline',action='store_true');args=p.parse_args()
if args.baseline: pipeline.score=baseline
root=Path(args.data);r=pipeline.run(root/'main')
if args.baseline:
    r.summary['detector_version']='1.0'
    for key in ['detector_version','collector_min_fraction','collector_window_days','cycle_min_fraction','cycle_window_hours','eligibility_points']: r.summary['configuration'].pop(key,None)
metrics=evaluate(r,root/'ground_truth'/'ground_truth.csv')
truth={row['record_id']:row for row in csv.DictReader((root/'ground_truth'/'ground_truth.csv').open())}
false=[b for b,risk in r.risks.items() if risk['risk_score']>=30 and truth[b]['is_injected_suspicious'].lower() not in ['true','1']]
counts=Counter(e['indicator'] for b in false for e in r.risks[b]['evidence'] if e['contribution']>0)
out={'version':'v1' if args.baseline else 'v2','dataset':str(root),'evaluated_at':datetime.now(timezone.utc).isoformat(),'summary':r.summary,'metrics':metrics,'false_positive_indicators':dict(counts),'false_positive_examples':[{'beneficiary_id':b,'scenario':truth[b]['scenario_type'],'evidence':r.risks[b]['evidence']} for b in false[:12]],'peak_rss_bytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
Path(args.output).write_text(json.dumps(out,indent=2));print(json.dumps({'metrics':metrics,'false_positive_indicators':dict(counts)},indent=2))
