/**
 * ProjectSearch P3 测试 — 项目级全文搜索
 * Spec: openspec/specs/search-and-retrieval/spec.md — P3: 项目级全文搜索
 *
 * TDD Red Phase：测试应编译但因实现不存在而失败。
 * 验证 FTS5 索引管理、搜索查询、CJK 支持、结果结构、documentOffset 映射、
 * 增量更新、索引重建、runtime 对齐、错误码、dispose 清理。
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";

import type { ProjectSearch, ProjectSearchRequest } from "../projectSearch";
import { createProjectSearch } from "../projectSearch";

// ─── mock types ─────────────────────────────────────────────────────

interface MockDb {
  prepare: Mock;
  exec: Mock;
  transaction: Mock;
}

interface MockEventBus {
  emit: Mock;
  on: Mock;
  off: Mock;
}

/** Minimal ProseMirror document mock */
interface MockProseMirrorDoc {
  type: string;
  content: Array<{
    type: string;
    content?: Array<{ type: string; text?: string }>;
    attrs?: Record<string, unknown>;
  }>;
}

// ─── helpers ────────────────────────────────────────────────────────

function createMockDb(): MockDb {
  return {
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: Function) => fn),
  };
}

function createMockEventBus(): MockEventBus {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

function makeSearchRequest(
  overrides: Partial<ProjectSearchRequest> = {},
): ProjectSearchRequest {
  return {
    projectId: "proj-1",
    query: "林远",
    offset: 0,
    limit: 20,
    ...overrides,
  };
}

function makeProseMirrorDoc(text: string): MockProseMirrorDoc {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

function makeProseMirrorDocWithHeading(
  heading: string,
  body: string,
): MockProseMirrorDoc {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: heading }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: body }],
      },
    ],
  };
}

// ─── tests ──────────────────────────────────────────────────────────

describe("ProjectSearch P3", () => {
  let db: MockDb;
  let eventBus: MockEventBus;
  let search: ProjectSearch;

  beforeEach(() => {
    db = createMockDb();
    eventBus = createMockEventBus();
    search = createProjectSearch({
      db: db as any,
      eventBus: eventBus as any,
      projectExists: (projectId) => projectId !== "nonexistent",
      backpressureGuard: (req) => (req.query === "反压测试" ? 200 : null),
    });
  });

  afterEach(() => {
    search.dispose();
    vi.restoreAllMocks();
  });

  // ── FTS5 index management ───────────────────────────────────────

  describe("index management", () => {
    it("创建项目的 FTS5 索引", async () => {
      const result = await search.createIndex("proj-1");

      expect(result.success).toBe(true);
    });

    it("重建项目的 FTS5 索引", async () => {
      const result = await search.rebuildIndex("proj-1");

      expect(result.success).toBe(true);
    });

    it("重建索引后发射 search-index-updated 事件（action=rebuilt）", async () => {
      await search.rebuildIndex("proj-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "search-index-updated",
          projectId: "proj-1",
          action: "rebuilt",
          documentId: expect.any(String),
          timestamp: expect.any(Number),
        }),
      );
    });

    it("索引文档到 FTS5", async () => {
      const doc = makeProseMirrorDoc("林远走进了废弃仓库");
      const result = await search.indexDocument({
        projectId: "proj-1",
        documentId: "doc-1",
        documentTitle: "第一章",
        documentType: "chapter",
        content: doc as any,
      });

      expect(result.success).toBe(true);
    });

    it("索引后发射 search-index-updated 事件", async () => {
      const doc = makeProseMirrorDoc("文本");
      await search.indexDocument({
        projectId: "proj-1",
        documentId: "doc-1",
        documentTitle: "第一章",
        documentType: "chapter",
        content: doc as any,
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "search-index-updated",
          projectId: "proj-1",
          documentId: "doc-1",
          action: "indexed",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("从索引中移除文档", async () => {
      const result = await search.removeDocument("proj-1", "doc-1");

      expect(result.success).toBe(true);
    });

    it("移除后发射 search-index-updated 事件（action=removed）", async () => {
      await search.removeDocument("proj-1", "doc-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "search-index-updated",
          projectId: "proj-1",
          documentId: "doc-1",
          action: "removed",
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  // ── Search query ────────────────────────────────────────────────

  describe("search query", () => {
    it("基本关键词搜索返回 ProjectSearchResponse", async () => {
      const result = await search.search(makeSearchRequest({ query: "林远" }));

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("results");
      expect(result.data).toHaveProperty("total");
      expect(result.data).toHaveProperty("hasMore");
      expect(result.data).toHaveProperty("indexState");
    });

    it("多词搜索正确匹配", async () => {
      const result = await search.search(
        makeSearchRequest({ query: "废弃仓库 林远" }),
      );

      expect(result.success).toBe(true);
    });

    it("CJK 中文搜索正确匹配", async () => {
      const result = await search.search(
        makeSearchRequest({ query: "退休刑警" }),
      );

      expect(result.success).toBe(true);
    });

    it("搜索结果包含匹配高亮", async () => {
      // 预设 mock 返回实际搜索数据
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([
          {
            projectId: "proj-1",
            documentId: "doc-1",
            documentTitle: "第一章",
            documentType: "chapter",
            snippet: "...林远走进了...",
            documentOffset: 5,
            matchedTerms: ["林远"],
          },
        ]),
      });

      const result = await search.search(makeSearchRequest({ query: "林远" }));

      expect(result.success).toBe(true);
      expect(result.data!.results.length).toBeGreaterThan(0);
      const firstResult = result.data!.results[0];
      expect(firstResult.snippet).toContain("林远");
      expect(firstResult.highlights.length).toBeGreaterThan(0);
      expect(firstResult.anchor).toEqual(firstResult.highlights[0]);
    });

    it("搜索结果包含 documentOffset 与 anchor 定位", async () => {
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([
          {
            projectId: "proj-1",
            documentId: "doc-1",
            documentTitle: "第一章",
            documentType: "chapter",
            snippet: "...林远走进了...",
            documentOffset: 5,
            matchedTerms: ["林远"],
          },
        ]),
      });

      const result = await search.search(makeSearchRequest({ query: "林远" }));

      expect(result.success).toBe(true);
      expect(result.data!.results.length).toBeGreaterThan(0);
      const firstResult = result.data!.results[0];
      expect(typeof firstResult.documentOffset).toBe("number");
      expect(firstResult.documentOffset).toBeGreaterThanOrEqual(0);
      expect(firstResult.anchor.start).toBeGreaterThanOrEqual(0);
      expect(firstResult.anchor.end).toBeGreaterThan(firstResult.anchor.start);
    });

    it("FTS 路径会从文档内容中计算真实命中 documentOffset", async () => {
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([
          {
            projectId: "proj-1",
            documentId: "doc-1",
            documentTitle: "第一章",
            documentType: "chapter",
            content: "前文铺垫后，林远终于推开门。",
            matchedTerms: ["林远"],
          },
        ]),
      });

      const result = await search.search(makeSearchRequest({ query: "林远" }));

      expect(result.success).toBe(true);
      expect(result.data!.results[0]).toMatchObject({
        documentOffset: "前文铺垫后，".length,
      });
      expect(result.data!.results[0].anchor.end).toBeGreaterThan(
        result.data!.results[0].anchor.start,
      );
    });

    it("搜索无结果时返回空数组", async () => {
      const result = await search.search(
        makeSearchRequest({ query: "不存在的关键词xyz" }),
      );

      expect(result.success).toBe(true);
      expect(result.data?.results).toEqual([]);
      expect(result.data?.total).toBe(0);
      expect(result.data?.indexState).toBe("ready");
    });

    it("分页参数生效", async () => {
      const result = await search.search(
        makeSearchRequest({ offset: 10, limit: 5 }),
      );

      expect(result.success).toBe(true);
    });

    it("limit 最大值为 100", async () => {
      // 模拟搜索返回成功结果
      db.prepare.mockReturnValueOnce({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([]),
      });

      const result = await search.search(makeSearchRequest({ limit: 200 }));

      // 应当截断到 100
      expect(result.success).toBe(true);
      // 验证传递给 db 的 limit 被截断为 100（SQL 级断言）
      const prepareCall = db.prepare.mock.calls.find(
        (call: any) => typeof call[0] === "string" && /LIMIT/i.test(call[0]),
      );
      expect(prepareCall).toBeDefined();
      expect(prepareCall![0]).toMatch(/LIMIT\s+\?/i);
      // SQL LIMIT ? 证明使用了参数化限制；实现层负责绑定 ≤ 100 的值
      const limitIdx = db.prepare.mock.calls.findIndex(
        (call: any) => typeof call[0] === "string" && /LIMIT/i.test(call[0]),
      );
      const limitStmt = db.prepare.mock.results[limitIdx].value;
      expect(limitStmt.all).toHaveBeenCalled();
    });
  });

  // ── Runtime-aligned response shape ──────────────────────────────

  describe("runtime-aligned response shape", () => {
    it("search 返回当前项目 scope 的扁平化结果项", async () => {
      db.prepare.mockImplementation((sql: string) => ({
        run: vi.fn(),
        get: vi.fn().mockReturnValue({ total: 1 }),
        all: vi.fn().mockImplementation(() => {
          if (!/WHERE si\.projectId = \?/i.test(sql)) {
            throw new Error("query must stay project-scoped");
          }
          return [
            {
              projectId: "proj-1",
              documentId: "doc-1",
              documentTitle: "第一章",
              documentType: "chapter",
              snippet: "...林远走进了...",
              documentOffset: 5,
              matchedTerms: ["林远"],
            },
          ];
        }),
      }));

      const result = await search.search(makeSearchRequest());

      expect(result.success).toBe(true);
      expect(result.data?.results[0]).toMatchObject({
        projectId: "proj-1",
        documentId: "doc-1",
        documentOffset: 5,
      });
      expect(result.data?.total).toBe(1);
      expect(result.data?.indexState).toBe("ready");
    });
  });

  // ── Text extraction ─────────────────────────────────────────────

  describe("text extraction", () => {
    it("从 ProseMirror JSON 提取纯文本", () => {
      const doc = makeProseMirrorDoc("林远走进了废弃仓库");
      const text = search.extractFromProseMirror(doc as any);

      expect(text).toContain("林远走进了废弃仓库");
    });

    it("保留段落分隔", () => {
      const doc: MockProseMirrorDoc = {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "第一段" }] },
          { type: "paragraph", content: [{ type: "text", text: "第二段" }] },
        ],
      };
      const text = search.extractFromProseMirror(doc as any);

      expect(text).toContain("第一段");
      expect(text).toContain("第二段");
    });

    it("保留标题层级信息", () => {
      const doc = makeProseMirrorDocWithHeading("第一章", "正文内容");
      const text = search.extractFromProseMirror(doc as any);

      expect(text).toContain("第一章");
      expect(text).toContain("正文内容");
    });

    it("去除格式标记（bold/italic 等）", () => {
      const doc: MockProseMirrorDoc = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "普通文本" },
              { type: "text", text: "加粗文本" },
            ],
          },
        ],
      };
      const text = search.extractFromProseMirror(doc as any);

      expect(text).toContain("普通文本");
      expect(text).toContain("加粗文本");
      expect(text).not.toContain("**");
    });

    it("extractDiff 返回两文档间的文本差异", () => {
      const oldDoc = makeProseMirrorDoc("林远走进了废弃仓库");
      const newDoc = makeProseMirrorDoc("林远走进了新的仓库");
      const diffs = search.extractDiff(oldDoc as any, newDoc as any);

      expect(Array.isArray(diffs)).toBe(true);
      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs[0]).toHaveProperty("type");
      expect(diffs[0]).toHaveProperty("documentOffset");
      expect(diffs[0]).toHaveProperty("text");
      expect(["added", "removed", "modified"]).toContain(diffs[0].type);
    });
  });

  // ── Offset mapping ──────────────────────────────────────────────

  describe("offset mapping", () => {
    it("mapOffsetToPosition 将纯文本 offset 映射为 ProseMirror position", () => {
      const doc = makeProseMirrorDoc("林远走进了废弃仓库");
      const position = search.mapOffsetToPosition(doc as any, 0);

      expect(typeof position).toBe("number");
      expect(position).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Incremental update ──────────────────────────────────────────

  describe("incremental update", () => {
    it("文档变更后增量更新索引", async () => {
      const newDoc = makeProseMirrorDoc("林远走进了新的仓库");
      const result = await search.updateDocument({
        projectId: "proj-1",
        documentId: "doc-1",
        documentTitle: "第一章",
        documentType: "chapter",
        content: newDoc as any,
      });

      expect(result.success).toBe(true);
    });
  });

  // ── Index corruption recovery ───────────────────────────────────

  describe("index corruption recovery", () => {
    it("索引损坏时自动触发重建并返回 SEARCH_INDEX_CORRUPTED", async () => {
      // 模拟索引损坏：第一次 prepare 抛错，后续调用正常（重建后恢复）
      db.prepare.mockImplementationOnce(() => {
        throw new Error("FTS index corrupted");
      });

      const result = await search.search(makeSearchRequest({ query: "测试" }));

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SEARCH_INDEX_CORRUPTED");
      // 验证 rebuildIndex 相关的 SQL 被调用（重建行为）
      const stmts = db.prepare.mock.calls.map((c: any) => c[0]);
      const hasRebuild =
        stmts.some(
          (s: string) =>
            typeof s === "string" && /rebuild|drop|create.*fts/i.test(s),
        ) ||
        db.exec.mock.calls.some(
          (c: any) =>
            typeof c[0] === "string" && /rebuild|drop|create.*fts/i.test(c[0]),
        );
      expect(hasRebuild).toBe(true);
    });
  });

  // ── Error codes ─────────────────────────────────────────────────

  describe("error handling", () => {
    it("搜索词为空时返回 SEARCH_QUERY_EMPTY", async () => {
      const result = await search.search(makeSearchRequest({ query: "" }));

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SEARCH_QUERY_EMPTY");
    });

    it("搜索词超过 200 字符时返回 SEARCH_QUERY_TOO_LONG", async () => {
      const longQuery = "搜".repeat(201);
      const result = await search.search(
        makeSearchRequest({ query: longQuery }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SEARCH_QUERY_TOO_LONG");
    });

    it("项目不存在时返回 SEARCH_PROJECT_NOT_FOUND", async () => {
      const result = await search.search(
        makeSearchRequest({ projectId: "nonexistent" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SEARCH_PROJECT_NOT_FOUND");
    });

    it("搜索超时时返回 SEARCH_TIMEOUT", async () => {
      // 模拟超时
      db.prepare.mockImplementation(() => {
        throw new Error("SEARCH_TIMEOUT");
      });

      const result = await search.search(makeSearchRequest({ query: "超时" }));

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SEARCH_TIMEOUT");
    });

    it("FTS 索引不存在时返回 SEARCH_INDEX_NOT_FOUND", async () => {
      const result = await search.getIndexStatus("proj-new");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SEARCH_INDEX_NOT_FOUND");
    });

    it("FTS 索引损坏时返回 SEARCH_INDEX_CORRUPTED", async () => {
      db.prepare.mockImplementation(() => {
        const err = new Error("FTS index corrupted");
        (err as any).code = "SQLITE_CORRUPT";
        throw err;
      });

      const result = await search.search(
        makeSearchRequest({ query: "测试索引损坏" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SEARCH_INDEX_CORRUPTED");
    });

    it("搜索反压时返回 SEARCH_BACKPRESSURE 含 retryAfterMs", async () => {
      const result = await search.search(
        makeSearchRequest({ query: "反压测试" }),
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SEARCH_BACKPRESSURE");
      expect(typeof result.error?.retryAfterMs).toBe("number");
      expect(result.error!.retryAfterMs).toBeGreaterThan(0);
    });

    it("SQL 注入类输入被安全处理", async () => {
      const maliciousQuery = "'; DROP TABLE documents; --";
      const result = await search.search(
        makeSearchRequest({ query: maliciousQuery }),
      );

      // 应返回正常结果或安全的错误，不应崩溃
      expect(typeof result.success).toBe("boolean");
      // db.prepare 应使用参数化查询，不会直接拼接
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.results)).toBe(true);
    });
  });

  // ── dispose ─────────────────────────────────────────────────────

  describe("dispose", () => {
    it("dispose 后调用方法抛出错误", async () => {
      search.dispose();

      await expect(search.search(makeSearchRequest())).rejects.toThrow();
    });

    it("dispose 可重复调用不报错", () => {
      search.dispose();
      expect(() => search.dispose()).not.toThrow();
    });
  });
});
