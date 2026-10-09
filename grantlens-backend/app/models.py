"""Persisted audit, evidence, reviewer case and event tables."""
from sqlalchemy import String, JSON, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

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


Index('ix_record_risk',Record.audit_id,Record.kind,Record.payload['risk_score'].as_integer(),Record.id)
