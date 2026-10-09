import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, UserRound, Download } from "lucide-react";
import { api } from "../services/api";
import {
  DataState,
  Modal,
  PageHeading,
  Pagination,
  Panel,
  RiskBadge,
  SearchField,
  Select,
  SortHead,
  StatusBadge,
} from "../components/Common";
import { money, download, statuses } from "../utils";
function BeneficiaryProfile({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ["beneficiary", id],
    queryFn: () => api.getBeneficiaryById(id),
  });
  const apps = useQuery({
    queryKey: ["applications", id],
    queryFn: () => api.getApplications(id),
  });
  const tx = useQuery({
    queryKey: ["transactions", id],
    queryFn: () => api.getTransactions(id),
  });
  const matches = useQuery({queryKey:["identity-matches",id],queryFn:()=>api.getIdentityMatches(id)});
  const b = q.data;
  return (
    <Modal title="Beneficiary record" onClose={onClose}>
      <div className="modal-body profile-detail">
        <DataState loading={q.isPending} error={q.error}>
          {b && (
            <>
              <div className="profile-title">
                <span className="avatar large">
                  <UserRound />
                </span>
                <div>
                  <h2>{b.name}</h2>
                  <code>{b.id}</code>
                </div>
                <RiskBadge score={b.score} />
              </div>
              <dl>
                <dt>District</dt>
                <dd>{b.district}</dd>
                <dt>Institution</dt>
                <dd>{b.institution}</dd>
                <dt>Scholarship scheme</dt>
                <dd>{b.scheme}</dd>
                <dt>Linked bank account</dt>
                <dd>
                  {b.account}
                </dd>
                <dt>Phone</dt>
                <dd>{b.phone}</dd>
                <dt>Address</dt>
                <dd>{b.address}</dd>
              </dl>
              <h3>Scholarship applications</h3>
              <DataState
                loading={apps.isPending}
                error={apps.error}
                empty={!apps.data?.length}
              >
                {apps.data?.map((a) => (
                  <div className="detail-record" key={a.id}>
                    <strong>
                      {a.id} · {a.academicYear}
                    </strong>
                    <span>
                      {money(a.amount)} · {a.status}
                    </span>
                  </div>
                ))}
              </DataState>
              <h3>Disbursement history</h3>
              <DataState
                loading={tx.isPending}
                error={tx.error}
                empty={!tx.data?.length}
              >
                {tx.data?.map((t) => (
                  <div className="detail-record" key={t.id}>
                    <span>
                      {t.id} · {t.date}
                    </span>
                    <strong>{money(t.amount)}</strong>
                  </div>
                ))}
              </DataState>
              <h3>Potential identity matches</h3>
              <DataState loading={matches.isPending} error={matches.error} empty={!matches.data?.length}>
                {matches.data?.map(m=><div className="detail-record" key={m.id}><strong>{m.id}</strong><span>{m.score}% match · {m.attributes.join(", ")} · independent verification required</span></div>)}
              </DataState>
              <p className="small muted">
                Source: {b.sourceId}. Risk indicators are available in the
                linked cluster.
              </p>
              {b.evidence?.map(e=><p key={e.id}>{e.label}: +{e.contribution} · {e.description}</p>)}
              {b.clusterId ? <div className="modal-actions">
                <Link className="button" to={`/clusters/${b.clusterId}`}>
                  View risk evidence
                </Link>
                <Link
                  className="button primary"
                  to={`/network?cluster=${b.clusterId}&entity=${b.id}`}
                >
                  Open in network <ArrowUpRight size={15} />
                </Link>
              </div> : <p>No review case detected for this record.</p>}
            </>
          )}
        </DataState>
      </div>
    </Modal>
  );
}
export function Beneficiaries() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  useEffect(() => {
    setSearch(params.get("q") || "");
    setPage(1);
  }, [params]);
  const [district, setDistrict] = useState("");
  const [scheme, setScheme] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [sort, setSort] = useState<"name" | "score">("name");
  const [desc, setDesc] = useState(false);
  const q = useQuery({
    queryKey: ["beneficiaries"],
    queryFn: api.getBeneficiaries,
  });
  const iq = useQuery({ queryKey: ["cases"], queryFn: api.getInvestigations });
  const state = (id: string) =>
    iq.data?.find((c) => c.clusterId === id)?.status || "";
  const rows = (q.data || [])
    .filter(
      (b) =>
        (b.id + " " + b.name + " " + b.account)
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!district || b.district === district) &&
        (!scheme || b.scheme.split(", ").includes(scheme)) &&
        (!status || state(b.clusterId) === status),
    )
    .sort(
      (a, b) =>
        (sort === "score" ? a.score - b.score : a.name.localeCompare(b.name)) *
        (desc ? -1 : 1),
    );
  const order = (s: typeof sort) => {
    setDesc(sort === s ? !desc : false);
    setSort(s);
  };
  return (
    <>
      <PageHeading
        title="Beneficiaries"
        description="Search scholarship records and review the evidence behind linked identities."
      >
        <button
          disabled={!q.data}
          onClick={() =>
            download(
              "grantlens-beneficiaries.json",
              JSON.stringify(rows, null, 2),
            )
          }
        >
          <Download size={16} />
          Export records
        </button>
      </PageHeading>
      <Panel
        title="Beneficiary registry"
        action={
          <span className="muted small">
            {q.data?.length || 0} synthetic records
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
            placeholder="Search name, beneficiary ID, or account…"
          />
          <Select
            label="District"
            value={district}
            onChange={(v) => {
              setDistrict(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "All districts" },
              ...new Set(q.data?.map((b) => b.district)),
            ]}
          />
          <Select
            label="Scheme"
            value={scheme}
            onChange={(v) => {
              setScheme(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "All schemes" },
              ...new Set(q.data?.flatMap((b) => b.scheme.split(", "))),
            ]}
          />
          <select
            aria-label="Beneficiary review status"
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
          loading={q.isPending || iq.isPending}
          error={q.error || iq.error}
          empty={!rows.length}
          retry={() => {
            q.refetch();
            iq.refetch();
          }}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <SortHead onClick={() => order("name")}>
                      Beneficiary
                    </SortHead>
                  </th>
                  <th>District / institution</th>
                  <th>Scheme</th>
                  <th>Account (masked)</th>
                  <th>
                    <SortHead onClick={() => order("score")}>
                      Risk score
                    </SortHead>
                  </th>
                  <th>Review status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * 8, page * 8).map((b) => (
                  <tr key={b.id}>
                    <td>
                      <button
                        className="record-button"
                        onClick={() => setSelected(b.id)}
                      >
                        {b.name}
                        <small>{b.id}</small>
                      </button>
                    </td>
                    <td>
                      {b.district}
                      <small className="table-subtext institution">
                        {b.institution}
                      </small>
                    </td>
                    <td className="scheme-cell">{b.scheme}</td>
                    <td>{b.account}</td>
                    <td>
                      <RiskBadge score={b.score} />
                    </td>
                    <td>
                      {b.clusterId ? <StatusBadge status={state(b.clusterId) || "NEEDS_REVIEW"} /> : <span>No review case</span>}
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
          size={8}
        />
      </Panel>
      {selected && (
        <BeneficiaryProfile id={selected} onClose={() => setSelected("")} />
      )}
    </>
  );
}
