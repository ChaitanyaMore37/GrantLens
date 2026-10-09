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
  return (
    <>
      <PageHeading
        title="Workspace Settings"
        description="Connection details, display preferences, and review-priority guidance."
      />
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
              file, then restart Vite. API mode is the default; mock mode is for isolated UI development.
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
            <h3>GrantLens · Version 1.0</h3>
            <p>
              A scholarship forensic intelligence demonstration for financial
              auditors. All people, institutions, identities, and results are
              synthetic.
            </p>
            <p>
              This project has no government affiliation. Demo decisions and
              uploaded file summaries reset on a full page reload.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
