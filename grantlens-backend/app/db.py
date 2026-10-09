import os
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import create_engine, String, JSON, select, delete, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DATA=Path(os.getenv('GRANTLENS_DATA','data'))
DATA.mkdir(parents=True,exist_ok=True)
engine=create_engine(os.getenv('GRANTLENS_DB',f'sqlite:///{DATA / "grantlens.db"}'),connect_args={'check_same_thread':False} if os.getenv('GRANTLENS_DB','sqlite:').startswith('sqlite:') else {})
Session=sessionmaker(engine)


class Base(DeclarativeBase):
    pass


class Audit(Base):
    __tablename__='audits'
    id: Mapped[str]=mapped_column(String,primary_key=True)
    status: Mapped[str]=mapped_column(String,default='Ready')
    directory: Mapped[str]=mapped_column(String)
    created_at: Mapped[str]=mapped_column(String)
    summary: Mapped[dict]=mapped_column(JSON,default=dict)


class Record(Base):
    __tablename__='records'
    audit_id: Mapped[str]=mapped_column(String,primary_key=True)
    kind: Mapped[str]=mapped_column(String,primary_key=True)
    id: Mapped[str]=mapped_column(String,primary_key=True)
    payload: Mapped[dict]=mapped_column(JSON)


class Case(Base):
    __tablename__='cases'
    audit_id: Mapped[str]=mapped_column(String,primary_key=True)
    id: Mapped[str]=mapped_column(String,primary_key=True)
    status: Mapped[str]=mapped_column(String,default='Needs Review')
    notes: Mapped[list]=mapped_column(JSON,default=list)
    payload: Mapped[dict]=mapped_column(JSON)


class Event(Base):
    __tablename__='audit_events'
    id: Mapped[str]=mapped_column(String,primary_key=True)
    audit_id: Mapped[str]=mapped_column(String,index=True)
    created_at: Mapped[str]=mapped_column(String,index=True)
    event_type: Mapped[str]=mapped_column(String,index=True)
    case_id: Mapped[str | None]=mapped_column(String,nullable=True)
    actor: Mapped[str]=mapped_column(String,default='Local demo auditor')
    summary: Mapped[str]=mapped_column(String)


def event(aid,kind,summary,case_id=None,session=None):
    row=Event(id=str(uuid4()),audit_id=aid,created_at=datetime.now(timezone.utc).isoformat(),event_type=kind,case_id=case_id,summary=summary,actor='Local demo auditor')
    if session is not None: session.add(row)
    else:
        with Session.begin() as s: s.add(row)

Index('ix_record_risk',Record.audit_id,Record.kind,Record.payload['risk_score'].as_integer(),Record.id)


def initialize():
    Base.metadata.create_all(engine)
    with Session.begin() as s:
        for audit in s.scalars(select(Audit).where(Audit.status=='Running')):
            audit.status='Failed'
            audit.summary={**audit.summary,'stage':'Interrupted','error':'Processing interrupted by server restart. Run this audit again.'}
            event(audit.id,'analysis_failed','Processing interrupted by server restart',session=s)


def create_audit(directory, audit_id=None):
    aid=audit_id or str(uuid4())
    with Session.begin() as s:
        s.add(Audit(id=aid,directory=str(Path(directory).resolve()),status='Ready',created_at=datetime.now(timezone.utc).isoformat(),summary={}))
        event(aid,'audit_created','Audit created',session=s)
    return aid


def persist(aid,result,demo_cases=None):
    import networkx as nx
    rows=[]
    for kind,items,key in [('beneficiary',result.dataset.beneficiaries,'beneficiary_id'),('application',result.dataset.applications,'application_id'),('transaction',result.dataset.transactions,'transaction_id'),('cluster',result.clusters,'cluster_id')]:
        for item in items:
            payload={**item,**(result.risks[item[key]] if kind=='beneficiary' else {})}
            rows.append(Record(audit_id=aid,kind=kind,id=item[key],payload=payload))
    rows.extend(Record(audit_id=aid,kind='match',id=str(i),payload=m) for i,m in enumerate(result.matches))
    rows.append(Record(audit_id=aid,kind='graph',id='entities',payload=nx.node_link_data(result.graph,edges='edges')))
    rows.extend(Record(audit_id=aid,kind='cycle',id=str(i),payload=c) for i,c in enumerate(result.cycles))
    rows.append(Record(audit_id=aid,kind='reference',id='tables',payload=result.dataset.references))
    cases={c['cluster_id']:{**c,'case_id':c['cluster_id']} for c in result.clusters}
    covered={b for c in result.clusters for b in c['beneficiary_ids']}
    for bid,risk in result.risks.items():
        if risk['risk_score']>=30 and bid not in covered:
            cases['CASE-'+bid]={'case_id':'CASE-'+bid,'beneficiary_ids':[bid],**risk}
    for cid,ids in (demo_cases or {}).items():
        cases[cid]={'case_id':cid,'beneficiary_ids':ids,'risk_score':max(result.risks[b]['risk_score'] for b in ids),
                    'risk_level':result.risks[ids[0]]['risk_level'],'cluster_ids':[c['cluster_id'] for c in result.clusters if set(ids)&set(c['beneficiary_ids'])],
                    'evidence':[{'beneficiary_id':b,**e} for b in ids for e in result.risks[b]['evidence']],
                    'description':'Stable analyst demo mapping; community IDs are computed independently.'}
    appbyid={a['application_id']:a for a in result.dataset.applications}
    from collections import defaultdict
    schemes=defaultdict(set); disbursed=defaultdict(float)
    for a in result.dataset.applications: schemes[a['beneficiary_id']].add(a['scheme_id'])
    for t in result.dataset.transactions:
        if t['transaction_type']=='DISBURSEMENT': disbursed[appbyid[t['application_id']]['beneficiary_id']]+=t['amount']
    membership={b:c['cluster_id'] for c in result.clusters for b in c['beneficiary_ids']}
    case_membership={b:cid for cid,c in cases.items() for b in c['beneficiary_ids']}
    beneficiary_map={b['beneficiary_id']:b for b in result.dataset.beneficiaries}
    for r in rows:
        if r.kind=='cluster':
            ids=r.payload['beneficiary_ids'];r.payload={**r.payload,'districts':sorted({beneficiary_map[b]['district'] for b in ids}),'schemes':sorted({scheme for b in ids for scheme in schemes[b]})}
        if r.kind=='beneficiary': r.payload={**r.payload,'schemes':sorted(schemes[r.id]),'total_disbursed':disbursed[r.id],'cluster_id':membership.get(r.id),'case_id':case_membership.get(r.id)}
    # Materialize real financial findings once, so paginated screens do not scan an audit.
    transactions={t['transaction_id']:t for t in result.dataset.transactions}
    findings={}
    for bid,risk in result.risks.items():
        for e in risk['evidence']:
            if e['indicator'] not in ['circular_transfer','collector','payout_concentration','overpayment']: continue
            from hashlib import sha256
            key=e['indicator']+'|'+ '|'.join(sorted(e['source_record_ids']))
            fid='FIND-'+sha256(key.encode()).hexdigest()[:16]
            if fid not in findings:
                legs=[transactions[t] for t in e['source_record_ids'] if t in transactions]
                findings[fid]={'finding_id':fid,**e,'beneficiary_ids':[], 'transactions':sorted(legs,key=lambda t:t['timestamp']),'amount':sum(t['amount'] for t in legs),'assessment':'Review' if e['contribution'] else 'Context only','case_ids':[]}
            findings[fid]['beneficiary_ids'].append(bid)
    for fid,f in findings.items():
        f['case_ids']=[cid for cid,c in cases.items() if set(c['beneficiary_ids']) & set(f['beneficiary_ids'])]
        rows.append(Record(audit_id=aid,kind='anomaly',id=fid,payload=f))
    with Session.begin() as s:
        s.execute(delete(Record).where(Record.audit_id==aid,Record.kind!='report'))
        s.add_all(rows)
        for cid,payload in cases.items():
            existing=s.get(Case,(aid,cid))
            if existing:
                existing.payload={**payload,**{k:v for k,v in existing.payload.items() if k in ['assigned_reviewer','priority','resolution']}}
            else:
                s.add(Case(audit_id=aid,id=cid,payload=payload,status='Needs Review',notes=[]))
        audit=s.get(Audit,aid)
        audit.status='Completed'; audit.summary={**audit.summary,**result.summary,'stage':'Completed','completed_at':datetime.now(timezone.utc).isoformat()}
        event(aid,'analysis_completed','Forensic analysis completed',session=s)
