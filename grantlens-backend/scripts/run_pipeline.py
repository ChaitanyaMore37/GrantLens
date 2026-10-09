import argparse
import json
from pathlib import Path
from app.services.pipeline import run
from app.db import initialize,create_audit,persist

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--input',default='data/synthetic')
    args=p.parse_args(); initialize()
    result=run(args.input)
    aid=create_audit(args.input)
    mapping=Path(args.input)/'demo_cases.json'
    persist(aid,result,json.loads(mapping.read_text()) if mapping.exists() else {})
    print(json.dumps({'audit_id':aid,**result.summary},indent=2))
