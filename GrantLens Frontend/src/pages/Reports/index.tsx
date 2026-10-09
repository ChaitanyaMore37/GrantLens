import { useQuery } from "@tanstack/react-query";
import { Landmark, Printer, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  DataState,
  PageHeading,
  Panel,
  RiskBadge,
  Select,
  StatusBadge,
} from "../../components/common/Common";
import {
  api,
  config,
  reportCsvUrl,
  scoped,
  selectAudit,
  selectedAudit,
} from "../../services/api";
import { download, money } from "../../utils";
function ReportArchive() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["reports", selectedAudit(), page],
    queryFn: () =>
      scoped<{
        items: { report_id: string; generated_at: string }[];
        total: number;
      }>("/reports", { offset: (page - 1) * 25, limit: 25 }),
  });
  async function exportReport(id: string) {
    setError("");
    try {
      const report = await scoped<Record<string, unknown>>("/reports/" + id);
      download(id + ".json", JSON.stringify(report, null, 2));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Panel title="Persisted report archive">
      <div className="settings-body">
        <p>
          Generate a snapshot with audit provenance, validation findings, real
          evidence, case notes and methodology. JSON includes full evidence; CSV
          contains the case register.
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await scoped("/reports", {}, { method: "POST" });
              await q.refetch();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Generate and archive report
        </button>
        {error && <p role="alert">{error}</p>}
        <DataState
          loading={q.isPending}
          error={q.error}
          retry={() => q.refetch()}
        >
          {q.data?.items.map((r) => (
            <p key={r.report_id}>
              {r.report_id} · {new Date(r.generated_at).toLocaleString()}{" "}
              <button onClick={() => exportReport(r.report_id)}>
                Download JSON
              </button>{" "}
              <a className="button" href={reportCsvUrl(r.report_id)} download>
                Download CSV
              </a>
            </p>
          ))}
        </DataState>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous reports
        </button>
        <button
          disabled={page * 25 >= (q.data?.total || 0)}
          onClick={() => setPage(page + 1)}
        >
          Next reports
        </button>
      </div>
    </Panel>
  );
}
export function Reports() {
  const jobs = useQuery({ queryKey: ["audits"], queryFn: api.getAudits });
  const summary = useQuery({
    queryKey: ["summary", {}],
    queryFn: () => api.getAuditSummary(),
  });
  const clusters = useQuery({
    queryKey: ["clusters"],
    queryFn: api.getClusters,
  });
  const cases = useQuery({
    queryKey: ["cases"],
    queryFn: api.getInvestigations,
  });
  const [selected, setSelected] = useState(
    config.mode === "mock" ? "AUD-2024-012" : selectedAudit(),
  );
  const job = jobs.data?.find((j) => j.id === (selected || selectedAudit()));
  const s = summary.data;
  return (
    <>
      <div className="no-print">
        <PageHeading
          title="Audit Reports"
          description="Review audit coverage, priority cases, and documented findings before sharing."
        >
          <button
            className="primary"
            disabled={!s || !job || job.status !== "COMPLETED"}
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print / Save as PDF
          </button>
        </PageHeading>
        <div className="filter-row report-filter">
          <Select
            label="Audit job"
            value={selected}
            onChange={(id) => {
              if (config.mode === "mock") setSelected(id);
              else {
                selectAudit(id);
                window.location.assign("/reports");
              }
            }}
            options={(jobs.data || [])
              .filter((j) => j.status === "COMPLETED")
              .map((j) => ({
                value: j.id,
                label: `${j.id} · ${j.status}`,
              }))}
          />
          <span className="muted small">
            Use your browser’s print dialog to save the report as PDF.
          </span>
        </div>
      </div>
      {config.mode === "api" && <ReportArchive />}
      <DataState
        loading={
          jobs.isPending ||
          summary.isPending ||
          clusters.isPending ||
          cases.isPending
        }
        error={jobs.error || summary.error || clusters.error || cases.error}
        retry={() => {
          jobs.refetch();
          summary.refetch();
          clusters.refetch();
          cases.refetch();
        }}
      >
        {job && s && (
          <article className="report-document">
            <div className="report-masthead">
              <div>
                <Landmark size={37} />
                <span className="wordmark">GrantLens</span>
              </div>
              <span className="demo-pill">PROTOTYPE — SYNTHETIC DATA</span>
            </div>
            <div className="eyebrow">SCHOLARSHIP FORENSIC INTELLIGENCE</div>
            <h1>Scholarship audit review</h1>
            <p className="report-subtitle">
              Synthetic scholarship records · All dates in selected audit
            </p>
            <div className="report-meta">
              <span>
                Generated <strong>{new Date().toLocaleString()}</strong>
                Audit reference<strong>{job.id}</strong>
              </span>
              <span>
                Prepared for<strong>Auditor review</strong>
              </span>
              <span>
                Scheme<strong>All supplied scholarship schemes</strong>
              </span>
              <span>
                Dataset
                <strong>
                  {job.status === "COMPLETED"
                    ? "Completed synthetic dataset"
                    : "No completed results"}
                </strong>
              </span>
            </div>
            {job.status !== "COMPLETED" ? (
              <div className="warning-banner">
                This job has no completed results. Select a completed audit.
              </div>
            ) : (
              <>
                {config.mode === "mock" && job.id !== "AUD-2024-012" && (
                  <div className="warning-banner">
                    This uploaded job ran a simulation. The evidence below
                    belongs to reference fixture AUD-2024-012, not the uploaded
                    records.
                  </div>
                )}
                <h2>01 / Audit summary</h2>
                <div className="report-kpis">
                  <div>
                    <strong>{s.beneficiaries}</strong>
                    <span>Beneficiary records</span>
                  </div>
                  <div>
                    <strong>{s.payments}</strong>
                    <span>Scholarship payments</span>
                  </div>
                  <div>
                    <strong>{s.clusters}</strong>
                    <span>Flagged clusters</span>
                  </div>
                  <div>
                    <strong>{money(s.underReview)}</strong>
                    <span>Under review</span>
                  </div>
                </div>
                <h3>Dataset files</h3>
                <p>
                  {job.files
                    .map((f) => `${f.name} (${f.rows} rows)`)
                    .join(" · ")}
                </p>
                <h3>Risk distribution</h3>
                <p>
                  {s.distribution
                    .map((d) => `${d.name}: ${d.value} beneficiaries`)
                    .join(" · ")}
                </p>
                <h2>02 / High-priority clusters</h2>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Cluster</th>
                        <th>Primary indicator</th>
                        <th>Risk index</th>
                        <th>Review status</th>
                        <th>Disbursements</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clusters.data
                        ?.filter((c) => c.score >= 60)
                        .map((c) => (
                          <tr key={c.id}>
                            <td>
                              <Link to={`/clusters/${c.id}`}>{c.id}</Link>
                            </td>
                            <td>{c.indicator}</td>
                            <td>
                              <RiskBadge score={c.score} />
                            </td>
                            <td>
                              <StatusBadge
                                status={
                                  cases.data?.find((i) => i.clusterId === c.id)
                                    ?.status || "NEEDS_REVIEW"
                                }
                              />
                            </td>
                            <td>{money(c.amount)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <h2>03 / Evidence summary</h2>
                {clusters.data
                  ?.filter((c) => c.score >= 60)
                  .map((c) => (
                    <div className="report-evidence" key={c.id}>
                      <h3>
                        {c.id} · {c.name}
                      </h3>
                      <p>
                        {c.evidence
                          .map(
                            (e) =>
                              `${e.label} (+${e.contribution}): ${e.description}`,
                          )
                          .join(" ")}
                      </p>
                    </div>
                  ))}
                <h2>04 / Reviewer findings</h2>
                {cases.data?.some((c) => c.notes.length) ? (
                  cases.data
                    .filter((c) => c.notes.length)
                    .map((c) => (
                      <div key={c.id}>
                        <h3>
                          {c.id} · {c.clusterId}
                        </h3>
                        {c.notes.map((n, i) => (
                          <p key={i}>
                            {n.text}{" "}
                            <small>
                              — {c.auditor},{" "}
                              {new Date(n.createdAt).toLocaleDateString(
                                "en-IN",
                              )}
                            </small>
                          </p>
                        ))}
                      </div>
                    ))
                ) : (
                  <p className="muted">
                    No reviewer findings have been recorded in this session.
                  </p>
                )}
                <div className="warning-banner">
                  <ShieldAlert size={18} />
                  These indicators require independent auditor verification and
                  do not constitute a finding of fraud.
                </div>
              </>
            )}
            <div className="report-bottom">
              GrantLens prototype · No government affiliation · INR currency ·
              Synthetic demonstration records
            </div>
          </article>
        )}
      </DataState>
    </>
  );
}
