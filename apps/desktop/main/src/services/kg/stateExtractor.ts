import type Database from "better-sqlite3";
import { z } from "zod";

import type { Logger } from "../../logging/logger";
import {
  createKnowledgeGraphService,
  type KnowledgeEntity,
  type KnowledgeGraphService,
} from "./kgService";

export type StateExtractorLlmErrorCode =
  | "TIMEOUT"
  | "LLM_API_ERROR"
  | "INVALID_ARGUMENT"
  | "INTERNAL";

export type StateExtractorLlmResult =
  | {
      ok: true;
      data: unknown;
    }
  | {
      ok: false;
      error: {
        code: StateExtractorLlmErrorCode;
        message: string;
        details?: unknown;
      };
    };

export type StateExtractorLlmClient = {
  extract: (args: {
    projectId: string;
    documentId: string;
    contentText: string;
    traceId: string;
  }) => Promise<StateExtractorLlmResult>;
};

export type StateExtractionOutcome = {
  status: "applied" | "degraded";
  updatedEntityIds: string[];
  unmatchedCharacters: string[];
  errorCode?:
    | "KG_STATE_EXTRACT_TIMEOUT"
    | "KG_STATE_EXTRACT_FAILED"
    | "KG_STATE_EXTRACT_INVALID_PAYLOAD"
    | "KG_STATE_ENTITY_LIST_FAILED"
    | "KG_STATE_EXTRACT_INTERNAL";
};

export type StateExtractor = {
  extractAndApply: (args: {
    projectId: string;
    documentId: string;
    contentText: string;
    traceId: string;
  }) => Promise<StateExtractionOutcome>;
};

const stateChangeSchema = z.object({
  characterName: z.string().trim().min(1),
  state: z.string().trim().min(1),
});

const stateExtractionSchema = z.object({
  stateChanges: z.array(stateChangeSchema),
});

function normalizeName(raw: string): string {
  return raw.trim().toLowerCase();
}

function normalizeState(raw: string): string {
  return raw.trim();
}

function buildEntityLookup(
  items: KnowledgeEntity[],
): Map<string, KnowledgeEntity> {
  const lookup = new Map<string, KnowledgeEntity>();
  for (const entity of items) {
    const names = [entity.name, ...entity.aliases];
    for (const candidate of names) {
      const normalized = normalizeName(candidate);
      if (normalized.length === 0) {
        continue;
      }
      if (!lookup.has(normalized)) {
        lookup.set(normalized, entity);
      }
    }
  }
  return lookup;
}

function createDefaultLlmClient(): StateExtractorLlmClient {
  return {
    extract: async ({ contentText }) => {
      if (process.env.CREONOW_KG_STATE_EXTRACT_FORCE_TIMEOUT === "1") {
        return {
          ok: false,
          error: {
            code: "TIMEOUT",
            message: "forced timeout",
          },
        };
      }

      if (process.env.CREONOW_KG_STATE_EXTRACT_FORCE_INVALID === "1") {
        return {
          ok: true,
          data: {
            stateChanges: [{ characterName: "", state: "" }],
          },
        };
      }

      const stateChanges: Array<{ characterName: string; state: string }> = [];
      const linePattern = /([^\n:：]{1,20})[:：]([^\n]{1,120})/gu;
      for (const match of contentText.matchAll(linePattern)) {
        const characterName = match[1]?.trim() ?? "";
        const state = match[2]?.trim() ?? "";
        if (characterName.length === 0 || state.length === 0) {
          continue;
        }
        stateChanges.push({ characterName, state });
      }

      return {
        ok: true,
        data: { stateChanges },
      };
    },
  };
}

function buildChapterExcerpt(contentText: string): string {
  return contentText.trim().slice(0, 120);
}

function createDegradedResult(
  errorCode: StateExtractionOutcome["errorCode"],
): StateExtractionOutcome {
  return {
    status: "degraded",
    updatedEntityIds: [],
    unmatchedCharacters: [],
    errorCode,
  };
}

export function createStateExtractor(args: {
  db?: Database.Database;
  logger: Logger;
  kgService?: KnowledgeGraphService;
  llmClient?: StateExtractorLlmClient;
}): StateExtractor {
  const kgService =
    args.kgService ??
    (args.db
      ? createKnowledgeGraphService({
          db: args.db,
          logger: args.logger,
        })
      : null);

  if (!kgService) {
    throw new Error("createStateExtractor requires db or kgService");
  }

  const llmClient = args.llmClient ?? createDefaultLlmClient();

  return {
    extractAndApply: async ({
      projectId,
      documentId,
      contentText,
      traceId,
    }) => {
      try {
        const llmRes = await llmClient.extract({
          projectId,
          documentId,
          contentText,
          traceId,
        });

        if (!llmRes.ok) {
          const errorCode =
            llmRes.error.code === "TIMEOUT"
              ? "KG_STATE_EXTRACT_TIMEOUT"
              : "KG_STATE_EXTRACT_FAILED";
          args.logger.error("kg_state_extraction_failed", {
            error_code: errorCode,
            source_code: llmRes.error.code,
            message: llmRes.error.message,
            project_id: projectId,
            document_id: documentId,
            trace_id: traceId,
          });
          return createDegradedResult(errorCode);
        }

        const parsed = stateExtractionSchema.safeParse(llmRes.data);
        if (!parsed.success) {
          args.logger.error("kg_state_extraction_schema_invalid", {
            error_code: "KG_STATE_EXTRACT_INVALID_PAYLOAD",
            project_id: projectId,
            document_id: documentId,
            trace_id: traceId,
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          });
          return createDegradedResult("KG_STATE_EXTRACT_INVALID_PAYLOAD");
        }

        const listed = kgService.entityList({ projectId });
        if (!listed.ok) {
          args.logger.error("kg_state_extraction_entity_list_failed", {
            error_code: "KG_STATE_ENTITY_LIST_FAILED",
            source_code: listed.error.code,
            message: listed.error.message,
            project_id: projectId,
            document_id: documentId,
            trace_id: traceId,
          });
          return createDegradedResult("KG_STATE_ENTITY_LIST_FAILED");
        }

        const entityLookup = buildEntityLookup(listed.data.items);
        const unmatchedCharacters: string[] = [];
        const chapterExcerpt = buildChapterExcerpt(contentText);
        const updates = new Map<
          string,
          { entity: KnowledgeEntity; state: string }
        >();

        for (const change of parsed.data.stateChanges) {
          const normalizedName = normalizeName(change.characterName);
          const matched = entityLookup.get(normalizedName);
          if (!matched) {
            if (!unmatchedCharacters.includes(change.characterName)) {
              unmatchedCharacters.push(change.characterName);
            }
            args.logger.info("kg_state_extraction_entity_unmatched", {
              code: "KG_STATE_ENTITY_UNMATCHED",
              character_name: change.characterName,
              project_id: projectId,
              document_id: documentId,
              trace_id: traceId,
              chapter_excerpt: chapterExcerpt,
            });
            continue;
          }

          updates.set(matched.id, {
            entity: matched,
            state: normalizeState(change.state),
          });
        }

        const updatedEntityIds: string[] = [];
        for (const [entityId, update] of updates) {
          const updated = kgService.entityUpdate({
            projectId,
            id: entityId,
            expectedVersion: update.entity.version,
            patch: {
              lastSeenState: update.state,
            },
          });

          if (!updated.ok) {
            args.logger.error("kg_state_extraction_entity_update_failed", {
              code: "KG_STATE_ENTITY_UPDATE_FAILED",
              source_code: updated.error.code,
              message: updated.error.message,
              entity_id: entityId,
              project_id: projectId,
              document_id: documentId,
              trace_id: traceId,
            });
            continue;
          }

          updatedEntityIds.push(entityId);
        }

        return {
          status: "applied",
          updatedEntityIds,
          unmatchedCharacters,
        };
      } catch (error) {
        args.logger.error("kg_state_extraction_internal_error", {
          error_code: "KG_STATE_EXTRACT_INTERNAL",
          message: error instanceof Error ? error.message : String(error),
          project_id: projectId,
          document_id: documentId,
          trace_id: traceId,
        });

        return createDegradedResult("KG_STATE_EXTRACT_INTERNAL");
      }
    },
  };
}

export async function runStateExtractionForChapterCompletion(args: {
  db: Database.Database;
  logger: Logger;
  stateExtractor: StateExtractor | null;
  projectId: string;
  documentId: string;
  status: "draft" | "final";
  traceId: string;
}): Promise<StateExtractionOutcome | null> {
  if (!args.stateExtractor) {
    return null;
  }

  if (args.status !== "final") {
    return null;
  }

  type DocumentRow = {
    type: string;
    contentText: string;
  };

  const row = args.db
    .prepare<
      [string, string],
      DocumentRow
    >("SELECT type, content_text as contentText FROM documents WHERE project_id = ? AND document_id = ?")
    .get(args.projectId, args.documentId);

  if (!row || row.type !== "chapter" || row.contentText.trim().length === 0) {
    return null;
  }

  const result = await args.stateExtractor.extractAndApply({
    projectId: args.projectId,
    documentId: args.documentId,
    contentText: row.contentText,
    traceId: args.traceId,
  });

  if (result.status === "degraded") {
    args.logger.error("kg_state_extraction_degraded", {
      error_code: result.errorCode,
      project_id: args.projectId,
      document_id: args.documentId,
      trace_id: args.traceId,
    });
  }

  return result;
}
