from typing import Any, Literal
from pydantic import BaseModel, Field

Status=Literal['Needs Review','In Investigation','Verification Requested','Cleared']


class SeedRequest(BaseModel):
    count: int=Field(default=10000,ge=300,le=50000)
    seed: int=17


class CaseUpdate(BaseModel):
    status: Status | None=None
    note: str | None=Field(default=None,min_length=1,max_length=4000)


class AuditResponse(BaseModel):
    audit_id: str
    status: str
    summary: dict[str,Any]=Field(default_factory=dict)


class Page(BaseModel):
    items: list[dict[str,Any]]
    total: int
    offset: int
    limit: int


class GraphElement(BaseModel):
    data: dict[str,Any]


class GraphResponse(BaseModel):
    nodes: list[GraphElement]
    edges: list[GraphElement]
    truncated: bool=False


class Detail(BaseModel):
    model_config={'extra':'allow'}


class HealthResponse(BaseModel):
    status: str
    version: str


class Evidence(BaseModel):
    indicator: str
    contribution: int
    explanation: str
    related_beneficiary_ids: list[str]
    related_account_ids: list[str]
    source_record_ids: list[str]
    beneficiary_id: str | None=None


class BeneficiaryDetail(Detail):
    beneficiary_id: str
    full_name: str
    dob: str
    phone: str
    bank_account_id: str
    bank_account_id_node_id: str
    risk_score: int=Field(ge=0,le=100)
    risk_level: Literal['Low','Medium','High','Critical']
    evidence: list[Evidence]
    applications: list[dict[str,Any]]=Field(default_factory=list)


class ClusterDetail(Detail):
    cluster_id: str
    beneficiary_ids: list[str]
    size: int
    risk_score: int
    risk_level: str
    related_account_ids: list[str]
    evidence: list[Evidence]
    account_concentration: float
    total_disbursed: float


class CaseDetail(Detail):
    case_id: str
    beneficiary_ids: list[str]
    risk_score: int
    risk_level: str
    status: Status
    notes: list[dict[str,str]]
    evidence: list[Evidence]
