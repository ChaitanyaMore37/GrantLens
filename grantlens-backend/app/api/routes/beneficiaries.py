"""Beneficiaries HTTP endpoints; existing API contract preserved."""
import json
from fastapi import Query
from sqlalchemy import select, func, or_
from app import db
from app.schemas import Page, BeneficiaryDetail, ReviewPage, FindingPage, FinancialFinding
from fastapi import APIRouter
from app.api.dependencies import audit, records, record, public, page

PREFIX='/api/v1'
router=APIRouter()

@router.get(PREFIX+'/beneficiaries',response_model=Page)
def beneficiaries(audit_id:str|None=None,offset:int=Query(0,ge=0),limit:int=Query(50,ge=1,le=200),risk_level:str|None=None,q:str|None=None):
    rows=records(audit(audit_id).id,'beneficiary')
    if risk_level: rows=[r for r in rows if r['risk_level']==risk_level]
    if q: rows=[r for r in rows if q.casefold() in (r['full_name']+' '+r['beneficiary_id']).casefold()]
    return page(rows,offset,limit)


@router.get(PREFIX+'/beneficiaries/{beneficiary_id}',response_model=BeneficiaryDetail)
def beneficiary(beneficiary_id:str,audit_id:str|None=None):
    aid=audit(audit_id).id
    row=record(aid,'beneficiary',beneficiary_id)
    return public({**row,'applications':[a for a in records(aid,'application') if a['beneficiary_id']==beneficiary_id]})


@router.get(PREFIX+'/beneficiaries/{beneficiary_id}/matches',response_model=Page)
def matches(beneficiary_id:str,audit_id:str|None=None,offset:int=Query(0,ge=0),limit:int=Query(50,ge=1,le=200)):
    aid=audit(audit_id).id; record(aid,'beneficiary',beneficiary_id)
    return page([m for m in records(aid,'match') if beneficiary_id in [m['first_beneficiary_id'],m['second_beneficiary_id']]],offset,limit)


@router.get(PREFIX+'/review-queue',response_model=ReviewPage)
def review_queue(audit_id:str,q:str=Query('',max_length=100),risk_level:str=Query('',pattern='^(|Low|Medium|High|Critical)$'),district:str=Query('',max_length=100),offset:int=Query(0,ge=0),limit:int=Query(25,ge=1,le=200),sort:str=Query('risk',pattern='^(risk|amount|name|id)$'),scheme:str=Query('',max_length=50),cluster_id:str=Query('',max_length=80),case_status:str=Query('',pattern='^(|Needs Review|In Investigation|Verification Requested|Cleared)$')):
    audit(audit_id)
    payload=db.Record.payload
    conditions=[db.Record.audit_id==audit_id,db.Record.kind=='beneficiary']
    if q: conditions.append(or_(payload['full_name'].as_string().icontains(q,autoescape=True),db.Record.id.icontains(q,autoescape=True)))
    if risk_level: conditions.append(payload['risk_level'].as_string()==risk_level)
    if district: conditions.append(payload['district'].as_string()==district.lower())
    if scheme: conditions.append(payload['schemes'].as_string().contains(json.dumps(scheme),autoescape=True))
    if cluster_id: conditions.append(payload['cluster_id'].as_string()==cluster_id)
    if case_status: conditions.append(payload['case_id'].as_string().in_(select(db.Case.id).where(db.Case.audit_id==audit_id,db.Case.status==case_status)))
    order={'amount':payload['total_disbursed'].as_float().desc(),'risk':payload['risk_score'].as_integer().desc(),'name':payload['full_name'].as_string(),'id':db.Record.id}[sort]
    with db.Session() as s:
        total=s.scalar(select(func.count()).select_from(db.Record).where(*conditions))
        rows=[r.payload for r in s.scalars(select(db.Record).where(*conditions).order_by(order,db.Record.id).offset(offset).limit(limit))]
    return {'items':public(rows),'total':total,'offset':offset,'limit':limit}


@router.get(PREFIX+'/beneficiaries/{beneficiary_id}/transactions',response_model=Page)
def beneficiary_transactions(beneficiary_id:str,audit_id:str,offset:int=Query(0,ge=0),limit:int=Query(25,ge=1,le=200)):
    aid=audit(audit_id).id;b=record(aid,'beneficiary',beneficiary_id)
    p=db.Record.payload
    conditions=[db.Record.audit_id==aid,db.Record.kind=='transaction',or_(p['sender_account'].as_string()==b['bank_account_id'],p['receiver_account'].as_string()==b['bank_account_id'])]
    with db.Session() as s:
        total=s.scalar(select(func.count()).select_from(db.Record).where(*conditions))
        rows=[r.payload for r in s.scalars(select(db.Record).where(*conditions).order_by(p['timestamp'].as_string(),db.Record.id).offset(offset).limit(limit))]
    return {'items':public(rows),'total':total,'offset':offset,'limit':limit}


@router.get(PREFIX+'/anomalies',response_model=FindingPage)
def anomalies(audit_id:str,q:str=Query('',max_length=100),kind:str=Query('',pattern='^(|circular_transfer|collector|payout_concentration|overpayment)$'),offset:int=Query(0,ge=0),limit:int=Query(25,ge=1,le=200)):
    audit(audit_id)
    conditions=[db.Record.audit_id==audit_id,db.Record.kind=='anomaly']
    if kind: conditions.append(db.Record.payload['indicator'].as_string()==kind)
    if q: conditions.append(db.Record.payload['explanation'].as_string().icontains(q,autoescape=True))
    with db.Session() as s:
        total=s.scalar(select(func.count()).select_from(db.Record).where(*conditions))
        rows=[r.payload for r in s.scalars(select(db.Record).where(*conditions).order_by(db.Record.id).offset(offset).limit(limit))]
    return {'items':public(rows),'total':total,'offset':offset,'limit':limit}


@router.get(PREFIX+'/anomalies/{finding_id}',response_model=FinancialFinding)
def anomaly(finding_id:str,audit_id:str):
    aid=audit(audit_id).id
    return public(record(aid,'anomaly',finding_id))
