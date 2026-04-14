import type { ServiceResult } from "../services/shared/ipcResult";
import { ipcError } from "../services/shared/ipcResult";
import type {
  KgMutationRequest,
  KgMutationSkill,
  KgMutationType,
} from "../services/skills/kgMutationSkill";

export type KgWriteOperation =
  | "createEntity"
  | "updateEntity"
  | "deleteEntity"
  | "createRelation"
  | "updateRelation"
  | "deleteRelation"
  | KgMutationType;

export type KgWriteExecuteRequest<TPayload = unknown> = {
  skill: "kg.write" | "builtin:kg-mutate";
  input: {
    operation: KgWriteOperation;
    projectId: string;
    payload: TPayload;
  };
};

export type KgWriteOrchestrator = {
  execute: <TResult, TPayload = unknown>(
    request: KgWriteExecuteRequest<TPayload>,
  ) => ServiceResult<TResult>;
};

function toMutationType(operation: KgWriteOperation): KgMutationType | null {
  switch (operation) {
    case "createEntity":
      return "entity:create";
    case "updateEntity":
      return "entity:update";
    case "deleteEntity":
      return "entity:delete";
    case "createRelation":
      return "relation:create";
    case "updateRelation":
      return "relation:update";
    case "deleteRelation":
      return "relation:delete";
    case "entity:create":
    case "entity:update":
    case "entity:delete":
    case "relation:create":
    case "relation:update":
    case "relation:delete":
      return operation;
    default:
      return null;
  }
}

export function createKgWriteOrchestrator(deps: {
  kgMutationSkill: Pick<KgMutationSkill, "execute">;
}): KgWriteOrchestrator {
  return {
    execute<TResult, TPayload = unknown>(
      request: KgWriteExecuteRequest<TPayload>,
    ): ServiceResult<TResult> {
      if (request.skill !== "kg.write" && request.skill !== "builtin:kg-mutate") {
        return ipcError(
          "INVALID_ARGUMENT",
          `Unknown skill: ${request.skill}`,
        ) as ServiceResult<TResult>;
      }

      const mutationType = toMutationType(request.input.operation);
      if (!mutationType) {
        return ipcError(
          "INVALID_ARGUMENT",
          `Unknown KG write operation: ${request.input.operation}`,
        ) as ServiceResult<TResult>;
      }

      const mutationRequest: KgMutationRequest<TPayload> = {
        mutationType,
        projectId: request.input.projectId,
        payload: request.input.payload,
      };

      return deps.kgMutationSkill.execute<TResult>(
        mutationRequest,
      ) as ServiceResult<TResult>;
    },
  };
}
