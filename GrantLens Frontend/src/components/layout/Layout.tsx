import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  FileBarChart2,
  FilePlus2,
  FolderSearch,
  Landmark,
  LayoutDashboard,
  Menu,
  Network,
  Search,
  Settings2,
  ShieldCheck,
  UsersRound,
  Waypoints,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api, config, selectAudit, selectedAudit } from "../../services/api";
import { Modal } from "../common/Common";
const links = [
  ["/", "Overview", LayoutDashboard],
  ["/new-audit", "New Audit", FilePlus2],
  ["/clusters", "Risk Clusters", Network],
  ["/beneficiaries", "Beneficiaries", UsersRound],
  ["/network", "Network Explorer", Waypoints],
  ["/investigations", "Investigations", FolderSearch],
  ["/reports", "Reports", FileBarChart2],
  ["/review-queue", "Priority Review Queue", UsersRound],
  ["/anomalies", "Transaction Anomalies", Waypoints],
  ["/history", "Analysis History", FileBarChart2],
  ["/audit-trail", "Audit Trail", FolderSearch],
  ["/evaluation", "Detection Evaluation", FileBarChart2],
  ["/settings", "Settings", Settings2],
] as const;
export function Layout() {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const audits = useQuery({
    queryKey: ["audits"],
    queryFn: api.getAudits,
    enabled: config.mode === "api",
  });
  return (
    <div className="application">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="brand-header">
        <div className="brand">
          <div className="brand-mark">
            <Landmark strokeWidth={1.7} />
          </div>
          <div>
            <div className="wordmark">GrantLens</div>
            <div className="brand-subtitle">
              Scholarship Forensic Intelligence
            </div>
          </div>
          <div className="brand-motto">
            TRANSPARENT SCHOLARSHIPS.
            <br />
            ACCOUNTABLE FUTURES.
          </div>
        </div>
        <div className="public-initiative">
          <strong>INSIGHT. INTEGRITY. IMPACT.</strong>
          <div className="tricolor" />
          <span>Built for better scholarship governance</span>
        </div>
      </header>
      <div className="nav-band">
        <span>
          <ShieldCheck size={16} />
          <strong>Scholarship Monitoring & Analytics Portal</strong>
          <span className="band-divider">|</span>Auditor workspace
        </span>
        <div>
          <span className="prototype-dot" />
          {config.mode === "mock"
            ? "Prototype — Synthetic Scholarship Data"
            : "Prototype — Synthetic Scholarship Data · API"}
          <button onClick={() => setDialog("User manual")}>
            User manual <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
      <div className="app-body">
        <aside className={`sidebar ${open ? "open" : ""}`}>
          <div className="sidebar-label">
            WORKSPACE
            <button
              aria-label="Close navigation"
              className="mobile-close"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <nav>
            {links.map(([to, label, Icon], i) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""} ${i === 7 ? "settings-link" : ""}`
                }
              >
                <Icon size={20} />
                {label}
                {label === "New Audit" && (
                  <span className="nav-plus" aria-hidden="true">
                    +
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="civic-illustration">
              <Landmark strokeWidth={0.7} />
              <div className="civic-line" />
            </div>
            <div className="sidebar-motto">
              BETTER SCHOLARSHIPS.
              <br />
              <strong>A STRONGER TOMORROW.</strong>
              <div className="tricolor" />
            </div>
            <div className="secure-note">
              <ShieldCheck size={15} />
              Local demo workspace
            </div>
          </div>
        </aside>
        {open && (
          <div className="sidebar-scrim" onClick={() => setOpen(false)} />
        )}
        <div className="workspace">
          <div className="utility-bar">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/beneficiaries?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={19} />
              <input
                aria-label="Global beneficiary search"
                placeholder="Search beneficiaries by name, ID, or account…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>Enter ↵</kbd>
            </form>
            <div className="user-actions">
              <button
                onClick={() => {
                  sessionStorage.removeItem("grantlens.demo-session");
                  window.location.assign("/login");
                }}
              >
                Logout
              </button>
              <button
                className="notification icon-button"
                aria-label="Notifications"
                onClick={() => setDialog("Notifications")}
              >
                <Bell size={21} />
                <i />
              </button>
              <span className="utility-divider" />
              <button
                className="profile"
                onClick={() => setDialog("Auditor profile")}
              >
                <span className="avatar">AM</span>
                <span>
                  <strong>Arjun Mehta</strong>
                  <small>Senior Audit Officer · Demo</small>
                </span>
                <ChevronDown size={15} />
              </button>
            </div>
          </div>
          <main id="main-content" tabIndex={-1}>
            {config.mode === "api" && (
              <div className="filter-row">
                <label>
                  Selected audit{" "}
                  <select
                    aria-label="Selected audit"
                    value={
                      selectedAudit() ||
                      audits.data?.find((j) => j.status === "COMPLETED")?.id ||
                      ""
                    }
                    onChange={(e) => {
                      selectAudit(e.target.value);
                      window.location.assign("/");
                    }}
                  >
                    <option value="">Choose completed audit</option>
                    {audits.data
                      ?.filter((j) => j.status === "COMPLETED")
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.id}
                        </option>
                      ))}
                  </select>
                </label>
                {audits.error && (
                  <span role="alert">{audits.error.message}</span>
                )}
              </div>
            )}
            <Outlet />
          </main>
          <footer>
            <span>GrantLens · Scholarship Forensic Intelligence</span>
            <span>
              Demonstration environment <span>•</span> No government affiliation
            </span>
            <button onClick={() => setDialog("Help & support")}>
              <CircleHelp size={13} />
              Help & support
            </button>
          </footer>
        </div>
      </div>
      {dialog && (
        <Modal title={dialog} onClose={() => setDialog("")}>
          <div className="modal-body">
            {dialog === "Notifications" ? (
              <>
                <h3>Your audit workspace is ready</h3>
                <p>
                  The synthetic Maharashtra audit is available for review. No
                  live notifications are connected.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    navigate("/review-queue");
                    setDialog("");
                  }}
                >
                  Open priority queue
                </button>
              </>
            ) : dialog === "Auditor profile" ? (
              <>
                <div className="avatar large">AM</div>
                <h3>Arjun Mehta</h3>
                <p>Fictional Senior Audit Officer · Maharashtra region</p>
                <p>
                  Frontend demo session only; API endpoints are not
                  authenticated.
                </p>
              </>
            ) : (
              <>
                <h3>From records to reviewable evidence</h3>
                <ol className="help-list">
                  <li>
                    Explore Overview for audit totals and risk indicators.
                  </li>
                  <li>
                    Open Risk Clusters and select a detected case to examine the
                    network.
                  </li>
                  <li>
                    Select a node or relationship to inspect source evidence.
                  </li>
                  <li>Record findings and update the investigation status.</li>
                  <li>
                    Use New Audit to validate sample CSVs and run an analysis.
                  </li>
                </ol>
                <p>
                  All indicators require independent verification. Upload
                  previews do not run fraud detection.
                </p>
                <a href="/samples/beneficiaries.csv" download>
                  Download a beneficiary CSV sample
                </a>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
