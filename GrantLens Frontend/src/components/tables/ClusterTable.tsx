import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, config } from "../../services/api";
import type { AuditFilters, Cluster } from "../../types";
import { compactMoney, statuses } from "../../utils";
import {
  DataState,
  Pagination,
  RiskBadge,
  SearchField,
  Select,
  SortHead,
  StatusBadge,
} from "../common/Common";
import { ServerClusterTable } from "./ServerClusterTable";
function LegacyClusterTable({
  compact = false,
  externalFilters = {},
}: {
  compact?: boolean;
  externalFilters?: AuditFilters;
}) {
  const q = useQuery({ queryKey: ["clusters"], queryFn: api.getClusters });
  const cases = useQuery({
    queryKey: ["cases"],
    queryFn: api.getInvestigations,
  });
  const transactions = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.getTransactions(),
    enabled: externalFilters.period === "q4" || !!externalFilters.scheme,
  });
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [scheme, setScheme] = useState("");
  const [min, setMin] = useState(0);
  const [page, setPage] = useState(1);
  const size = compact ? 5 : 3;
  const [max, setMax] = useState(100);
  const [sort, setSort] = useState<"score" | "beneficiaries" | "amount">(
    "score",
  );
  const [desc, setDesc] = useState(true);
  const statusOf = (id: string) =>
    cases.data?.find((c) => c.clusterId === id)?.status || "NEEDS_REVIEW";
  const rows = (q.data || [])
    .map((c) =>
      externalFilters.period === "q4" || !!externalFilters.scheme
        ? {
            ...c,
            amount: (transactions.data || [])
              .filter(
                (t) =>
                  c.beneficiaryIds.includes(t.beneficiaryId || "") &&
                  (!externalFilters.scheme ||
                    t.scheme === externalFilters.scheme) &&
                  (externalFilters.period !== "q4" ||
                    (t.date >= "2024-10-01" && t.date < "2025-01-01")),
              )
              .reduce((sum, t) => sum + t.amount, 0),
          }
        : c,
    )
    .filter(
      (c) =>
        (c.id + " " + c.name + " " + c.indicator)
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!district || c.district === district) &&
        (!scheme || c.scheme.split(", ").includes(scheme)) &&
        (!externalFilters.district ||
          c.district === externalFilters.district) &&
        (!externalFilters.scheme ||
          c.scheme.split(", ").includes(externalFilters.scheme)) &&
        (!externalFilters.batch || c.batch === externalFilters.batch) &&
        (!status || statusOf(c.id) === status) &&
        c.score >= min &&
        c.score <= max &&
        (!risk ||
          (risk === "critical"
            ? c.score >= 80
            : risk === "high"
              ? c.score >= 60 && c.score < 80
              : risk === "medium"
                ? c.score >= 30 && c.score < 60
                : c.score < 30)),
    )
    .sort((a, b) => {
      const v = (c: Cluster) =>
        sort === "beneficiaries" ? c.beneficiaryIds.length : c[sort];
      return (v(b) - v(a)) * (desc ? 1 : -1);
    });
  const update = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const order = (s: typeof sort) => {
    setDesc(sort === s ? !desc : true);
    setSort(s);
  };
  return (
    <>
      <div className="table-tools">
        <SearchField
          value={search}
          onChange={(v) => update(() => setSearch(v))}
          placeholder="Search cluster ID or risk indicator…"
        />
        <div className="table-filter-right">
          <SlidersHorizontal size={15} />
          <select
            aria-label="Filter risk level"
            value={risk}
            onChange={(e) => update(() => setRisk(e.target.value))}
          >
            <option value="">All risk levels</option>
            {["critical", "high", "medium", "low"].map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter review status"
            value={status}
            onChange={(e) => update(() => setStatus(e.target.value))}
          >
            <option value="">All statuses</option>
            {Object.entries(statuses).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!compact && (
        <div className="filter-row secondary-filters">
          <Select
            label="District"
            value={district}
            onChange={(v) => update(() => setDistrict(v))}
            options={[
              { value: "", label: "All districts" },
              ...new Set(q.data?.map((c) => c.district)),
            ]}
          />
          <Select
            label="Scheme"
            value={scheme}
            onChange={(v) => update(() => setScheme(v))}
            options={[
              { value: "", label: "All schemes" },
              ...new Set(q.data?.flatMap((c) => c.scheme.split(", "))),
            ]}
          />
          <label className="range-field">
            Minimum score <strong>{min}</strong>
            <input
              aria-label="Minimum risk score"
              type="range"
              min={0}
              max={100}
              value={min}
              onChange={(e) =>
                update(() => setMin(Math.min(+e.target.value, max)))
              }
            />
          </label>
          <label className="range-field">
            Maximum score <strong>{max}</strong>
            <input
              aria-label="Maximum risk score"
              type="range"
              min={0}
              max={100}
              value={max}
              onChange={(e) =>
                update(() => setMax(Math.max(+e.target.value, min)))
              }
            />
          </label>
          <button
            className="text-button"
            onClick={() => {
              setSearch("");
              setRisk("");
              setStatus("");
              setDistrict("");
              setScheme("");
              setMin(0);
              setMax(100);
              setPage(1);
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      <DataState
        loading={
          q.isPending ||
          cases.isPending ||
          ((externalFilters.period === "q4" || !!externalFilters.scheme) &&
            transactions.isPending)
        }
        error={q.error || cases.error || transactions.error}
        retry={() => {
          q.refetch();
          cases.refetch();
        }}
        empty={!rows.length}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cluster / primary indicator</th>
                <th>
                  <SortHead onClick={() => order("beneficiaries")}>
                    Beneficiaries
                  </SortHead>
                </th>
                {!compact && <th>Accounts / matches / patterns</th>}
                <th>
                  <SortHead onClick={() => order("amount")}>
                    Disbursements
                  </SortHead>
                </th>
                <th>
                  <SortHead onClick={() => order("score")}>Risk score</SortHead>
                </th>
                <th>Review status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.slice((page - 1) * size, page * size).map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link className="record-link" to={`/clusters/${c.id}`}>
                      {c.id}
                      <span>{c.name}</span>
                    </Link>
                    <small className="table-subtext">{c.indicator}</small>
                  </td>
                  <td>
                    <span className="beneficiary-count">
                      {c.beneficiaryIds.length}
                    </span>{" "}
                    <small>connected</small>
                  </td>
                  {!compact && (
                    <td>
                      {c.accountIds.length} / {c.identityMatches} /{" "}
                      {c.transactionPatterns}
                    </td>
                  )}
                  <td className="money-cell">{compactMoney(c.amount)}</td>
                  <td>
                    <RiskBadge score={c.score} />
                  </td>
                  <td>
                    <StatusBadge status={statusOf(c.id)} />
                  </td>
                  <td>
                    <Link
                      className="row-action"
                      aria-label={`Open ${c.id}`}
                      to={`/clusters/${c.id}`}
                    >
                      <ArrowRight size={17} />
                    </Link>
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
        total={rows.length}
        size={size}
      />
      {!compact && (
        <p className="table-note">
          <Search size={14} /> Scores are review-priority indices, not
          probabilities of fraud.
        </p>
      )}
    </>
  );
}

export function ClusterTable(props: {
  compact?: boolean;
  externalFilters?: AuditFilters;
}) {
  return config.mode === "api" ? (
    <ServerClusterTable {...props} />
  ) : (
    <LegacyClusterTable {...props} />
  );
}
