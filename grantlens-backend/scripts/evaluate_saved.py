"""Offline evaluation of saved predictions. Never imported by the detection pipeline."""
import argparse,json
from types import SimpleNamespace
from pathlib import Path
from sqlalchemy import select
from app import db
from app.services.evaluation import evaluate
p=argparse.ArgumentParser();p.add_argument('--audit-id',required=True);p.add_argument('--truth',required=True);p.add_argument('--output',required=True);args=p.parse_args()
with db.Session() as s:
    audit=s.get(db.Audit,args.audit_id)
    if not audit or audit.status!='Completed': raise SystemExit('Completed audit required')
    def rows(kind): return [r.payload for r in s.scalars(select(db.Record).where(db.Record.audit_id==audit.id,db.Record.kind==kind))]
    result=SimpleNamespace(matches=rows('match'),risks={b['beneficiary_id']:b for b in rows('beneficiary')},summary=audit.summary)
    metrics=evaluate(result,args.truth)
Path(args.output).write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics,indent=2))
