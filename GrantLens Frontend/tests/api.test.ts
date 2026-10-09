import { describe, it, expect, vi, afterEach } from "vitest";
import { mockApi, httpApi, selectAudit } from "../src/services/api";
import {
  beneficiaries,
  clusters,
  transactions,
  cases,
} from "../src/services/data";
import { validateCsv } from "../src/utils";
import { readFileSync } from "node:fs";
afterEach(() => {vi.unstubAllGlobals(); localStorage.clear();});
describe("deterministic mock API and evidence consistency", () => {
  it("derives dashboard totals from the same records as case views", async () => {
    const s = await mockApi.getAuditSummary();
    expect(s.beneficiaries).toBe(32);
    expect(s.payments).toBe(96);
    expect(s.clusters).toBe(5);
    expect(s.underReview).toBe(1152000);
    expect(s.monthly.reduce((n, m) => n + m.high + m.medium + m.low, 0)).toBe(
      96,
    );
    expect(s.distribution.reduce((n, d) => n + d.value, 0)).toBe(32);
    expect(clusters.reduce((n, c) => n + c.amount, 0)).toBe(
      transactions
        .filter((t) => t.beneficiaryId)
        .reduce((n, t) => n + t.amount, 0),
    );
  });
  it("filters summary records by district and reporting period", async () => {
    expect(
      (await mockApi.getAuditSummary({ district: "Pune" })).beneficiaries,
    ).toBe(16);
    expect(
      (await mockApi.getAuditSummary({ district: "Pune", period: "q4" }))
        .payments,
    ).toBe(16);
    expect(
      (await mockApi.getAuditSummary({ district: "Unknown" })).beneficiaries,
    ).toBe(0);
  });
  it("returns isolated copies rather than exposing mutable fixtures", async () => {
    const a = await mockApi.getBeneficiaries();
    a[0].name = "Changed";
    expect((await mockApi.getBeneficiaries())[0].name).toBe("Aarav Deshmukh");
  });
  it("provides a complete graph without dangling edges and consistent scores", async () => {
    for (const c of clusters) {
      const g = await mockApi.getClusterGraph(c.id);
      const ids = new Set(g.nodes.map((n) => n.data.id));
      expect(ids.size).toBe(g.nodes.length);
      expect(
        g.nodes
          .filter((n) => n.data.type === "beneficiary")
          .map((n) => n.data.id)
          .sort(),
      ).toEqual([...c.beneficiaryIds].sort());
      expect(g.edges.filter((e) => e.data.type === "identity").length).toBe(
        c.identityMatches,
      );
      for (const e of g.edges) {
        expect(ids.has(e.data.source)).toBe(true);
        expect(ids.has(e.data.target)).toBe(true);
      }
      expect(c.evidence.reduce((n, e) => n + e.contribution, 0)).toBe(c.score);
    }
  });
  it("preserves the recorded directed transaction cycle", async () => {
    const g = await mockApi.getClusterGraph("CL-017");
    const links = g.edges
      .filter((e) => e.data.type === "transfer")
      .map((e) => `${e.data.source}>${e.data.target}`);
    expect(links).toEqual(["AC-1>COL-01", "COL-01>AC-2", "AC-2>AC-1"]);
    expect(g.nodes.filter((n) => n.data.type === "beneficiary")).toHaveLength(
      16,
    );
  });
  it("returns bounded neighborhoods and paths using stable IDs", async () => {
    const one = await mockApi.getGraphNeighbors("CL-017", "BEN-001", 1);
    const three = await mockApi.getGraphNeighbors("CL-017", "BEN-001", 3);
    expect(three.nodes.length).toBeGreaterThan(one.nodes.length);
    const p = await mockApi.getGraphPath("CL-017", "BEN-001", "COL-01");
    expect(p.nodes.map((n) => n.data.id)).toEqual(
      expect.arrayContaining(["BEN-001", "AC-1", "COL-01"]),
    );
    expect(
      (await mockApi.getGraphPath("CL-017", "missing", "COL-01")).nodes,
    ).toEqual([]);
  });
  it("persists status and notes while keeping risk independent", async () => {
    const original = structuredClone(cases[0]);
    try {
      await mockApi.updateInvestigation("INV-104", {
        status: "CLEARED",
        note: "Source records independently checked in test.",
      });
      const c = (await mockApi.getInvestigations())[0];
      expect(c.status).toBe("CLEARED");
      expect(c.notes.at(-1)?.text).toContain("independently");
      expect((await mockApi.getClusterById("CL-017")).score).toBe(95);
      expect((await mockApi.getAuditSummary()).underReview).toBe(432000);
    } finally {
      Object.assign(cases[0], original);
    }
  });
  it("rejects missing records", async () => {
    await expect(mockApi.getBeneficiaryById("missing")).rejects.toThrow(
      "not found",
    );
    await expect(mockApi.getClusterGraph("missing")).rejects.toThrow(
      "not found",
    );
  });
  it("uses valid downloadable source files and records all source rows", () => {
    for (const name of [
      "beneficiaries.csv",
      "applications.csv",
      "transactions.csv",
    ]) {
      const result = validateCsv(
        readFileSync(`public/samples/${name}`, "utf8"),
        name,
      );
      expect(result.errors).toEqual([]);
      expect(result.rows).toBe(name === "transactions.csv" ? 100 : 32);
    }
    expect(
      beneficiaries.every((b) => clusters.some((c) => c.id === b.clusterId)),
    ).toBe(true);
  });
  it("supports simulated success and recoverable failure", async () => {
    const files = [
      "beneficiaries.csv",
      "applications.csv",
      "transactions.csv",
    ].map((name) => ({
      name,
      rows: 1,
      columns: [],
      file: new File(["id\n1"], name),
    }));
    const j = await mockApi.uploadAuditFiles(files);
    expect((await mockApi.runAudit(j.id, true)).status).toBe("FAILED");
    await mockApi.runAudit(j.id);
    let result = await mockApi.getAudit(j.id);
    for (let i = 0; i < 6; i++) result = await mockApi.getAudit(j.id);
    expect(result.status).toBe("COMPLETED");
    expect(result.progress).toBe(100);
    await expect(mockApi.uploadAuditFiles([])).rejects.toThrow("three CSV");
  });
});
describe("CSV schema checks", () => {
  it("rejects missing columns and empty datasets", () => {
    expect(
      validateCsv("id,name\n1,A", "beneficiaries.csv").errors.join(),
    ).toContain("Missing columns");
    expect(
      validateCsv(
        "id,name,district,institution,scheme,account",
        "beneficiaries.csv",
      ).errors,
    ).toContain("The file has no data records.");
  });
  it("handles quoted commas and validates numeric fields", () => {
    expect(
      validateCsv(
        'id,beneficiary_id,scheme,amount\nA1,B1,"Merit, 2024",15000',
        "applications.csv",
      ).errors,
    ).toEqual([]);
    const invalid = validateCsv(
      "id,source,target,amount,date\nT1,A,B,nope,bad-date\nT1,A,B,1,2024-01-01",
      "transactions.csv",
    ).errors.join();
    expect(invalid).toContain("amount");
    expect(invalid).toContain("invalid date");
    expect(invalid).toContain("duplicate id");
  });
});
describe("HTTP adapter failures", () => {
  it("handles HTTP errors", async () => {
    selectAudit("test-audit");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async()=>({error:{message:"Unavailable"}}) }),
    );
    await expect(httpApi.getClusters()).rejects.toThrow("503");
  });
  it("rejects missing response bodies and allows empty lists", async () => {
    selectAudit("test-audit");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => null }),
    );
    await expect(httpApi.getClusters()).rejects.toThrow("empty response");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({clusters:[],beneficiaries:[],applications:[],transactions:[]}) }),
    );
    expect(await httpApi.getClusters()).toEqual([]);
  });
});

describe("integrated HTTP contract",()=>{
  it("scopes data and graph calls to the selected audit",async()=>{
    selectAudit("audit-A");
    const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({beneficiaries:[],applications:[],transactions:[],clusters:[]})}).mockResolvedValueOnce({ok:true,json:async()=>({nodes:[{data:{id:"B",type:"BENEFICIARY",label:"Record"}},{data:{id:"A",type:"BANK_ACCOUNT",label:"••••1234"}}],edges:[{data:{id:"E",source:"B",target:"A",relationship:"USES_ACCOUNT",source_record_ids:["B"]}}],truncated:true})});
    vi.stubGlobal("fetch",fetcher);
    expect(await httpApi.getBeneficiaries()).toEqual([]);
    const g=await httpApi.getClusterGraph("CLU-real");
    expect(g.nodes[1].data.type).toBe("account");
    expect(g.edges[0].data.records).toEqual(["B"]);
    expect(g.truncated).toBe(true);
    expect(fetcher.mock.calls.every(([url])=>String(url).includes("audit_id=audit-A"))).toBe(true);
    selectAudit("audit-B");
    fetcher.mockResolvedValueOnce({ok:true,json:async()=>({beneficiaries:[],applications:[],transactions:[],clusters:[]})});
    await httpApi.getBeneficiaries();
    expect(String(fetcher.mock.calls.at(-1)?.[0])).toContain("audit_id=audit-B");
  });
  it("maps case statuses to backend values without changing the score",async()=>{
    selectAudit("audit-C");
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({case_id:"CLU-real",status:"In Investigation",notes:[{text:"check",created_at:"2026-10-09"}]})});
    vi.stubGlobal("fetch",fetcher);
    const c=await httpApi.updateInvestigation("CLU-real",{status:"IN_INVESTIGATION",note:"check"});
    expect(c.status).toBe("IN_INVESTIGATION");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({status:"In Investigation",note:"check"});
  });
});
