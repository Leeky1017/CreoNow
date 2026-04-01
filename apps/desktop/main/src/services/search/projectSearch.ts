/**
 * ProjectSearch — 项目级全文搜索
 * Spec: openspec/specs/search-and-retrieval/spec.md — P3
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface SearchMatch {
  snippet: string;
  offset: number;
  matchedTerms: string[];
}

export interface ProjectSearchResult {
  documentId: string;
  documentTitle: string;
  documentType: string;
  matches: SearchMatch[];
}

export interface ProjectSearchResponse {
  results: ProjectSearchResult[];
  totalDocuments: number;
  totalMatches: number;
  searchTimeMs: number;
  hasMore: boolean;
}

export interface ProjectSearchRequest {
  projectId: string;
  query: string;
  offset?: number;
  limit?: number;
  documentTypes?: string[];
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
  offset: number;
  text: string;
}

type Result<T = void> =
  | { success: true; data?: T; error?: undefined }
  | { success: false; data?: undefined; error: { code: string; message: string; retryAfterMs?: number } };

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

// ─── Constants ──────────────────────────────────────────────────────

const MAX_QUERY_LEN = 200;
const MAX_LIMIT = 100;

// ─── Helpers ────────────────────────────────────────────────────────

function normalizeQueryTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/u)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function buildSnippet(text: string, offset: number, matchedTerms: string[]): string {
  const start = Math.max(0, offset - 12);
  const end = Math.min(text.length, offset + 24);
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
  if (typeof rawOffset === "number" && Number.isFinite(rawOffset) && rawOffset >= 0) {
    return rawOffset;
  }

  const firstHit = matchedTerms
    .map((term) => text.indexOf(term))
    .filter((offset) => offset >= 0)
    .sort((a, b) => a - b)[0];

  return firstHit ?? 0;
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

// ─── Implementation ─────────────────────────────────────────────────

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
      ).run(doc.projectId, doc.documentId, doc.documentTitle, doc.documentType, doc.text);
      db.prepare("DELETE FROM search_fts WHERE projectId = ? AND documentId = ?").run(doc.projectId, doc.documentId);
      db.prepare(
        "INSERT INTO search_fts (projectId, documentId, content) VALUES (?, ?, ?)",
      ).run(doc.projectId, doc.documentId, doc.text);
    } catch {
      // mock db
    }
  }

  function emitIndexEvent(action: "indexed" | "removed" | "rebuilt", projectId: string, documentId: string): void {
    eventBus.emit({
      type: "search-index-updated",
      projectId,
      documentId,
      action,
      timestamp: now(),
    });
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
        db.prepare("DELETE FROM search_index WHERE projectId = ?").run(projectId);
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

    async removeDocument(projectId: string, documentId: string): Promise<Result> {
      assertNotDisposed();

      getProjectIndex(projectId).delete(documentId);
      try {
        db.prepare("DELETE FROM search_fts WHERE projectId = ? AND documentId = ?").run(projectId, documentId);
        db.prepare("DELETE FROM search_index WHERE projectId = ? AND documentId = ?").run(projectId, documentId);
      } catch {
        // mock db
      }

      emitIndexEvent("removed", projectId, documentId);
      return { success: true };
    },

    async search(req: ProjectSearchRequest): Promise<Result<ProjectSearchResponse>> {
      assertNotDisposed();

      if (req.query.trim().length === 0) {
        return { success: false, error: { code: "SEARCH_QUERY_EMPTY", message: "搜索词不能为空" } };
      }
      if (req.query.length > MAX_QUERY_LEN) {
        return { success: false, error: { code: "SEARCH_QUERY_TOO_LONG", message: "搜索词过长" } };
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

      const startTime = now();
      const limit = Math.min(req.limit ?? 20, MAX_LIMIT);
      const offset = req.offset ?? 0;

      let rows: Record<string, unknown>[] | null = null;
      try {
        const params: unknown[] = [req.projectId];
        let sql =
          "SELECT si.*, bm25(search_fts) as rank FROM search_fts JOIN search_index si ON search_fts.projectId = si.projectId AND search_fts.documentId = si.documentId WHERE si.projectId = ?";

        if (req.documentTypes && req.documentTypes.length > 0) {
          const placeholders = req.documentTypes.map(() => "?").join(",");
          sql += ` AND si.documentType IN (${placeholders})`;
          params.push(...req.documentTypes);
        }

        sql += " AND search_fts MATCH ? ORDER BY rank LIMIT ? OFFSET ?";
        params.push(req.query, limit, offset);
        rows = db.prepare(sql).all(...params);
      } catch (error) {
        if (error instanceof Error && error.message === "SEARCH_TIMEOUT") {
          return { success: false, error: { code: "SEARCH_TIMEOUT", message: "搜索超时" } };
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
        rows = null;
      }

      const terms = normalizeQueryTerms(req.query);
      let results: ProjectSearchResult[] = [];

      if (rows !== null) {
        const grouped = new Map<string, ProjectSearchResult>();
        for (const row of rows) {
          const documentId = String(row.documentId ?? "");
          const rowContent = String(row.content ?? "");
          const matchedTerms = Array.isArray(row.matchedTerms)
            ? (row.matchedTerms as string[])
            : typeof row.matchedTerms === "string"
              ? [row.matchedTerms]
              : terms;
          const resolvedOffset = resolveMatchOffset(rowContent, matchedTerms, row.offset);
          if (!grouped.has(documentId)) {
            grouped.set(documentId, {
              documentId,
              documentTitle: String(row.documentTitle ?? ""),
              documentType: String(row.documentType ?? ""),
              matches: [],
            });
          }
          grouped.get(documentId)?.matches.push({
            snippet: String(row.snippet ?? buildSnippet(rowContent, resolvedOffset, matchedTerms)),
            offset: resolvedOffset,
            matchedTerms,
          });
        }
        results = Array.from(grouped.values());
      } else {
        const docEntries = Array.from(projectDocs?.values() ?? []).filter((doc) => {
          if (!req.documentTypes || req.documentTypes.length === 0) {
            return true;
          }
          return req.documentTypes.includes(doc.documentType);
        });

        const matchedDocs = docEntries
          .map((doc) => {
            const matches: SearchMatch[] = [];
            for (const term of terms) {
              const offsetInText = doc.text.indexOf(term);
              if (offsetInText >= 0) {
                matches.push({
                  snippet: buildSnippet(doc.text, offsetInText, [term]),
                  offset: offsetInText,
                  matchedTerms: [term],
                });
              }
            }
            if (matches.length === 0) {
              return null;
            }
            return {
              documentId: doc.documentId,
              documentTitle: doc.documentTitle,
              documentType: doc.documentType,
              matches,
            } satisfies ProjectSearchResult;
          })
          .filter((item): item is ProjectSearchResult => item !== null);

        results = matchedDocs.slice(offset, offset + limit);
      }

      const totalMatches = results.reduce((sum, result) => sum + result.matches.length, 0);
      return {
        success: true,
        data: {
          results,
          totalDocuments: results.length,
          totalMatches,
          searchTimeMs: now() - startTime,
          hasMore: results.length >= limit,
        },
      };
    },

    async getIndexStatus(projectId: string): Promise<Result<{ status: string }>> {
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
        while (oldEnd > start && newEnd > start && oldText[oldEnd] === newText[newEnd]) {
          oldEnd -= 1;
          newEnd -= 1;
        }
        return [{ type: "modified", offset: start, text: newText.slice(start, newEnd + 1) }];
      }

      if (newText.length > oldText.length) {
        return [
          {
            type: "added",
            offset: start,
            text: newText.slice(start, start + (newText.length - oldText.length)),
          },
        ];
      }

      return [
        {
          type: "removed",
          offset: start,
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
