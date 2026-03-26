import type { IpcError } from "./ipc-generated";

export const KG_SUGGESTION_CHANNEL = "knowledge:suggestion:new" as const;

export type KgSuggestionEntityType =
  | "character"
  | "location"
  | "event"
  | "item"
  | "faction";

export type KgSuggestionEvent = {
  taskId: string;
  suggestionId: string;
  projectId: string;
  documentId: string;
  sessionId: string;
  name: string;
  type: KgSuggestionEntityType;
  traceId: string;
  createdAt: string;
};

export type KgRulesInjectionEntity = {
  id: string;
  name: string;
  type: KgSuggestionEntityType;
  attributes: Record<string, string>;
  relationsSummary: string[];
};

export type KgRulesInjectionSuccess = {
  ok: true;
  data: {
    injectedEntities: KgRulesInjectionEntity[];
    source: "kg-rules-mock";
  };
};

export type KgRulesInjectionFailure = {
  ok: false;
  error: IpcError & { traceId: string };
};

export type KgRulesInjectionResult =
  | KgRulesInjectionSuccess
  | KgRulesInjectionFailure;
