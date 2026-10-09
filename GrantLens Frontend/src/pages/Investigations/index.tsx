import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  FolderSearch,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  DataState,
  PageHeading,
  Pagination,
  Panel,
  RiskBadge,
  SearchField,
  StatusBadge,
} from "../../components/common/Common";
import { api } from "../../services/api";
import { statuses } from "../../utils";
export function Investigations() {
  const q = useQuery({ queryKey: ["cases"], queryFn: api.getInvestigations });
  const clusters = useQuery({
    queryKey: ["clusters"],
    queryFn: api.getClusters,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const rows = (q.data || []).filter(
    (c) =>
      (c.id + " " + c.clusterId + " " + c.auditor)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!status || c.status === status),
  );
  return (
    <>
      <PageHeading
        title="Investigations"
        description="Manage review decisions, verification requests, and findings in one audit workspace."
      />
      <div className="case-status-grid">
        {Object.entries(statuses).map(([s, label], i) => {
          const Icon = [Clock3, FolderSearch, Send, ShieldCheck][i];
          return (
            <button
              key={s}
              className={status === s ? "selected" : ""}
              onClick={() => {
                setStatus(status === s ? "" : s);
                setPage(1);
              }}
            >
              <Icon size={20} />
              <strong>
                {q.data?.filter((c) => c.status === s).length || 0}
              </strong>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <Panel
        title="Investigation register"
        action={
          <span className="muted small">
            Review status and notes are saved through the selected data service
          </span>
        }
      >
        <div className="table-tools">
          <SearchField
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search case, cluster, or auditor…"
          />
          <select
            aria-label="Investigation status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(statuses).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <DataState
          loading={q.isPending || clusters.isPending}
          error={q.error || clusters.error}
          empty={!rows.length}
          retry={() => {
            q.refetch();
            clusters.refetch();
          }}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Investigation</th>
                  <th>Review group / record case</th>
                  <th>Risk score</th>
                  <th>Reviewer context</th>
                  <th>Latest note</th>
                  <th>Review status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * 5, page * 5).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        className="record-link"
                        to={`/clusters/${c.clusterId}`}
                      >
                        {c.id}
                      </Link>
                      <small className="table-subtext">
                        {c.notes.length} notes recorded
                      </small>
                    </td>
                    <td>{c.clusterId}</td>
                    <td>
                      <RiskBadge
                        score={
                          c.score ??
                          clusters.data?.find((a) => a.id === c.clusterId)
                            ?.score ??
                          0
                        }
                      />
                    </td>
                    <td>{c.auditor}</td>
                    <td>
                      {c.updatedAt
                        ? new Date(c.updatedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "No notes"}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <Link
                        className="row-action"
                        aria-label={`Open ${c.id}`}
                        to={`/clusters/${c.clusterId}`}
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
        <Pagination page={page} setPage={setPage} total={rows.length} />
      </Panel>
    </>
  );
}
