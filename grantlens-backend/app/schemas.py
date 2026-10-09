from typing import Any, Literal
from pydantic import BaseModel, Field

Status=Literal['Needs Review','In Investigation','Verification Requested','Cleared']


class SeedRequest(BaseModel):
    count: int=Field(default=10000,ge=300,le=50000)
    seed: int=17


class CaseUpdate(BaseModel):
    status: Status | None=None
    assigned_reviewer: str | None=Field(default=None,max_length=100)
    priority: Literal['Normal','High','Urgent'] | None=None
    resolution: str | None=Field(default=None,max_length=2000)
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


class DemoDatasetRequest(BaseModel):
    dataset: Literal['sample','main']='sample'

class EvaluationResponse(BaseModel):
    environment: str
    runs: list[dict[str,Any]]

class EventResponse(BaseModel):
    id: str
    audit_id: str
    created_at: str
    event_type: str
    case_id: str | None
    actor: str
    summary: str

class EventPage(BaseModel):
    items: list[EventResponse]
    total: int
    offset: int
    limit: int


class ColumnMappings(BaseModel):
    tables: dict[str,dict[str,str]]=Field(default_factory=dict)

class ReviewBeneficiary(BeneficiaryDetail):
    district: str
    institution_id: str
    total_disbursed: float=0
    schemes: list[str]=Field(default_factory=list)
    cluster_id: str | None=None
    case_id: str | None=None

class ReviewPage(BaseModel):
    items: list[ReviewBeneficiary]
    total: int
    offset: int
    limit: int

class FinancialFinding(Evidence):
    finding_id: str
    beneficiary_ids: list[str]
    case_ids: list[str]
    transactions: list[dict[str,Any]]
    amount: float
    assessment: Literal['Review','Context only']

class FindingPage(BaseModel):
    items: list[FinancialFinding]
    total: int
    offset: int
    limit: int

class HistoryAudit(AuditResponse):
    created_at: str

class HistoryPage(BaseModel):
    items: list[HistoryAudit]
    total: int
    offset: int
    limit: int

class ReportSnapshot(BaseModel):
    report_id: str
    audit_id: str
    generated_at: str
    environment: str
    summary: dict[str,Any]
    cases: list[CaseDetail]
    anomalies: list[FinancialFinding]
    methodology: str
    limitations: str
