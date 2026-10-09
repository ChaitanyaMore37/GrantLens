import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  ShieldAlert,
  FileSearch,
  Send,
  CheckCircle2,
  Network,
  ArrowUpRight,
} from "lucide-react";
import { api, config } from "../services/api";
import {
  DataState,
  Modal,
  PageHeading,
  Panel,
  RiskBadge,
  StatusBadge,
  useToast,
} from "../components/Common";
import { GraphView } from "../components/GraphView";
import type { ReviewStatus } from "../types";
import { download, money, statuses } from "../utils";
export function ClusterDetail() {
  const { id = "CL-017" } = useParams();
  const q = useQuery({
    queryKey: ["cluster", id],
    queryFn: () => api.getClusterById(id),
  });
  const iq = useQuery({ queryKey: ["cases"], queryFn: api.getInvestigations });
  const tx = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.getTransactions(),
  });
  const item = iq.data?.find((c) => c.clusterId === id);
  const [confirm, setConfirm] = useState<ReviewStatus | null>(null);
  const [note, setNote] = useState("");
  const toast = useToast();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (patch: { status?: ReviewStatus; note?: string }) =>
      api.updateInvestigation(item!.id, patch),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["cases"] });
      client.invalidateQueries({ queryKey: ["summary"] });
      setConfirm(null);
      setNote("");
      toast(
        config.mode === "mock"
          ? "Investigation updated in this demo session."
          : "Investigation updated.",
      );
    },
  });
  const c = q.data;
  return (
    <>
      <Link className="back-link" to="/clusters">
        <ArrowLeft size={14} />
        Back to risk clusters
      </Link>
      <PageHeading
        eyebrow="FORENSIC INVESTIGATION WORKSPACE"
        title={id}
        description={
          c
            ? `${c.name} · ${c.district} · ${c.scheme}`
            : "Loading case evidence…"
        }
      >
        <button
          disabled={!c || !item || tx.isPending || !!tx.error}
          onClick={() =>
            download(
              `${id}-case-report.json`,
              JSON.stringify(
                {
                  environment: config.mode,
                  notice:
                    "Indicators require independent verification and do not constitute a finding of fraud.",
                  cluster: c,
                  investigation: item,
                },
                null,
                2,
              ),
            )
          }
        >
          <Download size={16} />
          Export case report
        </button>
      </PageHeading>
      <DataState
        loading={q.isPending || iq.isPending || tx.isPending}
        error={q.error || iq.error || tx.error}
        retry={() => {
          q.refetch();
          iq.refetch();
          tx.refetch();
        }}
      >
        {c && (
          <>
            <div className="investigation-workspace">
              <Panel title="Case summary" className="case-summary">
                <div className="case-score">
                  <span>REVIEW PRIORITY</span>
                  <strong>
                    {c.score}
                    <small>/100</small>
                  </strong>
                  <RiskBadge score={c.score} />
                </div>
                {item && <StatusBadge status={item.status} />}
                <dl className="case-stats">
                  <div>
                    <dt>Beneficiaries</dt>
                    <dd>{c.beneficiaryIds.length}</dd>
                  </div>
                  <div>
                    <dt>Payout accounts</dt>
                    <dd>{c.accountIds.length}</dd>
                  </div>
                  <div>
                    <dt>Linked transactions</dt>
                    <dd>
                      {
                        tx.data?.filter(
                          (t) =>
                            c.beneficiaryIds.includes(t.beneficiaryId || "") ||
                            c.accountIds.includes(t.source) ||
                            c.accountIds.includes(t.target),
                        ).length
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Disbursements</dt>
                    <dd>{money(c.amount)}</dd>
                  </div>
                </dl>
                <h4>Main detected patterns</h4>
                <ul className="pattern-list">
                  {c.evidence.map((e) => (
                    <li key={e.id}>
                      <ShieldAlert size={14} />
                      {e.label}
                    </li>
                  ))}
                </ul>
                <div className="case-actions">
                  <button
                    className="primary"
                    disabled={
                      !item ||
                      mutation.isPending ||
                      item.status === "IN_INVESTIGATION"
                    }
                    onClick={() => setConfirm("IN_INVESTIGATION")}
                  >
                    <FileSearch size={15} />
                    Start investigation
                  </button>
                  <button
                    disabled={
                      !item ||
                      mutation.isPending ||
                      item.status === "VERIFICATION_REQUESTED"
                    }
                    onClick={() => setConfirm("VERIFICATION_REQUESTED")}
                  >
                    <Send size={15} />
                    Request verification
                  </button>
                  <button
                    disabled={
                      !item || mutation.isPending || item.status === "CLEARED"
                    }
                    onClick={() => setConfirm("CLEARED")}
                  >
                    <CheckCircle2 size={15} />
                    Mark cleared
                  </button>
                </div>
                <p className="small muted">
                  {config.mode === "mock"
                    ? "Actions are stored only for this running demo session."
                    : "Actions use the configured API."}
                </p>
              </Panel>
              <Panel
                title="Relationship network"
                icon={<Network size={18} />}
                action={
                  <Link to={`/network?cluster=${id}`}>
                    Expand <ArrowUpRight size={14} />
                  </Link>
                }
                className="case-network"
              >
                <GraphView clusterId={id} />
              </Panel>
            </div>
            <div className="case-bottom">
              <Panel
                title="Explainable risk score"
                icon={<ShieldAlert size={18} />}
                action={
                  <span className="muted small">
                    Maximum member score, capped at 100 · contributions shown for that member
                  </span>
                }
              >
                <div className="score-evidence">
                  {c.evidence.map((e) => (
                    <div className="evidence-row" key={e.id}>
                      <div>
                        <h3>{e.label}</h3>
                        <p>{e.description}</p>
                        <small>{e.records.join(" · ")}</small>
                      </div>
                      <span>+{e.contribution}</span>
                    </div>
                  ))}
                  <div className="score-total">
                    <strong>Maximum member review-priority score</strong>
                    <strong>{c.score} / 100</strong>
                  </div>
                </div>
              </Panel>
              <Panel
                title="Auditor findings"
                action={item && <span className="muted small">{item.id}</span>}
              >
                <div className="notes-body">
                  {item?.notes.length ? (
                    item.notes.map((n, i) => (
                      <article className="case-note" key={i}>
                        <strong>{item.auditor}</strong>
                        <small>
                          {new Date(n.createdAt).toLocaleString("en-IN")}
                        </small>
                        <p>{n.text}</p>
                      </article>
                    ))
                  ) : (
                    <div className="notes-empty">
                      <FileSearch size={24} />
                      <p>No findings recorded yet.</p>
                      <small>Add a verification note to this case.</small>
                    </div>
                  )}
                  <label className="form-label">
                    Investigation note
                    <textarea
                      placeholder="Record source checks, observations, or verification steps…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={4}
                    />
                  </label>
                  <button
                    className="primary"
                    disabled={!note.trim() || mutation.isPending || !item}
                    onClick={() => mutation.mutate({ note })}
                  >
                    Save note
                  </button>
                  {mutation.error && (
                    <p role="alert" className="error-text">
                      {mutation.error.message}
                    </p>
                  )}
                </div>
              </Panel>
            </div>
            <div className="warning-banner">
              <ShieldAlert size={17} />
              These indicators require independent auditor verification and do
              not constitute a finding of fraud.
            </div>
          </>
        )}
      </DataState>
      {confirm && (
        <Modal
          title="Update investigation status"
          onClose={() => setConfirm(null)}
        >
          <div className="modal-body">
            <p>
              Change <strong>{id}</strong> to{" "}
              <strong>{statuses[confirm]}</strong>?
            </p>
            <p>
              {confirm === "CLEARED"
                ? "Confirm that you have independently verified the underlying records. The risk index will remain unchanged."
                : "This updates the case workflow. Verification requests are recorded locally; no message is sent."}
            </p>
            {mutation.error && (
              <p role="alert" className="error-text">
                {mutation.error.message}
              </p>
            )}
            <div className="modal-actions">
              <button onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className="primary"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ status: confirm })}
              >
                Confirm change
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
