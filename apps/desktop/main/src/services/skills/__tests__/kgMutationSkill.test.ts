/**
 * Tests for builtin:kg-mutate Skill (INV-6 gateway for KG write operations).
 *
 * Strategy:
 *   - Verify the 3-stage pipeline: validate → permission (auto-allow) → execute
 *   - Verify delegation to correct KnowledgeGraphService method for each mutation type
 *   - Verify validation errors bubble up before touching the service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createKgMutationSkill,
  KG_MUTATION_TYPES,
  type KgMutationRequest,
} from "../kgMutationSkill";
import type { KnowledgeGraphService } from "../../kg/types";

// ── Mock KG service ───────────────────────────────────────────────

function makeMockKgService(): KnowledgeGraphService {
  return {
    entityCreate: vi.fn().mockReturnValue({
      ok: true,
      data: { id: "ent-1", projectId: "p1", type: "character", name: "Alice" },
    }),
    entityRead: vi.fn().mockReturnValue({
      ok: true,
      data: { id: "ent-1", projectId: "p1", type: "character", name: "Alice" },
    }),
    entityList: vi.fn().mockReturnValue({
      ok: true,
      data: { items: [], totalCount: 0 },
    }),
    entityUpdate: vi.fn().mockReturnValue({
      ok: true,
      data: {
        id: "ent-1",
        projectId: "p1",
        type: "character",
        name: "Alice-updated",
      },
    }),
    entityDelete: vi.fn().mockReturnValue({
      ok: true,
      data: { deleted: true, deletedRelationCount: 0 },
    }),
    relationCreate: vi.fn().mockReturnValue({
      ok: true,
      data: {
        id: "rel-1",
        projectId: "p1",
        sourceEntityId: "e1",
        targetEntityId: "e2",
        relationType: "knows",
      },
    }),
    relationList: vi.fn().mockReturnValue({
      ok: true,
      data: { items: [], totalCount: 0 },
    }),
    relationUpdate: vi.fn().mockReturnValue({
      ok: true,
      data: { id: "rel-1", relationType: "loves" },
    }),
    relationDelete: vi.fn().mockReturnValue({
      ok: true,
      data: { deleted: true },
    }),
    querySubgraph: vi.fn(),
    queryPath: vi.fn(),
    queryValidate: vi.fn(),
    queryRelevant: vi.fn(),
    queryByIds: vi.fn(),
    buildRulesInjection: vi.fn(),
  } as unknown as KnowledgeGraphService;
}

// ── Helpers ───────────────────────────────────────────────────────

function makeReq<T>(
  mutationType: KgMutationRequest["mutationType"],
  payload: T,
): KgMutationRequest<T> {
  return { mutationType, projectId: "proj-1", payload };
}

// ── Tests ─────────────────────────────────────────────────────────

describe("kgMutationSkill", () => {
  let kgService: KnowledgeGraphService;
  let skill: ReturnType<typeof createKgMutationSkill>;

  beforeEach(() => {
    vi.clearAllMocks();
    kgService = makeMockKgService();
    skill = createKgMutationSkill({ kgService });
  });

  // ── Identity ──

  it("has skillId builtin:kg-mutate", () => {
    expect(skill.skillId).toBe("builtin:kg-mutate");
  });

  // ── Validation: unknown mutation type ──

  it("returns INVALID_ARGUMENT for unknown mutation type", () => {
    const req = {
      mutationType: "entity:explode" as KgMutationRequest["mutationType"],
      projectId: "p1",
      payload: {},
    };
    const result = skill.execute(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
      expect(result.error.message).toContain("Unknown mutation type");
    }
  });

  // ── Validation: missing/empty projectId ──

  it("returns INVALID_ARGUMENT when projectId is empty", () => {
    const req: KgMutationRequest = {
      mutationType: "entity:create",
      projectId: "",
      payload: { type: "character", name: "Bob" },
    };
    const result = skill.execute(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  // ── Validation: payload must be an object ──

  it("returns INVALID_ARGUMENT when payload is not an object", () => {
    const req = {
      mutationType: "entity:create" as const,
      projectId: "p1",
      payload: "not-an-object",
    };
    const result = skill.execute(req as unknown as KgMutationRequest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  // ── entity:create ──

  describe("entity:create", () => {
    it("delegates to kgService.entityCreate and returns data", () => {
      const result = skill.execute(
        makeReq("entity:create", { type: "character", name: "Alice" }),
      );
      expect(result.ok).toBe(true);
      expect(kgService.entityCreate).toHaveBeenCalledOnce();
      expect(kgService.entityCreate).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "proj-1", type: "character", name: "Alice" }),
      );
    });

    it("validation: requires type", () => {
      const result = skill.execute(
        makeReq("entity:create", { name: "Alice" }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.entityCreate).not.toHaveBeenCalled();
      }
    });

    it("validation: requires name", () => {
      const result = skill.execute(
        makeReq("entity:create", { type: "character" }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.entityCreate).not.toHaveBeenCalled();
      }
    });

    it("propagates service error", () => {
      vi.mocked(kgService.entityCreate).mockReturnValueOnce({
        ok: false,
        error: { code: "DB_ERROR", message: "sqlite error" },
      });
      const result = skill.execute(
        makeReq("entity:create", { type: "character", name: "Alice" }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DB_ERROR");
      }
    });

    it("rethrows service exception (no silent catch)", () => {
      vi.mocked(kgService.entityCreate).mockImplementationOnce(() => {
        throw new Error("db exploded");
      });

      expect(() =>
        skill.execute(
          makeReq("entity:create", { type: "character", name: "Alice" }),
        ),
      ).toThrow("db exploded");
    });

    it("rejects 'inspiration' type — managed by quickCaptureService", () => {
      const result = skill.execute(
        makeReq("entity:create", { type: "inspiration", name: "Plot Twist" }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("dedicated service");
      }
      expect(kgService.entityCreate).not.toHaveBeenCalled();
    });

    it("rejects 'foreshadowing' type — managed by foreshadowingTracker", () => {
      const result = skill.execute(
        makeReq("entity:create", {
          type: "foreshadowing",
          name: "Dark Omen",
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("dedicated service");
      }
      expect(kgService.entityCreate).not.toHaveBeenCalled();
    });
  });

  // ── entity:update ──

  describe("entity:update", () => {
    it("delegates to kgService.entityUpdate", () => {
      const result = skill.execute(
        makeReq("entity:update", { id: "ent-1", expectedVersion: 1, patch: {} }),
      );
      expect(result.ok).toBe(true);
      expect(kgService.entityUpdate).toHaveBeenCalledOnce();
    });

    it("validation: requires id", () => {
      const result = skill.execute(
        makeReq("entity:update", { expectedVersion: 1, patch: {} }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.entityUpdate).not.toHaveBeenCalled();
      }
    });

    it("validation: requires expectedVersion as number", () => {
      const result = skill.execute(
        makeReq("entity:update", { id: "e1", expectedVersion: "one", patch: {} }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.entityUpdate).not.toHaveBeenCalled();
      }
    });

    it("rejects patch.type = 'inspiration' — dedicated-service only", () => {
      const result = skill.execute(
        makeReq("entity:update", {
          id: "e1",
          expectedVersion: 1,
          patch: { type: "inspiration" },
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("dedicated service");
      }
      expect(kgService.entityUpdate).not.toHaveBeenCalled();
    });

    it("rejects patch.type = 'foreshadowing' — dedicated-service only", () => {
      const result = skill.execute(
        makeReq("entity:update", {
          id: "e1",
          expectedVersion: 1,
          patch: { type: "foreshadowing" },
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("dedicated service");
      }
      expect(kgService.entityUpdate).not.toHaveBeenCalled();
    });

    it("allows patch.type = 'character' (not a dedicated type)", () => {
      const result = skill.execute(
        makeReq("entity:update", {
          id: "e1",
          expectedVersion: 1,
          patch: { type: "character" },
        }),
      );
      expect(result.ok).toBe(true);
      expect(kgService.entityUpdate).toHaveBeenCalledOnce();
    });

    it("rejects update of existing inspiration entity (runtime type guard)", () => {
      vi.mocked(kgService.entityRead).mockReturnValueOnce({
        ok: true,
        data: {
          id: "e1",
          projectId: "p1",
          type: "inspiration",
          name: "Quick idea",
          description: "",
          attributes: {},
          aiContextLevel: "when_detected",
          aliases: [],
          version: 1,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
      });
      const result = skill.execute(
        makeReq("entity:update", {
          id: "e1",
          expectedVersion: 1,
          patch: { name: "Updated name" },
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("dedicated service");
      }
      expect(kgService.entityUpdate).not.toHaveBeenCalled();
    });

    it("rejects update of existing foreshadowing entity (runtime type guard)", () => {
      vi.mocked(kgService.entityRead).mockReturnValueOnce({
        ok: true,
        data: {
          id: "e2",
          projectId: "p1",
          type: "foreshadowing",
          name: "Chekhov's gun",
          description: "",
          attributes: {},
          aiContextLevel: "when_detected",
          aliases: [],
          version: 1,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
      });
      const result = skill.execute(
        makeReq("entity:update", {
          id: "e2",
          expectedVersion: 1,
          patch: { attributes: { resolved: "true" } },
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("dedicated service");
      }
      expect(kgService.entityUpdate).not.toHaveBeenCalled();
    });

    it("allows update of existing character entity (runtime type guard passes)", () => {
      // Default mock returns type: 'character' — should pass through
      const result = skill.execute(
        makeReq("entity:update", {
          id: "e1",
          expectedVersion: 1,
          patch: { name: "Bob" },
        }),
      );
      expect(result.ok).toBe(true);
      expect(kgService.entityRead).toHaveBeenCalledOnce();
      expect(kgService.entityUpdate).toHaveBeenCalledOnce();
    });

    it("fail-closed: entityRead DB_ERROR propagates, entityUpdate not called", () => {
      vi.mocked(kgService.entityRead).mockReturnValueOnce({
        ok: false,
        error: { code: "DB_ERROR", message: "disk I/O error" },
      });
      const result = skill.execute(
        makeReq("entity:update", {
          id: "e1",
          expectedVersion: 1,
          patch: { name: "Updated" },
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DB_ERROR");
      }
      expect(kgService.entityUpdate).not.toHaveBeenCalled();
    });

    it("fail-closed: entityRead NOT_FOUND propagates, entityUpdate not called", () => {
      vi.mocked(kgService.entityRead).mockReturnValueOnce({
        ok: false,
        error: { code: "NOT_FOUND", message: "Entity not found" },
      });
      const result = skill.execute(
        makeReq("entity:update", {
          id: "nonexistent",
          expectedVersion: 1,
          patch: { name: "Updated" },
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
      expect(kgService.entityUpdate).not.toHaveBeenCalled();
    });
  });

  // ── entity:delete ──

  describe("entity:delete", () => {
    it("delegates to kgService.entityDelete", () => {
      const result = skill.execute(makeReq("entity:delete", { id: "ent-1" }));
      expect(result.ok).toBe(true);
      expect(kgService.entityDelete).toHaveBeenCalledOnce();
    });

    it("validation: requires id", () => {
      const result = skill.execute(makeReq("entity:delete", {}));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.entityDelete).not.toHaveBeenCalled();
      }
    });
  });

  // ── relation:create ──

  describe("relation:create", () => {
    it("delegates to kgService.relationCreate", () => {
      const result = skill.execute(
        makeReq("relation:create", {
          sourceEntityId: "e1",
          targetEntityId: "e2",
          relationType: "ally",
        }),
      );
      expect(result.ok).toBe(true);
      expect(kgService.relationCreate).toHaveBeenCalledOnce();
      expect(kgService.relationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "proj-1",
          sourceEntityId: "e1",
          targetEntityId: "e2",
          relationType: "ally",
        }),
      );
    });

    it("validation: requires sourceEntityId", () => {
      const result = skill.execute(
        makeReq("relation:create", {
          targetEntityId: "e2",
          relationType: "ally",
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.relationCreate).not.toHaveBeenCalled();
      }
    });

    it("validation: requires targetEntityId", () => {
      const result = skill.execute(
        makeReq("relation:create", {
          sourceEntityId: "e1",
          relationType: "ally",
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.relationCreate).not.toHaveBeenCalled();
      }
    });

    it("validation: requires relationType", () => {
      const result = skill.execute(
        makeReq("relation:create", {
          sourceEntityId: "e1",
          targetEntityId: "e2",
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.relationCreate).not.toHaveBeenCalled();
      }
    });
  });

  // ── relation:update ──

  describe("relation:update", () => {
    it("delegates to kgService.relationUpdate", () => {
      const result = skill.execute(
        makeReq("relation:update", { id: "rel-1", patch: { relationType: "enemy" } }),
      );
      expect(result.ok).toBe(true);
      expect(kgService.relationUpdate).toHaveBeenCalledOnce();
    });

    it("validation: requires id", () => {
      const result = skill.execute(
        makeReq("relation:update", { patch: { relationType: "enemy" } }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.relationUpdate).not.toHaveBeenCalled();
      }
    });
  });

  // ── relation:delete ──

  describe("relation:delete", () => {
    it("delegates to kgService.relationDelete", () => {
      const result = skill.execute(makeReq("relation:delete", { id: "rel-1" }));
      expect(result.ok).toBe(true);
      expect(kgService.relationDelete).toHaveBeenCalledOnce();
    });

    it("validation: requires id", () => {
      const result = skill.execute(makeReq("relation:delete", {}));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(kgService.relationDelete).not.toHaveBeenCalled();
      }
    });
  });

  // ── Read methods NOT delegated ──

  it("does NOT call any read methods (querySubgraph, queryPath, etc.)", () => {
    // Execute all write mutation types to verify no read methods are touched
    skill.execute(makeReq("entity:create", { type: "character", name: "X" }));
    expect(kgService.querySubgraph).not.toHaveBeenCalled();
    expect(kgService.queryPath).not.toHaveBeenCalled();
    expect(kgService.queryValidate).not.toHaveBeenCalled();
    expect(kgService.queryRelevant).not.toHaveBeenCalled();
    expect(kgService.queryByIds).not.toHaveBeenCalled();
    expect(kgService.buildRulesInjection).not.toHaveBeenCalled();
  });

  // ── KG_MUTATION_TYPES constant ──

  it("exports KG_MUTATION_TYPES covering all write ops", () => {
    expect(KG_MUTATION_TYPES).toContain("entity:create");
    expect(KG_MUTATION_TYPES).toContain("entity:update");
    expect(KG_MUTATION_TYPES).toContain("entity:delete");
    expect(KG_MUTATION_TYPES).toContain("relation:create");
    expect(KG_MUTATION_TYPES).toContain("relation:update");
    expect(KG_MUTATION_TYPES).toContain("relation:delete");
    expect(KG_MUTATION_TYPES).toHaveLength(6);
  });
});
