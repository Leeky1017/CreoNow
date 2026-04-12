import type { TFunction } from "i18next";

import type { IpcError, IpcErrorCode } from "@shared/types/ipc-generated";

type ErrorMessageKey =
  | "errors.aiAuthFailed"
  | "errors.aiNotConfigured"
  | "errors.aiProviderUnavailable"
  | "errors.canceled"
  | "errors.capacityExceeded"
  | "errors.channelForbidden"
  | "errors.conflict"
  | "errors.constraintViolation"
  | "errors.db"
  | "errors.documentTooLarge"
  | "errors.forbidden"
  | "errors.generic"
  | "errors.internal"
  | "errors.invalidArgument"
  | "errors.io"
  | "errors.modelNotReady"
  | "errors.notFound"
  | "errors.payloadTooLarge"
  | "errors.permissionDenied"
  | "errors.rateLimited"
  | "errors.timeout"
  | "errors.unsupported"
  | "errors.upstream";

export const IPC_ERROR_MESSAGE_KEYS = {
  AI_AUTH_FAILED: "errors.aiAuthFailed",
  AI_NOT_CONFIGURED: "errors.aiNotConfigured",
  AI_PROVIDER_UNAVAILABLE: "errors.aiProviderUnavailable",
  AI_RATE_LIMITED: "errors.rateLimited",
  AI_SERVICE_ERROR: "errors.upstream",
  AI_SESSION_TOKEN_BUDGET_EXCEEDED: "errors.capacityExceeded",
  ALREADY_EXISTS: "errors.conflict",
  CANCELED: "errors.canceled",
  CONFLICT: "errors.conflict",
  CONSTRAINT_CONFLICT: "errors.constraintViolation",
  CONSTRAINT_NOT_FOUND: "errors.notFound",
  CONSTRAINT_VALIDATION_ERROR: "errors.invalidArgument",
  CONTEXT_BACKPRESSURE: "errors.capacityExceeded",
  CONTEXT_BUDGET_CONFLICT: "errors.conflict",
  CONTEXT_BUDGET_INVALID_MINIMUM: "errors.invalidArgument",
  CONTEXT_BUDGET_INVALID_RATIO: "errors.invalidArgument",
  CONTEXT_INPUT_TOO_LARGE: "errors.payloadTooLarge",
  CONTEXT_INSPECT_FORBIDDEN: "errors.forbidden",
  CONTEXT_SCOPE_VIOLATION: "errors.forbidden",
  CONTEXT_TOKENIZER_MISMATCH: "errors.internal",
  DB_ERROR: "errors.db",
  DOCUMENT_SAVE_CONFLICT: "errors.conflict",
  DOCUMENT_SIZE_EXCEEDED: "errors.documentTooLarge",
  EMBEDDING_PROVIDER_UNAVAILABLE: "errors.aiProviderUnavailable",
  ENCODING_FAILED: "errors.internal",
  FORBIDDEN: "errors.forbidden",
  INTERNAL: "errors.internal",
  INTERNAL_ERROR: "errors.internal",
  INVALID_ARGUMENT: "errors.invalidArgument",
  IO_ERROR: "errors.io",
  IPC_CHANNEL_FORBIDDEN: "errors.channelForbidden",
  IPC_PAYLOAD_TOO_LARGE: "errors.payloadTooLarge",
  IPC_SUBSCRIPTION_LIMIT_EXCEEDED: "errors.capacityExceeded",
  IPC_TIMEOUT: "errors.timeout",
  KG_ATTRIBUTE_KEYS_EXCEEDED: "errors.capacityExceeded",
  KG_CAPACITY_EXCEEDED: "errors.capacityExceeded",
  KG_ENTITY_CONFLICT: "errors.conflict",
  KG_ENTITY_DUPLICATE: "errors.conflict",
  KG_QUERY_TIMEOUT: "errors.timeout",
  KG_RECOGNITION_UNAVAILABLE: "errors.aiProviderUnavailable",
  KG_RELATION_INVALID: "errors.invalidArgument",
  KG_RELEVANT_QUERY_FAILED: "errors.upstream",
  KG_SCOPE_VIOLATION: "errors.forbidden",
  KG_SUBGRAPH_K_EXCEEDED: "errors.capacityExceeded",
  LLM_API_ERROR: "errors.upstream",
  MEMORY_BACKPRESSURE: "errors.capacityExceeded",
  MEMORY_CAPACITY_EXCEEDED: "errors.capacityExceeded",
  MEMORY_CLEAR_CONFIRM_REQUIRED: "errors.invalidArgument",
  MEMORY_CONFIDENCE_OUT_OF_RANGE: "errors.invalidArgument",
  MEMORY_DISTILL_LLM_UNAVAILABLE: "errors.aiProviderUnavailable",
  MEMORY_EPISODE_WRITE_FAILED: "errors.upstream",
  MEMORY_SCOPE_DENIED: "errors.permissionDenied",
  MEMORY_TRACE_MISMATCH: "errors.conflict",
  MODEL_NOT_READY: "errors.modelNotReady",
  NOT_FOUND: "errors.notFound",
  PERMISSION_DENIED: "errors.permissionDenied",
  PREFLIGHT_INVALID_API_KEY_FORMAT: "errors.invalidArgument",
  PREFLIGHT_MISSING_API_KEY: "errors.aiNotConfigured",
  PREFLIGHT_MISSING_MODEL: "errors.aiNotConfigured",
  PREFLIGHT_MODEL_PROVIDER_MISMATCH: "errors.invalidArgument",
  PROJECT_CAPACITY_EXCEEDED: "errors.capacityExceeded",
  PROJECT_DELETE_REQUIRES_ARCHIVE: "errors.conflict",
  PROJECT_IPC_SCHEMA_INVALID: "errors.internal",
  PROJECT_LIFECYCLE_WRITE_FAILED: "errors.upstream",
  PROJECT_METADATA_INVALID_ENUM: "errors.invalidArgument",
  PROJECT_PURGE_PERMISSION_DENIED: "errors.permissionDenied",
  PROJECT_SWITCH_TIMEOUT: "errors.timeout",
  RATE_LIMITED: "errors.rateLimited",
  SEARCH_BACKPRESSURE: "errors.capacityExceeded",
  SEARCH_CAPACITY_EXCEEDED: "errors.capacityExceeded",
  SEARCH_CONCURRENT_WRITE_CONFLICT: "errors.conflict",
  SEARCH_DATA_CORRUPTED: "errors.internal",
  SEARCH_PROJECT_FORBIDDEN: "errors.forbidden",
  SEARCH_REINDEX_IO_ERROR: "errors.io",
  SEARCH_TIMEOUT: "errors.timeout",
  SKILL_CAPACITY_EXCEEDED: "errors.capacityExceeded",
  SKILL_DEPENDENCY_MISSING: "errors.notFound",
  SKILL_INPUT_EMPTY: "errors.invalidArgument",
  SKILL_INPUT_INVALID: "errors.invalidArgument",
  SKILL_OUTPUT_INVALID: "errors.upstream",
  SKILL_QUEUE_OVERFLOW: "errors.capacityExceeded",
  SKILL_SCOPE_VIOLATION: "errors.forbidden",
  SKILL_TIMEOUT: "errors.timeout",
  TIMEOUT: "errors.timeout",
  UNSUPPORTED: "errors.unsupported",
  UPSTREAM_ERROR: "errors.upstream",
  VALIDATION_ERROR: "errors.invalidArgument",
  VERSION_DIFF_PAYLOAD_TOO_LARGE: "errors.payloadTooLarge",
  VERSION_MERGE_TIMEOUT: "errors.timeout",
  VERSION_ROLLBACK_CONFLICT: "errors.conflict",
  VERSION_SNAPSHOT_FAILED: "errors.upstream",
  VERSION_SNAPSHOT_COMPACTED: "errors.conflict",
  WRITE_BACK_FAILED: "errors.upstream",
  COST_BUDGET_EXCEEDED: "errors.upstream",
  COST_MODEL_NOT_FOUND: "errors.upstream",
  COST_PRICING_STALE: "errors.upstream",
  DIFF_COMPUTE_FAILED: "errors.upstream",
  DIFF_INPUT_TOO_LARGE: "errors.payloadTooLarge",
  CHARACTER_NAME_REQUIRED: "errors.invalidArgument",
  CHARACTER_NAME_DUPLICATE: "errors.conflict",
  CHARACTER_NOT_FOUND: "errors.notFound",
  CHARACTER_ATTR_KEY_TOO_LONG: "errors.invalidArgument",
  CHARACTER_ATTR_LIMIT_EXCEEDED: "errors.capacityExceeded",
  CHARACTER_CAPACITY_EXCEEDED: "errors.capacityExceeded",
  LOCATION_NAME_REQUIRED: "errors.invalidArgument",
  LOCATION_NAME_DUPLICATE: "errors.conflict",
  LOCATION_NOT_FOUND: "errors.notFound",
  LOCATION_ATTR_KEY_TOO_LONG: "errors.invalidArgument",
  LOCATION_ATTR_LIMIT_EXCEEDED: "errors.capacityExceeded",
  LOCATION_CAPACITY_EXCEEDED: "errors.capacityExceeded",
  PROJECT_NOT_FOUND: "errors.notFound",
  PROJECT_CONFIG_INVALID: "errors.invalidArgument",
  PROJECT_GENRE_REQUIRED: "errors.invalidArgument",
  MEMORY_KEY_REQUIRED: "errors.invalidArgument",
  MEMORY_KEY_TOO_LONG: "errors.invalidArgument",
  MEMORY_VALUE_TOO_LONG: "errors.invalidArgument",
  MEMORY_NOT_FOUND: "errors.notFound",
  MEMORY_SERVICE_UNAVAILABLE: "errors.internal",
  SKILL_PARSE_FAILED: "errors.invalidArgument",
  SEARCH_QUERY_EMPTY: "errors.invalidArgument",
  SEARCH_QUERY_TOO_LONG: "errors.invalidArgument",
  SEARCH_INDEX_NOT_FOUND: "errors.notFound",
  SEARCH_INDEX_CORRUPTED: "errors.internal",
  SEARCH_PROJECT_NOT_FOUND: "errors.notFound",
  EXPORT_FORMAT_UNSUPPORTED: "errors.unsupported",
  EXPORT_WRITE_ERROR: "errors.io",
  EXPORT_EMPTY_DOCUMENT: "errors.invalidArgument",
  EXPORT_DOCUMENT_NOT_FOUND: "errors.notFound",
  EXPORT_UNSUPPORTED_NODE: "errors.unsupported",
  EXPORT_SIZE_EXCEEDED: "errors.payloadTooLarge",
  EXPORT_INTERRUPTED: "errors.canceled",
} satisfies Record<IpcErrorCode, ErrorMessageKey>;

function getIpcErrorMessageKey(code: unknown): ErrorMessageKey {
  if (typeof code === "string" && code in IPC_ERROR_MESSAGE_KEYS) {
    return IPC_ERROR_MESSAGE_KEYS[code as IpcErrorCode];
  }

  return "errors.generic";
}

export function getHumanErrorMessage(error: IpcError | Error, t: TFunction): string {
  return t(getIpcErrorMessageKey((error as { code?: unknown }).code));
}
