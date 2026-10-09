import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DataState,
  PageHeading,
  Panel,
  Select,
} from "../../components/common/Common";
import { v2 } from "../../services/api/v2";
export function DetectionEvaluation() {
  const data = useQuery({ queryKey: ["evaluations"], queryFn: v2.evaluations });
  const [index, setIndex] = useState(1);
  const run = data.data?.runs[index];
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  return (
    <>
      <PageHeading
        title="Detection Evaluation & Benchmarking"
        description="Offline synthetic-data evaluation environment. Generator-based controls do not establish performance on real scholarship records."
      />
      <DataState
        loading={data.isPending}
        error={data.error}
        retry={() => data.refetch()}
        empty={!data.data?.runs.length}
      >
        <Panel title="Measured baseline and V2 comparison">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart
                data={data.data?.runs.map((r) => ({
                  name: r.dataset.replace(".json", ""),
                  precision: r.metrics.suspicious_records.precision * 100,
                  recall: r.metrics.suspicious_records.recall * 100,
                  F1: r.metrics.suspicious_records.f1 * 100,
                }))}
              >
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="precision" fill="#173b66" />
                <Bar dataKey="recall" fill="#168a80" />
                <Bar dataKey="F1" fill="#d28b30" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Evaluation details">
          <div className="filter-row">
            <Select
              label="Evaluation run"
              value={String(index)}
              onChange={(v) => setIndex(Number(v))}
              options={
                data.data?.runs.map((r, i) => ({
                  value: String(i),
                  label: r.dataset,
                })) || []
              }
            />
          </div>
          {run && (
            <div className="settings-body">
              <p>
                {run.summary.beneficiary_count.toLocaleString()} records ·{" "}
                {new Date(run.evaluated_at).toLocaleString()} ·{" "}
                {run.metrics.processing_seconds}s ·{" "}
                {run.metrics.records_per_second.toLocaleString()} records/s
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th title="Flagged positives divided by all flags">
                        Precision
                      </th>
                      <th title="Detected labeled positives divided by all labeled positives">
                        Recall
                      </th>
                      <th title="Harmonic mean of precision and recall">F1</th>
                      <th>False-positive rate</th>
                      <th>TP / FP / FN</th>
                      <th title="At least half of labeled ring members flagged; not exact community recovery">
                        Ring recall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{pct(run.metrics.suspicious_records.precision)}</td>
                      <td>{pct(run.metrics.suspicious_records.recall)}</td>
                      <td>{pct(run.metrics.suspicious_records.f1)}</td>
                      <td>{pct(run.metrics.false_positive_rate)}</td>
                      <td>
                        {run.metrics.suspicious_records.true_positives} /{" "}
                        {run.metrics.suspicious_records.false_positives} /{" "}
                        {run.metrics.suspicious_records.false_negatives}
                      </td>
                      <td>{pct(run.metrics.fraud_ring_detection_recall)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Identity linkage: precision{" "}
                {pct(run.metrics.identity_matching.precision)} · recall{" "}
                {pct(run.metrics.identity_matching.recall)} · F1{" "}
                {pct(run.metrics.identity_matching.f1)}
              </p>
              <h3>Scenario flag rates</h3>
              <p>
                For legitimate controls, lower is better. For injected
                suspicious scenarios, higher is better.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Scenario / legitimate lookalike</th>
                    <th>Flagged</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(run.metrics.scenario_flag_rates).map(
                    ([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{pct(v)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              <details>
                <summary>Recorded configuration</summary>
                <pre>{JSON.stringify(run.configuration, null, 2)}</pre>
              </details>
            </div>
          )}
        </Panel>
      </DataState>
    </>
  );
}
