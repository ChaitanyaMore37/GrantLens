import { useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { Panel } from "../components/Common";
export function Protected() {
  return sessionStorage.getItem("grantlens.demo-session") === "active" ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
}
export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  return (
    <main className="login-page">
      <div className="login-brand">
        <h1>GrantLens</h1>
        <p>Scholarship Forensic Intelligence</p>
        <div className="tricolor" />
      </div>
      <Panel title="Auditor demo access">
        <form
          className="settings-body"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              email.trim().toLowerCase() !== "auditor@grantlens.demo" ||
              password !== "GrantLens123"
            ) {
              setError("The demo email or password is incorrect.");
              return;
            }
            sessionStorage.setItem("grantlens.demo-session", "active");
            navigate("/", { replace: true });
          }}
        >
          <p>Prototype — Synthetic Scholarship Data</p>
          <label>
            Email
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
            />{" "}
            Show password
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="primary" type="submit">
            Sign in
          </button>
          <p>Demo: auditor@grantlens.demo / GrantLens123</p>
          <small>
            Frontend demonstration access only. API endpoints are not
            authenticated. No government affiliation.
          </small>
        </form>
      </Panel>
    </main>
  );
}
