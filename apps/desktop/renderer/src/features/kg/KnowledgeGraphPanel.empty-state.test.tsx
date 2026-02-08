import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { KgEntity, KgRelation } from "../../stores/kgStore";
import { KnowledgeGraphPanel } from "./KnowledgeGraphPanel";

type MockKgState = {
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  entities: KgEntity[];
  relations: KgRelation[];
  lastError: null;
  bootstrapForProject: (projectId: string | null) => Promise<void>;
  clearError: () => void;
  entityCreate: () => Promise<{ ok: true }>;
  entityUpdate: () => Promise<{ ok: true }>;
  entityDelete: () => Promise<{ ok: true }>;
  relationCreate: () => Promise<{ ok: true }>;
  relationUpdate: () => Promise<{ ok: true }>;
  relationDelete: () => Promise<{ ok: true }>;
};

let mockKgState: MockKgState;

vi.mock("../../stores/kgStore", () => ({
  useKgStore: (selector: (state: MockKgState) => unknown) => selector(mockKgState),
}));

describe("KnowledgeGraphPanel.empty-state", () => {
  beforeEach(() => {
    mockKgState = {
      bootstrapStatus: "ready",
      entities: [],
      relations: [],
      lastError: null,
      bootstrapForProject: async () => {},
      clearError: () => {},
      entityCreate: async () => ({ ok: true }),
      entityUpdate: async () => ({ ok: true }),
      entityDelete: async () => ({ ok: true }),
      relationCreate: async () => ({ ok: true }),
      relationUpdate: async () => ({ ok: true }),
      relationDelete: async () => ({ ok: true }),
    };
  });

  it("should render empty state and create-node CTA when graph has no entities", () => {
    render(<KnowledgeGraphPanel projectId="project-empty" />);

    expect(
      screen.getByText("暂无实体，点击添加你的第一个角色或地点"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加节点" })).toBeInTheDocument();
  });
});

