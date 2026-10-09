import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Login, Protected } from "../src/pages/Login";
import {
  PriorityQueue,
  TransactionAnomalies,
  AnalysisHistory,
  AuditTrail,
} from "../src/pages/Intelligence";
import { v2 } from "../src/services/v2";
import type { ReactNode } from "react";
function mount(node: ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});
describe("V2 workflow", () => {
  it("rejects incorrect demo credentials and opens protected routes after login", async () => {
    const u = userEvent.setup();
    mount(
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route path="/" element={<h1>Protected dashboard</h1>} />
        </Route>
      </Routes>,
    );
    await u.type(screen.getByLabelText("Email"), "auditor@grantlens.demo");
    await u.type(screen.getByLabelText("Password"), "wrong");
    await u.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("incorrect");
    await u.clear(screen.getByLabelText("Password"));
    await u.type(screen.getByLabelText("Password"), "GrantLens123");
    await u.click(screen.getByLabelText("Show password"));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    await u.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByRole("heading", { name: "Protected dashboard" }),
    ).toBeInTheDocument();
  });
  it("requests server pages and filters instead of a whole audit snapshot", async () => {
    const spy = vi
      .spyOn(v2, "queue")
      .mockResolvedValue({
        items: [
          {
            beneficiary_id: "B1",
            full_name: "Sample person",
            district: "Pune",
            institution_id: "I1",
            risk_score: 80,
            risk_level: "Critical",
            bank_account_id: "••••1234",
            evidence: [],
          },
        ],
        total: 40,
        offset: 0,
        limit: 25,
      });
    const u = userEvent.setup();
    mount(<PriorityQueue />);
    await screen.findByRole("button", { name: "Sample person" });
    await u.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 25, limit: 25 }),
      ),
    );
    await u.selectOptions(screen.getByLabelText("Risk level"), "High");
    await waitFor(() =>
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ risk_level: "High", offset: 0 }),
      ),
    );
  });
  it("shows real sequence references from anomaly response", async () => {
    vi.spyOn(v2, "anomalies").mockResolvedValue({
      items: [
        {
          finding_id: "F1",
          indicator: "collector",
          contribution: 40,
          explanation: "Review coordinated transfers",
          source_record_ids: ["T1"],
          related_account_ids: ["A1"],
          beneficiary_ids: ["B1"],
          case_ids: [],
          assessment: "Review",
          amount: 500,
          transactions: [
            {
              transaction_id: "T1",
              sender_account: "••••1234",
              receiver_account: "••••5678",
              amount: 500,
              timestamp: "2024-01-01",
            },
          ],
        },
      ],
      total: 1,
      offset: 0,
      limit: 25,
    });
    mount(<TransactionAnomalies />);
    await userEvent.click(
      await screen.findByRole("button", { name: "collector" }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("T1");
    expect(screen.getByRole("dialog")).toHaveTextContent("••••1234 → ••••5678");
  });
  it("shows failed audit history without offering completed results", async () => {
    vi.spyOn(v2, "history").mockResolvedValue({
      items: [
        {
          audit_id: "A1",
          created_at: "2024-01-01",
          status: "Failed",
          summary: { error: "Interrupted" },
        },
      ],
      total: 1,
      offset: 0,
      limit: 25,
    });
    mount(<AnalysisHistory />);
    expect(
      await screen.findByRole("button", { name: "Open audit" }),
    ).toBeDisabled();
    expect(screen.getByText("Interrupted")).toBeInTheDocument();
  });
  it("shows backend failure with retry and no invented events", async () => {
    vi.spyOn(v2, "events").mockRejectedValue(new Error("Backend unavailable"));
    mount(<AuditTrail />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Backend unavailable",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
