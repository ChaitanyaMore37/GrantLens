import { config } from "../../config";
import type {
  AuditJob,
  Beneficiary,
  Cluster,
  FinancialTransaction,
  GraphResponse,
  InvestigationCase,
  ScholarshipApplication,
} from "../../types";
import { requireItem } from "../../utils/requireItem";
import { mockApi } from "../mock/api";
import { ApiError, request } from "./client";
import type { Api } from "./contracts";
export type { Api } from "./contracts";
export { ApiError, config, mockApi, request };
const query = (values: object) =>
  new URLSearchParams(
    Object.entries(values)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
export function selectedAudit() {
  return localStorage.getItem("grantlens.audit") || "";
}
export function selectAudit(id: string) {
  localStorage.setItem("grantlens.audit", id);
  snapshots.clear();
}
type Results = {
  beneficiaries: Beneficiary[];
  applications: ScholarshipApplication[];
  transactions: FinancialTransaction[];
  clusters: Cluster[];
  reviewCases?: Cluster[];
};
type WireAudit = {
  audit_id: string;
  status: string;
  created_at?: string;
  summary?: {
    validation?: unknown;
    warnings?: string[];
    accepted_counts?: Record<string, number>;
    beneficiary_count?: number;
    application_count?: number;
    transaction_count?: number;
    error?: string;
    stage?: string;
  };
};
const statusMap = {
  "Needs Review": "NEEDS_REVIEW",
  "In Investigation": "IN_INVESTIGATION",
  "Verification Requested": "VERIFICATION_REQUESTED",
  Cleared: "CLEARED",
} as const;
type WireCase = {
  assigned_reviewer?: string;
  priority?: string;
  resolution?: string;
  case_id: string;
  risk_score?: number;
  status: keyof typeof statusMap;
  notes: { text: string; created_at: string }[];
};
function mapCase(c: WireCase): InvestigationCase {
  return {
    id: c.case_id,
    clusterId: c.case_id,
    score: c.risk_score,
    status: statusMap[c.status],
    auditor: c.assigned_reviewer || "Local reviewer",
    priority: c.priority,
    resolution: c.resolution,
    updatedAt: c.notes.at(-1)?.created_at || "",
    notes: c.notes.map((n) => ({ text: n.text, createdAt: n.created_at })),
  };
}
function mapAudit(a: WireAudit): AuditJob {
  const status = (
    {
      Ready: "READY",
      Running: "PROCESSING",
      Completed: "COMPLETED",
      Failed: "FAILED",
    } as const
  )[a.status as "Ready" | "Running" | "Completed" | "Failed"];
  if (!status) throw new Error("Unknown audit status from backend");
  const counts = a.summary?.accepted_counts || {
    beneficiaries: a.summary?.beneficiary_count || 0,
    applications: a.summary?.application_count || 0,
    transactions: a.summary?.transaction_count || 0,
  };
  return {
    validation: a.summary?.validation || a.summary,
    id: a.audit_id,
    name: "Uploaded scholarship dataset",
    status,
    progress: status === "COMPLETED" ? 100 : 0,
    stage:
      a.summary?.error ||
      a.summary?.stage ||
      (status === "PROCESSING"
        ? "Forensic pipeline running — progress is indeterminate"
        : a.status),
    createdAt: a.created_at || "",
    files: Object.entries(counts).map(([name, rows]) => ({
      name: name + ".csv",
      rows,
    })),
  };
}
export async function scope() {
  if (selectedAudit()) return selectedAudit();
  const jobs = await httpApi.getAudits();
  const latest = jobs.find((j) => j.status === "COMPLETED");
  if (!latest)
    throw new Error(
      "No completed audit. Open New Audit and upload the supplied CSV files.",
    );
  selectAudit(latest.id);
  return latest.id;
}
export async function scoped<T>(
  path: string,
  values: object = {},
  options?: RequestInit,
): Promise<T> {
  const aid = await scope();
  return request(`${path}?${query({ ...values, audit_id: aid })}`, options);
}
const snapshots = new Map<string, Promise<Results>>();
async function results() {
  const aid = await scope();
  if (!snapshots.has(aid))
    snapshots.set(
      aid,
      request<Results>(`/ui/results?${query({ audit_id: aid })}`).catch((e) => {
        snapshots.delete(aid);
        throw e;
      }),
    );
  return snapshots.get(aid)!;
}
async function allCases(): Promise<InvestigationCase[]> {
  const aid = await scope();
  const items: InvestigationCase[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = await request<{ items: WireCase[]; total: number }>(
      `/cases?${query({ audit_id: aid, offset, limit: 200 })}`,
    );
    items.push(...page.items.map(mapCase));
    if (items.length >= page.total) return items;
  }
}
type WireGraph = {
  nodes: {
    data: { id: string; label: string; type: string; risk_score?: number };
  }[];
  edges: {
    data: {
      id: string;
      source: string;
      target: string;
      relationship: string;
      source_record_ids: string[];
      confidence?: number;
      amount?: number;
      timestamp?: string;
    };
  }[];
  truncated: boolean;
};
function mapGraph(g: WireGraph): GraphResponse {
  const types: Record<string, GraphResponse["nodes"][number]["data"]["type"]> =
    {
      BENEFICIARY: "beneficiary",
      BANK_ACCOUNT: "account",
      PHONE: "phone",
      ADDRESS: "address",
      INSTITUTION: "institution",
      SCHEME: "scheme",
    };
  const relations: Record<string, string> = {
    TRANSFER: "transfer",
    POSSIBLE_IDENTITY_MATCH: "identity",
    USES_ACCOUNT: "payout",
    HAS_PHONE: "phone",
    RESIDES_AT: "address",
    ENROLLED_AT: "institution",
    APPLIED_FOR: "scheme",
  };
  return {
    truncated: g.truncated,
    nodes: g.nodes.map((n) => ({
      data: {
        ...n.data,
        type: types[n.data.type],
        maskedInfo: n.data.label,
        sourceRecords: [
          ...new Set(
            g.edges
              .filter(
                (e) =>
                  e.data.source === n.data.id || e.data.target === n.data.id,
              )
              .flatMap((e) => e.data.source_record_ids),
          ),
        ],
      },
    })),
    edges: g.edges.map((e) => ({
      data: {
        ...e.data,
        label: e.data.relationship.replaceAll("_", " "),
        type: relations[e.data.relationship] || e.data.relationship,
        records: e.data.source_record_ids,
        confidence:
          e.data.relationship === "POSSIBLE_IDENTITY_MATCH"
            ? e.data.confidence
            : undefined,
      },
    })),
  };
}
export const httpApi: Api = {
  getIdentityMatches: async (id) => {
    const items: { id: string; score: number; attributes: string[] }[] = [];
    const aid = await scope();
    for (let offset = 0; ; offset += 200) {
      const page = await request<{
        items: {
          first_beneficiary_id: string;
          second_beneficiary_id: string;
          match_score: number;
          matching_attributes: string[];
        }[];
        total: number;
      }>(
        `/beneficiaries/${encodeURIComponent(id)}/matches?${query({ audit_id: aid, offset, limit: 200 })}`,
      );
      items.push(
        ...page.items.map((m) => ({
          id:
            m.first_beneficiary_id === id
              ? m.second_beneficiary_id
              : m.first_beneficiary_id,
          score: m.match_score,
          attributes: m.matching_attributes,
        })),
      );
      if (items.length >= page.total) return items;
    }
  },
  getAuditSummary: (f) => scoped("/ui/summary", f || {}),
  getBeneficiaries: async () => (await results()).beneficiaries,
  getBeneficiaryById: async (id) =>
    requireItem((await results()).beneficiaries.find((b) => b.id === id)),
  getApplications: async (id) =>
    (await results()).applications.filter((a) => a.beneficiaryId === id),
  getTransactions: async (id) =>
    (await results()).transactions.filter(
      (t) =>
        !id || t.beneficiaryId === id || t.source === id || t.target === id,
    ),
  getClusters: async () => (await results()).clusters,
  getClusterById: async (id) =>
    requireItem(
      [
        ...(await results()).clusters,
        ...((await results()).reviewCases || []),
      ].find((c) => c.id === id),
    ),
  getClusterGraph: async (id) =>
    mapGraph(
      await scoped(`/clusters/${encodeURIComponent(id)}/graph`, { limit: 500 }),
    ),
  getGraphNeighbors: async (_c, id, hops) =>
    mapGraph(
      await scoped("/graph/neighbors", { node_id: id, hops, limit: 500 }),
    ),
  getGraphPath: async (_c, source, target) =>
    mapGraph(await scoped("/graph/path", { source, target, limit: 500 })),
  getInvestigations: allCases,
  updateInvestigation: async (id, patch) =>
    mapCase(
      await scoped(
        `/cases/${encodeURIComponent(id)}`,
        {},
        {
          method: "PATCH",
          body: JSON.stringify({
            ...patch,
            status: patch.status
              ? Object.entries(statusMap).find(
                  ([, v]) => v === patch.status,
                )?.[0]
              : undefined,
          }),
        },
      ),
    ),
  getAudits: async () => (await request<WireAudit[]>("/audits")).map(mapAudit),
  uploadAuditFiles: async (files) => {
    const data = new FormData();
    files.forEach((f) => data.append(f.name.replace(".csv", ""), f.file));
    const tables = Object.fromEntries(
      files
        .filter((f) => f.mapping)
        .map((f) => [f.name.replace(".csv", ""), f.mapping]),
    );
    if (Object.keys(tables).length)
      data.append("column_mapping", JSON.stringify({ tables }));
    return mapAudit(
      await request<WireAudit>("/audits/upload", {
        method: "POST",
        body: data,
      }),
    );
  },
  runAudit: async (id) => {
    snapshots.delete(id);
    return mapAudit(
      await request<WireAudit>(`/audits/${encodeURIComponent(id)}/run`, {
        method: "POST",
      }),
    );
  },
  getAudit: async (id) =>
    mapAudit(
      await request<WireAudit>(`/audits/${encodeURIComponent(id)}/status`),
    ),
};
export const api = config.mode === "mock" ? mockApi : httpApi;

export const reportCsvUrl = (id: string) =>
  `${config.baseUrl}/reports/${encodeURIComponent(id)}/csv?${query({ audit_id: selectedAudit() })}`;
