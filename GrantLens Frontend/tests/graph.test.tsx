import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CytoscapeOptions } from "cytoscape";
import { describe, expect, it, vi } from "vitest";
import { GraphView } from "../src/components/graphs/GraphView";
import { mockApi } from "../src/services/api";

// Exercise the real Cytoscape graph engine without jsdom's unavailable canvas renderer.
vi.mock("cytoscape", async (importOriginal) => {
  const actual = await importOriginal<{
    default: typeof import("cytoscape");
  }>();
  return {
    default: (options: CytoscapeOptions) =>
      actual.default({
        ...options,
        container: undefined,
        headless: true,
        styleEnabled: true,
      }),
  };
});
async function mount(initialEntity?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(
    ["graph", "CL-017"],
    await mockApi.getClusterGraph("CL-017"),
  );
  render(
    <QueryClientProvider client={client}>
      <GraphView clusterId="CL-017" initialEntity={initialEntity} />
    </QueryClientProvider>,
  );
}
describe("graph evidence inspector", () => {
  it("selects a beneficiary deep link even when the graph is already cached", async () => {
    await mount("BEN-001");
    expect(
      await screen.findByRole("heading", { name: "Aarav · 001" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Select graph entity", { exact: true }),
    ).toHaveValue("BEN-001");
    expect(await screen.findByText("TX-0001")).toBeInTheDocument();
    expect(screen.getByText("beneficiaries.csv:row:2")).toBeInTheDocument();
  });
  it("updates the inspector on node and relationship selection", async () => {
    const user = userEvent.setup();
    await mount();
    await user.selectOptions(
      screen.getByLabelText("Select graph entity", { exact: true }),
      "COL-01",
    );
    expect(
      await screen.findByRole("heading", { name: "Collector ••8901" }),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("Select graph relationship"),
      "AC-1-COL-01-transfer",
    );
    const inspector = screen.getByRole("complementary");
    expect(within(inspector).getByText("Source entity")).toBeInTheDocument();
    expect(within(inspector).getByText("AC-1")).toBeInTheDocument();
    expect(within(inspector).getByText("COL-01")).toBeInTheDocument();
    expect(within(inspector).getByText("TX-C1")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Toggle evidence inspector" }),
    );
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
