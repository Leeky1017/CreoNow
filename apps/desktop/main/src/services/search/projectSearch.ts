/**
 * ProjectSearch — in-memory seam mirroring the runtime `search:fts:*` contract.
 * Spec: openspec/specs/search-and-retrieval/spec.md — P3
 */

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

type Result<T = void> =
  | { success: true; data?: T; error?: undefined }
  | {
      success: false;
      data?: undefined;
      error: { code: string; message: string; retryAfterMs?: number };
    };

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

const MAX_QUERY_LEN = 200;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

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

function hasCorruptionSignal(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const maybeCode = "code" in error ? error.code : undefined;
  const maybeMessage = "message" in error ? error.message : undefined;
  return (
    maybeCode === "SQLITE_CORRUPT" ||
    (typeof maybeMessage === "string" && /corrupt/i.test(maybeMessage))
  );
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

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.trunc(limit), MAX_LIMIT);
}

function clampOffset(offset?: number): number {
  if (typeof offset !== "number" || !Number.isFinite(offset) || offset < 0) {
    return DEFAULT_OFFSET;
  }
  return Math.trunc(offset);
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
      return { success: true };
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
      return { success: true };
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
      return { success: true };
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
      return { success: true };
    },

    async search(
      req: ProjectSearchRequest,
    ): Promise<Result<ProjectSearchResponse>> {
      assertNotDisposed();

      if (req.query.trim().length === 0) {
        return {
          success: false,
          error: { code: "SEARCH_QUERY_EMPTY", message: "搜索词不能为空" },
        };
      }
      if (req.query.length > MAX_QUERY_LEN) {
        return {
          success: false,
          error: { code: "SEARCH_QUERY_TOO_LONG", message: "搜索词过长" },
        };
      }

      const retryAfterMs = deps.backpressureGuard?.(req) ?? null;
      if (retryAfterMs !== null) {
        return {
          success: false,
          error: {
            code: "SEARCH_BACKPRESSURE",
            message: "搜索反压",
            retryAfterMs,
          },
        };
      }

      const projectDocs = documentsByProject.get(req.projectId);
      const projectKnown =
        indexedProjects.has(req.projectId) ||
        (projectDocs !== undefined && projectDocs.size > 0) ||
        deps.projectExists?.(req.projectId) === true;

      if (!projectKnown) {
        return {
          success: false,
          error: { code: "SEARCH_PROJECT_NOT_FOUND", message: "项目不存在" },
        };
      }

      const limit = clampLimit(req.limit);
      const offset = clampOffset(req.offset);
      const terms = normalizeQueryTerms(req.query);

      let results: ProjectSearchResult[] | null = null;
      let total = 0;
      try {
        const rows = db
          .prepare(
            "SELECT si.projectId, si.documentId, si.documentTitle, si.documentType, si.content, bm25(search_fts) as rank FROM search_fts JOIN search_index si ON search_fts.projectId = si.projectId AND search_fts.documentId = si.documentId WHERE si.projectId = ? AND search_fts MATCH ? ORDER BY rank LIMIT ? OFFSET ?",
          )
          .all(req.projectId, req.query, limit, offset);
        const countRow = db
          .prepare(
            "SELECT COUNT(*) as total FROM search_fts JOIN search_index si ON search_fts.projectId = si.projectId AND search_fts.documentId = si.documentId WHERE si.projectId = ? AND search_fts MATCH ?",
          )
          .get(req.projectId, req.query);
        results = rows.map((row) => rowToResult(row, req.projectId, terms));
        total = getNumericField(countRow, "total") ?? results.length;
      } catch (error) {
        if (error instanceof Error && error.message === "SEARCH_TIMEOUT") {
          return {
            success: false,
            error: { code: "SEARCH_TIMEOUT", message: "搜索超时" },
          };
        }
        if (hasCorruptionSignal(error)) {
          await search.rebuildIndex(req.projectId);
          return {
            success: false,
            error: {
              code: "SEARCH_INDEX_CORRUPTED",
              message: "正在重建索引，请稍后重试",
            },
          };
        }
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
        results = matchedDocs.slice(offset, offset + limit);
      }

      return {
        success: true,
        data: {
          results,
          total,
          hasMore: offset + results.length < total,
          indexState: "ready",
        },
      };
    },

    async getIndexStatus(
      projectId: string,
    ): Promise<Result<{ status: string }>> {
      assertNotDisposed();

      if (!indexedProjects.has(projectId)) {
        return {
          success: false,
          error: { code: "SEARCH_INDEX_NOT_FOUND", message: "FTS 索引不存在" },
        };
      }

      return { success: true, data: { status: "ready" } };
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
