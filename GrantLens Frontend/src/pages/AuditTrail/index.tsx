import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  DataState,
  PageHeading,
  Pagination,
  Panel,
  Select,
} from "../../components/common/Common";
import { selectedAudit } from "../../services/api";
import { v2 } from "../../services/api/v2";
export function AuditTrail() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const data = useQuery({
    queryKey: ["events", selectedAudit(), page, type],
    queryFn: () =>
      v2.events({ offset: (page - 1) * 25, limit: 25, event_type: type }),
  });
  return (
    <>
      <PageHeading
        title="Audit Trail"
        description="Actual events recorded since the V2 upgrade. Local SQLite history is not an immutable or tamper-proof log."
      />
      <Panel title="Recorded activity">
        <div className="filter-row">
          <Select
            label="Event type"
            value={type}
            onChange={(v) => {
              setType(v);
              setPage(1);
            }}
            options={[
              "",
              "audit_created",
              "validation_completed",
              "analysis_started",
              "analysis_completed",
              "analysis_failed",
              "case_updated",
              "report_generated",
            ]}
          />
        </div>
        <DataState
          loading={data.isPending}
          error={data.error}
          retry={() => data.refetch()}
          empty={data.data?.total === 0}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Summary</th>
                  <th>Case</th>
                </tr>
              </thead>
              <tbody>
                {data.data?.items.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {new Date(e.created_at).toLocaleString()}
                      <small>{e.id}</small>
                    </td>
                    <td>{e.event_type}</td>
                    <td>{e.actor}</td>
                    <td>{e.summary}</td>
                    <td>{e.case_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
        <Pagination
          page={page}
          setPage={setPage}
          total={data.data?.total || 0}
          size={25}
        />
      </Panel>
    </>
  );
}
