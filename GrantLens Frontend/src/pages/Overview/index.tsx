import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  FolderSearch,
  IndianRupee,
  Info,
  ListFilter,
  Network,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
import { GraphView } from "../../components/graphs/GraphView";
import { ClusterTable } from "../../components/tables/ClusterTable";
import { api, config, selectedAudit } from "../../services/api";
import { compactMoney } from "../../utils";
export function Overview() {
  const [scheme, setScheme] = useState("");
  const [district, setDistrict] = useState("");
  const [batch, setBatch] = useState("");
  const [period, setPeriod] = useState(config.mode === "mock" ? "2024" : "");
  const filters = { scheme, district, batch, period };
  const q = useQuery({
    queryKey: ["summary", filters],
    queryFn: () => api.getAuditSummary(filters),
  });
  const clusters = useQuery({
    queryKey: ["clusters"],
    queryFn: api.getClusters,
  });
  const s = q.data;
  const previewCluster = clusters.data?.find(
    (c) =>
      (!district || c.district === district) &&
      (!scheme || c.scheme.split(", ").includes(scheme)),
  );
  return (
    <>
      <PageHeading
        eyebrow="SCHOLARSHIP MONITORING & ANALYTICS"
        title="Overview"
        description="Monitor scholarship beneficiaries, uncover suspicious relationships, and prioritize investigations."
      >
        <Link className="primary button" to="/new-audit">
          <span>+</span> New audit
        </Link>
      </PageHeading>
      <div className="filter-row overview-filters">
        <Select
          label="Scholarship scheme"
          value={scheme}
          onChange={setScheme}
          options={[
            { value: "", label: "All scholarship schemes" },
            ...new Set(clusters.data?.flatMap((c) => c.scheme.split(", "))),
          ]}
        />
        <Select
          label="District"
          value={district}
          onChange={setDistrict}
          options={[
            { value: "", label: "All districts" },
            ...new Set(clusters.data?.map((c) => c.district)),
          ]}
        />
        <Select
          label="Audit batch"
          value={batch}
          onChange={setBatch}
          options={[
            { value: "", label: "All audit batches" },
            ...(config.mode === "mock"
              ? [{ value: "AUD-2024-012", label: "AUD-2024-012" }]
              : []),
          ]}
        />
        <div className="date-filter">
          <CalendarDays size={17} />
          <Select
            label="Reporting period"
            value={period}
            onChange={setPeriod}
            options={[
              ...(config.mode === "mock"
                ? [
                    { value: "2024", label: "Jan – Dec 2024" },
                    { value: "q4", label: "Oct – Dec 2024" },
                  ]
                : [{ value: "", label: "All dataset dates" }]),
            ]}
          />
        </div>
        <button
          className="icon-button refresh"
          aria-label="Refresh dashboard"
          onClick={() => q.refetch()}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="info-banner">
        <Info size={18} />
        <span>
          Evidence-led insights for a transparent and accountable scholarship
          ecosystem.
        </span>
        <span className="demo-pill">SYNTHETIC DATA</span>
        <Link to="/settings">
          About this prototype <ArrowUpRight size={14} />
        </Link>
      </div>
      <DataState
        loading={q.isPending}
        error={q.error}
        retry={() => q.refetch()}
      >
        {s && (
          <>
            <div className="kpi-grid">
              {[
                {
                  label: "Beneficiaries analyzed",
                  value: s.beneficiaries,
                  Icon: UsersRound,
                  color: "blue",
                  note: "Across selected scholarship records",
                },
                {
                  label: "Suspicious clusters",
                  value: s.clusters,
                  Icon: Network,
                  color: "purple",
                  note: "Prioritized for auditor review",
                },
                {
                  label: "Payments under review",
                  value: compactMoney(s.underReview),
                  Icon: IndianRupee,
                  color: "orange",
                  note: "Associated with uncleared cases",
                },
                {
                  label: "Active investigations",
                  value: s.investigations,
                  Icon: FolderSearch,
                  color: "teal",
                  note: "Investigation or verification ongoing",
                },
              ].map((k) => (
                <div className={`kpi-card ${k.color}`} key={k.label}>
                  <div className="kpi-top">
                    <span>{k.label}</span>
                    <div className="kpi-icon">
                      <k.Icon size={21} />
                    </div>
                  </div>
                  <div className="kpi-value">{k.value}</div>
                  <div className="kpi-note">
                    <span className="tiny-dot" />
                    {k.note}
                  </div>
                </div>
              ))}
            </div>
            <div className="metrics-strip">
              <span>
                <ShieldCheck size={16} />
                <strong>{s.payments}</strong> scholarship payments analyzed
              </span>
              <span>
                <UsersRound size={16} />
                <strong>{s.duplicates}</strong> potential identity matches
              </span>
              <span className="dataset-note">
                Audit{" "}
                <strong>
                  {config.mode === "mock" ? "AUD-2024-012" : selectedAudit()}
                </strong>
              </span>
            </div>
            <div className="dashboard-charts">
              <Panel
                title="Monthly audit trend"
                icon={<ChartNoAxesCombined size={19} />}
                action={
                  <span className="muted small">Flagged payment records</span>
                }
              >
                <div className="chart-legend">
                  <span>
                    <i style={{ background: "#c94c55" }} />
                    High / critical
                  </span>
                  <span>
                    <i style={{ background: "#1762a7" }} />
                    Medium
                  </span>
                  <span>
                    <i style={{ background: "#168a80" }} />
                    Low
                  </span>
                </div>
                <div className="trend-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={s.monthly}
                      margin={{ top: 8, right: 18, left: -20, bottom: 0 }}
                    >
                      <defs>
                        {[
                          ["high", "#c94c55"],
                          ["medium", "#1762a7"],
                          ["low", "#168a80"],
                        ].map(([id, color]) => (
                          <linearGradient
                            key={id}
                            id={id}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={color}
                              stopOpacity={0.18}
                            />
                            <stop
                              offset="100%"
                              stopColor={color}
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e4ebf2"
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#61748b" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#61748b" }}
                      />
                      <Tooltip />
                      {[
                        ["high", "#c94c55"],
                        ["medium", "#1762a7"],
                        ["low", "#168a80"],
                      ].map(([id, color]) => (
                        <Area
                          isAnimationActive={false}
                          key={id}
                          type="monotone"
                          dataKey={id}
                          stroke={color}
                          strokeWidth={2.2}
                          fill={`url(#${id})`}
                          dot={{ r: 3, strokeWidth: 2, fill: "white" }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel
                title="Suspicious network"
                icon={<Network size={19} />}
                action={
                  <Link to="/network">
                    Explore network <ArrowUpRight size={14} />
                  </Link>
                }
              >
                <div className="network-preview">
                  {previewCluster ? (
                    <GraphView clusterId={previewCluster.id} preview />
                  ) : (
                    <p>No detected review groups in this selection.</p>
                  )}
                  <div className="preview-caption">
                    <span className="live-dot" />
                    Synthetic relationship network{" "}
                    {previewCluster && (
                      <Link to={`/clusters/${previewCluster.id}`}>
                        Inspect {previewCluster?.id} <ChevronRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              </Panel>
            </div>
            <div className="dashboard-secondary">
              <Panel
                title="Risk distribution"
                action={<span className="muted small">Beneficiaries</span>}
              >
                <div className="distribution">
                  <div className="donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={s.distribution}
                          dataKey="value"
                          innerRadius={44}
                          outerRadius={59}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {s.distribution.map((d) => (
                            <Cell fill={d.color} key={d.name} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                      <strong>{s.beneficiaries}</strong>
                      <span>RECORDS</span>
                    </div>
                  </div>
                  <div className="distribution-legend">
                    {s.distribution.map((d) => (
                      <div key={d.name}>
                        <i style={{ background: d.color }} />
                        <span>{d.name}</span>
                        <strong>{d.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
              <Panel
                title="Anomaly categories"
                icon={<ListFilter size={17} />}
                action={
                  <span className="muted small">
                    Linked beneficiaries · categories may overlap
                  </span>
                }
              >
                <div className="anomaly-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={s.anomalies}
                      layout="vertical"
                      margin={{ left: 5, right: 20, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={155}
                        tick={{ fontSize: 11, fill: "#61748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar
                        isAnimationActive={false}
                        dataKey="value"
                        fill="#4c7fae"
                        barSize={10}
                        radius={[0, 3, 3, 0]}
                        label={{
                          position: "right",
                          fontSize: 11,
                          fill: "#12345a",
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          </>
        )}
      </DataState>
      <Panel
        title="Priority risk clusters"
        icon={<FolderSearch size={19} />}
        action={
          <Link to="/clusters">
            View all clusters <ArrowUpRight size={14} />
          </Link>
        }
        className="cluster-panel"
      >
        <ClusterTable compact externalFilters={filters} />
      </Panel>
    </>
  );
}
