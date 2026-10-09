export type ReviewStatus =
  "NEEDS_REVIEW" | "IN_INVESTIGATION" | "VERIFICATION_REQUESTED" | "CLEARED";
export interface Beneficiary {
  id: string;
  name: string;
  district: string;
  institution: string;
  scheme: string;
  account: string;
  phone: string;
  address: string;
  score: number;
  clusterId: string;
  sourceId: string;
  evidence?: RiskEvidence[];
}
export interface ScholarshipApplication {
  id: string;
  beneficiaryId: string;
  scheme: string;
  academicYear: string;
  amount: number;
  status: string;
}
export interface FinancialTransaction {
  scheme?: string;
  id: string;
  beneficiaryId?: string;
  source: string;
  target: string;
  amount: number;
  date: string;
  reference: string;
}
export interface RiskEvidence {
  id: string;
  label: string;
  description: string;
  contribution: number;
  records: string[];
}
export interface Cluster {
  id: string;
  name: string;
  beneficiaryIds: string[];
  district: string;
  scheme: string;
  score: number;
  accountIds: string[];
  identityMatches: number;
  transactionPatterns: number;
  amount: number;
  indicator: string;
  evidence: RiskEvidence[];
  batch: string;
}
export interface InvestigationCase {
  priority?: string;
  resolution?: string;
  score?: number;
  id: string;
  clusterId: string;
  status: ReviewStatus;
  auditor: string;
  updatedAt: string;
  notes: { text: string; createdAt: string }[];
}
export type EntityType =
  | "beneficiary"
  | "account"
  | "phone"
  | "address"
  | "institution"
  | "scheme"
  | "collector";
export interface GraphNode {
  data: {
    id: string;
    label: string;
    type: EntityType;
    maskedInfo: string;
    sourceRecords: string[];
  };
  position?: { x: number; y: number };
}
export interface GraphEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    type: string;
    confidence?: number;
    records: string[];
  };
}
export interface GraphResponse {
  truncated?: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
export interface AuditJob {
  validation?: unknown;
  id: string;
  name: string;
  status: "READY" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  stage: string;
  createdAt: string;
  files: { name: string; rows: number }[];
}
export interface AuditSummary {
  beneficiaries: number;
  payments: number;
  clusters: number;
  underReview: number;
  investigations: number;
  duplicates: number;
  monthly: { month: string; high: number; medium: number; low: number }[];
  distribution: { name: string; value: number; color: string }[];
  anomalies: { name: string; value: number }[];
}
export interface DatasetFile {
  mapping?: Record<string, string>;
  name: string;
  rows: number;
  file: File;
  columns: string[];
}
export interface AuditFilters {
  scheme?: string;
  district?: string;
  batch?: string;
  period?: string;
}
