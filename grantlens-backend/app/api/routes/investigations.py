"""Investigations HTTP endpoints; existing API contract preserved."""
from datetime import datetime, timezone
from fastapi import HTTPException, Query
from sqlalchemy import select, func
from app import db
from app.schemas import CaseUpdate, Page, CaseDetail
from fastapi import APIRouter
from app.api.dependencies import audit, records, public, case_data

PREFIX='/api/v1'
router=APIRouter()

@router.get(PREFIX+'/cases',response_model=Page)
def cases(audit_id:str|None=None,status:str|None=None,offset:int=Query(0,ge=0),limit:int=Query(50,ge=1,le=200)):
    aid=audit(audit_id).id
    conditions=[db.Case.audit_id==aid]
    if status: conditions.append(db.Case.status==status)
    with db.Session() as s:
        total=s.scalar(select(func.count()).select_from(db.Case).where(*conditions))
        rows=[case_data(c) for c in s.scalars(select(db.Case).where(*conditions).order_by(db.Case.id).offset(offset).limit(limit))]
    return {'items':public(rows),'total':total,'offset':offset,'limit':limit}


@router.get(PREFIX+'/cases/{case_id}',response_model=CaseDetail)
def case(case_id:str,audit_id:str|None=None):
    aid=audit(audit_id).id
    with db.Session() as s:
        item=s.get(db.Case,(aid,case_id))
        if not item: raise HTTPException(404,'Case not found')
        return public(case_data(item))


@router.patch(PREFIX+'/cases/{case_id}',response_model=CaseDetail)
def update_case(case_id:str,body:CaseUpdate,audit_id:str|None=None):
    aid=audit(audit_id).id
    with db.Session.begin() as s:
        item=s.get(db.Case,(aid,case_id))
        if not item: raise HTTPException(404,'Case not found')
        if body.status:
            item.status=body.status
            db.event(aid,'case_status_updated','Case status changed to '+body.status,case_id,session=s)
        if body.note:
            item.notes=[*item.notes,{'text':body.note,'created_at':datetime.now(timezone.utc).isoformat()}]
            db.event(aid,'reviewer_note_added','Reviewer note added',case_id,session=s)
        patch=body.model_dump(exclude_none=True,exclude={'status','note'})
        if patch: item.payload={**item.payload,**patch}
        db.event(aid,'case_updated','Updated '+', '.join(body.model_dump(exclude_none=True)),case_id,session=s)
    return case(case_id,aid)


@router.get(PREFIX+'/cases/{case_id}/report',response_model=CaseDetail)
def report(case_id:str,audit_id:str|None=None):
    aid=audit(audit_id).id; result=case(case_id,aid)
    ids=set(result['beneficiary_ids'])
    accounts={r['bank_account_id'] for r in records(aid,'beneficiary') if r['beneficiary_id'] in ids}
    return {**result,'generated_at':datetime.now(timezone.utc).isoformat(),
            'cycles':public([c for c in records(aid,'cycle') if accounts & set(c['accounts'])]),
            'notice':'Review priority only. Verify evidence and legitimate explanations before any action.'}
