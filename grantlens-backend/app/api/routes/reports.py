"""Reports HTTP endpoints; existing API contract preserved."""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import Query
from fastapi.responses import Response
from sqlalchemy import select, func
from app import db
from app.schemas import Page, ReportSnapshot
from fastapi import APIRouter
from app.api.dependencies import audit, records, record, public, case_data

PREFIX='/api/v1'
router=APIRouter()

@router.post(PREFIX+'/reports',response_model=ReportSnapshot,status_code=201)
def create_report(audit_id:str):
    item=audit(audit_id)
    with db.Session() as s:
        cases=[case_data(c) for c in s.scalars(select(db.Case).where(db.Case.audit_id==audit_id))]
    result=public({'report_id':str(uuid4()),'audit_id':audit_id,'generated_at':datetime.now(timezone.utc).isoformat(),
        'environment':'Prototype — Synthetic Scholarship Data','summary':item.summary,'cases':cases,
        'anomalies':records(audit_id,'anomaly'),
        'methodology':'Weighted review-priority index, not fraud probability. Community score is maximum member score; corroboration and legitimate explanations require human review.',
        'limitations':'Synthetic evaluation does not establish real-world accuracy. Internal workflow only. No official certification or digital signature.'})
    with db.Session.begin() as s:
        s.add(db.Record(audit_id=audit_id,kind='report',id=result['report_id'],payload=result))
        db.event(audit_id,'report_generated','Audit report archived: '+result['report_id'],session=s)
    return result


@router.get(PREFIX+'/reports',response_model=Page)
def reports(audit_id:str,offset:int=Query(0,ge=0),limit:int=Query(25,ge=1,le=100)):
    audit(audit_id)
    with db.Session() as s:
        conditions=[db.Record.audit_id==audit_id,db.Record.kind=='report']
        total=s.scalar(select(func.count()).select_from(db.Record).where(*conditions))
        rows=s.scalars(select(db.Record).where(*conditions).order_by(db.Record.payload['generated_at'].as_string().desc(),db.Record.id).offset(offset).limit(limit))
        return {'items':[{k:r.payload[k] for k in ['report_id','audit_id','generated_at','environment']} for r in rows],'total':total,'offset':offset,'limit':limit}


@router.get(PREFIX+'/reports/{report_id}',response_model=ReportSnapshot)
def saved_report(report_id:str,audit_id:str):
    audit(audit_id)
    return record(audit_id,'report',report_id)


@router.get(PREFIX+'/reports/{report_id}/csv',response_class=Response,responses={200:{'content':{'text/csv':{'schema':{'type':'string'}}},'description':'Archived case register CSV'}})
def report_csv(report_id:str,audit_id:str):
    import csv,io
    from fastapi.responses import Response
    report=saved_report(report_id,audit_id)
    output=io.StringIO(newline='')
    writer=csv.writer(output)
    writer.writerow(['audit_id','generated_at','case_id','status','risk_score','assigned_reviewer','resolution'])
    def cell(value):
        value=str(value or '')
        return "'"+value if value.lstrip().startswith(('=','+','-','@')) else value
    for c in report['cases']:
        writer.writerow([cell(v) for v in [audit_id,report['generated_at'],c['case_id'],c['status'],c['risk_score'],c.get('assigned_reviewer'),c.get('resolution')]])
    return Response(output.getvalue(),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="grantlens-case-register.csv"'})
