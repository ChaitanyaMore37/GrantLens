import type { AuditJob, GraphResponse } from "../../types";
import { requireItem } from "../../utils/requireItem";
import type { Api } from "../api/contracts";
import {
  applications,
  beneficiaries,
  cases,
  clusters,
  graphFor,
  jobs,
  transactions,
} from "./data";
const copy = <T>(data: T): Promise<T> => Promise.resolve(structuredClone(data));
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
  getIdentityMatches: async (id) => {
    const b = requireItem(beneficiaries.find((b) => b.id === id));
    return graphFor(b.clusterId)
      .edges.filter(
        (e) =>
          e.data.type === "identity" &&
          [e.data.source, e.data.target].includes(id),
      )
      .map((e) => ({
        id: e.data.source === id ? e.data.target : e.data.source,
        score: (e.data.confidence || 0) * 100,
        attributes: ["Demo relationship"],
      }));
  },
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
