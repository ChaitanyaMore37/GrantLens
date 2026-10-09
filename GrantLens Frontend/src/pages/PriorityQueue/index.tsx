import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  DataState,
  Modal,
  PageHeading,
  Pagination,
  Panel,
  RiskBadge,
  SearchField,
  Select,
} from "../../components/common/Common";
import { api, selectedAudit } from "../../services/api";
import { v2, type Person } from "../../services/api/v2";
import { money } from "../../utils";
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
