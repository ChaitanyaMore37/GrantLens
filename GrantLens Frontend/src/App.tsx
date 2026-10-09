import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { PageHeading, Panel, ToastProvider } from "./components/Common";
import { ClusterTable } from "./components/ClusterTable";
import { Overview } from "./pages/Overview";
import { ClusterDetail } from "./pages/ClusterDetail";
import { NetworkExplorer } from "./pages/NetworkExplorer";
import { Beneficiaries } from "./pages/Beneficiaries";
import { NewAudit } from "./pages/NewAudit";
import { Investigations } from "./pages/Investigations";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Login, Protected } from "./pages/Login";
import {
  PriorityQueue,
  TransactionAnomalies,
  AnalysisHistory,
  AuditTrail,
  DetectionEvaluation,
} from "./pages/Intelligence";
import { config } from "./services/api";
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false },
  },
});
export function App() {
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
