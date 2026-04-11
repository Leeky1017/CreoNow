/**
 * @module kgMutationSkill
 * ## Responsibility: INV-6 compliant gateway for all KG write operations.
 * ## Does NOT: call LLM, stream tokens, touch documents, or handle read queries.
 * ## Dependency direction: Service Layer (KG) → Shared types. No reverse deps.
 * ## Key invariant: INV-6 — every KG write from IPC passes through this skill.
 *
 * Pipeline stages (simplified from the 9-stage writing pipeline, because
 * KG mutations are pure data ops with no LLM involvement):
 *   1. Validate — check mutation type + payload shape
 *   2. Permission — currently auto-allow (SKILL.md permissionLevel: auto-allow);
 *      future: honour dynamic Permission Gate when INV-1 runtime reads frontmatter
 *   3. Execute — delegate to KnowledgeGraphService write methods
 *   4. Return — unified ServiceResult envelope
 */

import type { KnowledgeGraphService } from "../kg/types";
import type { ServiceResult } from "../shared/ipcResult";
import { ipcError } from "../shared/ipcResult";

// ── Mutation types ────────────────────────────────────────────────

export const KG_MUTATION_TYPES = [
  "entity:create",
  "entity:update",
  "entity:delete",
  "relation:create",
  "relation:update",
  "relation:delete",
] as const;

export type KgMutationType = (typeof KG_MUTATION_TYPES)[number];

export type KgMutationRequest<T = unknown> = {
  mutationType: KgMutationType;
  projectId: string;
  payload: T;
};

// ── Skill interface ───────────────────────────────────────────────

export type KgMutationSkill = {
  readonly skillId: "builtin:kg-mutate";

  /**
   * Execute a KG mutation through the INV-6 pipeline.
   *
   * @why Single entry-point ensures all KG writes are auditable and
   * will automatically gain Permission Gate enforcement when INV-1
   * runtime starts reading SKILL.md `permissionLevel`.
   */
  execute: <T>(request: KgMutationRequest) => ServiceResult<T>;
};

// ── Validation ────────────────────────────────────────────────────

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Stage 1: validate mutation type and payload shape.
 *
 * @risk Returning a generic error for invalid payloads makes debugging
 * harder, but we intentionally keep validation lean — upstream IPC
 * handlers already have stricter typing. This is a safety net, not
 * the primary validation layer.
 */
function validateMutation(
  request: KgMutationRequest,
): ServiceResult<{ valid: true }> {
  if (!(KG_MUTATION_TYPES as readonly string[]).includes(request.mutationType)) {
    return ipcError(
      "INVALID_ARGUMENT",
      `Unknown mutation type: ${request.mutationType}`,
    );
  }

  if (!isNonEmptyString(request.projectId)) {
    return ipcError("INVALID_ARGUMENT", "projectId is required");
  }

  const p = request.payload;
  if (!isObject(p)) {
    return ipcError("INVALID_ARGUMENT", "payload must be an object");
  }

  switch (request.mutationType) {
    case "entity:create":
      if (!isNonEmptyString(p["type"]) || !isNonEmptyString(p["name"])) {
        return ipcError(
          "INVALID_ARGUMENT",
          "entity:create requires type and name",
        );
      }
      break;
    case "entity:update":
      if (!isNonEmptyString(p["id"]) || typeof p["expectedVersion"] !== "number") {
        return ipcError(
          "INVALID_ARGUMENT",
          "entity:update requires id and expectedVersion",
        );
      }
      break;
    case "entity:delete":
      if (!isNonEmptyString(p["id"])) {
        return ipcError("INVALID_ARGUMENT", "entity:delete requires id");
      }
      break;
    case "relation:create":
      if (
        !isNonEmptyString(p["sourceEntityId"]) ||
        !isNonEmptyString(p["targetEntityId"]) ||
        !isNonEmptyString(p["relationType"])
      ) {
        return ipcError(
          "INVALID_ARGUMENT",
          "relation:create requires sourceEntityId, targetEntityId, relationType",
        );
      }
      break;
    case "relation:update":
      if (!isNonEmptyString(p["id"])) {
        return ipcError("INVALID_ARGUMENT", "relation:update requires id");
      }
      break;
    case "relation:delete":
      if (!isNonEmptyString(p["id"])) {
        return ipcError("INVALID_ARGUMENT", "relation:delete requires id");
      }
      break;
  }

  return { ok: true, data: { valid: true } };
}

// ── Factory ───────────────────────────────────────────────────────

export function createKgMutationSkill(deps: {
  kgService: KnowledgeGraphService;
}): KgMutationSkill {
  const { kgService } = deps;

  function execute<T>(request: KgMutationRequest): ServiceResult<T> {
    // Stage 1: Validate
    const validation = validateMutation(request);
    if (!validation.ok) {
      return validation as ServiceResult<T>;
    }

    // Stage 2: Permission (currently auto-allow per SKILL.md frontmatter)
    // @invariant INV-6 — when INV-1 runtime reads permissionLevel from
    //   SKILL.md, a Permission Gate check will be inserted here.

    // Stage 3: Execute — delegate to KG Service
    const payload = request.payload as Record<string, unknown>;
    const fullPayload = { ...payload, projectId: request.projectId };

    switch (request.mutationType) {
      case "entity:create":
        return kgService.entityCreate(
          fullPayload as Parameters<typeof kgService.entityCreate>[0],
        ) as ServiceResult<T>;
      case "entity:update":
        return kgService.entityUpdate(
          fullPayload as Parameters<typeof kgService.entityUpdate>[0],
        ) as ServiceResult<T>;
      case "entity:delete":
        return kgService.entityDelete(
          fullPayload as Parameters<typeof kgService.entityDelete>[0],
        ) as ServiceResult<T>;
      case "relation:create":
        return kgService.relationCreate(
          fullPayload as Parameters<typeof kgService.relationCreate>[0],
        ) as ServiceResult<T>;
      case "relation:update":
        return kgService.relationUpdate(
          fullPayload as Parameters<typeof kgService.relationUpdate>[0],
        ) as ServiceResult<T>;
      case "relation:delete":
        return kgService.relationDelete(
          fullPayload as Parameters<typeof kgService.relationDelete>[0],
        ) as ServiceResult<T>;
      default: {
        // Exhaustive check — should never reach here after validation
        const _exhaustive: never = request.mutationType;
        return ipcError(
          "INTERNAL_ERROR",
          `Unhandled mutation type: ${_exhaustive}`,
        ) as ServiceResult<T>;
      }
    }
  }

  return {
    skillId: "builtin:kg-mutate",
    execute,
  };
}
