/**
 * ProjectSearch — in-memory seam mirroring the runtime `search:fts:*` contract.
 * Spec: openspec/specs/search-and-retrieval/spec.md — P3
 */

import {
  ensureProjectScopedRows,
  isFtsCorruptionError,
  isFtsSyntaxError,
  normalizeFtsLimit,
  normalizeFtsOffset,
  normalizeFtsProjectId,
  normalizeFtsQuery,
} from "./ftsService";

export interface SearchHighlightRange {
  start: number;
  end: number;
}

export interface SearchAnchor {
  start: number;
  end: number;
}

export interface ProjectSearchResult {
  projectId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  snippet: string;
  highlights: SearchHighlightRange[];
  anchor: SearchAnchor;
  documentOffset: number;
}

export interface ProjectSearchResponse {
  results: ProjectSearchResult[];
  total: number;
  hasMore: boolean;
  indexState: "ready" | "rebuilding";
}

export interface ProjectSearchRequest {
  projectId: string;
  query: string;
  offset?: number;
  limit?: number;
}

interface ProseMirrorNode {
  type: string;
  text?: string;
  content?: ProseMirrorNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

interface IndexDocumentRequest {
  projectId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  content: ProseMirrorNode;
}

interface TextDiff {
  type: "added" | "removed" | "modified";
  documentOffset: number;
  text: string;
}

type ProjectSearchError = {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
};

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ProjectSearchError };

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

function err(
  code: string,
  message: string,
  details?: unknown,
  options?: { retryable?: boolean },
): Result<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
      ...(options?.retryable === undefined
        ? {}
        : { retryable: options.retryable }),
    },
  };
}

export interface ProjectSearch {
  createIndex(projectId: string): Promise<Result>;
  rebuildIndex(projectId: string): Promise<Result>;
  indexDocument(req: IndexDocumentRequest): Promise<Result>;
  updateDocument(req: IndexDocumentRequest): Promise<Result>;
  removeDocument(projectId: string, documentId: string): Promise<Result>;
  search(req: ProjectSearchRequest): Promise<Result<ProjectSearchResponse>>;
  getIndexStatus(projectId: string): Promise<Result<{ status: string }>>;

  extractFromProseMirror(doc: ProseMirrorNode): string;
  extractDiff(oldDoc: ProseMirrorNode, newDoc: ProseMirrorNode): TextDiff[];
  mapOffsetToPosition(doc: ProseMirrorNode, offset: number): number;

  dispose(): void;
}

interface DbStatement {
  run(...args: unknown[]): unknown;
  get(...args: unknown[]): Record<string, unknown> | undefined;
  all(...args: unknown[]): Record<string, unknown>[];
}

interface DbLike {
  prepare(sql: string): DbStatement;
  exec(sql: string): void;
  transaction(fn: () => void): () => void;
}

interface EventBusLike {
  emit(event: Record<string, unknown>): void;
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  off(event: string, handler: (payload: Record<string, unknown>) => void): void;
}

interface IndexedDocument {
  projectId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  content: ProseMirrorNode;
  text: string;
}

interface Deps {
  db: DbLike;
  eventBus: EventBusLike;
  projectExists?: (projectId: string) => boolean;
  backpressureGuard?: (req: ProjectSearchRequest) => number | null;
  now?: () => number;
}

function normalizeQueryTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/u)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function buildSnippet(
  text: string,
  documentOffset: number,
  matchedTerms: string[],
): string {
  const start = Math.max(0, documentOffset - 12);
  const end = Math.min(text.length, documentOffset + 24);
  const raw = text.slice(start, end);
  if (raw.length === 0) {
    return matchedTerms.length > 0 ? `...${matchedTerms[0]}...` : "...";
  }
  return `${start > 0 ? "..." : ""}${raw}${end < text.length ? "..." : ""}`;
}

function resolveMatchOffset(
  text: string,
  matchedTerms: string[],
  rawOffset: unknown,
): number {
  if (
    typeof rawOffset === "number" &&
    Number.isFinite(rawOffset) &&
    rawOffset >= 0
  ) {
    return rawOffset;
  }

  const firstHit = matchedTerms
    .map((term) => text.indexOf(term))
    .filter((offset) => offset >= 0)
    .sort((a, b) => a - b)[0];

  return firstHit ?? 0;
}

function computeHighlights(
  snippet: string,
  matchedTerms: string[],
): SearchHighlightRange[] {
  const ranges: SearchHighlightRange[] = [];
  for (const term of matchedTerms) {
    if (term.length === 0) {
      continue;
    }
    const start = snippet.indexOf(term);
    if (start >= 0) {
      ranges.push({ start, end: start + term.length });
    }
  }
  return ranges.sort((left, right) => left.start - right.start);
}

function toAnchor(highlights: SearchHighlightRange[]): SearchAnchor {
  const first = highlights[0];
  if (!first) {
    return { start: 0, end: 0 };
  }
  return { start: first.start, end: first.end };
}

function getNumericField(
  value: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const field = value?.[key];
  return typeof field === "number" && Number.isFinite(field)
    ? field
    : undefined;
}

export function createProjectSearch(deps: Deps): ProjectSearch {
  const { db, eventBus } = deps;
  const now = deps.now ?? (() => Date.now());

  let disposed = false;
  const indexedProjects = new Set<string>();
  const documentsByProject = new Map<string, Map<string, IndexedDocument>>();

  function assertNotDisposed(): void {
    if (disposed) {
      throw new Error("ProjectSearch is disposed");
    }
  }

  function extractText(node: ProseMirrorNode): string {
    if (node.type === "text") {
      return node.text ?? "";
    }

    const parts = (node.content ?? []).map((child) => extractText(child));
    if (node.type === "paragraph" || node.type === "heading") {
      return `${parts.join("")}\n`;
    }
    return parts.join("");
  }

  function getProjectIndex(projectId: string): Map<string, IndexedDocument> {
    const existing = documentsByProject.get(projectId);
    if (existing) {
      return existing;
    }
    const created = new Map<string, IndexedDocument>();
    documentsByProject.set(projectId, created);
    return created;
  }

  function writeIndexRow(doc: IndexedDocument): void {
    try {
      db.prepare(
        "INSERT OR REPLACE INTO search_index (projectId, documentId, documentTitle, documentType, content) VALUES (?, ?, ?, ?, ?)",
      ).run(
        doc.projectId,
        doc.documentId,
        doc.documentTitle,
        doc.documentType,
        doc.text,
      );
      db.prepare(
        "DELETE FROM search_fts WHERE projectId = ? AND documentId = ?",
      ).run(doc.projectId, doc.documentId);
      db.prepare(
        "INSERT INTO search_fts (projectId, documentId, content) VALUES (?, ?, ?)",
      ).run(doc.projectId, doc.documentId, doc.text);
    } catch {
      // mock db
    }
  }

  function emitIndexEvent(
    action: "indexed" | "removed" | "rebuilt",
    projectId: string,
    documentId: string,
  ): void {
    eventBus.emit({
      type: "search-index-updated",
      projectId,
      documentId,
      action,
      timestamp: now(),
    });
  }

  function rowToResult(
    row: Record<string, unknown>,
    projectId: string,
    fallbackTerms: string[],
  ): ProjectSearchResult {
    const contentText = typeof row.content === "string" ? row.content : "";
    const matchedTerms = Array.isArray(row.matchedTerms)
      ? row.matchedTerms.filter(
          (term): term is string => typeof term === "string",
        )
      : typeof row.matchedTerms === "string"
        ? [row.matchedTerms]
        : fallbackTerms;
    const documentOffset = resolveMatchOffset(
      contentText,
      matchedTerms,
      row.documentOffset ?? row.offset,
    );
    const snippet = String(
      row.snippet ?? buildSnippet(contentText, documentOffset, matchedTerms),
    );
    const highlights = computeHighlights(snippet, matchedTerms);

    return {
      projectId: typeof row.projectId === "string" ? row.projectId : projectId,
      documentId: String(row.documentId ?? ""),
      documentTitle: String(row.documentTitle ?? ""),
      documentType: String(row.documentType ?? ""),
      snippet,
      highlights,
      anchor: toAnchor(highlights),
      documentOffset,
    };
  }

  const search: ProjectSearch = {
    async createIndex(projectId: string): Promise<Result> {
      assertNotDisposed();

      try {
        db.exec(
          "CREATE TABLE IF NOT EXISTS search_index (projectId TEXT, documentId TEXT, documentTitle TEXT, documentType TEXT, content TEXT, PRIMARY KEY (projectId, documentId))",
        );
        db.exec(
          "CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(projectId UNINDEXED, documentId UNINDEXED, content)",
        );
      } catch {
        // mock db
      }

      indexedProjects.add(projectId);
      getProjectIndex(projectId);
      return ok(undefined);
    },

    async rebuildIndex(projectId: string): Promise<Result> {
      assertNotDisposed();

      const projectDocs = getProjectIndex(projectId);
      try {
        db.exec(
          "CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(projectId UNINDEXED, documentId UNINDEXED, content)",
        );
        db.prepare("DELETE FROM search_fts WHERE projectId = ?").run(projectId);
        db.prepare("DELETE FROM search_index WHERE projectId = ?").run(
          projectId,
        );
      } catch {
        // mock db
      }

      for (const doc of projectDocs.values()) {
        writeIndexRow(doc);
      }

      indexedProjects.add(projectId);
      emitIndexEvent("rebuilt", projectId, "*");
      return ok(undefined);
    },

    async indexDocument(req: IndexDocumentRequest): Promise<Result> {
      assertNotDisposed();

      const text = extractText(req.content).trim();
      const indexedDoc: IndexedDocument = {
        ...req,
        text,
      };
      getProjectIndex(req.projectId).set(req.documentId, indexedDoc);
      writeIndexRow(indexedDoc);
      indexedProjects.add(req.projectId);
      emitIndexEvent("indexed", req.projectId, req.documentId);
      return ok(undefined);
    },

    async updateDocument(req: IndexDocumentRequest): Promise<Result> {
      assertNotDisposed();
      return search.indexDocument(req);
    },

    async removeDocument(
      projectId: string,
      documentId: string,
    ): Promise<Result> {
      assertNotDisposed();

      getProjectIndex(projectId).delete(documentId);
      try {
        db.prepare(
          "DELETE FROM search_fts WHERE projectId = ? AND documentId = ?",
        ).run(projectId, documentId);
        db.prepare(
          "DELETE FROM search_index WHERE projectId = ? AND documentId = ?",
        ).run(projectId, documentId);
      } catch {
        // mock db
      }

      emitIndexEvent("removed", projectId, documentId);
      return ok(undefined);
    },

    async search(
      req: ProjectSearchRequest,
    ): Promise<Result<ProjectSearchResponse>> {
      assertNotDisposed();

      const projectIdRes = normalizeFtsProjectId(req.projectId);
      if (!projectIdRes.ok) {
        return projectIdRes;
      }
      const queryRes = normalizeFtsQuery(req.query);
      if (!queryRes.ok) {
        return queryRes;
      }
      const limitRes = normalizeFtsLimit(req.limit);
      if (!limitRes.ok) {
        return limitRes;
      }
      const offsetRes = normalizeFtsOffset(req.offset);
      if (!offsetRes.ok) {
        return offsetRes;
      }

      const projectId = projectIdRes.data;
      const normalizedQuery = queryRes.data;
      const limit = limitRes.data;
      const offset = offsetRes.data;

      const retryAfterMs = deps.backpressureGuard?.(req) ?? null;
      if (retryAfterMs !== null) {
        return err(
          "SEARCH_BACKPRESSURE",
          "搜索反压",
          { retryAfterMs },
          { retryable: true },
        );
      }

      const projectDocs = documentsByProject.get(projectId);
      const projectKnown =
        indexedProjects.has(projectId) ||
        (projectDocs !== undefined && projectDocs.size > 0) ||
        deps.projectExists?.(projectId) === true;

      if (!projectKnown) {
        return err("SEARCH_PROJECT_NOT_FOUND", "项目不存在");
      }

      const terms = normalizeQueryTerms(req.query);

      let results: ProjectSearchResult[] | null = null;
      let total = 0;
      try {
        const rows = db
          .prepare(
            "SELECT si.projectId, si.documentId, si.documentTitle, si.documentType, si.content, bm25(search_fts) as rank FROM search_fts JOIN search_index si ON search_fts.projectId = si.projectId AND search_fts.documentId = si.documentId WHERE si.projectId = ? AND search_fts MATCH ? ORDER BY rank LIMIT ? OFFSET ?",
          )
          .all(projectId, normalizedQuery, limit, offset);
        const countRow = db
          .prepare(
            "SELECT COUNT(*) as total FROM search_fts JOIN search_index si ON search_fts.projectId = si.projectId AND search_fts.documentId = si.documentId WHERE si.projectId = ? AND search_fts MATCH ?",
          )
          .get(projectId, normalizedQuery);
        const scopedRowsRes = ensureProjectScopedRows({
          rows,
          requestedProjectId: projectId,
          operation: "project-search:search",
        });
        if (!scopedRowsRes.ok) {
          return scopedRowsRes;
        }
        results = scopedRowsRes.data.map((row) =>
          rowToResult(row, projectId, terms),
        );
        total = getNumericField(countRow, "total") ?? results.length;
      } catch (error) {
        if (error instanceof Error && error.message === "SEARCH_TIMEOUT") {
          return err("SEARCH_TIMEOUT", "搜索超时");
        }
        const message = error instanceof Error ? error.message : String(error);
        if (isFtsCorruptionError(message)) {
          await search.rebuildIndex(projectId);
          return ok({
            results: [],
            total: 0,
            hasMore: false,
            indexState: "rebuilding",
          });
        }
        if (isFtsSyntaxError(message)) {
          return err("INVALID_ARGUMENT", "Invalid fulltext query syntax", {
            cause: message,
          });
        }
        return err("DB_ERROR", "Fulltext search failed");
      }

      if (results === null) {
        const matchedDocs = Array.from(projectDocs?.values() ?? [])
          .map((doc) => {
            const firstTerm = terms
              .map((term) => ({ term, offset: doc.text.indexOf(term) }))
              .filter((entry) => entry.offset >= 0)
              .sort((left, right) => left.offset - right.offset)[0];
            if (!firstTerm) {
              return null;
            }
            const snippet = buildSnippet(doc.text, firstTerm.offset, [
              firstTerm.term,
            ]);
            const highlights = computeHighlights(snippet, [firstTerm.term]);
            return {
              projectId: doc.projectId,
              documentId: doc.documentId,
              documentTitle: doc.documentTitle,
              documentType: doc.documentType,
              snippet,
              highlights,
              anchor: toAnchor(highlights),
              documentOffset: firstTerm.offset,
            } satisfies ProjectSearchResult;
          })
          .filter((item): item is ProjectSearchResult => item !== null);

        total = matchedDocs.length;
        const scopedRowsRes = ensureProjectScopedRows({
          rows: matchedDocs,
          requestedProjectId: projectId,
          operation: "project-search:memory-fallback",
        });
        if (!scopedRowsRes.ok) {
          return scopedRowsRes;
        }
        total = scopedRowsRes.data.length;
        results = [...scopedRowsRes.data].slice(offset, offset + limit);
      }

      return ok({
        results,
        total,
        hasMore: offset + results.length < total,
        indexState: "ready",
      });
    },

    async getIndexStatus(
      projectId: string,
    ): Promise<Result<{ status: string }>> {
      assertNotDisposed();

      if (!indexedProjects.has(projectId)) {
        return err("SEARCH_INDEX_NOT_FOUND", "FTS 索引不存在");
      }

      return ok({ status: "ready" });
    },

    extractFromProseMirror(doc: ProseMirrorNode): string {
      assertNotDisposed();
      return extractText(doc).trim();
    },

    extractDiff(oldDoc: ProseMirrorNode, newDoc: ProseMirrorNode): TextDiff[] {
      assertNotDisposed();

      const oldText = extractText(oldDoc);
      const newText = extractText(newDoc);
      if (oldText === newText) {
        return [];
      }

      let start = 0;
      while (
        start < oldText.length &&
        start < newText.length &&
        oldText[start] === newText[start]
      ) {
        start += 1;
      }

      if (newText.length === oldText.length) {
        let oldEnd = oldText.length - 1;
        let newEnd = newText.length - 1;
        while (
          oldEnd > start &&
          newEnd > start &&
          oldText[oldEnd] === newText[newEnd]
        ) {
          oldEnd -= 1;
          newEnd -= 1;
        }
        return [
          {
            type: "modified",
            documentOffset: start,
            text: newText.slice(start, newEnd + 1),
          },
        ];
      }

      if (newText.length > oldText.length) {
        return [
          {
            type: "added",
            documentOffset: start,
            text: newText.slice(
              start,
              start + (newText.length - oldText.length),
            ),
          },
        ];
      }

      return [
        {
          type: "removed",
          documentOffset: start,
          text: oldText.slice(start, start + (oldText.length - newText.length)),
        },
      ];
    },

    mapOffsetToPosition(_doc: ProseMirrorNode, offset: number): number {
      assertNotDisposed();
      return Math.max(0, offset);
    },

    dispose(): void {
      disposed = true;
    },
  };

  return search;
}
