"""Clusters HTTP endpoints; existing API contract preserved."""
import json
from fastapi import Query
from sqlalchemy import select, func, or_
from app import db
from app.schemas import Page, ClusterDetail
from fastapi import APIRouter
from app.api.dependencies import audit, records, record, public

PREFIX='/api/v1'
router=APIRouter()

@router.get(PREFIX+'/clusters',response_model=Page)
def clusters(audit_id:str|None=None,offset:int=Query(0,ge=0),limit:int=Query(50,ge=1,le=200),risk_level:str=Query('',pattern='^(|Low|Medium|High|Critical)$'),q:str=Query('',max_length=100),district:str=Query('',max_length=100),scheme:str=Query('',max_length=50),status:str=Query('',pattern='^(|Needs Review|In Investigation|Verification Requested|Cleared)$'),sort:str=Query('risk',pattern='^(risk|amount|size)$'),minimum:int=Query(0,ge=0,le=100),maximum:int=Query(100,ge=0,le=100)):
    aid=audit(audit_id).id; payload=db.Record.payload
    conditions=[db.Record.audit_id==aid,db.Record.kind=='cluster',payload['risk_score'].as_integer()>=minimum,payload['risk_score'].as_integer()<=maximum]
    if risk_level: conditions.append(payload['risk_level'].as_string()==risk_level)
    if q: conditions.append(or_(db.Record.id.icontains(q,autoescape=True),payload['evidence'].as_string().icontains(q,autoescape=True)))
    if district: conditions.append(payload['districts'].as_string().contains(json.dumps(district.lower()),autoescape=True))
    if scheme: conditions.append(payload['schemes'].as_string().contains(json.dumps(scheme),autoescape=True))
    if status: conditions.append(db.Record.id.in_(select(db.Case.id).where(db.Case.audit_id==aid,db.Case.status==status)))
    order=payload[{'risk':'risk_score','amount':'total_disbursed','size':'size'}[sort]].as_float().desc()
    with db.Session() as s:
        total=s.scalar(select(func.count()).select_from(db.Record).where(*conditions))
        rows=[r.payload for r in s.scalars(select(db.Record).where(*conditions).order_by(order,db.Record.id).offset(offset).limit(limit))]
        for row in rows:
            c=s.get(db.Case,(aid,row['cluster_id']));row['status']=c.status if c else 'Needs Review'
    return {'items':public(rows),'total':total,'offset':offset,'limit':limit}


@router.get(PREFIX+'/clusters/{cluster_id}',response_model=ClusterDetail)
def cluster(cluster_id:str,audit_id:str|None=None):
    return public(record(audit(audit_id).id,'cluster',cluster_id))


@router.get(PREFIX+'/ui/results')
def ui_results(audit_id:str):
    from app.services.presentation import results
    aid=audit(audit_id).id
    return results(aid, records)


@router.get(PREFIX+'/ui/summary')
def ui_summary(audit_id:str, scheme:str='', district:str='', batch:str='', period:str=''):
    from app.services.presentation import summary
    aid=audit(audit_id).id
    return summary(aid,records,scheme,district,batch,period)
