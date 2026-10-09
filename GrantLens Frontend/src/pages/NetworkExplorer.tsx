import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { DataState, PageHeading, Panel, Select } from "../components/Common";
import { GraphView } from "../components/GraphView";
export function NetworkExplorer() {
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ["clusters"], queryFn: api.getClusters });
  const id = params.get("cluster") || q.data?.[0]?.id || "";
  return (
    <>
      <PageHeading
        title="Network Explorer"
        description="Trace shared identities, payout accounts, and transaction flows across connected records."
      >
        <Select
          label="Cluster"
          value={id}
          onChange={(v) => setParams({ cluster: v })}
          options={(q.data || []).map((c) => ({
            value: c.id,
            label: `${c.id} · ${c.name}`,
          }))}
        />
      </PageHeading>
      <div className="info-banner">
        Explore one synthetic cluster at a time. Select an entity to highlight
        up to three hops or trace a connection path.
      </div>
      <Panel className="explorer-panel">
        <DataState loading={q.isPending} error={q.error} empty={!id}>{id && <GraphView
          clusterId={id}
          initialEntity={params.get("entity") || undefined}
        />}</DataState>
      </Panel>
    </>
  );
}
