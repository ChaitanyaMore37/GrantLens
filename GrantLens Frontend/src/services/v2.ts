import { request, scoped, scope } from "./api";
export type Page<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
};
export type Evidence = {
  indicator: string;
  contribution: number;
  explanation: string;
  source_record_ids: string[];
  related_account_ids: string[];
};
export type Person = {
  beneficiary_id: string;
  full_name: string;
  district: string;
  institution_id: string;
  risk_score: number;
  risk_level: string;
  bank_account_id: string;
  phone?: string;
  address?: string;
  dob?: string;
  source_file?: string;
  source_row?: number;
  evidence: Evidence[];
  cluster_id?: string;
  case_id?: string;
  schemes?: string[];
  total_disbursed?: number;
  applications?: {
    application_id: string;
    scheme_id: string;
    approved_amount: number;
  }[];
};
export type Finding = Evidence & {
  finding_id: string;
  beneficiary_ids: string[];
  case_ids: string[];
  amount: number;
  assessment: string;
  transactions: {
    transaction_id: string;
    sender_account: string;
    receiver_account: string;
    amount: number;
    timestamp: string;
  }[];
};
export type Audit = {
  audit_id: string;
  created_at: string;
  status: string;
  summary: {
    beneficiary_count?: number;
    flagged_beneficiaries?: number;
    suspicious_cluster_count?: number;
    processing_seconds?: number;
    stage?: string;
    error?: string;
    source?: string;
  };
};
export type Event = {
  id: string;
  audit_id: string;
  created_at: string;
  event_type: string;
  case_id: string | null;
  actor: string;
  summary: string;
};
export type Metrics = {
  precision: number;
  recall: number;
  f1: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
};
export type Evaluation = {
  dataset: string;
  version: string;
  evaluated_at: string;
  summary: { beneficiary_count: number };
  configuration: Record<string, unknown>;
  metrics: {
    suspicious_records: Metrics;
    identity_matching: Metrics;
    false_positive_rate: number;
    fraud_ring_detection_recall: number;
    processing_seconds: number;
    records_per_second: number;
    scenario_flag_rates: Record<string, number>;
  };
};
const query = (v: Record<string, string | number>) =>
  new URLSearchParams(
    Object.entries(v).map(([k, x]) => [k, String(x)]),
  ).toString();
export const v2 = {
  transactions: (id: string, offset = 0) =>
    scoped<
      Page<{
        transaction_id: string;
        timestamp: string;
        amount: number;
        sender_account: string;
        receiver_account: string;
      }>
    >(`/beneficiaries/${encodeURIComponent(id)}/transactions`, {
      offset,
      limit: 25,
    }),
  summary: async () =>
    request<{
      transfer_count?: number;
      cycle_count?: number;
      suspicious_cycle_count?: number;
    }>(`/audits/${await scope()}/summary`),
  queue: (p: Record<string, string | number>) =>
    scoped<Page<Person>>("/review-queue", p),
  person: (id: string) =>
    scoped<Person>("/beneficiaries/" + encodeURIComponent(id)),
  anomalies: (p: Record<string, string | number>) =>
    scoped<Page<Finding>>("/anomalies", p),
  history: (p: Record<string, string | number>) =>
    request<Page<Audit>>("/history?" + query(p)),
  events: (p: Record<string, string | number>) =>
    scoped<Page<Event>>("/events", p),
  evaluations: () =>
    request<{ environment: string; runs: Evaluation[] }>("/evaluations"),
  initialize: (dataset: string) =>
    request<Audit>("/demo/initialize", {
      method: "POST",
      body: JSON.stringify({ dataset }),
    }),
  health: () => request<{ status: string; version: string }>("/health"),
  configuration: () => request<Record<string, unknown>>("/config"),
};
