import { Link, Route, Routes } from "react-router-dom";
import { PageHeading, Panel } from "../../components/common/Common";
import { Layout } from "../../components/layout/Layout";
import { ClusterTable } from "../../components/tables/ClusterTable";
import { AnalysisHistory } from "../../pages/AnalysisHistory";
import { AuditTrail } from "../../pages/AuditTrail";
import { Beneficiaries } from "../../pages/Beneficiaries";
import { ClusterDetail } from "../../pages/ClusterDetail";
import { DetectionEvaluation } from "../../pages/DetectionEvaluation";
import { Investigations } from "../../pages/Investigations";
import { Login, Protected } from "../../pages/Login";
import { NetworkExplorer } from "../../pages/NetworkExplorer";
import { NewAudit } from "../../pages/NewAudit";
import { Overview } from "../../pages/Overview";
import { PriorityQueue } from "../../pages/PriorityQueue";
import { Reports } from "../../pages/Reports";
import { Settings } from "../../pages/Settings";
import { TransactionAnomalies } from "../../pages/TransactionAnomalies";
import { config } from "../../services/api";
export function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route
            path="clusters"
            element={
              <>
                <PageHeading
                  title="Risk Clusters"
                  description="Prioritize connected records for review using explainable risk indicators."
                />
                <Panel title="Suspicious cluster register">
                  <ClusterTable />
                </Panel>
              </>
            }
          />
          <Route path="clusters/:id" element={<ClusterDetail />} />
          <Route path="new-audit" element={<NewAudit />} />
          <Route
            path="beneficiaries"
            element={
              config.mode === "api" ? (
                <PriorityQueue directory />
              ) : (
                <Beneficiaries />
              )
            }
          />
          <Route path="review-queue" element={<PriorityQueue />} />
          <Route path="anomalies" element={<TransactionAnomalies />} />
          <Route path="history" element={<AnalysisHistory />} />
          <Route path="audit-trail" element={<AuditTrail />} />
          <Route path="evaluation" element={<DetectionEvaluation />} />
          <Route path="network" element={<NetworkExplorer />} />
          <Route path="investigations" element={<Investigations />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>Page not found</h1>
                <Link to="/">Return to Overview</Link>
              </div>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
