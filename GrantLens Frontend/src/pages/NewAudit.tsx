import Papa from "papaparse";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  LoaderCircle,
  Download,
} from "lucide-react";
import { api, config, selectAudit, ApiError } from "../services/api";
import type { AuditJob, DatasetFile } from "../types";
import { PageHeading, Panel, useToast } from "../components/Common";
import { schemas, validateCsv } from "../utils";
type Preview = DatasetFile & {
  errors: string[];
  sourceText: string;
  sourceColumns: string[];
};
const stages = [
  "Data Validation",
  "Normalization",
  "Record Linkage",
  "Graph Construction",
  "Community Detection",
  "Risk Scoring",
];
export function NewAudit() {
  const [files, setFiles] = useState<Record<string, Preview>>({});
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<AuditJob | null>(null);
  const [references, setReferences] = useState<DatasetFile[]>([]);
  const [fail, setFail] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const client = useQueryClient();
  const names = Object.keys(schemas);
  const valid = names.every((n) => files[n] && !files[n].errors.length);
  const add = async (name: string, file: File | undefined) => {
    if (!file) return;
    setError("");
    setJob(null);
    setValidation(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Preview files must be smaller than 10 MB.");
      return;
    }
    try {
      const text = await file.text();
      const result = validateCsv(text, name);
      setFiles((old) => ({
        ...old,
        [name]: {
          ...result,
          name,
          file,
          sourceText: text,
          sourceColumns: result.columns,
        },
      }));
    } catch {
      setError("Unable to read this file. Please choose it again.");
    }
  };
  const mapColumn = (name: string, canonical: string, source: string) => {
    setJob(null);
    setValidation(null);
    setFiles((old) => {
      const file = old[name];
      const mapping = { ...file.mapping };
      if (source) mapping[canonical] = source;
      else delete mapping[canonical];
      const rows = Papa.parse<string[]>(file.sourceText, {
        skipEmptyLines: true,
      }).data;
      const inverse = Object.fromEntries(
        Object.entries(mapping).map(([c, s]) => [s, c]),
      );
      const headers = rows[0].map((h) => inverse[h] || h);
      const result = validateCsv(
        Papa.unparse([headers, ...rows.slice(1)]),
        name,
      );
      if (
        new Set(Object.values(mapping)).size !==
          Object.values(mapping).length ||
        new Set(headers).size !== headers.length
      )
        result.errors.push(
          "Ambiguous mapping: each source and canonical column must be unique.",
        );
      return { ...old, [name]: { ...file, ...result, mapping } };
    });
  };
  useEffect(() => {
    if (job?.status !== "PROCESSING") return;
    const timer = setTimeout(async () => {
      try {
        setJob(await api.getAudit(job.id));
      } catch (e) {
        setError((e as Error).message);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [job]);
  const validateServer = async () => {
    setBusy(true);
    setError("");
    try {
      const uploaded = await api.uploadAuditFiles([
        ...Object.values(files),
        ...references,
      ]);
      setJob(uploaded);
      setValidation(uploaded.validation);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setValidation(e.details);
    } finally {
      setBusy(false);
    }
  };
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const uploaded =
        job ||
        (await api.uploadAuditFiles([...Object.values(files), ...references]));
      const started = await api.runAudit(uploaded.id, fail);
      setJob(started);
      setStep(3);
      client.invalidateQueries({ queryKey: ["audits"] });
      toast(
        config.mode === "mock"
          ? "Demo simulation started. No forensic processing is performed."
          : "Audit job started.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        title="New Audit"
        description="Prepare a scholarship dataset, validate its structure, and start an audit workflow."
      >
        <span className="demo-pill">
          {config.mode === "mock" ? "DEMO ANALYSIS" : "API ANALYSIS"}
        </span>
      </PageHeading>
      <div className="stepper">
        {["Upload data", "Validate dataset", "Run analysis"].map((s, i) => (
          <div className={step >= i + 1 ? "current" : ""} key={s}>
            <span>{step > i + 1 ? <CheckCircle2 size={18} /> : i + 1}</span>
            <div>
              <small>STEP {i + 1}</small>
              <strong>{s}</strong>
            </div>
            {i < 2 && <ArrowRight size={18} />}
          </div>
        ))}
      </div>
      {error && (
        <div role="alert" className="warning-banner">
          {error}
        </div>
      )}
      {step === 1 && (
        <Panel
          title="Upload your source files"
          action={
            <span className="muted small">
              CSV only · maximum 10 MB per file
            </span>
          }
        >
          <div className="upload-intro">
            <p>
              Provide all three source files. Personal records should be masked
              before use in this prototype.
            </p>
            <span className="small muted">
              Basic schema checks run in your browser. In demo mode, files are
              never sent to a backend.
            </span>
          </div>
          {config.mode === "api" && (
            <div className="info-banner">
              <label>
                Reference CSVs (select all four from main/reference)
                <input
                  aria-label="Reference CSV files"
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={(e) => {
                    const fs = Array.from(e.target.files || []);
                    const expected = [
                      "institutions.csv",
                      "accounts.csv",
                      "scheme_rules.csv",
                      "account_authorizations.csv",
                    ];
                    if (
                      fs.length &&
                      (fs.length !== 4 ||
                        !expected.every((n) => fs.some((f) => f.name === n)))
                    ) {
                      setError("Select all four reference CSVs together.");
                      setReferences([]);
                      return;
                    }
                    setError("");
                    setJob(null);
                    setValidation(null);
                    setReferences(
                      fs.map((file) => ({
                        name: file.name,
                        file,
                        rows: 0,
                        columns: [],
                      })),
                    );
                  }}
                />
              </label>
              <span>
                Ordinary references only. Never upload evaluation labels.
              </span>
            </div>
          )}
          <div className="upload-grid">
            {names.map((name) => (
              <div
                key={name}
                className={`upload-zone ${files[name] ? "has-file" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  add(name, e.dataTransfer.files[0]);
                }}
              >
                <div className="upload-icon">
                  {files[name] ? <FileSpreadsheet /> : <UploadCloud />}
                </div>
                <h3>{name}</h3>
                {files[name] ? (
                  <>
                    <strong>{files[name].file.name}</strong>
                    <p>
                      {(files[name].file.size / 1024).toFixed(1)} KB ·{" "}
                      {files[name].rows} records
                    </p>
                    <button
                      className="text-button"
                      onClick={() =>
                        setFiles((old) => {
                          const next = { ...old };
                          delete next[name];
                          setJob(null);
                          setValidation(null);
                          return next;
                        })
                      }
                    >
                      <X size={14} />
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <p>Drag and drop your CSV here</p>
                    <label className="button file-select">
                      Choose file
                      <input
                        aria-label={`Upload ${name}`}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => add(name, e.target.files?.[0])}
                      />
                    </label>
                  </>
                )}
                <a
                  className="sample-link"
                  href={
                    config.mode === "mock"
                      ? `/samples/${name}`
                      : `${config.baseUrl}/dataset/sample/${name}`
                  }
                  download
                >
                  <Download size={13} />
                  Download sample
                </a>
              </div>
            ))}
          </div>
          <div className="panel-footer">
            <span className="muted small">
              {Object.keys(files).length} of 3 required files selected
            </span>
            <button
              className="primary"
              disabled={Object.keys(files).length !== 3}
              onClick={() => setStep(2)}
            >
              Validate dataset <ArrowRight size={16} />
            </button>
          </div>
        </Panel>
      )}
      {step === 2 && (
        <Panel
          title="Dataset validation"
          action={<span className="demo-pill">SCHEMA PREVIEW ONLY</span>}
        >
          <div className="validation-body">
            {validation != null && (
              <section>
                <h3>Backend validation findings</h3>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    maxHeight: 360,
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(validation, null, 2)}
                </pre>
              </section>
            )}
            <p>
              Explicit column mappings rename headers only. Original uploaded
              bytes are preserved on the backend when a mapping is used. Values
              and row order remain unchanged; resolve ambiguous mappings before
              validation.
            </p>
            {names.map((n) => (
              <section className="validation-file" key={n}>
                <div>
                  <FileSpreadsheet size={20} />
                  <strong>{n}</strong>
                  <span>{files[n]?.rows || 0} records</span>
                  {files[n]?.errors.length ? (
                    <span className="error-text">
                      <AlertTriangle size={16} />
                      Needs correction
                    </span>
                  ) : (
                    <span className="success-text">
                      <CheckCircle2 size={16} />
                      Schema passed
                    </span>
                  )}
                </div>
                {config.mode === "api" && (
                  <details>
                    <summary>Review / change column mapping</summary>
                    {schemas[n].map((c) => (
                      <label className="form-label" key={c}>
                        {c}
                        <select
                          aria-label={`${n} mapping ${c}`}
                          value={
                            files[n]?.mapping?.[c] ||
                            (files[n]?.sourceColumns.includes(c) ? c : "")
                          }
                          onChange={(e) => mapColumn(n, c, e.target.value)}
                        >
                          <option value="">Unmapped</option>
                          {files[n]?.sourceColumns.map((col) => (
                            <option key={col}>{col}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </details>
                )}
                <div className="column-map">
                  {schemas[n].map((c) => (
                    <span
                      className={
                        files[n]?.columns.includes(c) ? "mapped" : "missing"
                      }
                      key={c}
                    >
                      {c} {files[n]?.columns.includes(c) ? "✓" : "×"}
                    </span>
                  ))}
                </div>
                {files[n]?.errors.length > 0 && (
                  <ul className="error-list">
                    {files[n].errors.slice(0, 12).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {files[n].errors.length > 12 && (
                      <li>
                        And {files[n].errors.length - 12} additional errors.
                      </li>
                    )}
                  </ul>
                )}
              </section>
            ))}
            {config.mode === "mock" && (
              <>
                <div className="info-banner">
                  Demo analysis replays the built-in CL-017 fixture. Uploaded
                  rows are only used for schema previews and file summaries.
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={fail}
                    onChange={(e) => setFail(e.target.checked)}
                  />
                  Simulate a processing failure to test recovery
                </label>
              </>
            )}
          </div>
          <div className="panel-footer">
            <button onClick={() => setStep(1)}>Back to files</button>
            {config.mode === "api" && (
              <button disabled={!valid || busy} onClick={validateServer}>
                Validate on server
              </button>
            )}
            <button
              className="primary"
              disabled={
                !valid ||
                busy ||
                (config.mode === "api" &&
                  !["READY", "FAILED"].includes(job?.status || ""))
              }
              onClick={run}
            >
              {busy ? <LoaderCircle size={16} /> : null}
              {config.mode === "mock" ? "Run demo analysis" : "Run analysis"}
              <ArrowRight size={16} />
            </button>
          </div>
        </Panel>
      )}
      {step === 3 && job && (
        <Panel
          title={
            job.status === "COMPLETED"
              ? config.mode === "mock"
                ? "Demo audit complete"
                : "Audit complete"
              : job.status === "FAILED"
                ? "Analysis could not complete"
                : "Processing audit workflow"
          }
        >
          <div className="processing-body">
            <div
              className={`processing-icon ${job.status === "FAILED" ? "failed" : ""}`}
            >
              {job.status === "COMPLETED" ? (
                <CheckCircle2 size={36} />
              ) : job.status === "FAILED" ? (
                <AlertTriangle size={36} />
              ) : (
                <LoaderCircle className="spin" size={36} />
              )}
            </div>
            <h2>
              {job.status === "COMPLETED"
                ? "Ready for a guided investigation"
                : job.stage}
            </h2>
            <p>
              {config.mode === "mock"
                ? "Simulated stages · no backend forensic analysis has occurred."
                : `Job ${job.id}`}
            </p>
            <div className="progress-track">
              <div style={{ width: `${job.progress}%` }} />
            </div>
            <span className="muted">
              {config.mode === "api" && job.status === "PROCESSING"
                ? "Processing; percentage unavailable"
                : `${job.progress}% complete`}
            </span>
            <div className="processing-stages" hidden={config.mode === "api"}>
              {stages.map((s, i) => (
                <div className={job.progress > i * 17 ? "done" : ""} key={s}>
                  <CheckCircle2 size={17} />
                  {s}
                </div>
              ))}
            </div>
            {job.status === "COMPLETED" && (
              <>
                <div className="completion-summary">
                  {job.files.map((f) => (
                    <span key={f.name}>
                      <strong>{f.rows}</strong>
                      {f.name}
                    </span>
                  ))}
                </div>
                <p>
                  {config.mode === "mock"
                    ? "Results use the reference demo fixture."
                    : "Results belong to your uploaded dataset."}
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    if (config.mode === "mock") navigate("/clusters/CL-017");
                    else {
                      selectAudit(job.id);
                      window.location.assign("/");
                    }
                  }}
                >
                  View results <ArrowRight size={16} />
                </button>
              </>
            )}
            {(job.status === "FAILED" || error) && (
              <>
                <p role="alert">{error || job.stage}</p>
                <button
                  onClick={() => {
                    setStep(2);
                    setFail(false);
                    setError("");
                  }}
                >
                  Return to validation and retry
                </button>
              </>
            )}
          </div>
        </Panel>
      )}
    </>
  );
}
