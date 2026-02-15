import type { Logger } from "../../../logging/logger";
import type { SynopsisItem, SynopsisStore } from "../synopsisStore";
import type { ContextLayerFetcher } from "../types";

const SYNOPSIS_UNAVAILABLE_WARNING =
  "SYNOPSIS_UNAVAILABLE: synopsis data not injected";
const DEFAULT_SYNOPSIS_CHAPTER_LIMIT = 3;

export type SynopsisFetcherDeps = {
  synopsisStore: Pick<SynopsisStore, "listRecentByProject">;
  logger?: Pick<Logger, "error">;
  chapterLimit?: number;
};

function shouldInjectSynopsis(skillId: string): boolean {
  const normalized = skillId.trim().toLowerCase();
  return normalized.includes("continue");
}

function compareByChapterOrder(
  left: SynopsisItem,
  right: SynopsisItem,
): number {
  if (left.chapterOrder !== right.chapterOrder) {
    return left.chapterOrder - right.chapterOrder;
  }
  if (left.updatedAt !== right.updatedAt) {
    return left.updatedAt - right.updatedAt;
  }
  return left.synopsisId.localeCompare(right.synopsisId);
}

/**
 * Why: synopsis chunks must have a stable and auditable rendering so layer
 * assembly remains deterministic.
 */
function toSynopsisChunk(item: SynopsisItem): {
  source: string;
  projectId: string;
  content: string;
} {
  return {
    source: `synopsis:chapter:${item.chapterOrder.toString()}:${item.documentId}`,
    projectId: item.projectId,
    content: `[章节摘要 #${item.chapterOrder.toString()}]\n${item.synopsisText}`,
  };
}

export function createSynopsisFetcher(
  deps: SynopsisFetcherDeps,
): ContextLayerFetcher {
  const chapterLimit = deps.chapterLimit ?? DEFAULT_SYNOPSIS_CHAPTER_LIMIT;

  return async (request) => {
    if (!shouldInjectSynopsis(request.skillId)) {
      return {
        chunks: [],
      };
    }

    const listed = deps.synopsisStore.listRecentByProject({
      projectId: request.projectId,
      excludeDocumentId: request.documentId,
      limit: chapterLimit,
    });

    if (!listed.ok) {
      deps.logger?.error("synopsis_fetcher_list_failed", {
        projectId: request.projectId,
        documentId: request.documentId,
        errorCode: listed.error.code,
        errorMessage: listed.error.message,
      });
      return {
        chunks: [],
        warnings: [SYNOPSIS_UNAVAILABLE_WARNING],
      };
    }

    if (listed.data.items.length === 0) {
      return {
        chunks: [],
      };
    }

    const ordered = [...listed.data.items].sort(compareByChapterOrder);

    return {
      chunks: ordered.map(toSynopsisChunk),
    };
  };
}
