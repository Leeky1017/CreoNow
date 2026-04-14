import { describe, expect, it, vi } from "vitest";

import { createKgWriteOrchestrator } from "../kgWriteOrchestrator";

describe("kgWriteOrchestrator", () => {
  it("routes createEntity to entity:create mutation", () => {
    const executeSpy = vi.fn().mockReturnValue({ ok: true, data: { id: "ent-1" } });
    const orchestrator = createKgWriteOrchestrator({
      kgMutationSkill: { execute: executeSpy },
    });

    const result = orchestrator.execute({
      skill: "kg.write",
      input: {
        operation: "createEntity",
        projectId: "proj-1",
        payload: { type: "character", name: "Alice" },
      },
    });

    expect(result.ok).toBe(true);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationType: "entity:create",
        projectId: "proj-1",
      }),
    );
  });

  it("passes through canonical mutation operation", () => {
    const executeSpy = vi.fn().mockReturnValue({ ok: true, data: { deleted: true } });
    const orchestrator = createKgWriteOrchestrator({
      kgMutationSkill: { execute: executeSpy },
    });

    const result = orchestrator.execute({
      skill: "kg.write",
      input: {
        operation: "relation:delete",
        projectId: "proj-1",
        payload: { id: "rel-1" },
      },
    });

    expect(result.ok).toBe(true);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationType: "relation:delete",
      }),
    );
  });

  it("returns INVALID_ARGUMENT for unknown skill id", () => {
    const executeSpy = vi.fn();
    const orchestrator = createKgWriteOrchestrator({
      kgMutationSkill: { execute: executeSpy },
    });

    const result = orchestrator.execute({
      skill: "builtin:unknown" as "kg.write",
      input: {
        operation: "entity:create",
        projectId: "proj-1",
        payload: {},
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    }
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it("returns INVALID_ARGUMENT for unknown operation", () => {
    const executeSpy = vi.fn();
    const orchestrator = createKgWriteOrchestrator({
      kgMutationSkill: { execute: executeSpy },
    });

    const result = orchestrator.execute({
      skill: "kg.write",
      input: {
        operation: "deleteEverything" as "entity:create",
        projectId: "proj-1",
        payload: {},
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    }
    expect(executeSpy).not.toHaveBeenCalled();
  });
});
