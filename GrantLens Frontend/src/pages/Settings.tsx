import { useQuery } from "@tanstack/react-query";
import { v2 } from "../services/v2";
import { api, selectedAudit, selectAudit } from "../services/api";
import { DataState } from "../components/Common";
import { useState } from "react";
import { Database, Monitor, ShieldCheck } from "lucide-react";
import { config } from "../services/api";
import { PageHeading, Panel, RiskBadge, useToast } from "../components/Common";
export function Settings() {
  const [compact, setCompact] = useState(
    localStorage.getItem("grantlens-compact") === "true",
  );
  const [motion, setMotion] = useState(
    localStorage.getItem("grantlens-motion") === "true",
  );
  const toast = useToast();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: v2.health,
    enabled: config.mode === "api",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dataset, setDataset] = useState("sample");
  async function initialize() {
    setBusy(true);
    setError("");
    try {
      const a = await v2.initialize(dataset);
      if (a.status === "Ready" || a.status === "Failed")
        await api.runAudit(a.audit_id);
      let status = await api.getAudit(a.audit_id);
      while (status.status === "PROCESSING") {
        await new Promise((r) => setTimeout(r, 1000));
        status = await api.getAudit(a.audit_id);
      }
      if (status.status !== "COMPLETED") throw new Error(status.stage);
      selectAudit(a.audit_id);
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Initialization failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Workspace Settings"
        description="Connection details, display preferences, and review-priority guidance."
      />
      <Panel title="System diagnostics and supplied datasets">
        <div className="settings-body">
          <DataState
            loading={health.isPending && config.mode === "api"}
            error={health.error}
            retry={() => health.refetch()}
          >
            <p>
              API / database:{" "}
              {health.data?.status || "Not checked in mock mode"} · version{" "}
              {health.data?.version || "—"}
            </p>
          </DataState>
          <p>
            Active audit: {selectedAudit() || "None selected"} · Supported
            input: CSV with optional reference tables.
          </p>
          <p>
            Initialize an existing supplied dataset without changing source
            files. Repeated initialization reuses the same audit.
          </p>
          <label>
            Dataset{" "}
            <select
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
            >
              <option value="sample">Sample · 1,000 beneficiaries</option>
              <option value="main">Main · 10,000 beneficiaries</option>
            </select>
          </label>
          <button disabled={busy || config.mode !== "api"} onClick={initialize}>
            {busy
              ? "Waiting for real analysis completion…"
              : "Initialize supplied dataset"}
          </button>
          {error && <p role="alert">{error}</p>}
          <p>
            If disconnected, start FastAPI on the configured port and retry. No
            mock fallback is used.
          </p>
        </div>
      </Panel>
      <div className="settings-grid">
        <Panel title="Data connection" icon={<Database size={18} />}>
          <div className="settings-body">
            <dl>
              <dt>Active data source</dt>
              <dd>
                <span className="demo-pill">
                  {config.mode.toUpperCase()} MODE
                </span>
              </dd>
              <dt>Configured backend URL</dt>
              <dd>
                <code>{config.baseUrl}</code>
              </dd>
              <dt>Connection behavior</dt>
              <dd>
                {config.mode === "mock"
                  ? "Local deterministic fixtures. No backend calls are made."
                  : "Requests use the integrated FastAPI service and selected audit."}
              </dd>
            </dl>
            <div className="info-banner">
              Change VITE_DATA_SOURCE and VITE_API_BASE_URL in your local .env
              file, then restart Vite. API mode is the default; mock mode is for
              isolated UI development.
            </div>
          </div>
        </Panel>
        <Panel title="Display preferences" icon={<Monitor size={18} />}>
          <div className="settings-body">
            <label className="setting-toggle">
              <span>
                <strong>Compact tables</strong>
                <small>Reduce table row spacing</small>
              </span>
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => {
                  setCompact(e.target.checked);
                  localStorage.setItem(
                    "grantlens-compact",
                    String(e.target.checked),
                  );
                  document.documentElement.classList.toggle(
                    "compact",
                    e.target.checked,
                  );
                  toast("Display preference saved on this device.");
                }}
              />
            </label>
            <label className="setting-toggle">
              <span>
                <strong>Reduce motion</strong>
                <small>Minimize interface transitions</small>
              </span>
              <input
                type="checkbox"
                checked={motion}
                onChange={(e) => {
                  setMotion(e.target.checked);
                  localStorage.setItem(
                    "grantlens-motion",
                    String(e.target.checked),
                  );
                  document.documentElement.classList.toggle(
                    "reduce-motion",
                    e.target.checked,
                  );
                }}
              />
            </label>
            <dl>
              <dt>Currency</dt>
              <dd>Indian Rupee · ₹ · en-IN</dd>
              <dt>Date format</dt>
              <dd>DD MMM YYYY · local time</dd>
            </dl>
          </div>
        </Panel>
        <Panel title="Risk index guidance" icon={<ShieldCheck size={18} />}>
          <div className="settings-body">
            <div className="risk-guide">
              {[
                [95, "80–100 · Critical priority"],
                [65, "60–79 · High priority"],
                [45, "30–59 · Medium priority"],
                [25, "0–29 · Low priority"],
              ].map(([s, l]) => (
                <div key={s}>
                  <RiskBadge score={Number(s)} />
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <p>
              Risk scores prioritize review. They are not probabilities of
              fraud. Case status is an independent auditor decision.
            </p>
          </div>
        </Panel>
        <Panel title="About this prototype">
          <div className="settings-body">
            <h3>GrantLens · Version 2.0</h3>
            <p>
              A scholarship forensic intelligence demonstration for financial
              auditors. All people, institutions, identities, and results are
              synthetic.
            </p>
            <p>
              This project has no government affiliation. API audit results and
              reviewer decisions persist in local SQLite across refreshes.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
