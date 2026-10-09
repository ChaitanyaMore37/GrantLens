import { useQuery, useQueryClient } from "@tanstack/react-query";
import cytoscape, { type Core, type StylesheetJson } from "cytoscape";
import {
  Maximize,
  Minus,
  Network,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RotateCcw,
  ScanSearch,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import type {
  EntityType,
  GraphEdge,
  GraphNode,
  GraphResponse,
} from "../../types";
import { money } from "../../utils";
import { DataState, SearchField, useToast } from "../common/Common";
const colors: Record<EntityType, string> = {
  beneficiary: "#2676bb",
  account: "#168a80",
  phone: "#a074bf",
  address: "#d28b30",
  institution: "#516885",
  scheme: "#7f93a9",
  collector: "#c94c55",
};
const shapes: Record<EntityType, string> = {
  beneficiary: "ellipse",
  account: "round-rectangle",
  phone: "diamond",
  address: "hexagon",
  institution: "rectangle",
  scheme: "pentagon",
  collector: "octagon",
};
const graphStyle: StylesheetJson = [
  {
    selector: "node",
    style: {
      width: 31,
      height: 31,
      label: "data(label)",
      "font-size": 9,
      color: "#29425e",
      "text-valign": "bottom",
      "text-margin-y": 7,
      "border-width": 3,
      "border-color": "#fff",
      "text-background-color": "#fff",
      "text-background-opacity": 0.8,
      "text-background-padding": "2px",
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.3,
      "line-color": "#c0cdd9",
      "curve-style": "bezier",
      "target-arrow-shape": "none",
      "target-arrow-color": "#c0cdd9",
      "arrow-scale": 0.65,
      "font-size": 8,
      color: "#52667e",
      "text-rotation": "autorotate",
      "text-background-color": "white",
      "text-background-opacity": 0.95,
      "text-background-padding": "2px",
    },
  },
  ...Object.entries(colors).map(([type, color]) => ({
    selector: `node[type="${type}"]`,
    style: { "background-color": color, shape: shapes[type as EntityType] },
  })),
  {
    selector: 'edge[type="transfer"]',
    style: {
      "target-arrow-shape": "triangle",
      "line-color": "#c94c55",
      "target-arrow-color": "#c94c55",
      width: 2.5,
    },
  },
  {
    selector: 'edge[type="identity"]',
    style: { "line-color": "#a074bf", "line-style": "dashed" },
  },
  { selector: ".dim", style: { opacity: 0.13 } },
  {
    selector: ".highlight",
    style: { "border-width": 4, "border-color": "#dba44c", opacity: 1 },
  },
  {
    selector: ":selected",
    style: {
      "border-color": "#092847",
      "border-width": 4,
      "line-color": "#1762a7",
      "target-arrow-color": "#1762a7",
    },
  },
] as StylesheetJson;
type Selection =
  | { kind: "node"; data: GraphNode["data"] }
  | { kind: "edge"; data: GraphEdge["data"] };
export function GraphView({
  clusterId,
  preview = false,
  initialEntity,
}: {
  clusterId: string;
  preview?: boolean;
  initialEntity?: string;
}) {
  const queryClient = useQueryClient();
  const container = useRef<HTMLDivElement>(null);
  const cy = useRef<Core | null>(null);
  const q = useQuery({
    queryKey: ["graph", clusterId],
    queryFn: () => api.getClusterGraph(clusterId),
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [search, setSearch] = useState(initialEntity || "");
  const [labels, setLabels] = useState(false);
  const [nodeLabels, setNodeLabels] = useState(true);
  const [hops, setHops] = useState(1);
  const [type, setType] = useState("");
  const [relation, setRelation] = useState("");
  const [inspector, setInspector] = useState(true);
  const [pathTarget, setPathTarget] = useState("");
  const [pathBusy, setPathBusy] = useState(false);
  const toast = useToast();
  const tx = useQuery({
    queryKey: ["transactions", selection?.data.id],
    queryFn: () => api.getTransactions(selection!.data.id),
    enabled: !!selection && selection.kind === "node" && !preview,
  });
  const beneficiary = useQuery({
    queryKey: ["beneficiary", selection?.data.id],
    queryFn: () => api.getBeneficiaryById(selection!.data.id),
    enabled:
      selection?.kind === "node" && selection.data.type === "beneficiary",
  });
  useEffect(() => {
    if (!container.current || !q.data) return;
    setSelection(null);
    const instance = cytoscape({
      container: container.current,
      elements: [...q.data.nodes, ...q.data.edges],
      style: graphStyle,
      layout: {
        name: q.data.nodes.every((n) => n.position) ? "preset" : "cose",
        animate: false,
        padding: preview ? 17 : 40,
      },
      minZoom: 0.15,
      maxZoom: 3,
      boxSelectionEnabled: false,
    });
    cy.current = instance;
    instance.on("tap", "node", (e) => {
      setSelection({ kind: "node", data: e.target.data() });
    });
    instance.on("tap", "edge", (e) => {
      setSelection({ kind: "edge", data: e.target.data() });
    });
    instance.on("tap", (e) => {
      if (e.target === instance) setSelection(null);
    });
    if (initialEntity) {
      const n = instance.getElementById(initialEntity);
      if (n.length) {
        n.select();
        setSelection({ kind: "node", data: n.data() });
      }
    }
    const obs = new ResizeObserver(() => {
      instance.resize();
      if (preview) instance.fit(undefined, 18);
    });
    obs.observe(container.current);
    return () => {
      obs.disconnect();
      instance.destroy();
      cy.current = null;
    };
  }, [q.data, preview, initialEntity]);
  useEffect(() => {
    setSearch(initialEntity || "");
    setType("");
    setRelation("");
  }, [clusterId, initialEntity]);
  useEffect(() => {
    const instance = cy.current;
    if (!instance) return;
    instance.elements().removeClass("dim highlight");
    if (selection) {
      let group = instance.getElementById(selection.data.id);
      for (let i = 0; i < hops; i++) group = group.union(group.neighborhood());
      instance.elements().difference(group).addClass("dim");
      instance.getElementById(selection.data.id).addClass("highlight");
    }
  }, [selection, hops, q.data]);
  useEffect(() => {
    const instance = cy.current;
    if (!instance) return;
    instance.nodes().forEach((n) => {
      n.style("display", !type || n.data("type") === type ? "element" : "none");
      n.style("label", nodeLabels ? n.data("label") : "");
    });
    instance.edges().forEach((e) => {
      e.style(
        "display",
        (!relation || e.data("type") === relation) &&
          e.source().style("display") !== "none" &&
          e.target().style("display") !== "none"
          ? "element"
          : "none",
      );
      e.style("label", labels ? e.data("label") : "");
    });
  }, [type, relation, labels, nodeLabels, q.data]);
  const selectNode = (id: string) => {
    const node = cy.current?.getElementById(id);
    if (node?.length) {
      cy.current?.elements().unselect();
      node.select();
      setSelection({ kind: "node", data: node.data() });
      cy.current?.animate({ center: { eles: node }, duration: 200 });
    }
  };
  const expand = async () => {
    if (selection?.kind !== "node") return;
    setPathBusy(true);
    try {
      const g = await api.getGraphNeighbors(clusterId, selection.data.id, hops);
      queryClient.setQueryData(["graph", clusterId], g);
      toast(
        `Loaded ${g.nodes.length} entities around selected node${g.truncated ? " (bounded)" : ""}.`,
      );
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setPathBusy(false);
    }
  };
  const showPath = async () => {
    if (selection?.kind !== "node" || !pathTarget) return;
    setPathBusy(true);
    try {
      const g: GraphResponse = await api.getGraphPath(
        clusterId,
        selection.data.id,
        pathTarget,
      );
      if (!g.nodes.length) {
        toast("No connection found between these entities.");
        return;
      }
      const ids = new Set([...g.nodes, ...g.edges].map((e) => e.data.id));
      cy.current?.elements().forEach((e) => {
        e.toggleClass("dim", !ids.has(e.id()));
        e.toggleClass("highlight", ids.has(e.id()));
      });
      toast(`Highlighted a path across ${g.nodes.length} entities.`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setPathBusy(false);
    }
  };
  return (
    <DataState
      loading={q.isPending}
      error={q.error}
      retry={() => q.refetch()}
      empty={!q.data?.nodes.length}
    >
      <div className={`graph-component ${preview ? "preview" : ""}`}>
        {!preview && (
          <>
            <div className="graph-toolbar">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Find entity, account, or beneficiary…"
              />
              <select
                aria-label="Select graph entity"
                value={selection?.kind === "node" ? selection.data.id : ""}
                onChange={(e) => selectNode(e.target.value)}
              >
                <option value="">Select entity</option>
                {q.data?.nodes
                  .filter((n) =>
                    (n.data.id + " " + n.data.label)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((n) => (
                    <option value={n.data.id} key={n.data.id}>
                      {n.data.id} · {n.data.label}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Select graph relationship"
                value={selection?.kind === "edge" ? selection.data.id : ""}
                onChange={(e) => {
                  const edge = q.data?.edges.find(
                    (a) => a.data.id === e.target.value,
                  );
                  if (edge) setSelection({ kind: "edge", data: edge.data });
                }}
              >
                <option value="">Inspect relationship</option>
                {q.data?.edges.map((e) => (
                  <option key={e.data.id} value={e.data.id}>
                    {e.data.source} → {e.data.target} · {e.data.label}
                  </option>
                ))}
              </select>
              <button
                className="icon-button"
                aria-label="Toggle evidence inspector"
                onClick={() => setInspector(!inspector)}
              >
                {inspector ? (
                  <PanelRightClose size={18} />
                ) : (
                  <PanelRightOpen size={18} />
                )}
              </button>
            </div>
            <div className="graph-filters">
              <select
                aria-label="Node type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">All entity types</option>
                {Object.keys(colors).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                aria-label="Relationship type"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
              >
                <option value="">All relationships</option>
                {[...new Set(q.data?.edges.map((e) => e.data.type))].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </select>
              <select
                aria-label="Exploration depth"
                value={hops}
                onChange={(e) => setHops(+e.target.value)}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}-hop connections
                  </option>
                ))}
              </select>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={nodeLabels}
                  onChange={(e) => setNodeLabels(e.target.checked)}
                />
                Node labels
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={labels}
                  onChange={(e) => setLabels(e.target.checked)}
                />
                Edge labels
              </label>
            </div>
          </>
        )}
        <div
          className={`graph-body ${!preview && inspector ? "with-inspector" : ""}`}
        >
          <div className="graph-canvas-wrap">
            <div
              ref={container}
              className="graph-canvas"
              role="img"
              aria-label={`Interactive relationship network for ${clusterId}. Use Select graph entity to inspect nodes with a keyboard.`}
            />
            {!preview && (
              <>
                <div className="graph-watermark">
                  <Network size={14} />
                  {clusterId} <span>· {q.data?.nodes.length} entities</span>
                </div>
                <div className="graph-controls">
                  <button
                    aria-label="Zoom in"
                    onClick={() => cy.current?.zoom(cy.current.zoom() * 1.2)}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    aria-label="Zoom out"
                    onClick={() => cy.current?.zoom(cy.current.zoom() / 1.2)}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    aria-label="Fit graph"
                    onClick={() => cy.current?.fit(undefined, 35)}
                  >
                    <Maximize size={16} />
                  </button>
                  <button
                    aria-label="Reset graph layout"
                    onClick={() => {
                      setSelection(null);
                      setType("");
                      setRelation("");
                      cy.current?.nodes().forEach((n) => {
                        const p = q.data?.nodes.find(
                          (a) => a.data.id === n.id(),
                        )?.position;
                        if (p) n.position(p);
                      });
                      if (!q.data?.nodes.every((n) => n.position))
                        cy.current
                          ?.layout({ name: "cose", animate: false })
                          .run();
                      cy.current?.fit(undefined, 35);
                    }}
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
                <div className="graph-hint">
                  Drag to arrange · Scroll to zoom · Select to inspect
                </div>
              </>
            )}
          </div>
          {!preview && inspector && (
            <aside className="evidence-inspector">
              <div className="inspector-heading">
                <ScanSearch size={17} />
                <h3>Evidence inspector</h3>
              </div>
              {!selection ? (
                <div className="inspector-empty">
                  <Network size={35} />
                  <h3>Follow the connections</h3>
                  <p>
                    Select a node or relationship to inspect its supporting
                    evidence.
                  </p>
                  <span>Or use the entity selector above.</span>
                </div>
              ) : (
                <div className="inspector-content">
                  <span className="eyebrow">
                    {selection.kind === "node"
                      ? selection.data.type
                      : "RELATIONSHIP"}
                  </span>
                  <h3>
                    {selection.kind === "node"
                      ? selection.data.label
                      : selection.data.label}
                  </h3>
                  <code>{selection.data.id}</code>
                  {selection.kind === "node" ? (
                    <>
                      <p>{selection.data.maskedInfo}</p>
                      {beneficiary.data &&
                        selection.data.type === "beneficiary" && (
                          <>
                            <h4>
                              Calculated risk: {beneficiary.data.score}/100
                            </h4>
                            {beneficiary.data.evidence?.map((e) => (
                              <p key={e.id}>
                                {e.label} (+{e.contribution}): {e.description}
                                <small>{e.records.join(" · ")}</small>
                              </p>
                            ))}
                          </>
                        )}
                      <h4>Connected entities</h4>
                      <div className="connection-list">
                        {q.data?.edges
                          .filter(
                            (e) =>
                              e.data.source === selection.data.id ||
                              e.data.target === selection.data.id,
                          )
                          .map((e) => {
                            const target =
                              e.data.source === selection.data.id
                                ? e.data.target
                                : e.data.source;
                            return (
                              <button
                                key={e.data.id}
                                onClick={() => selectNode(target)}
                              >
                                {target}
                                <small>{e.data.label}</small>
                              </button>
                            );
                          })}
                      </div>
                      <h4>Explore connection path</h4>
                      <button disabled={pathBusy} onClick={expand}>
                        Load selected neighborhood
                      </button>
                      <small>
                        Replaces this view with a bounded neighborhood, up to
                        500 nodes.
                      </small>
                      <select
                        aria-label="Path target"
                        value={pathTarget}
                        onChange={(e) => setPathTarget(e.target.value)}
                      >
                        <option value="">Choose target entity</option>
                        {q.data?.nodes
                          .filter((n) => n.data.id !== selection.data.id)
                          .map((n) => (
                            <option value={n.data.id} key={n.data.id}>
                              {n.data.id}
                            </option>
                          ))}
                      </select>
                      <button
                        className="small-button"
                        disabled={!pathTarget || pathBusy}
                        onClick={showPath}
                      >
                        Highlight path
                      </button>
                      <h4>Relevant transactions</h4>
                      {tx.isPending ? (
                        <p>Loading transactions…</p>
                      ) : tx.error ? (
                        <p role="alert">{tx.error.message}</p>
                      ) : tx.data?.length ? (
                        <div className="transaction-list">
                          {tx.data.map((t) => (
                            <div key={t.id}>
                              <strong>{t.id}</strong>
                              <span>{money(t.amount)}</span>
                              <small>
                                {t.date} · {t.source} → {t.target}
                              </small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No direct transactions for this entity.</p>
                      )}
                      <h4>Source records</h4>
                      {selection.data.sourceRecords.map((r) => (
                        <code className="source-record" key={r}>
                          {r}
                        </code>
                      ))}
                    </>
                  ) : (
                    <>
                      <dl>
                        <dt>Source entity</dt>
                        <dd>{selection.data.source}</dd>
                        <dt>Target entity</dt>
                        <dd>{selection.data.target}</dd>
                        <dt>Relationship type</dt>
                        <dd>{selection.data.type}</dd>
                        {selection.data.confidence !== undefined && (
                          <>
                            <dt>Match confidence</dt>
                            <dd>
                              {Math.round(selection.data.confidence * 100)}%
                            </dd>
                          </>
                        )}
                      </dl>
                      <h4>Supporting records</h4>
                      {selection.data.records.map((r) => (
                        <code className="source-record" key={r}>
                          {r}
                        </code>
                      ))}
                    </>
                  )}
                </div>
              )}
            </aside>
          )}
        </div>
        {!preview && (
          <div className="graph-legend">
            {q.data?.truncated && (
              <strong>Bounded view: graph truncated to 500 nodes.</strong>
            )}
            {Object.entries(colors).map(([t, c]) => (
              <span key={t}>
                <i style={{ background: c }} />
                {t === "collector" ? "Transaction account" : t}
              </span>
            ))}
          </div>
        )}
      </div>
    </DataState>
  );
}
