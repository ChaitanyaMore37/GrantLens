import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { scoped, selectedAudit } from "../services/api";
import {
  DataState,
  Pagination,
  RiskBadge,
  SearchField,
  Select,
} from "./Common";
import { compactMoney } from "../utils";
import type { AuditFilters } from "../types";
import type { Page } from "../services/v2";
type Row = {
  cluster_id: string;
  size: number;
  risk_score: number;
  total_disbursed: number;
  status: string;
  mean_member_score?: number;
  flagged_member_fraction?: number;
  independent_indicator_count?: number;
  evidence: { indicator: string; contribution: number }[];
};
export function ServerClusterTable({
  compact = false,
  externalFilters = {},
}: {
  compact?: boolean;
  externalFilters?: AuditFilters;
}) {
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [scheme, setScheme] = useState("");
  const [sort, setSort] = useState("risk");
  const [page, setPage] = useState(1);
  const [minimum, setMin] = useState(0);
  const [maximum, setMax] = useState(100);
  const limit = compact ? 5 : 25;
  const data = useQuery({
    queryKey: [
      "cluster-page",
      selectedAudit(),
      q,
      risk,
      status,
      district,
      scheme,
      sort,
      page,
      minimum,
      maximum,
      externalFilters,
    ],
    queryFn: () =>
      scoped<Page<Row>>("/clusters", {
        q,
        risk_level: risk,
        status,
        district: externalFilters.district || district,
        scheme: externalFilters.scheme || scheme,
        sort,
        minimum,
        maximum,
        offset: (page - 1) * limit,
        limit,
      }),
  });
  return (
    <>
      <div className="table-tools">
        <SearchField
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Search cluster ID or risk indicator…"
        />
        <Select
          label="Filter risk level"
          value={risk}
          onChange={(v) => {
            setRisk(v);
            setPage(1);
          }}
          options={["", "Critical", "High", "Medium", "Low"]}
        />
        <Select
          label="Filter review status"
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
      {!compact && (
        <div className="filter-row">
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
          <Select
            label="Sort clusters"
            value={sort}
            onChange={(v) => {
              setSort(v);
              setPage(1);
            }}
            options={["risk", "amount", "size"]}
          />
          <label>
            Minimum score
            <input
              type="number"
              min={0}
              max={maximum}
              value={minimum}
              onChange={(e) => {
                setMin(Number(e.target.value));
                setPage(1);
              }}
            />
          </label>
          <label>
            Maximum score
            <input
              type="number"
              min={minimum}
              max={100}
              value={maximum}
              onChange={(e) => {
                setMax(Number(e.target.value));
                setPage(1);
              }}
            />
          </label>
        </div>
      )}
      <DataState
        loading={data.isPending}
        error={data.error}
        retry={() => data.refetch()}
        empty={data.data?.total === 0}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cluster / contributing indicators</th>
                <th>Beneficiaries</th>
                <th>Disbursements</th>
                <th>Maximum priority</th>
                {!compact && <th>Community context</th>}
                <th>Review status</th>
              </tr>
            </thead>
            <tbody>
              {data.data?.items.map((c) => (
                <tr key={c.cluster_id}>
                  <td>
                    <Link
                      className="record-link"
                      to={"/clusters/" + c.cluster_id}
                    >
                      {c.cluster_id}
                      <span>Computed review group</span>
                    </Link>
                    <small className="table-subtext">
                      {[
                        ...new Set(
                          c.evidence
                            .filter((e) => e.contribution > 0)
                            .map((e) => e.indicator.replaceAll("_", " ")),
                        ),
                      ].join(", ")}
                    </small>
                  </td>
                  <td>{c.size} connected</td>
                  <td>{compactMoney(c.total_disbursed)}</td>
                  <td>
                    <RiskBadge score={c.risk_score} />
                  </td>
                  {!compact && (
                    <td>
                      Mean {c.mean_member_score ?? "—"} ·{" "}
                      {c.flagged_member_fraction == null
                        ? "—"
                        : Math.round(c.flagged_member_fraction * 100) +
                          "%"}{" "}
                      flagged · {c.independent_indicator_count ?? "—"} indicator
                      types
                    </td>
                  )}
                  <td>{c.status}</td>
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
        size={limit}
      />
      <p className="table-note">
        Disbursements cover all awards of connected members. Maximum score is an
        individual review index; community membership does not establish
        wrongdoing.
      </p>
    </>
  );
}
