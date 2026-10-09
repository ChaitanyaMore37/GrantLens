import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime,timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4
import networkx as nx
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from app import db
from app.core import CONFIG
from app.schemas import SeedRequest,CaseUpdate,AuditResponse,Page,GraphResponse,Detail,HealthResponse,BeneficiaryDetail,ClusterDetail,CaseDetail
from app.services.synthetic import generate
from app.services.ingestion import ingest,ValidationError
from app.services.pipeline import run
from app.services.graphs import serialize,neighbors,node_id

LOCK=Lock()
CACHE={}
PREFIX='/api/v1'


@asynccontextmanager
async def lifespan(app):
    db.initialize()
    yield


app=FastAPI(title='GrantLens',version='1.0.0',lifespan=lifespan,
            description='Local fictional scholarship audit prototype. Scores are review priorities, not fraud probabilities.')
app.add_middleware(CORSMiddleware,allow_origins=os.getenv('GRANTLENS_CORS','http://localhost:5173,http://127.0.0.1:5173').split(','),allow_methods=['GET','POST','PATCH'],allow_headers=['*'])


@app.exception_handler(HTTPException)
async def http_error(request,exc):
    return JSONResponse(status_code=exc.status_code,content={'error':{'code':str(exc.status_code),'message':exc.detail}})


@app.exception_handler(RequestValidationError)
async def request_error(request,exc):
    return JSONResponse(status_code=422,content={'error':{'code':'validation_error','message':'Invalid request','details':[{'location':list(e['loc']),'message':e['msg']} for e in exc.errors()]}})


@app.exception_handler(ValidationError)
async def dataset_error(request,exc):
    # Raw originals remain local; do not leak sensitive values through validation responses.
    report={**exc.report,'rejected_rows':[{k:v for k,v in r.items() if k!='original'} for r in exc.report.get('rejected_rows',[])]}
    return JSONResponse(status_code=422,content={'error':{'code':'dataset_invalid','message':str(exc),'details':report}})


@app.exception_handler(Exception)
async def unexpected_error(request,exc):
    logging.exception('Unhandled API error')
    return JSONResponse(status_code=500,content={'error':{'code':'internal_error','message':'Unexpected server error; inspect local server logs.'}})


def audit(aid=None, completed=True):
    with db.Session() as s:
        if aid:
            item=s.get(db.Audit,aid)
        else:
            item=s.scalar(select(db.Audit).where(db.Audit.status=='Completed').order_by(db.Audit.created_at.desc()))
        if not item:
            raise HTTPException(404,'Audit not found; seed or upload a dataset first')
        if completed and item.status!='Completed':
            raise HTTPException(409,'Audit is not completed')
        return item


def records(aid,kind):
    with db.Session() as s:
        return [r.payload for r in s.scalars(select(db.Record).where(db.Record.audit_id==aid,db.Record.kind==kind).order_by(db.Record.id))]


def record(aid,kind,rid):
    with db.Session() as s:
        r=s.get(db.Record,(aid,kind,rid))
        if not r:
            raise HTTPException(404,f'{kind} not found')
        return r.payload


def public(item):
    if isinstance(item,list):
        return [public(x) for x in item]
    if not isinstance(item,dict):
        return item
    result={}
    for key,value in item.items():
        if key in ['original','name_normalized','address_normalized']:
            continue
        if key in ['bank_account_id','sender_account','receiver_account']:
            result[key]='••••'+value[-4:]
            result[key+'_node_id']=node_id('BANK_ACCOUNT',value)
        elif key=='phone':
            result[key]='••••'+value[-4:]
        elif key in ['accounts','cycle_path']:
            result[key]=[node_id('BANK_ACCOUNT',v) for v in value]
        else:
            result[key]=public(value)
    return result


def page(items,offset,limit):
    return {'items':public(items[offset:offset+limit]),'total':len(items),'offset':offset,'limit':limit}


def graph(aid):
    if aid not in CACHE:
        g=nx.node_link_graph(record(aid,'graph','entities'),edges='edges')
        CACHE.clear() # single audit cache, bounded for the local prototype
        CACHE[aid]=g
    return CACHE[aid]


def process(aid):
    try:
        item=audit(aid,False)
        result=run(item.directory)
        mapping=Path(item.directory)/'demo_cases.json'
        db.persist(aid,result,json.loads(mapping.read_text()) if mapping.exists() else {})
        CACHE.pop(aid,None)
    except Exception as exc:
        logging.exception('Audit processing failed')
        with db.Session.begin() as s:
            item=s.get(db.Audit,aid)
            item.status='Failed'; item.summary={'error':str(exc)}
    finally:
        LOCK.release()


@app.get(PREFIX+'/health',response_model=HealthResponse)
def health():
    with db.Session() as s:
        s.execute(select(1))
    return {'status':'ok','version':'1.0.0'}


@app.get(PREFIX+'/config',response_model=Detail)
def config():
    return CONFIG.public()


@app.post(PREFIX+'/demo/seed',response_model=AuditResponse,status_code=201)
def seed(body:SeedRequest=SeedRequest()):
    aid=str(uuid4()); directory=generate(db.DATA/'audits'/aid,body.count,body.seed)
    return {'audit_id':db.create_audit(directory,aid),'status':'Ready'}


@app.post(PREFIX+'/audits/upload',response_model=AuditResponse,status_code=201)
async def upload(beneficiaries:UploadFile=File(...),applications:UploadFile=File(...),transactions:UploadFile=File(...), institutions:UploadFile|None=File(None), accounts:UploadFile|None=File(None), scheme_rules:UploadFile|None=File(None), account_authorizations:UploadFile|None=File(None)):
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
    try:
        dataset=ingest(directory)
    except ValidationError as exc:
        (directory/'validation_report.json').write_text(json.dumps(exc.report,indent=2),encoding='utf-8')
        raise
    return {'audit_id':db.create_audit(directory,aid),'status':'Ready','summary':dataset.report}


@app.post(PREFIX+'/audits/{audit_id}/run',response_model=AuditResponse,status_code=202)
def run_audit(audit_id:str,background:BackgroundTasks):
    item=audit(audit_id,False)
    if not LOCK.acquire(blocking=False):
        raise HTTPException(409,'Another audit is running; retry after completion')
    try:
        with db.Session.begin() as s:
            row=s.get(db.Audit,item.id); row.status='Running'; row.summary={}
        background.add_task(process,item.id)
    except Exception:
        LOCK.release(); raise
    return {'audit_id':item.id,'status':'Running'}


@app.get(PREFIX+'/audits/{audit_id}/status',response_model=AuditResponse)
def status(audit_id:str):
    item=audit(audit_id,False)
    return {'audit_id':item.id,'status':item.status,'summary':item.summary}


@app.get(PREFIX+'/audits/{audit_id}/summary',response_model=Detail)
def summary(audit_id:str):
    return audit(audit_id).summary


@app.get(PREFIX+'/beneficiaries',response_model=Page)
def beneficiaries(audit_id:str|None=None,offset:int=Query(0,ge=0),limit:int=Query(50,ge=1,le=200),risk_level:str|None=None,q:str|None=None):
    rows=records(audit(audit_id).id,'beneficiary')
    if risk_level: rows=[r for r in rows if r['risk_level']==risk_level]
    if q: rows=[r for r in rows if q.casefold() in (r['full_name']+' '+r['beneficiary_id']).casefold()]
    return page(rows,offset,limit)


@app.get(PREFIX+'/beneficiaries/{beneficiary_id}',response_model=BeneficiaryDetail)
def beneficiary(beneficiary_id:str,audit_id:str|None=None):
    aid=audit(audit_id).id
    row=record(aid,'beneficiary',beneficiary_id)
    return public({**row,'applications':[a for a in records(aid,'application') if a['beneficiary_id']==beneficiary_id]})


@app.get(PREFIX+'/beneficiaries/{beneficiary_id}/matches',response_model=Page)
def matches(beneficiary_id:str,audit_id:str|None=None,offset:int=Query(0,ge=0),limit:int=Query(50,ge=1,le=200)):
    aid=audit(audit_id).id; record(aid,'beneficiary',beneficiary_id)
    return page([m for m in records(aid,'match') if beneficiary_id in [m['first_beneficiary_id'],m['second_beneficiary_id']]],offset,limit)


@app.get(PREFIX+'/clusters',response_model=Page)
def clusters(audit_id:str|None=None,offset:int=Query(0,ge=0),limit:int=Query(50,ge=1,le=200),risk_level:str|None=None):
    rows=records(audit(audit_id).id,'cluster')
    if risk_level: rows=[r for r in rows if r['risk_level']==risk_level]
    return page(sorted(rows,key=lambda r:-r['risk_score']),offset,limit)


@app.get(PREFIX+'/clusters/{cluster_id}',response_model=ClusterDetail)
def cluster(cluster_id:str,audit_id:str|None=None):
    return public(record(audit(audit_id).id,'cluster',cluster_id))


@app.get(PREFIX+'/clusters/{cluster_id}/graph',response_model=GraphResponse)
def cluster_graph(cluster_id:str,audit_id:str|None=None,limit:int=Query(200,ge=1,le=500)):
    aid=audit(audit_id).id
    c=case(cluster_id,aid) if cluster_id.startswith('CASE-') else record(aid,'cluster',cluster_id)
    g=graph(aid)
    nodes=set(c['beneficiary_ids'])
    for bid in c['beneficiary_ids']:
        nodes.update(g.neighbors(bid))
    for n in list(nodes):
        if g.nodes[n]['type']=='BANK_ACCOUNT':
            nodes.update(other for other in g.neighbors(n) if g.nodes[other]['type']=='BANK_ACCOUNT')
    return serialize(g,nodes,{},limit)


@app.get(PREFIX+'/graph/neighbors',response_model=GraphResponse)
def graph_neighbors(node_id:str,audit_id:str|None=None,hops:int=Query(1,ge=1,le=3),limit:int=Query(100,ge=1,le=500)):
    g=graph(audit(audit_id).id)
    if node_id not in g: raise HTTPException(404,'Node not found')
    nodes,truncated=neighbors(g,node_id,hops,limit)
    output=serialize(g,nodes,{},limit); output['truncated']|=truncated
    return output


@app.get(PREFIX+'/graph/path',response_model=GraphResponse)
def graph_path(source:str,target:str,audit_id:str|None=None,max_hops:int=Query(6,ge=1,le=6),limit:int=Query(500,ge=2,le=500)):
    g=graph(audit(audit_id).id)
    if source not in g or target not in g: raise HTTPException(404,'Node not found')
    nodes,truncated=neighbors(g,source,max_hops,limit)
    try: path=nx.shortest_path(g.subgraph(nodes),source,target)
    except (nx.NetworkXNoPath,nx.NodeNotFound):
        raise HTTPException(404,'No path within bounded search; increase limit if appropriate')
    if len(path)-1>max_hops: raise HTTPException(404,'No path within hop limit')
    out=serialize(g,path,{},limit); out['truncated']=truncated
    return out


def case_data(item):
    return {**item.payload,'case_id':item.id,'status':item.status,'notes':item.notes}


@app.get(PREFIX+'/cases',response_model=Page)
def cases(audit_id:str|None=None,status:str|None=None,offset:int=Query(0,ge=0),limit:int=Query(50,ge=1,le=200)):
    aid=audit(audit_id).id
    conditions=[db.Case.audit_id==aid]
    if status: conditions.append(db.Case.status==status)
    with db.Session() as s:
        total=s.scalar(select(func.count()).select_from(db.Case).where(*conditions))
        rows=[case_data(c) for c in s.scalars(select(db.Case).where(*conditions).order_by(db.Case.id).offset(offset).limit(limit))]
    return {'items':public(rows),'total':total,'offset':offset,'limit':limit}



@app.get(PREFIX+'/cases/{case_id}',response_model=CaseDetail)
def case(case_id:str,audit_id:str|None=None):
    aid=audit(audit_id).id
    with db.Session() as s:
        item=s.get(db.Case,(aid,case_id))
        if not item: raise HTTPException(404,'Case not found')
        return public(case_data(item))


@app.patch(PREFIX+'/cases/{case_id}',response_model=CaseDetail)
def update_case(case_id:str,body:CaseUpdate,audit_id:str|None=None):
    aid=audit(audit_id).id
    with db.Session.begin() as s:
        item=s.get(db.Case,(aid,case_id))
        if not item: raise HTTPException(404,'Case not found')
        if body.status: item.status=body.status
        if body.note: item.notes=[*item.notes,{'text':body.note,'created_at':datetime.now(timezone.utc).isoformat()}]
    return case(case_id,aid)


@app.get(PREFIX+'/cases/{case_id}/report',response_model=CaseDetail)
def report(case_id:str,audit_id:str|None=None):
    aid=audit(audit_id).id; result=case(case_id,aid)
    ids=set(result['beneficiary_ids'])
    accounts={r['bank_account_id'] for r in records(aid,'beneficiary') if r['beneficiary_id'] in ids}
    return {**result,'generated_at':datetime.now(timezone.utc).isoformat(),
            'cycles':public([c for c in records(aid,'cycle') if accounts & set(c['accounts'])]),
            'notice':'Review priority only. Verify evidence and legitimate explanations before any action.'}


@app.get(PREFIX+'/audits')
def audit_list():
    with db.Session() as s:
        return [{'audit_id':a.id,'status':a.status,'summary':a.summary,'created_at':a.created_at} for a in s.scalars(select(db.Audit).order_by(db.Audit.created_at.desc()))]

@app.get(PREFIX+'/ui/results')
def ui_results(audit_id:str):
    from app.services.presentation import results
    aid=audit(audit_id).id
    return results(aid, records)

@app.get(PREFIX+'/ui/summary')
def ui_summary(audit_id:str, scheme:str='', district:str='', batch:str='', period:str=''):
    from app.services.presentation import summary
    aid=audit(audit_id).id
    return summary(aid,records,scheme,district,batch,period)


@app.get(PREFIX+'/dataset/sample/{filename}')
def sample_file(filename:str):
    from fastapi.responses import FileResponse
    if filename not in ['beneficiaries.csv','applications.csv','transactions.csv']:
        raise HTTPException(404,'Unknown sample file')
    path=Path(__file__).resolve().parents[2]/'Synthetic Scholarship Dataset'/'grantlens-dataset'/'data'/'sample'/'main'/filename
    if not path.exists(): raise HTTPException(404,'Supplied sample dataset not found')
    return FileResponse(path,media_type='text/csv',filename=filename)
