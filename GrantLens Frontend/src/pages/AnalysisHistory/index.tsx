import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  DataState,
  PageHeading,
  Pagination,
  Panel,
  SearchField,
  Select,
} from "../../components/common/Common";
import { api, selectAudit } from "../../services/api";
import { v2 } from "../../services/api/v2";
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
