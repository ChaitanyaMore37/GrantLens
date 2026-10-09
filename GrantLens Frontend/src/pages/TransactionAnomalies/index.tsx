import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  DataState,
  Modal,
  PageHeading,
  Pagination,
  Panel,
  SearchField,
  Select,
} from "../../components/common/Common";
import { selectedAudit } from "../../services/api";
import { v2, type Finding } from "../../services/api/v2";
import { money } from "../../utils";
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
