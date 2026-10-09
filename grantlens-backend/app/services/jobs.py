"""Single-worker audit execution and failure recording."""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from app import db
from app.services.pipeline import run
from app.api.dependencies import audit, CACHE

LOCK=Lock()

def process(aid):
    try:
        item=audit(aid,False)
        def stage(name):
            with db.Session.begin() as session:
                row=session.get(db.Audit,aid); row.summary={**row.summary,'stage':name}
        result=run(item.directory,stage=stage)
        result.summary['source']=item.summary.get('source','Uploaded or legacy local dataset')
        mapping=Path(item.directory)/'demo_cases.json'
        db.persist(aid,result,json.loads(mapping.read_text()) if mapping.exists() else {})
        CACHE.pop(aid,None)
    except Exception as exc:
        logging.exception('Audit processing failed')
        with db.Session.begin() as s:
            item=s.get(db.Audit,aid)
            item.status='Failed'; item.summary={**item.summary,'stage':'Failed','completed_at':datetime.now(timezone.utc).isoformat(),'error':'Processing failed; see local server log.'}
            db.event(aid,'analysis_failed','Forensic analysis failed',session=s)
    finally:
        LOCK.release()
