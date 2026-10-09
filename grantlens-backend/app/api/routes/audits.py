"""Audits HTTP endpoints; existing API contract preserved."""
import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from fastapi import HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy import select, func
from app import db
from app.schemas import SeedRequest, AuditResponse, Detail, DemoDatasetRequest, EventPage, HistoryPage
from app.services.synthetic import generate
from app.services.ingestion import ingest, ValidationError, FIELDS
from fastapi import APIRouter
from app.paths import WORKSPACE_ROOT
from app.api.dependencies import audit
from app.services.jobs import LOCK, process

PREFIX='/api/v1'
router=APIRouter()

@router.post(PREFIX+'/demo/seed',response_model=AuditResponse,status_code=201)
def seed(body:SeedRequest=SeedRequest()):
    aid=str(uuid4()); directory=generate(db.DATA/'audits'/aid,body.count,body.seed)
    return {'audit_id':db.create_audit(directory,aid),'status':'Ready'}


@router.post(PREFIX+'/audits/upload',response_model=AuditResponse,status_code=201)
async def upload(beneficiaries:UploadFile=File(...),applications:UploadFile=File(...),transactions:UploadFile=File(...), institutions:UploadFile|None=File(None), accounts:UploadFile|None=File(None), scheme_rules:UploadFile|None=File(None), account_authorizations:UploadFile|None=File(None),column_mapping:str|None=Form(None)):
    for file in [beneficiaries,applications,transactions,institutions,accounts,scheme_rules,account_authorizations]:
        if file and (not file.filename or Path(file.filename).name!=file.filename or '\\' in file.filename or not file.filename.lower().endswith('.csv')): raise HTTPException(422,'Upload filenames must be plain CSV filenames')
    aid=str(uuid4()); directory=db.DATA/'audits'/aid; directory.mkdir(parents=True)
    for name,file in [('beneficiaries',beneficiaries),('applications',applications),('transactions',transactions)]:
        total=0
        with (directory/f'{name}.csv').open('wb') as out:
            while chunk:=await file.read(1024*1024):
                total+=len(chunk)
                if total>50*1024*1024:
                    raise HTTPException(413,'Each CSV must be at most 50 MiB')
                out.write(chunk)
    refs = [('institutions',institutions),('accounts',accounts),('scheme_rules',scheme_rules),('account_authorizations',account_authorizations)]
    if any(file for _,file in refs):
        if not all(file for _,file in refs):
            raise HTTPException(422,'Supply all four reference CSVs together')
        (directory/'reference').mkdir()
        for name,file in refs:
            content = await file.read(50*1024*1024+1)
            if len(content)>50*1024*1024: raise HTTPException(413,'Reference CSV too large')
            (directory/'reference'/f'{name}.csv').write_bytes(content)
    if column_mapping:
        import csv,shutil
        try:
            from app.schemas import ColumnMappings
            mappings=ColumnMappings.model_validate_json(column_mapping).tables
            if set(mappings)-set(FIELDS): raise ValueError('Unknown table')
            (directory/'raw').mkdir()
            for table,mapping in mappings.items():
                if set(mapping)-set(FIELDS[table]) or len(set(mapping.values()))!=len(mapping): raise ValueError('Invalid or ambiguous canonical mapping')
                path=directory/(table+'.csv')
                with path.open(newline='',encoding='utf-8-sig') as f: rows=list(csv.reader(f))
                if not rows or not set(mapping.values())<=set(rows[0]): raise ValueError('Mapped source column not found')
                inverse={source:canonical for canonical,source in mapping.items()}
                header=[inverse.get(h,h) for h in rows[0]]
                if len(header)!=len(set(header)): raise ValueError('Mapping creates duplicate columns')
                shutil.copyfile(path,directory/'raw'/path.name)
                with path.open('w',newline='',encoding='utf-8') as f:
                    writer=csv.writer(f);writer.writerow(header);writer.writerows(rows[1:])
            (directory/'column_mapping.json').write_text(json.dumps(mappings,indent=2))
        except (ValueError,TypeError) as exc: raise HTTPException(422,'Invalid explicit column mapping: '+str(exc))
    try:
        dataset=ingest(directory)
    except ValidationError as exc:
        (directory/'validation_report.json').write_text(json.dumps(exc.report,indent=2),encoding='utf-8')
        raise
    db.create_audit(directory,aid)
    with db.Session.begin() as session:
        session.get(db.Audit,aid).summary={'validation':dataset.report,'source':'Uploaded CSV files'}
        db.event(aid,'validation_completed','Uploaded CSV files passed validation',session=session)
    return {'audit_id':aid,'status':'Ready','summary':dataset.report}


@router.post(PREFIX+'/audits/{audit_id}/run',response_model=AuditResponse,status_code=202)
def run_audit(audit_id:str,background:BackgroundTasks):
    item=audit(audit_id,False)
    if not LOCK.acquire(blocking=False):
        raise HTTPException(409,'Another audit is running; retry after completion')
    try:
        with db.Session.begin() as s:
            row=s.get(db.Audit,item.id); row.status='Running'; row.summary={**row.summary,'stage':'Starting','started_at':datetime.now(timezone.utc).isoformat()}
            db.event(item.id,'analysis_started','Forensic analysis started',session=s)
        background.add_task(process,item.id)
    except Exception:
        LOCK.release(); raise
    return {'audit_id':item.id,'status':'Running'}


@router.get(PREFIX+'/audits/{audit_id}/status',response_model=AuditResponse)
def status(audit_id:str):
    item=audit(audit_id,False)
    return {'audit_id':item.id,'status':item.status,'summary':item.summary}


@router.get(PREFIX+'/audits/{audit_id}/summary',response_model=Detail)
def summary(audit_id:str):
    return audit(audit_id).summary


@router.get(PREFIX+'/audits')
def audit_list():
    with db.Session() as s:
        return [{'audit_id':a.id,'status':a.status,'summary':a.summary,'created_at':a.created_at} for a in s.scalars(select(db.Audit).order_by(db.Audit.created_at.desc()))]


@router.get(PREFIX+'/history',response_model=HistoryPage)
def history(sort:str=Query('newest',pattern='^(newest|oldest)$'),q:str=Query('',max_length=100),status:str=Query('',pattern='^(|Ready|Running|Completed|Failed)$'),offset:int=Query(0,ge=0),limit:int=Query(25,ge=1,le=200)):
    conditions=[]
    if q: conditions.append(db.Audit.id.contains(q,autoescape=True))
    if status: conditions.append(db.Audit.status==status)
    with db.Session() as s:
        total=s.scalar(select(func.count()).select_from(db.Audit).where(*conditions))
        rows=s.scalars(select(db.Audit).where(*conditions).order_by(db.Audit.created_at.desc() if sort=='newest' else db.Audit.created_at.asc(),db.Audit.id).offset(offset).limit(limit))
        return {'items':[{'audit_id':a.id,'created_at':a.created_at,'status':a.status,'summary':a.summary} for a in rows],'total':total,'offset':offset,'limit':limit}


@router.get(PREFIX+'/events',response_model=EventPage)
def events(audit_id:str,event_type:str=Query('',max_length=80),offset:int=Query(0,ge=0),limit:int=Query(25,ge=1,le=200)):
    audit(audit_id,False)
    conditions=[db.Event.audit_id==audit_id]
    if event_type: conditions.append(db.Event.event_type==event_type)
    with db.Session() as s:
        total=s.scalar(select(func.count()).select_from(db.Event).where(*conditions))
        rows=s.scalars(select(db.Event).where(*conditions).order_by(db.Event.created_at.desc(),db.Event.id).offset(offset).limit(limit))
        return {'items':[{k:getattr(e,k) for k in ['id','audit_id','created_at','event_type','case_id','actor','summary']} for e in rows],'total':total,'offset':offset,'limit':limit}


@router.post(PREFIX+'/demo/initialize',response_model=AuditResponse)
def initialize_demo(body:DemoDatasetRequest):
    root=WORKSPACE_ROOT/'Synthetic Scholarship Dataset'/'grantlens-dataset'/'data'
    directory=root/'sample'/'main' if body.dataset=='sample' else root/'main'
    if not directory.exists(): raise HTTPException(404,'Supplied dataset not installed')
    with db.Session() as s:
        existing=s.scalar(select(db.Audit).where(db.Audit.directory==str(directory.resolve())).order_by(db.Audit.created_at.desc()))
        if existing: return {'audit_id':existing.id,'status':existing.status,'summary':existing.summary}
    dataset=ingest(directory)
    aid=db.create_audit(directory)
    with db.Session.begin() as s:
        row=s.get(db.Audit,aid); row.summary={'validation':dataset.report,'source':'Supplied '+body.dataset+' synthetic dataset'}
        db.event(aid,'validation_completed','Supplied '+body.dataset+' dataset validated without regeneration',session=s)
    return {'audit_id':aid,'status':'Ready','summary':dataset.report}
