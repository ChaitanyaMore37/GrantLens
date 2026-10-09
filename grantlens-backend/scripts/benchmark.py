import argparse
import json
from pathlib import Path
from app.services.synthetic import generate
from app.services.pipeline import run
from app.services.evaluation import evaluate

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--count',type=int,default=10000)
    args=p.parse_args()
    path=generate(f'data/benchmark-{args.count}',args.count)
    result=run(path)
    metrics=evaluate(result,path/'ground_truth.csv')
    metrics['record_count']=args.count
    Path('benchmark-results').mkdir(exist_ok=True)
    Path(f'benchmark-results/{args.count}.json').write_text(json.dumps(metrics,indent=2),encoding='utf-8')
    print(json.dumps(metrics,indent=2))
