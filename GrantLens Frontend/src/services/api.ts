import {
  applications,
  beneficiaries,
  cases,
  clusters,
  graphFor,
  jobs,
  transactions,
} from "./data";
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
} from "../types";
export const config = {
  mode: import.meta.env.VITE_DATA_SOURCE === "mock" ? "mock" : "api",
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1",
};
export interface Api {
  getIdentityMatches(id:string):Promise<{id:string;score:number;attributes:string[]}[]>;
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
    patch: { status?: InvestigationCase["status"]; note?: string },
  ): Promise<InvestigationCase>;
  getAudits(): Promise<AuditJob[]>;
  uploadAuditFiles(files: DatasetFile[]): Promise<AuditJob>;
  runAudit(id: string, fail?: boolean): Promise<AuditJob>;
  getAudit(id: string): Promise<AuditJob>;
}
const copy = <T>(data: T): Promise<T> => Promise.resolve(structuredClone(data));
const requireItem = <T>(item: T | undefined): T => {
  if (!item) throw new Error("The requested record was not found.");
  return item;
};
function neighborhood(g: GraphResponse, id: string, hops: number) {
  let ids = new Set([id]);
  for (let i = 0; i < hops; i++) {
    const next = new Set(ids);
    g.edges.forEach(({ data: e }) => {
      if (ids.has(e.source)) next.add(e.target);
      if (ids.has(e.target)) next.add(e.source);
    });
    ids = next;
  }
  return {
    nodes: g.nodes.filter((n) => ids.has(n.data.id)),
    edges: g.edges.filter(
      (e) => ids.has(e.data.source) && ids.has(e.data.target),
    ),
  };
}
export const mockApi: Api = {
  getIdentityMatches:async id=>{const b=requireItem(beneficiaries.find(b=>b.id===id));return graphFor(b.clusterId).edges.filter(e=>e.data.type==="identity" && [e.data.source,e.data.target].includes(id)).map(e=>({id:e.data.source===id?e.data.target:e.data.source,score:(e.data.confidence || 0)*100,attributes:["Demo relationship"]}));},
  async getAuditSummary(f = {}) {
    const cs = clusters.filter(
      (c) =>
        (!f.scheme || c.scheme === f.scheme) &&
        (!f.district || c.district === f.district) &&
        (!f.batch || c.batch === f.batch),
    );
    const bs = beneficiaries.filter((b) =>
      cs.some((c) => c.beneficiaryIds.includes(b.id)),
    );
    const ts = transactions.filter(
      (t) =>
        bs.some((b) => b.id === t.beneficiaryId) &&
        (!f.period || f.period === "2024" || Number(t.date.slice(5, 7)) >= 10),
    );
    const open = cs.filter(
      (c) => cases.find((i) => i.clusterId === c.id)?.status !== "CLEARED",
    );
    return copy({
      beneficiaries: bs.length,
      payments: ts.length,
      clusters: cs.length,
      underReview: ts
        .filter((t) =>
          open.some((c) => c.beneficiaryIds.includes(t.beneficiaryId || "")),
        )
        .reduce((s, t) => s + t.amount, 0),
      investigations: cases.filter(
        (i) =>
          cs.some((c) => c.id === i.clusterId) &&
          ["IN_INVESTIGATION", "VERIFICATION_REQUESTED"].includes(i.status),
      ).length,
      duplicates: cs.reduce((s, c) => s + c.identityMatches, 0),
      monthly: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ].map((month, i) => {
        const mt = ts.filter((t) => Number(t.date.slice(5, 7)) === i + 1);
        return {
          month,
          high: mt.filter(
            (t) => (bs.find((b) => b.id === t.beneficiaryId)?.score || 0) >= 80,
          ).length,
          medium: mt.filter((t) => {
            const s = bs.find((b) => b.id === t.beneficiaryId)?.score || 0;
            return s >= 50 && s < 80;
          }).length,
          low: mt.filter(
            (t) => (bs.find((b) => b.id === t.beneficiaryId)?.score || 0) < 50,
          ).length,
        };
      }),
      distribution: [
        {
          name: "High / critical",
          value: bs.filter((b) => b.score >= 80).length,
          color: "#c94c55",
        },
        {
          name: "Medium",
          value: bs.filter((b) => b.score >= 50 && b.score < 80).length,
          color: "#d28b30",
        },
        {
          name: "Low",
          value: bs.filter((b) => b.score < 50).length,
          color: "#168a80",
        },
      ],
      anomalies: cs.map((c) => ({
        name: c.indicator,
        value: c.beneficiaryIds.length,
      })),
    });
  },
  getBeneficiaries: () => copy(beneficiaries),
  getBeneficiaryById: async (id) =>
    copy(requireItem(beneficiaries.find((b) => b.id === id))),
  getApplications: (id) =>
    copy(applications.filter((a) => a.beneficiaryId === id)),
  getTransactions: (id) =>
    copy(
      transactions.filter(
        (t) =>
          !id || t.beneficiaryId === id || t.source === id || t.target === id,
      ),
    ),
  getClusters: () => copy(clusters),
  getClusterById: async (id) =>
    copy(requireItem(clusters.find((c) => c.id === id))),
  getClusterGraph: async (id) => {
    requireItem(clusters.find((c) => c.id === id));
    return copy(graphFor(id));
  },
  getGraphNeighbors: async (c, id, hops) =>
    copy(neighborhood(graphFor(c), id, Math.min(3, Math.max(1, hops)))),
  getGraphPath: async (c, source, target) => {
    const g = graphFor(c);
    const q: string[][] = [[source]];
    const seen = new Set([source]);
    while (q.length) {
      const p = q.shift()!;
      const end = p[p.length - 1];
      if (end === target) {
        const ids = new Set(p);
        return copy({
          nodes: g.nodes.filter((n) => ids.has(n.data.id)),
          edges: g.edges.filter((e) =>
            p.some(
              (v, i) =>
                i < p.length - 1 &&
                ((v === e.data.source && p[i + 1] === e.data.target) ||
                  (v === e.data.target && p[i + 1] === e.data.source)),
            ),
          ),
        });
      }
      g.edges.forEach(({ data: e }) => {
        const next =
          e.source === end ? e.target : e.target === end ? e.source : null;
        if (next && !seen.has(next)) {
          seen.add(next);
          q.push([...p, next]);
        }
      });
    }
    return { nodes: [], edges: [] };
  },
  getInvestigations: () => copy(cases),
  updateInvestigation: async (id, patch) => {
    const c = requireItem(cases.find((c) => c.id === id));
    if (patch.status) c.status = patch.status;
    if (patch.note?.trim())
      c.notes.push({
        text: patch.note.trim(),
        createdAt: new Date().toISOString(),
      });
    c.updatedAt = new Date().toISOString();
    return copy(c);
  },
  getAudits: () => copy(jobs),
  uploadAuditFiles: async (files) => {
    if (files.length !== 3)
      throw new Error("All three CSV files are required.");
    const job: AuditJob = {
      id: `AUD-DEMO-${jobs.length + 1}`,
      name: "Uploaded dataset · demo analysis",
      status: "READY",
      progress: 0,
      stage: "Ready",
      createdAt: new Date().toISOString(),
      files: files.map((f) => ({ name: f.name, rows: f.rows })),
    };
    jobs.push(job);
    return copy(job);
  },
  runAudit: async (id, fail) => {
    const job = requireItem(jobs.find((j) => j.id === id));
    job.status = fail ? "FAILED" : "PROCESSING";
    job.progress = 0;
    job.stage = fail ? "Simulated processing failure" : "Data Validation";
    return copy(job);
  },
  getAudit: async (id) => {
    const j = requireItem(jobs.find((j) => j.id === id));
    if (j.status === "PROCESSING") {
      j.progress = Math.min(100, j.progress + 17);
      j.stage = [
        "Data Validation",
        "Normalization",
        "Record Linkage",
        "Graph Construction",
        "Community Detection",
        "Risk Scoring",
      ][Math.min(5, Math.floor(j.progress / 17))];
      if (j.progress === 100) {
        j.status = "COMPLETED";
        j.stage = "Complete";
      }
    }
    return copy(j);
  },
};
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(config.baseUrl + path, {
    ...options,
    headers:
      options?.body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(()=>null);
    const details = body?.error?.details;
    const errors = details?.errors || [];
    const rows = details?.rejected_rows?.slice(0,3).map((r: {table:string;row?:number;errors:string[]})=>`${r.table}${r.row ? ` row ${r.row}` : ""}: ${r.errors.join(", ")}`) || [];
    throw new Error(`API request failed (${response.status}): ${body?.error?.message || "Check the backend connection and selected audit."} ${[...errors,...rows].join("; ")}`);
  }
  const data = await response.json();
  if (data == null) throw new Error("The API returned an empty response.");
  return data as T;
}
const query = (values: object) =>
  new URLSearchParams(
    Object.entries(values)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
export function selectedAudit() { return localStorage.getItem("grantlens.audit") || ""; }
export function selectAudit(id: string) { localStorage.setItem("grantlens.audit", id); snapshots.clear(); }
type Results = { beneficiaries: Beneficiary[]; applications: ScholarshipApplication[]; transactions: FinancialTransaction[]; clusters: Cluster[]; reviewCases?: Cluster[] };
type WireAudit = { audit_id: string; status: string; created_at?: string; summary?: {accepted_counts?: Record<string, number>; beneficiary_count?: number; application_count?: number; transaction_count?: number; error?: string} };
const statusMap = { "Needs Review": "NEEDS_REVIEW", "In Investigation": "IN_INVESTIGATION", "Verification Requested": "VERIFICATION_REQUESTED", "Cleared": "CLEARED" } as const;
type WireCase = {case_id: string; risk_score?:number; status: keyof typeof statusMap; notes: {text:string; created_at:string}[]};
function mapCase(c: WireCase): InvestigationCase { return {id:c.case_id,clusterId:c.case_id,score:c.risk_score,status:statusMap[c.status],auditor:"Local reviewer",updatedAt:c.notes.at(-1)?.created_at || "",notes:c.notes.map(n=>({text:n.text,createdAt:n.created_at}))}; }
function mapAudit(a: WireAudit): AuditJob {
  const status = ({Ready:"READY",Running:"PROCESSING",Completed:"COMPLETED",Failed:"FAILED"} as const)[a.status as "Ready" | "Running" | "Completed" | "Failed"];
  if (!status) throw new Error("Unknown audit status from backend");
  const counts = a.summary?.accepted_counts || {beneficiaries:a.summary?.beneficiary_count || 0,applications:a.summary?.application_count || 0,transactions:a.summary?.transaction_count || 0};
  return {id:a.audit_id,name:"Uploaded scholarship dataset",status,progress:status === "COMPLETED" ? 100 : 0,stage:a.summary?.error || (status === "PROCESSING" ? "Forensic pipeline running — progress is indeterminate" : a.status),createdAt:a.created_at || "",files:Object.entries(counts).map(([name,rows])=>({name:name+".csv",rows}))};
}
async function scope() {
  if (selectedAudit()) return selectedAudit();
  const jobs = await httpApi.getAudits();
  const latest = jobs.find(j=>j.status === "COMPLETED");
  if (!latest) throw new Error("No completed audit. Open New Audit and upload the supplied CSV files.");
  selectAudit(latest.id); return latest.id;
}
async function scoped<T>(path: string, values: object = {}, options?:RequestInit):Promise<T> { const aid=await scope(); return request(`${path}?${query({...values,audit_id:aid})}`,options); }
const snapshots = new Map<string, Promise<Results>>();
async function results() {
  const aid=await scope();
  if (!snapshots.has(aid)) snapshots.set(aid, request<Results>(`/ui/results?${query({audit_id:aid})}`).catch(e=>{snapshots.delete(aid);throw e;}));
  return snapshots.get(aid)!;
}
async function allCases():Promise<InvestigationCase[]> {
  const aid=await scope(); const items:InvestigationCase[]=[];
  for(let offset=0;;offset+=200) { const page=await request<{items:WireCase[];total:number}>(`/cases?${query({audit_id:aid,offset,limit:200})}`); items.push(...page.items.map(mapCase)); if(items.length>=page.total) return items; }
}
type WireGraph = { nodes: {data:{id:string;label:string;type:string;risk_score?:number}}[]; edges:{data:{id:string;source:string;target:string;relationship:string;source_record_ids:string[];confidence?:number;amount?:number;timestamp?:string}}[]; truncated:boolean };
function mapGraph(g:WireGraph):GraphResponse {
  const types:Record<string,GraphResponse["nodes"][number]["data"]["type"]>={BENEFICIARY:"beneficiary",BANK_ACCOUNT:"account",PHONE:"phone",ADDRESS:"address",INSTITUTION:"institution",SCHEME:"scheme"};
  const relations:Record<string,string>={TRANSFER:"transfer",POSSIBLE_IDENTITY_MATCH:"identity",USES_ACCOUNT:"payout",HAS_PHONE:"phone",RESIDES_AT:"address",ENROLLED_AT:"institution",APPLIED_FOR:"scheme"};
  return {truncated:g.truncated,nodes:g.nodes.map(n=>({data:{...n.data,type:types[n.data.type],maskedInfo:n.data.label,sourceRecords:[...new Set(g.edges.filter(e=>e.data.source===n.data.id || e.data.target===n.data.id).flatMap(e=>e.data.source_record_ids))]}})),edges:g.edges.map(e=>({data:{...e.data,label:e.data.relationship.replaceAll("_"," "),type:relations[e.data.relationship] || e.data.relationship,records:e.data.source_record_ids,confidence:e.data.relationship==="POSSIBLE_IDENTITY_MATCH"?e.data.confidence:undefined}}))};
}
export const httpApi: Api = {
  getIdentityMatches:async id=>{const items:{id:string;score:number;attributes:string[]}[]=[]; const aid=await scope(); for(let offset=0;;offset+=200){const page=await request<{items:{first_beneficiary_id:string;second_beneficiary_id:string;match_score:number;matching_attributes:string[]}[];total:number}>(`/beneficiaries/${encodeURIComponent(id)}/matches?${query({audit_id:aid,offset,limit:200})}`);items.push(...page.items.map(m=>({id:m.first_beneficiary_id===id?m.second_beneficiary_id:m.first_beneficiary_id,score:m.match_score,attributes:m.matching_attributes})));if(items.length>=page.total)return items;}},
  getAuditSummary: f=>scoped("/ui/summary",f || {}),
  getBeneficiaries: async()=> (await results()).beneficiaries,
  getBeneficiaryById: async id=> requireItem((await results()).beneficiaries.find(b=>b.id===id)),
  getApplications: async id=> (await results()).applications.filter(a=>a.beneficiaryId===id),
  getTransactions: async id=> (await results()).transactions.filter(t=>!id || t.beneficiaryId===id || t.source===id || t.target===id),
  getClusters: async()=> (await results()).clusters,
  getClusterById: async id=> requireItem([...(await results()).clusters,...((await results()).reviewCases || [])].find(c=>c.id===id)),
  getClusterGraph: async id=>mapGraph(await scoped(`/clusters/${encodeURIComponent(id)}/graph`,{limit:500})),
  getGraphNeighbors: async (_c,id,hops)=>mapGraph(await scoped("/graph/neighbors",{node_id:id,hops,limit:500})),
  getGraphPath: async (_c,source,target)=>mapGraph(await scoped("/graph/path",{source,target,limit:500})),
  getInvestigations: allCases,
  updateInvestigation: async(id,patch)=>mapCase(await scoped(`/cases/${encodeURIComponent(id)}`,{}, {method:"PATCH",body:JSON.stringify({...patch,status:patch.status ? Object.entries(statusMap).find(([,v])=>v===patch.status)?.[0] : undefined})})),
  getAudits: async()=> (await request<WireAudit[]>("/audits")).map(mapAudit),
  uploadAuditFiles: async files=>{ const data=new FormData(); files.forEach(f=>data.append(f.name.replace(".csv",""),f.file)); return mapAudit(await request<WireAudit>("/audits/upload",{method:"POST",body:data})); },
  runAudit: async id=> { snapshots.delete(id); return mapAudit(await request<WireAudit>(`/audits/${encodeURIComponent(id)}/run`,{method:"POST"})); },
  getAudit: async id=>mapAudit(await request<WireAudit>(`/audits/${encodeURIComponent(id)}/status`)),
};
export const api = config.mode === "mock" ? mockApi : httpApi;
