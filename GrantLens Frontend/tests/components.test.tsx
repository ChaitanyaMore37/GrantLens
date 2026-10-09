import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DataState, ToastProvider } from "../src/components/common/Common";
import { Layout } from "../src/components/layout/Layout";
import { ClusterTable } from "../src/components/tables/ClusterTable";
import { NewAudit } from "../src/pages/NewAudit";
function mount(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>{node}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}
describe("cluster registry controls", () => {
  it("searches, filters, and navigates to CL-017", async () => {
    const user = userEvent.setup();
    mount(
      <Routes>
        <Route path="/" element={<ClusterTable />} />
        <Route path="/clusters/:id" element={<h1>Case workspace opened</h1>} />
      </Routes>,
    );
    await screen.findByRole("link", { name: "Open CL-017" });
    await user.selectOptions(
      screen.getByLabelText("Filter risk level"),
      "critical",
    );
    expect(
      screen.queryByRole("link", { name: "Open CL-019" }),
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Search cluster ID or risk indicator…"),
      "absent",
    );
    expect(screen.getByText("No matching records")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    await user.type(
      screen.getByLabelText("Search cluster ID or risk indicator…"),
      "CL-017",
    );
    await user.click(screen.getByRole("link", { name: "Open CL-017" }));
    expect(
      screen.getByRole("heading", { name: "Case workspace opened" }),
    ).toBeInTheDocument();
  });
  it("sorts risk scores independently of review status", async () => {
    const user = userEvent.setup();
    mount(<ClusterTable />);
    await screen.findByRole("link", { name: "Open CL-017" });
    await user.click(screen.getByRole("button", { name: "Risk score" }));
    expect(
      within(screen.getAllByRole("row")[1]).getByRole("link", {
        name: "Open CL-021",
      }),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("Filter review status"),
      "NEEDS_REVIEW",
    );
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});
describe("shared shell", () => {
  it("navigates all eight sidebar destinations", async () => {
    const user = userEvent.setup();
    mount(
      <Routes>
        <Route element={<Layout />}>
          {[
            "",
            "new-audit",
            "clusters",
            "beneficiaries",
            "network",
            "investigations",
            "reports",
            "settings",
          ].map((p) => (
            <Route
              key={p}
              path={p || "/"}
              element={<h1>Screen {p || "overview"}</h1>}
            />
          ))}
        </Route>
      </Routes>,
    );
    for (const [name, path] of [
      ["New Audit", "new-audit"],
      ["Risk Clusters", "clusters"],
      ["Beneficiaries", "beneficiaries"],
      ["Network Explorer", "network"],
      ["Investigations", "investigations"],
      ["Reports", "reports"],
      ["Settings", "settings"],
      ["Overview", "overview"],
    ]) {
      await user.click(screen.getByRole("link", { name }));
      expect(
        screen.getByRole("heading", { name: `Screen ${path}` }),
      ).toBeInTheDocument();
    }
  });
});
describe("upload workflow", () => {
  it("requires three files and presents missing-column errors", async () => {
    const user = userEvent.setup();
    mount(<NewAudit />);
    expect(
      screen.getByRole("button", { name: "Validate dataset" }),
    ).toBeDisabled();
    for (const name of [
      "beneficiaries.csv",
      "applications.csv",
      "transactions.csv",
    ]) {
      const file = new File(["id\n1"], name, { type: "text/csv" });
      Object.defineProperty(file, "text", { value: async () => "id\n1" });
      await user.upload(screen.getByLabelText(`Upload ${name}`), file);
    }
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Validate dataset" }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Validate dataset" }));
    expect(screen.getAllByText(/Missing columns:/)).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: "Run demo analysis" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Back to files" }));
    expect(screen.getAllByRole("button", { name: "Remove file" })).toHaveLength(
      3,
    );
  });
});
describe("async state feedback", () => {
  it("shows useful empty, loading, and retry states", async () => {
    const retry = vi.fn();
    const r = render(<DataState empty />);
    expect(screen.getByText("No matching records")).toBeInTheDocument();
    r.rerender(<DataState loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    r.rerender(
      <DataState error={new Error("Backend unavailable")} retry={retry} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Backend unavailable");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
