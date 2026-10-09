import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DataState,
  PageHeading,
  Panel,
  Pagination,
  Modal,
  RiskBadge,
  SearchField,
  Select,
} from "../components/Common";
import { v2, type Finding, type Person } from "../services/v2";
import { api, selectedAudit, selectAudit } from "../services/api";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export function PriorityQueue({ directory = false }: { directory?: boolean }) {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [scheme, setScheme] = useState("");
  const [cluster, setCluster] = useState("");
  const [status, setStatus] = useState("");
  const [risk, setRisk] = useState("");
  const [district, setDistrict] = useState("");
  const [sort, setSort] = useState("risk");
  const [page, setPage] = useState(1);
  const [id, setId] = useState("");
  useEffect(() => {
    setQ(params.get("q") || "");
    setPage(1);
  }, [params]);
  const data = useQuery({
    queryKey: [
      "queue",
      selectedAudit(),
      q,
      risk,
      district,
      sort,
      page,
      scheme,
      cluster,
      status,
    ],
    queryFn: () =>
      v2.queue({
        q,
        risk_level: risk,
        district,
        sort,
        scheme,
        cluster_id: cluster,
        case_status: status,
        offset: (page - 1) * 25,
        limit: 25,
      }),
  });
  return (
    <>
      <PageHeading
        title={directory ? "Beneficiaries" : "Priority Review Queue"}
        description="Individual review priority. A score is not a fraud probability; community membership alone is not evidence."
      />
      <Panel title="Beneficiary register">
        <div className="filter-row">
          <SearchField
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          <Select
            label="Risk level"
            value={risk}
            onChange={(v) => {
              setRisk(v);
              setPage(1);
            }}
            options={["", "Critical", "High", "Medium", "Low"]}
          />
          <label>
            District
            <input
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <Select
            label="Sort"
            value={sort}
            onChange={(v) => {
              setSort(v);
              setPage(1);
            }}
            options={["risk", "amount", "name", "id"]}
          />
          <label>
            Scheme
            <input
              value={scheme}
              onChange={(e) => {
                setScheme(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Cluster ID
            <input
              value={cluster}
              onChange={(e) => {
                setCluster(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <Select
            label="Case status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              "",
              "Needs Review",
              "In Investigation",
              "Verification Requested",
              "Cleared",
            ]}
          />
        </div>
        <DataState
          loading={data.isPending}
          error={data.error}
          retry={() => data.refetch()}
          empty={data.data?.total === 0}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Beneficiary</th>
                  <th>District</th>
                  <th>Institution</th>
                  <th>Payout account</th>
                  <th>Disbursed</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.data?.items.map((b) => (
                  <tr key={b.beneficiary_id}>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setId(b.beneficiary_id)}
                      >
                        {b.full_name}
                      </button>
                      <small>{b.beneficiary_id}</small>
                    </td>
                    <td>{b.district}</td>
                    <td>{b.institution_id}</td>
                    <td>{b.bank_account_id}</td>
                    <td>{money(b.total_disbursed || 0)}</td>
                    <td>
                      <RiskBadge score={b.risk_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
        <Pagination
          page={page}
          setPage={setPage}
          total={data.data?.total || 0}
          size={25}
        />
      </Panel>
      {id && <PersonDetail id={id} close={() => setId("")} />}
    </>
  );
}
function PersonDetail({ id, close }: { id: string; close: () => void }) {
  const [page, setPage] = useState(1);
  const tx = useQuery({
    queryKey: ["person-transactions", selectedAudit(), id, page],
    queryFn: () => v2.transactions(id, (page - 1) * 25),
  });
  const data = useQuery({
    queryKey: ["person", selectedAudit(), id],
    queryFn: () => v2.person(id),
  });
  const matches = useQuery({
    queryKey: ["matches", selectedAudit(), id],
    queryFn: () => api.getIdentityMatches(id),
  });
  return (
    <Modal title="Beneficiary evidence" onClose={close}>
      <div className="modal-body">
        <DataState
          loading={data.isPending}
          error={data.error}
          retry={() => data.refetch()}
        >
          {data.data && (
            <>
              <h3>
                {data.data.full_name} · {id}
              </h3>
              <RiskBadge score={data.data.risk_score} />
              <p>
                {data.data.bank_account_id} · {data.data.phone} ·{" "}
                {data.data.institution_id}
              </p>
              <p>
                {data.data.address} · {data.data.dob?.slice(0, 10)}
              </p>
              <p>
                Source: {data.data.source_file || "Legacy record"} · row{" "}
                {data.data.source_row || "unavailable"}
              </p>
              <p>
                {data.data.cluster_id ? (
                  <Link to={"/clusters/" + data.data.cluster_id}>
                    Open computed cluster and graph
                  </Link>
                ) : (
                  "No detected Louvain review community."
                )}
              </p>
              {data.data.case_id && (
                <p>
                  <Link to={"/clusters/" + data.data.case_id}>
                    Open investigation {data.data.case_id}
                  </Link>
                </p>
              )}
              <EvidenceList person={data.data} />
              <h3>Applications</h3>
              {data.data.applications?.map((a) => (
                <p key={a.application_id}>
                  {a.application_id} · {a.scheme_id} ·{" "}
                  {money(a.approved_amount)}
                </p>
              ))}
              <h3>Account transactions</h3>
              <p>
                Shared-account transfers cannot be uniquely attributed to this
                beneficiary.
              </p>
              <DataState
                loading={tx.isPending}
                error={tx.error}
                retry={() => tx.refetch()}
              >
                {tx.data?.items.map((t) => (
                  <p key={t.transaction_id}>
                    {t.transaction_id} · {t.timestamp} · {t.sender_account} →{" "}
                    {t.receiver_account} · {money(t.amount)}
                  </p>
                ))}
              </DataState>
              <Pagination
                page={page}
                setPage={setPage}
                size={25}
                total={tx.data?.total || 0}
              />
              <h3>Potential identity matches</h3>
              <DataState
                loading={matches.isPending}
                error={matches.error}
                empty={!matches.data?.length}
              >
                {matches.data?.map((m) => (
                  <p key={m.id}>
                    {m.id} · match score {m.score} · {m.attributes.join(", ")}
                  </p>
                ))}
              </DataState>
            </>
          )}
        </DataState>
      </div>
    </Modal>
  );
}
function EvidenceList({ person }: { person: Person }) {
  return (
    <>
      {person.evidence.length === 0 ? (
        <p>No contributing risk evidence.</p>
      ) : (
        person.evidence.map((e, i) => (
          <div className="evidence-item" key={i}>
            <strong>
              {e.indicator.replaceAll("_", " ")} · +{e.contribution}
            </strong>
            <p>{e.explanation}</p>
            <small>Source records: {e.source_record_ids.join(", ")}</small>
          </div>
        ))
      )}
    </>
  );
}
export function TransactionAnomalies() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Finding | null>(null);
  const summary = useQuery({
    queryKey: ["analysis-summary", selectedAudit()],
    queryFn: v2.summary,
  });
  const data = useQuery({
    queryKey: ["anomalies", selectedAudit(), q, kind, page],
    queryFn: () =>
      v2.anomalies({ q, kind, offset: (page - 1) * 25, limit: 25 }),
  });
  return (
    <>
      <PageHeading
        title="Transaction Anomalies"
        description="Computed financial findings and contextual relationships. Older audits must be rerun to materialize V2 findings."
      />
      <Panel title="Financial findings">
        <div className="settings-body">
          Analyzed account transfers:{" "}
          {summary.data?.transfer_count ?? "Unavailable for older audit"} ·
          Chronological cycles: {summary.data?.cycle_count ?? "—"} · Suspicious
          cycles:{" "}
          {summary.data?.suspicious_cycle_count ??
            "Unavailable for older audit"}
        </div>
        <div className="filter-row">
          <SearchField
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          <Select
            label="Finding type"
            value={kind}
            onChange={(v) => {
              setKind(v);
              setPage(1);
            }}
            options={[
              "",
              "circular_transfer",
              "collector",
              "payout_concentration",
              "overpayment",
            ]}
          />
        </div>
        <DataState
          loading={data.isPending}
          error={data.error}
          retry={() => data.refetch()}
          empty={data.data?.total === 0}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Finding</th>
                  <th>Assessment</th>
                  <th>Accounts</th>
                  <th>Beneficiaries</th>
                  <th>Gross transfer-leg total</th>
                  <th>Period</th>
                </tr>
              </thead>
              <tbody>
                {data.data?.items.map((f) => (
                  <tr key={f.finding_id}>
                    <td>
                      <button onClick={() => setSelected(f)}>
                        {f.indicator.replaceAll("_", " ")}
                      </button>
                      <small>{f.finding_id}</small>
                    </td>
                    <td>
                      {f.assessment} (+{f.contribution})
                    </td>
                    <td>{f.related_account_ids.length}</td>
                    <td>{f.beneficiary_ids.length}</td>
                    <td>
                      {f.transactions.length
                        ? money(f.amount)
                        : "No transfer claim"}
                    </td>
                    <td>
                      {f.transactions[0]?.timestamp.slice(0, 10) ||
                        "Account relationship"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
        <Pagination
          page={page}
          setPage={setPage}
          total={data.data?.total || 0}
          size={25}
        />
      </Panel>
      {selected && (
        <Modal title={selected.finding_id} onClose={() => setSelected(null)}>
          <div className="modal-body">
            <p>{selected.explanation}</p>
            <p>Beneficiaries: {selected.beneficiary_ids.join(", ")}</p>
            <h3>Directed transaction sequence</h3>
            <ol>
              {selected.transactions.map((t) => (
                <li key={t.transaction_id}>
                  <strong>
                    {t.sender_account} → {t.receiver_account}
                  </strong>
                  <p>
                    {money(t.amount)} · {t.timestamp} · {t.transaction_id}
                  </p>
                </li>
              ))}
            </ol>
            <p>Source records: {selected.source_record_ids.join(", ")}</p>
            {selected.case_ids.map((id) => (
              <p key={id}>
                <Link to={"/clusters/" + id}>
                  Open related case {id} and graph
                </Link>
              </p>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
export function AnalysisHistory() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const data = useQuery({
    queryKey: ["history", q, status, page, sort],
    queryFn: () =>
      v2.history({ q, status, sort, offset: (page - 1) * 25, limit: 25 }),
    refetchInterval: 5000,
  });
  return (
    <>
      <PageHeading
        title="Analysis History"
        description="Persisted, separate audit runs. Open an audit to change the context across the entire workspace."
      />
      <Panel title="Audit history">
        <div className="filter-row">
          <SearchField
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          <Select
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={["", "Ready", "Running", "Completed", "Failed"]}
          />
          <Select
            label="History order"
            value={sort}
            onChange={(v) => {
              setSort(v);
              setPage(1);
            }}
            options={["newest", "oldest"]}
          />
          {error && <p role="alert">{error}</p>}
        </div>
        <DataState
          loading={data.isPending}
          error={data.error}
          retry={() => data.refetch()}
          empty={data.data?.total === 0}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Audit / uploaded</th>
                  <th>Status</th>
                  <th>Records</th>
                  <th>Flagged</th>
                  <th>Clusters</th>
                  <th>Duration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.data?.items.map((a) => (
                  <tr key={a.audit_id}>
                    <td>
                      {a.audit_id}
                      <small>{new Date(a.created_at).toLocaleString()}</small>
                    </td>
                    <td>
                      {a.status}
                      <small>{a.summary.error || a.summary.stage}</small>
                    </td>
                    <td>{a.summary.beneficiary_count ?? "—"}</td>
                    <td>{a.summary.flagged_beneficiaries ?? "—"}</td>
                    <td>{a.summary.suspicious_cluster_count ?? "—"}</td>
                    <td>{a.summary.processing_seconds ?? "—"} s</td>
                    <td>
                      <button
                        disabled={a.status !== "Completed"}
                        onClick={() => {
                          selectAudit(a.audit_id);
                          window.location.assign("/");
                        }}
                      >
                        Open audit
                      </button>
                      {["Ready", "Failed"].includes(a.status) && (
                        <button
                          disabled={busy === a.audit_id}
                          onClick={async () => {
                            setBusy(a.audit_id);
                            setError("");
                            try {
                              await api.runAudit(a.audit_id);
                              await data.refetch();
                            } catch (e) {
                              setError((e as Error).message);
                            } finally {
                              setBusy("");
                            }
                          }}
                        >
                          Run / retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
        <Pagination
          page={page}
          setPage={setPage}
          total={data.data?.total || 0}
          size={25}
        />
      </Panel>
    </>
  );
}
export function AuditTrail() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const data = useQuery({
    queryKey: ["events", selectedAudit(), page, type],
    queryFn: () =>
      v2.events({ offset: (page - 1) * 25, limit: 25, event_type: type }),
  });
  return (
    <>
      <PageHeading
        title="Audit Trail"
        description="Actual events recorded since the V2 upgrade. Local SQLite history is not an immutable or tamper-proof log."
      />
      <Panel title="Recorded activity">
        <div className="filter-row">
          <Select
            label="Event type"
            value={type}
            onChange={(v) => {
              setType(v);
              setPage(1);
            }}
            options={[
              "",
              "audit_created",
              "validation_completed",
              "analysis_started",
              "analysis_completed",
              "analysis_failed",
              "case_updated",
              "report_generated",
            ]}
          />
        </div>
        <DataState
          loading={data.isPending}
          error={data.error}
          retry={() => data.refetch()}
          empty={data.data?.total === 0}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Summary</th>
                  <th>Case</th>
                </tr>
              </thead>
              <tbody>
                {data.data?.items.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {new Date(e.created_at).toLocaleString()}
                      <small>{e.id}</small>
                    </td>
                    <td>{e.event_type}</td>
                    <td>{e.actor}</td>
                    <td>{e.summary}</td>
                    <td>{e.case_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
        <Pagination
          page={page}
          setPage={setPage}
          total={data.data?.total || 0}
          size={25}
        />
      </Panel>
    </>
  );
}
export function DetectionEvaluation() {
  const data = useQuery({ queryKey: ["evaluations"], queryFn: v2.evaluations });
  const [index, setIndex] = useState(1);
  const run = data.data?.runs[index];
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  return (
    <>
      <PageHeading
        title="Detection Evaluation & Benchmarking"
        description="Offline synthetic-data evaluation environment. Generator-based controls do not establish performance on real scholarship records."
      />
      <DataState
        loading={data.isPending}
        error={data.error}
        retry={() => data.refetch()}
        empty={!data.data?.runs.length}
      >
        <Panel title="Measured baseline and V2 comparison">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart
                data={data.data?.runs.map((r) => ({
                  name: r.dataset.replace(".json", ""),
                  precision: r.metrics.suspicious_records.precision * 100,
                  recall: r.metrics.suspicious_records.recall * 100,
                  F1: r.metrics.suspicious_records.f1 * 100,
                }))}
              >
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="precision" fill="#173b66" />
                <Bar dataKey="recall" fill="#168a80" />
                <Bar dataKey="F1" fill="#d28b30" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Evaluation details">
          <div className="filter-row">
            <Select
              label="Evaluation run"
              value={String(index)}
              onChange={(v) => setIndex(Number(v))}
              options={
                data.data?.runs.map((r, i) => ({
                  value: String(i),
                  label: r.dataset,
                })) || []
              }
            />
          </div>
          {run && (
            <div className="settings-body">
              <p>
                {run.summary.beneficiary_count.toLocaleString()} records ·{" "}
                {new Date(run.evaluated_at).toLocaleString()} ·{" "}
                {run.metrics.processing_seconds}s ·{" "}
                {run.metrics.records_per_second.toLocaleString()} records/s
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th title="Flagged positives divided by all flags">
                        Precision
                      </th>
                      <th title="Detected labeled positives divided by all labeled positives">
                        Recall
                      </th>
                      <th title="Harmonic mean of precision and recall">F1</th>
                      <th>False-positive rate</th>
                      <th>TP / FP / FN</th>
                      <th title="At least half of labeled ring members flagged; not exact community recovery">
                        Ring recall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{pct(run.metrics.suspicious_records.precision)}</td>
                      <td>{pct(run.metrics.suspicious_records.recall)}</td>
                      <td>{pct(run.metrics.suspicious_records.f1)}</td>
                      <td>{pct(run.metrics.false_positive_rate)}</td>
                      <td>
                        {run.metrics.suspicious_records.true_positives} /{" "}
                        {run.metrics.suspicious_records.false_positives} /{" "}
                        {run.metrics.suspicious_records.false_negatives}
                      </td>
                      <td>{pct(run.metrics.fraud_ring_detection_recall)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Identity linkage: precision{" "}
                {pct(run.metrics.identity_matching.precision)} · recall{" "}
                {pct(run.metrics.identity_matching.recall)} · F1{" "}
                {pct(run.metrics.identity_matching.f1)}
              </p>
              <h3>Scenario flag rates</h3>
              <p>
                For legitimate controls, lower is better. For injected
                suspicious scenarios, higher is better.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Scenario / legitimate lookalike</th>
                    <th>Flagged</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(run.metrics.scenario_flag_rates).map(
                    ([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{pct(v)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              <details>
                <summary>Recorded configuration</summary>
                <pre>{JSON.stringify(run.configuration, null, 2)}</pre>
              </details>
            </div>
          )}
        </Panel>
      </DataState>
    </>
  );
}
