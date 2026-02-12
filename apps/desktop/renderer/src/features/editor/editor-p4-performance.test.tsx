import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { DiffViewPanel } from "../diff/DiffViewPanel";
import { createEditorStore } from "../../stores/editorStore";

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

describe("editor p4 performance baselines", () => {
  it("should keep typing render simulation p95 under 16ms", () => {
    let text = "x".repeat(100_000);
    const costs: number[] = [];

    for (let i = 0; i < 80; i += 1) {
      const startedAt = performance.now();
      text = `${text}a`;
      const endedAt = performance.now();
      costs.push(endedAt - startedAt);
    }

    const p95 = percentile(costs, 95);
    expect(p95).toBeLessThan(16);
  });

  it("should keep autosave write latency p95 under 500ms", async () => {
    const costs: number[] = [];

    const store = createEditorStore({
      invoke: async (channel, payload) => {
        if (channel !== "file:document:save") {
          throw new Error(`Unexpected channel: ${channel}`);
        }
        const request = payload as { reason: string };
        if (!["autosave", "manual-save"].includes(request.reason)) {
          throw new Error(`Unexpected reason: ${request.reason}`);
        }
        return {
          ok: true,
          data: {
            contentHash: "hash",
            updatedAt: Date.now(),
          },
        };
      },
    });

    store.setState({
      projectId: "project-1",
      documentId: "doc-1",
      autosaveStatus: "idle",
      autosaveError: null,
    });

    for (let i = 0; i < 40; i += 1) {
      const startedAt = performance.now();
      await store.getState().save({
        projectId: "project-1",
        documentId: "doc-1",
        contentJson: JSON.stringify({ i }),
        actor: "auto",
        reason: "autosave",
      });
      costs.push(performance.now() - startedAt);
    }

    const p95 = percentile(costs, 95);
    expect(p95).toBeLessThan(500);
  });

  it("should keep diff panel open/render p95 under 200ms", () => {
    const diffText = [
      "@@ -1,3 +1,3 @@",
      "-old line",
      "+new line",
      " unchanged",
    ].join("\n");

    const costs: number[] = [];
    for (let i = 0; i < 30; i += 1) {
      const startedAt = performance.now();
      const rendered = render(<DiffViewPanel diffText={diffText} mode="ai" />);
      costs.push(performance.now() - startedAt);
      rendered.unmount();
    }

    const p95 = percentile(costs, 95);
    expect(p95).toBeLessThan(200);
  });
});
