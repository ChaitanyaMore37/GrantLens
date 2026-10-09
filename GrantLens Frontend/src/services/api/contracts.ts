import type {
  AuditFilters,
  AuditJob,
  AuditSummary,
  Beneficiary,
  Cluster,
  DatasetFile,
  FinancialTransaction,
  GraphResponse,
  InvestigationCase,
  ScholarshipApplication,
} from "../../types";
export interface Api {
  getIdentityMatches(
    id: string,
  ): Promise<{ id: string; score: number; attributes: string[] }[]>;
  getAuditSummary(filters?: AuditFilters): Promise<AuditSummary>;
  getBeneficiaries(): Promise<Beneficiary[]>;
  getBeneficiaryById(id: string): Promise<Beneficiary>;
  getApplications(id: string): Promise<ScholarshipApplication[]>;
  getTransactions(id?: string): Promise<FinancialTransaction[]>;
  getClusters(): Promise<Cluster[]>;
  getClusterById(id: string): Promise<Cluster>;
  getClusterGraph(id: string): Promise<GraphResponse>;
  getGraphNeighbors(
    clusterId: string,
    id: string,
    hops: number,
  ): Promise<GraphResponse>;
  getGraphPath(
    clusterId: string,
    source: string,
    target: string,
  ): Promise<GraphResponse>;
  getInvestigations(): Promise<InvestigationCase[]>;
  updateInvestigation(
    id: string,
    patch: {
      status?: InvestigationCase["status"];
      note?: string;
      assigned_reviewer?: string;
      priority?: string;
      resolution?: string;
    },
  ): Promise<InvestigationCase>;
  getAudits(): Promise<AuditJob[]>;
  uploadAuditFiles(files: DatasetFile[]): Promise<AuditJob>;
  runAudit(id: string, fail?: boolean): Promise<AuditJob>;
  getAudit(id: string): Promise<AuditJob>;
}
