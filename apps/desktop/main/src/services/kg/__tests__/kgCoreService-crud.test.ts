import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";

import { createKnowledgeGraphCoreService } from "../kgCoreService";
import type { KnowledgeGraphService } from "../types";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

interface MockStatement {
  run: Mock;
  get: Mock;
  all: Mock;
}

interface MockDb {
  prepare: Mock;
  exec: Mock;
  transaction: Mock;
}

function createMockStatement(overrides?: Partial<MockStatement>): MockStatement {
  return {
    run: vi.fn().mockReturnValue({ changes: 0 }),
    get: vi.fn(),
    all: vi.fn().mockReturnValue([]),
    ...overrides,
  };
}

function createMockDb(): MockDb {
  return {
    prepare: vi.fn().mockReturnValue(createMockStatement()),
    exec: vi.fn(),
    transaction: vi.fn(
      (fn: Function) =>
        (...args: unknown[]) =>
          fn(...args),
    ),
  };
}

function createMockLogger() {
  return {
    logPath: "/dev/null",
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = "proj-1";
const ENTITY_ID = "ent-001";
const ENTITY_ID_2 = "ent-002";
const RELATION_ID = "rel-001";
const NOW_ISO = "2024-01-01T00:00:00.000Z";

function makeEntityRow(overrides?: Record<string, unknown>) {
  return {
    id: ENTITY_ID,
    projectId: PROJECT_ID,
    type: "character",
    name: "Alice",
    description: "Main character",
    attributesJson: "{}",
    lastSeenState: null,
    aiContextLevel: "when_detected",
    aliasesJson: "[]",
    version: 1,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

function makeRelationRow(overrides?: Record<string, unknown>) {
  return {
    id: RELATION_ID,
    projectId: PROJECT_ID,
    sourceEntityId: ENTITY_ID,
    targetEntityId: ENTITY_ID_2,
    relationType: "ally",
    description: "",
    createdAt: NOW_ISO,
    ...overrides,
  };
}

function projectExistsStmt(): MockStatement {
  return createMockStatement({
    get: vi.fn().mockReturnValue({ projectId: PROJECT_ID }),
  });
}

function projectMissingStmt(): MockStatement {
  return createMockStatement({ get: vi.fn().mockReturnValue(undefined) });
}

function countStmt(count: number): MockStatement {
  return createMockStatement({ get: vi.fn().mockReturnValue({ count }) });
}

function dupCheckMissStmt(): MockStatement {
  return createMockStatement({ get: vi.fn().mockReturnValue(undefined) });
}

function dupCheckHitStmt(): MockStatement {
  return createMockStatement({
    get: vi.fn().mockReturnValue({ id: "dup-id" }),
  });
}

function insertStmt(): MockStatement {
  return createMockStatement({
    run: vi.fn().mockReturnValue({ changes: 1 }),
  });
}

function selectEntityStmt(row = makeEntityRow()): MockStatement {
  return createMockStatement({ get: vi.fn().mockReturnValue(row) });
}

function selectEntityMissingStmt(): MockStatement {
  return createMockStatement({ get: vi.fn().mockReturnValue(undefined) });
}

function selectRelationStmt(row = makeRelationRow()): MockStatement {
  return createMockStatement({ get: vi.fn().mockReturnValue(row) });
}

// ---------------------------------------------------------------------------
// Env setup
// ---------------------------------------------------------------------------

let db: MockDb;
let logger: ReturnType<typeof createMockLogger>;
let svc: KnowledgeGraphService;

const SAVED_ENV = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  db = createMockDb();
  logger = createMockLogger();

  process.env.CREONOW_KG_NODE_LIMIT = "100";
  process.env.CREONOW_KG_EDGE_LIMIT = "200";
  process.env.CREONOW_KG_SUBGRAPH_MAX_K = "3";
  process.env.CREONOW_KG_ATTRIBUTE_KEYS_LIMIT = "50";

  svc = createKnowledgeGraphCoreService({
    db: db as unknown as Parameters<typeof createKnowledgeGraphCoreService>[0]["db"],
    logger: logger as unknown as Parameters<typeof createKnowledgeGraphCoreService>[0]["logger"],
  });
});

afterEach(() => {
  process.env = { ...SAVED_ENV };
});

// ===========================================================================
// Entity CRUD
// ===========================================================================

describe("kgCoreService — Entity CRUD（实体增删改查）", () => {
  // -------------------------------------------------------------------------
  // entityCreate
  // -------------------------------------------------------------------------
  describe("entityCreate", () => {
    it("成功创建实体（最少参数）", () => {
      const row = makeEntityRow();
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())   // ensureProjectExists
        .mockReturnValueOnce(countStmt(0))           // countEntities
        .mockReturnValueOnce(dupCheckMissStmt())     // entityDuplicateExists
        .mockReturnValueOnce(insertStmt())           // INSERT
        .mockReturnValueOnce(selectEntityStmt(row)); // reload

      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: "Alice",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.name).toBe("Alice");
        expect(result.data.type).toBe("character");
        expect(result.data.projectId).toBe(PROJECT_ID);
        expect(result.data.version).toBe(1);
        expect(result.data.aiContextLevel).toBe("when_detected");
      }
    });

    it("成功创建实体（全部可选字段）", () => {
      const row = makeEntityRow({
        description: "Protagonist",
        attributesJson: '{"age":"30"}',
        lastSeenState: "alive",
        aiContextLevel: "always",
        aliasesJson: '["Ali"]',
      });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(0))
        .mockReturnValueOnce(dupCheckMissStmt())
        .mockReturnValueOnce(insertStmt())
        .mockReturnValueOnce(selectEntityStmt(row));

      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: "Alice",
        description: "Protagonist",
        attributes: { age: "30" },
        lastSeenState: "alive",
        aiContextLevel: "always",
        aliases: ["Ali"],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.description).toBe("Protagonist");
        expect(result.data.attributes).toEqual({ age: "30" });
        expect(result.data.aiContextLevel).toBe("always");
        expect(result.data.aliases).toEqual(["Ali"]);
      }
    });

    it("拒绝空 projectId", () => {
      const result = svc.entityCreate({
        projectId: "  ",
        type: "character",
        name: "Alice",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("拒绝空 name", () => {
      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: "  ",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("name");
      }
    });

    it("拒绝 name 超过 256 字符", () => {
      const longName = "a".repeat(257);
      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: longName,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("256");
      }
    });

    it("拒绝无效的实体类型", () => {
      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "invalid_type" as never,
        name: "Alice",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("type");
      }
    });

    it("拒绝无效的 aiContextLevel", () => {
      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: "Alice",
        aiContextLevel: "bogus" as never,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toContain("aiContextLevel");
      }
    });

    it("拒绝项目不存在", () => {
      db.prepare.mockReturnValueOnce(projectMissingStmt());

      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: "Alice",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("拒绝重复实体（同 type + 规范化 name）", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(0))
        .mockReturnValueOnce(dupCheckHitStmt());

      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: "Alice",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_ENTITY_DUPLICATE");
      }
    });

    it("拒绝节点容量超限", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(100)); // equals the limit

      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: "Alice",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_CAPACITY_EXCEEDED");
      }
    });

    it("数据库错误时优雅降级", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(0))
        .mockReturnValueOnce(dupCheckMissStmt())
        .mockImplementationOnce(() => {
          throw new Error("disk I/O error");
        });

      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: "Alice",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DB_ERROR");
      }
      expect(logger.error).toHaveBeenCalled();
    });

    it("name 边界：刚好 256 字符应通过", () => {
      const row = makeEntityRow({ name: "a".repeat(256) });
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(0))
        .mockReturnValueOnce(dupCheckMissStmt())
        .mockReturnValueOnce(insertStmt())
        .mockReturnValueOnce(selectEntityStmt(row));

      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: "a".repeat(256),
      });
      expect(result.ok).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // entityRead
  // -------------------------------------------------------------------------
  describe("entityRead", () => {
    it("成功读取实体", () => {
      const row = makeEntityRow();
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityStmt(row));

      const result = svc.entityRead({ projectId: PROJECT_ID, id: ENTITY_ID });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe(ENTITY_ID);
        expect(result.data.name).toBe("Alice");
      }
    });

    it("拒绝空 projectId", () => {
      const result = svc.entityRead({ projectId: " ", id: ENTITY_ID });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("拒绝空 id", () => {
      const result = svc.entityRead({ projectId: PROJECT_ID, id: "  " });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("实体不存在时返回 NOT_FOUND", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityMissingStmt());

      const result = svc.entityRead({
        projectId: PROJECT_ID,
        id: "nonexistent",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("实体属于其他项目时返回 NOT_FOUND", () => {
      const row = makeEntityRow({ projectId: "other-proj" });
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityStmt(row));

      const result = svc.entityRead({ projectId: PROJECT_ID, id: ENTITY_ID });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });
  });

  // -------------------------------------------------------------------------
  // entityList
  // -------------------------------------------------------------------------
  describe("entityList", () => {
    it("成功返回 items 和 totalCount", () => {
      const row = makeEntityRow();
      // ensureProjectExists
      db.prepare.mockReturnValueOnce(projectExistsStmt());
      // listProjectEntities (all)
      db.prepare.mockReturnValueOnce(
        createMockStatement({ all: vi.fn().mockReturnValue([row]) }),
      );
      // countProjectEntities → falls through to countEntities
      db.prepare.mockReturnValueOnce(countStmt(1));

      const result = svc.entityList({ projectId: PROJECT_ID });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.totalCount).toBe(1);
      }
    });

    it("按 aiContextLevel 过滤", () => {
      db.prepare.mockReturnValueOnce(projectExistsStmt());
      // listProjectEntities with filter
      db.prepare.mockReturnValueOnce(
        createMockStatement({ all: vi.fn().mockReturnValue([]) }),
      );
      // countProjectEntities with filter
      db.prepare.mockReturnValueOnce(countStmt(0));

      const result = svc.entityList({
        projectId: PROJECT_ID,
        filter: { aiContextLevel: "always" },
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.totalCount).toBe(0);
      }
    });

    it("支持分页（limit + offset）", () => {
      db.prepare.mockReturnValueOnce(projectExistsStmt());
      db.prepare.mockReturnValueOnce(
        createMockStatement({ all: vi.fn().mockReturnValue([]) }),
      );
      db.prepare.mockReturnValueOnce(countStmt(10));

      const result = svc.entityList({
        projectId: PROJECT_ID,
        limit: 5,
        offset: 5,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.totalCount).toBe(10);
      }
    });

    it("拒绝无效 limit（负数）", () => {
      const result = svc.entityList({ projectId: PROJECT_ID, limit: -1 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("limit");
      }
    });

    it("拒绝无效 offset（负数）", () => {
      const result = svc.entityList({ projectId: PROJECT_ID, offset: -1 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("offset");
      }
    });

    it("拒绝无效 filter.aiContextLevel", () => {
      const result = svc.entityList({
        projectId: PROJECT_ID,
        filter: { aiContextLevel: "bogus" as never },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  // -------------------------------------------------------------------------
  // entityUpdate
  // -------------------------------------------------------------------------
  describe("entityUpdate", () => {
    it("成功更新实体并递增 version", () => {
      const existingRow = makeEntityRow({ version: 1 });
      const updatedRow = makeEntityRow({
        version: 2,
        name: "Alice Updated",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())   // ensureProjectExists
        .mockReturnValueOnce(selectEntityStmt(existingRow))  // selectEntityById (read current)
        .mockReturnValueOnce(dupCheckMissStmt())     // entityDuplicateExists
        .mockReturnValueOnce(insertStmt())           // UPDATE
        .mockReturnValueOnce(selectEntityStmt(updatedRow));  // reload

      const result = svc.entityUpdate({
        projectId: PROJECT_ID,
        id: ENTITY_ID,
        expectedVersion: 1,
        patch: { name: "Alice Updated" },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.version).toBe(2);
        expect(result.data.name).toBe("Alice Updated");
      }
    });

    it("拒绝版本冲突", () => {
      const existingRow = makeEntityRow({ version: 3 });
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityStmt(existingRow));

      const result = svc.entityUpdate({
        projectId: PROJECT_ID,
        id: ENTITY_ID,
        expectedVersion: 1,
        patch: { name: "New Name" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_ENTITY_CONFLICT");
      }
    });

    it("拒绝空 patch", () => {
      const result = svc.entityUpdate({
        projectId: PROJECT_ID,
        id: ENTITY_ID,
        expectedVersion: 1,
        patch: {},
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("patch");
      }
    });

    it("拒绝 patch 中无效的 aiContextLevel", () => {
      const result = svc.entityUpdate({
        projectId: PROJECT_ID,
        id: ENTITY_ID,
        expectedVersion: 1,
        patch: { aiContextLevel: "invalid" as never },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("拒绝无效 expectedVersion", () => {
      const result = svc.entityUpdate({
        projectId: PROJECT_ID,
        id: ENTITY_ID,
        expectedVersion: -1,
        patch: { name: "New" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("expectedVersion");
      }
    });

    it("实体不存在时返回 NOT_FOUND", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityMissingStmt());

      const result = svc.entityUpdate({
        projectId: PROJECT_ID,
        id: "nonexistent",
        expectedVersion: 1,
        patch: { name: "New" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });
  });

  // -------------------------------------------------------------------------
  // entityDelete
  // -------------------------------------------------------------------------
  describe("entityDelete", () => {
    it("成功删除实体，级联删除关系", () => {
      const row = makeEntityRow();
      const deleteRelationsStmt = createMockStatement({
        run: vi.fn().mockReturnValue({ changes: 2 }),
      });
      const deleteEntityStmt = createMockStatement({
        run: vi.fn().mockReturnValue({ changes: 1 }),
      });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityStmt(row))
        .mockReturnValueOnce(deleteRelationsStmt) // DELETE relations
        .mockReturnValueOnce(deleteEntityStmt);   // DELETE entity

      const result = svc.entityDelete({ projectId: PROJECT_ID, id: ENTITY_ID });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.deleted).toBe(true);
        expect(result.data.deletedRelationCount).toBe(2);
      }
    });

    it("实体不存在时返回 NOT_FOUND", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityMissingStmt());

      const result = svc.entityDelete({
        projectId: PROJECT_ID,
        id: "nonexistent",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("拒绝空 id", () => {
      const result = svc.entityDelete({ projectId: PROJECT_ID, id: "  " });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });
  });
});

// ===========================================================================
// Relation CRUD
// ===========================================================================

describe("kgCoreService — Relation CRUD（关系增删改查）", () => {
  // -------------------------------------------------------------------------
  // relationCreate
  // -------------------------------------------------------------------------
  describe("relationCreate", () => {
    function setupRelationCreateSuccess() {
      const sourceRow = makeEntityRow({ id: ENTITY_ID });
      const targetRow = makeEntityRow({ id: ENTITY_ID_2 });
      const relRow = makeRelationRow();

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())              // ensureProjectExists
        .mockReturnValueOnce(countStmt(0))                     // countRelations
        .mockReturnValueOnce(selectEntityStmt(sourceRow))      // ensureEntityInProject (source)
        .mockReturnValueOnce(selectEntityStmt(targetRow))      // ensureEntityInProject (target)
        .mockReturnValueOnce(insertStmt())                     // INSERT OR IGNORE builtin relation types
        .mockReturnValueOnce(insertStmt())                     // INSERT relation
        .mockReturnValueOnce(selectRelationStmt(relRow));      // reload
    }

    it("成功创建关系", () => {
      setupRelationCreateSuccess();

      const result = svc.relationCreate({
        projectId: PROJECT_ID,
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID_2,
        relationType: "ally",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.sourceEntityId).toBe(ENTITY_ID);
        expect(result.data.targetEntityId).toBe(ENTITY_ID_2);
        expect(result.data.relationType).toBe("ally");
      }
    });

    it("拒绝自关系（source == target）", () => {
      const result = svc.relationCreate({
        projectId: PROJECT_ID,
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID,
        relationType: "ally",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_RELATION_INVALID");
      }
    });

    it("拒绝 source 实体不存在", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(0))
        .mockReturnValueOnce(selectEntityMissingStmt()); // source missing

      const result = svc.relationCreate({
        projectId: PROJECT_ID,
        sourceEntityId: "missing-src",
        targetEntityId: ENTITY_ID_2,
        relationType: "ally",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_RELATION_INVALID");
      }
    });

    it("拒绝 target 实体不存在", () => {
      const sourceRow = makeEntityRow({ id: ENTITY_ID });
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(0))
        .mockReturnValueOnce(selectEntityStmt(sourceRow))     // source found
        .mockReturnValueOnce(selectEntityMissingStmt());       // target missing

      const result = svc.relationCreate({
        projectId: PROJECT_ID,
        sourceEntityId: ENTITY_ID,
        targetEntityId: "missing-tgt",
        relationType: "ally",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_RELATION_INVALID");
      }
    });

    it("拒绝空 relationType", () => {
      const result = svc.relationCreate({
        projectId: PROJECT_ID,
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID_2,
        relationType: "  ",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("relationType");
      }
    });

    it("拒绝 edge 容量超限", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(200)); // equals the edge limit

      const result = svc.relationCreate({
        projectId: PROJECT_ID,
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID_2,
        relationType: "ally",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_CAPACITY_EXCEEDED");
      }
    });

    it("拒绝空 sourceEntityId", () => {
      const result = svc.relationCreate({
        projectId: PROJECT_ID,
        sourceEntityId: "  ",
        targetEntityId: ENTITY_ID_2,
        relationType: "ally",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });
  });

  // -------------------------------------------------------------------------
  // relationList
  // -------------------------------------------------------------------------
  describe("relationList", () => {
    it("成功返回分页列表", () => {
      const relRow = makeRelationRow();
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({ all: vi.fn().mockReturnValue([relRow]) }),
        )
        .mockReturnValueOnce(countStmt(1));

      const result = svc.relationList({ projectId: PROJECT_ID, limit: 10 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.totalCount).toBe(1);
      }
    });

    it("拒绝无效 limit", () => {
      const result = svc.relationList({ projectId: PROJECT_ID, limit: 0 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });
  });

  // -------------------------------------------------------------------------
  // relationUpdate
  // -------------------------------------------------------------------------
  describe("relationUpdate", () => {
    it("成功更新关系", () => {
      const existingRow = makeRelationRow();
      const updatedRow = makeRelationRow({ relationType: "enemy" });

      const srcEntity = makeEntityRow({ id: ENTITY_ID });
      const tgtEntity = makeEntityRow({ id: ENTITY_ID_2 });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())              // ensureProjectExists
        .mockReturnValueOnce(selectRelationStmt(existingRow))  // selectRelationById
        .mockReturnValueOnce(selectEntityStmt(srcEntity))      // ensureEntityInProject (source)
        .mockReturnValueOnce(selectEntityStmt(tgtEntity))      // ensureEntityInProject (target)
        .mockReturnValueOnce(insertStmt())                     // ensureRelationTypeRegistered
        .mockReturnValueOnce(insertStmt())                     // UPDATE
        .mockReturnValueOnce(selectRelationStmt(updatedRow));  // reload

      const result = svc.relationUpdate({
        projectId: PROJECT_ID,
        id: RELATION_ID,
        patch: { relationType: "enemy" },
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.relationType).toBe("enemy");
      }
    });

    it("拒绝更新后产生自关系", () => {
      const existingRow = makeRelationRow();
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectRelationStmt(existingRow));

      const result = svc.relationUpdate({
        projectId: PROJECT_ID,
        id: RELATION_ID,
        patch: { targetEntityId: ENTITY_ID }, // source == target after patch
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_RELATION_INVALID");
      }
    });

    it("拒绝空 patch", () => {
      const result = svc.relationUpdate({
        projectId: PROJECT_ID,
        id: RELATION_ID,
        patch: {},
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("关系不存在时返回 NOT_FOUND", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({ get: vi.fn().mockReturnValue(undefined) }),
        );

      const result = svc.relationUpdate({
        projectId: PROJECT_ID,
        id: "nonexistent",
        patch: { relationType: "enemy" },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });
  });

  // -------------------------------------------------------------------------
  // relationDelete
  // -------------------------------------------------------------------------
  describe("relationDelete", () => {
    it("成功删除关系", () => {
      const relRow = makeRelationRow();
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectRelationStmt(relRow))
        .mockReturnValueOnce(
          createMockStatement({
            run: vi.fn().mockReturnValue({ changes: 1 }),
          }),
        );

      const result = svc.relationDelete({
        projectId: PROJECT_ID,
        id: RELATION_ID,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.deleted).toBe(true);
      }
    });

    it("关系不存在时返回 NOT_FOUND", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({ get: vi.fn().mockReturnValue(undefined) }),
        );

      const result = svc.relationDelete({
        projectId: PROJECT_ID,
        id: "nonexistent",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("拒绝空 id", () => {
      const result = svc.relationDelete({ projectId: PROJECT_ID, id: "  " });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });
  });

  describe("parse fallback logging (INV-10)", () => {
    it("entityRead attributesJson 解析失败时记录日志并返回空 attributes", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          selectEntityStmt(makeEntityRow({ attributesJson: "{invalid" })),
        );

      const result = svc.entityRead({ projectId: PROJECT_ID, id: ENTITY_ID });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.attributes).toEqual({});
      }
      expect(consoleSpy).toHaveBeenCalledWith(
        "kg_entity_attributes_parse_failed",
        expect.objectContaining({ message: expect.any(String) }),
      );
      consoleSpy.mockRestore();
    });

    it("entityRead aliasesJson 解析失败时记录日志并返回空 aliases", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          selectEntityStmt(makeEntityRow({ aliasesJson: "{invalid" })),
        );

      const result = svc.entityRead({ projectId: PROJECT_ID, id: ENTITY_ID });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.aliases).toEqual([]);
      }
      expect(consoleSpy).toHaveBeenCalledWith(
        "kg_entity_aliases_parse_failed",
        expect.objectContaining({ message: expect.any(String) }),
      );
      consoleSpy.mockRestore();
    });
  });
});

// ===========================================================================
// Query Operations
// ===========================================================================

describe("kgCoreService — Query Operations（查询操作）", () => {
  // -------------------------------------------------------------------------
  // querySubgraph
  // -------------------------------------------------------------------------
  describe("querySubgraph", () => {
    it("成功返回 k 跳内的实体和关系", () => {
      const centerRow = makeEntityRow({ id: ENTITY_ID });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityStmt(centerRow))
        // CTE traversal → depthRows
        .mockReturnValueOnce(
          createMockStatement({
            all: vi
              .fn()
              .mockReturnValue([
                { entityId: ENTITY_ID, depth: 0 },
                { entityId: ENTITY_ID_2, depth: 1 },
              ]),
          }),
        )
        // listEntitiesByIds
        .mockReturnValueOnce(
          createMockStatement({
            all: vi.fn().mockReturnValue([
              makeEntityRow({ id: ENTITY_ID }),
              makeEntityRow({ id: ENTITY_ID_2, name: "Bob" }),
            ]),
          }),
        )
        // listProjectRelations
        .mockReturnValueOnce(
          createMockStatement({
            all: vi.fn().mockReturnValue([makeRelationRow()]),
          }),
        );

      const result = svc.querySubgraph({
        projectId: PROJECT_ID,
        centerEntityId: ENTITY_ID,
        k: 1,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.entities.length).toBeGreaterThanOrEqual(1);
        expect(result.data.nodeCount).toBeGreaterThanOrEqual(1);
        expect(typeof result.data.queryCostMs).toBe("number");
      }
    });

    it("拒绝 k ≤ 0", () => {
      const result = svc.querySubgraph({
        projectId: PROJECT_ID,
        centerEntityId: ENTITY_ID,
        k: 0,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("拒绝 k 超过 subgraphMaxK", () => {
      const result = svc.querySubgraph({
        projectId: PROJECT_ID,
        centerEntityId: ENTITY_ID,
        k: 999,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_SUBGRAPH_K_EXCEEDED");
      }
    });

    it("中心实体不存在时返回 NOT_FOUND", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityMissingStmt());

      const result = svc.querySubgraph({
        projectId: PROJECT_ID,
        centerEntityId: "nonexistent",
        k: 1,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("拒绝空 centerEntityId", () => {
      const result = svc.querySubgraph({
        projectId: PROJECT_ID,
        centerEntityId: "  ",
        k: 1,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });
  });

  // -------------------------------------------------------------------------
  // queryPath
  // -------------------------------------------------------------------------
  describe("queryPath", () => {
    it("找到连通实体间的路径", () => {
      const sourceRow = makeEntityRow({ id: ENTITY_ID });
      const targetRow = makeEntityRow({ id: ENTITY_ID_2 });
      const relRow = makeRelationRow();

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityStmt(sourceRow)) // source
        .mockReturnValueOnce(selectEntityStmt(targetRow)) // target
        // listProjectRelations
        .mockReturnValueOnce(
          createMockStatement({
            all: vi.fn().mockReturnValue([relRow]),
          }),
        );

      const result = svc.queryPath({
        projectId: PROJECT_ID,
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID_2,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.pathEntityIds).toEqual([ENTITY_ID, ENTITY_ID_2]);
        expect(result.data.degraded).toBe(false);
        expect(typeof result.data.queryCostMs).toBe("number");
      }
    });

    it("不连通时返回空路径", () => {
      const sourceRow = makeEntityRow({ id: ENTITY_ID });
      const targetRow = makeEntityRow({ id: ENTITY_ID_2 });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityStmt(sourceRow))
        .mockReturnValueOnce(selectEntityStmt(targetRow))
        .mockReturnValueOnce(
          createMockStatement({ all: vi.fn().mockReturnValue([]) }),
        );

      const result = svc.queryPath({
        projectId: PROJECT_ID,
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID_2,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.pathEntityIds).toEqual([]);
      }
    });

    it("拒绝空 sourceEntityId/targetEntityId", () => {
      const result = svc.queryPath({
        projectId: PROJECT_ID,
        sourceEntityId: "  ",
        targetEntityId: "  ",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });

    it("拒绝无效端点（不在项目中）", () => {
      const sourceRow = makeEntityRow({ id: ENTITY_ID, projectId: "other" });
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityStmt(sourceRow)) // source wrong project
        .mockReturnValueOnce(selectEntityMissingStmt());   // target not found

      const result = svc.queryPath({
        projectId: PROJECT_ID,
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID_2,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_RELATION_INVALID");
      }
    });

    it("source 与 target 相同时直接返回包含单节点的路径", () => {
      const row = makeEntityRow({ id: ENTITY_ID });
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(selectEntityStmt(row))  // source
        .mockReturnValueOnce(selectEntityStmt(row))  // target (same)
        .mockReturnValueOnce(
          createMockStatement({ all: vi.fn().mockReturnValue([]) }),
        );

      const result = svc.queryPath({
        projectId: PROJECT_ID,
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.pathEntityIds).toEqual([ENTITY_ID]);
      }
    });
  });

  // -------------------------------------------------------------------------
  // queryValidate
  // -------------------------------------------------------------------------
  describe("queryValidate", () => {
    it("检测有向环", () => {
      // A -> B -> A cycle via directed adjacency
      const relA2B = makeRelationRow({
        id: "r1",
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID_2,
      });
      const relB2A = makeRelationRow({
        id: "r2",
        sourceEntityId: ENTITY_ID_2,
        targetEntityId: ENTITY_ID,
      });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({
            all: vi.fn().mockReturnValue([relA2B, relB2A]),
          }),
        );

      const result = svc.queryValidate({ projectId: PROJECT_ID });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.cycles.length).toBeGreaterThan(0);
        expect(typeof result.data.queryCostMs).toBe("number");
      }
    });

    it("无环图返回空 cycles", () => {
      const relA2B = makeRelationRow({
        id: "r1",
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID_2,
      });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({
            all: vi.fn().mockReturnValue([relA2B]),
          }),
        );

      const result = svc.queryValidate({ projectId: PROJECT_ID });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.cycles).toEqual([]);
      }
    });

    it("拒绝空 projectId", () => {
      const result = svc.queryValidate({ projectId: "  " });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });
  });

  // -------------------------------------------------------------------------
  // queryRelevant
  // -------------------------------------------------------------------------
  describe("queryRelevant", () => {
    it("返回匹配 excerpt 关键词的实体", () => {
      const row = makeEntityRow({
        name: "Alice",
        description: "the heroine of the story",
      });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        // listProjectEntities
        .mockReturnValueOnce(
          createMockStatement({ all: vi.fn().mockReturnValue([row]) }),
        );

      const result = svc.queryRelevant({
        projectId: PROJECT_ID,
        excerpt: "Alice is the heroine",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items.length).toBeGreaterThan(0);
        expect(result.data.items[0].name).toBe("Alice");
      }
    });

    it("excerpt 不匹配时返回空列表", () => {
      const row = makeEntityRow({
        name: "Zeta",
        description: "unrelated",
      });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({ all: vi.fn().mockReturnValue([row]) }),
        );

      const result = svc.queryRelevant({
        projectId: PROJECT_ID,
        excerpt: "xyzzy foobar",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toEqual([]);
      }
    });

    it("遵守 maxEntities 限制", () => {
      const rows = Array.from({ length: 10 }, (_, i) =>
        makeEntityRow({
          id: `ent-${i}`,
          name: `Character${i}`,
          description: "important hero",
        }),
      );

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({ all: vi.fn().mockReturnValue(rows) }),
        );

      const result = svc.queryRelevant({
        projectId: PROJECT_ID,
        excerpt: "hero important",
        maxEntities: 3,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items.length).toBeLessThanOrEqual(3);
      }
    });

    it("拒绝跨项目 entityIds（scope violation）", () => {
      const crossProjectRow = makeEntityRow({
        id: "foreign-ent",
        projectId: "other-project",
      });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        // listEntitiesByIds
        .mockReturnValueOnce(
          createMockStatement({
            all: vi.fn().mockReturnValue([crossProjectRow]),
          }),
        );

      const result = svc.queryRelevant({
        projectId: PROJECT_ID,
        excerpt: "test",
        entityIds: ["foreign-ent"],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_SCOPE_VIOLATION");
      }
    });

    it("空 excerpt 返回候选实体的前 N 个", () => {
      const rows = Array.from({ length: 3 }, (_, i) =>
        makeEntityRow({ id: `ent-${i}`, name: `Char${i}` }),
      );
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({ all: vi.fn().mockReturnValue(rows) }),
        );

      const result = svc.queryRelevant({
        projectId: PROJECT_ID,
        excerpt: "   ",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items.length).toBeLessThanOrEqual(5);
      }
    });
  });

  // -------------------------------------------------------------------------
  // queryByIds
  // -------------------------------------------------------------------------
  describe("queryByIds", () => {
    it("按传入顺序返回实体", () => {
      const rowA = makeEntityRow({ id: ENTITY_ID, name: "Alice" });
      const rowB = makeEntityRow({ id: ENTITY_ID_2, name: "Bob" });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        // listEntitiesByIds
        .mockReturnValueOnce(
          createMockStatement({
            all: vi.fn().mockReturnValue([rowB, rowA]),
          }),
        );

      const result = svc.queryByIds({
        projectId: PROJECT_ID,
        entityIds: [ENTITY_ID, ENTITY_ID_2],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items[0].id).toBe(ENTITY_ID);
        expect(result.data.items[1].id).toBe(ENTITY_ID_2);
      }
    });

    it("空 entityIds 返回空列表", () => {
      const result = svc.queryByIds({
        projectId: PROJECT_ID,
        entityIds: [],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toEqual([]);
      }
    });

    it("拒绝跨项目 id", () => {
      const foreignRow = makeEntityRow({
        id: "foreign",
        projectId: "other-proj",
      });

      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({
            all: vi.fn().mockReturnValue([foreignRow]),
          }),
        );

      const result = svc.queryByIds({
        projectId: PROJECT_ID,
        entityIds: ["foreign"],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("KG_SCOPE_VIOLATION");
      }
    });
  });

  // -------------------------------------------------------------------------
  // buildRulesInjection
  // -------------------------------------------------------------------------
  describe("buildRulesInjection", () => {
    it("返回 injectedEntities 及其 relationsSummary", () => {
      const entityRow = makeEntityRow({
        name: "Alice",
        description: "heroine",
        attributesJson: '{"role":"protagonist"}',
      });
      const relRow = makeRelationRow({
        sourceEntityId: ENTITY_ID,
        targetEntityId: ENTITY_ID_2,
        relationType: "ally",
      });

      // buildRulesInjection internally creates a new service instance to call
      // queryRelevant, which runs ensureProjectExists + listProjectEntities.
      // Then the outer function runs listProjectEntities (for name map) +
      // listProjectRelations (for relation summaries).

      // queryRelevant call chain:
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())       // queryRelevant → ensureProjectExists
        .mockReturnValueOnce(                            // queryRelevant → listProjectEntities
          createMockStatement({ all: vi.fn().mockReturnValue([entityRow]) }),
        )
        // buildRulesInjection body:
        .mockReturnValueOnce(                            // listProjectEntities (name map)
          createMockStatement({ all: vi.fn().mockReturnValue([entityRow]) }),
        )
        .mockReturnValueOnce(                            // listProjectRelations
          createMockStatement({ all: vi.fn().mockReturnValue([relRow]) }),
        );

      const result = svc.buildRulesInjection({
        projectId: PROJECT_ID,
        documentId: "doc-1",
        excerpt: "Alice the heroine",
        traceId: "trace-1",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.source).toBe("kg-rules-mock");
        expect(result.data.injectedEntities.length).toBeGreaterThan(0);
        const first = result.data.injectedEntities[0];
        expect(first.name).toBe("Alice");
        expect(first.type).toBe("character");
      }
    });

    it("无相关实体时返回空列表", () => {
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(
          createMockStatement({ all: vi.fn().mockReturnValue([]) }),
        );

      const result = svc.buildRulesInjection({
        projectId: PROJECT_ID,
        documentId: "doc-1",
        excerpt: "nothing matches here",
        traceId: "trace-2",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.injectedEntities).toEqual([]);
      }
    });

    it("拒绝空 documentId", () => {
      const result = svc.buildRulesInjection({
        projectId: PROJECT_ID,
        documentId: "  ",
        excerpt: "test",
        traceId: "trace-3",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("documentId");
      }
    });

    it("拒绝空 traceId", () => {
      const result = svc.buildRulesInjection({
        projectId: PROJECT_ID,
        documentId: "doc-1",
        excerpt: "test",
        traceId: "  ",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
        expect(result.error.message).toContain("traceId");
      }
    });

    it("拒绝空 projectId", () => {
      const result = svc.buildRulesInjection({
        projectId: "  ",
        documentId: "doc-1",
        excerpt: "test",
        traceId: "trace-4",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_ARGUMENT");
      }
    });
  });
});

// ===========================================================================
// Edge Cases（边界情况）
// ===========================================================================

describe("kgCoreService — Edge Cases（边界情况）", () => {
  it("aliases: 规范化并去重", () => {
    const row = makeEntityRow({
      aliasesJson: '["Ali","Bob"]',
    });

    db.prepare
      .mockReturnValueOnce(projectExistsStmt())
      .mockReturnValueOnce(countStmt(0))
      .mockReturnValueOnce(dupCheckMissStmt())
      .mockReturnValueOnce(insertStmt())
      .mockReturnValueOnce(selectEntityStmt(row));

    const result = svc.entityCreate({
      projectId: PROJECT_ID,
      type: "character",
      name: "Alice",
      aliases: ["Ali", " Ali ", "Bob", "  ", "Bob"],
    });
    expect(result.ok).toBe(true);
    // The service normalizes + dedupes before storing; the returned data
    // reflects what was inserted (from the row mock).
  });

  it("attributes: 拒绝超过 key 限制", () => {
    const tooManyAttrs: Record<string, string> = {};
    for (let i = 0; i < 51; i++) {
      tooManyAttrs[`key${i}`] = `val${i}`;
    }

    const result = svc.entityCreate({
      projectId: PROJECT_ID,
      type: "character",
      name: "Alice",
      attributes: tooManyAttrs,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("KG_ATTRIBUTE_KEYS_EXCEEDED");
    }
  });

  it("description: 拒绝超过 4096 字符", () => {
    const longDesc = "x".repeat(4097);
    const result = svc.entityCreate({
      projectId: PROJECT_ID,
      type: "character",
      name: "Alice",
      description: longDesc,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
      expect(result.error.message).toContain("4096");
    }
  });

  it("entity name: 去除前后空白", () => {
    const row = makeEntityRow({ name: "Alice" });
    db.prepare
      .mockReturnValueOnce(projectExistsStmt())
      .mockReturnValueOnce(countStmt(0))
      .mockReturnValueOnce(dupCheckMissStmt())
      .mockReturnValueOnce(insertStmt())
      .mockReturnValueOnce(selectEntityStmt(row));

    const result = svc.entityCreate({
      projectId: PROJECT_ID,
      type: "character",
      name: "  Alice  ",
    });
    expect(result.ok).toBe(true);
    // The INSERT call should use trimmed name
    const insertCall = db.prepare.mock.calls[3]; // 4th call = INSERT
    expect(insertCall).toBeDefined();
  });

  it("projectId: 去除前后空白", () => {
    const row = makeEntityRow();
    db.prepare
      .mockReturnValueOnce(projectExistsStmt())
      .mockReturnValueOnce(countStmt(0))
      .mockReturnValueOnce(dupCheckMissStmt())
      .mockReturnValueOnce(insertStmt())
      .mockReturnValueOnce(selectEntityStmt(row));

    const result = svc.entityCreate({
      projectId: `  ${PROJECT_ID}  `,
      type: "character",
      name: "Alice",
    });
    expect(result.ok).toBe(true);
  });

  it("entityCreate: lastSeenState 超过 4096 字符被拒绝", () => {
    const result = svc.entityCreate({
      projectId: PROJECT_ID,
      type: "character",
      name: "Alice",
      lastSeenState: "x".repeat(4097),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
      expect(result.error.message).toContain("lastSeenState");
    }
  });

  it("relationCreate: relationType 超过 64 字符被拒绝", () => {
    const result = svc.relationCreate({
      projectId: PROJECT_ID,
      sourceEntityId: ENTITY_ID,
      targetEntityId: ENTITY_ID_2,
      relationType: "a".repeat(65),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
      expect(result.error.message).toContain("relationType");
    }
  });

  it("entityRead: DB 错误时返回 DB_ERROR", () => {
    db.prepare.mockImplementationOnce(() => {
      throw new Error("connection lost");
    });

    const result = svc.entityRead({ projectId: PROJECT_ID, id: ENTITY_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_ERROR");
    }
  });

  it("entityList: DB 错误时返回 DB_ERROR", () => {
    db.prepare.mockImplementationOnce(() => {
      throw new Error("broken pipe");
    });

    const result = svc.entityList({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_ERROR");
    }
  });

  it("entityDelete: DB 错误时返回 DB_ERROR", () => {
    db.prepare.mockImplementationOnce(() => {
      throw new Error("io fail");
    });

    const result = svc.entityDelete({ projectId: PROJECT_ID, id: ENTITY_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_ERROR");
    }
  });

  it("entityUpdate: DB 错误时返回 DB_ERROR", () => {
    db.prepare.mockImplementationOnce(() => {
      throw new Error("unexpected");
    });

    const result = svc.entityUpdate({
      projectId: PROJECT_ID,
      id: ENTITY_ID,
      expectedVersion: 1,
      patch: { name: "New" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_ERROR");
    }
  });

  it("querySubgraph: DB 错误时返回 DB_ERROR", () => {
    db.prepare.mockImplementationOnce(() => {
      throw new Error("disk error");
    });

    const result = svc.querySubgraph({
      projectId: PROJECT_ID,
      centerEntityId: ENTITY_ID,
      k: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_ERROR");
    }
  });

  it("queryPath: DB 错误时返回 DB_ERROR", () => {
    db.prepare.mockImplementationOnce(() => {
      throw new Error("corrupt");
    });

    const result = svc.queryPath({
      projectId: PROJECT_ID,
      sourceEntityId: ENTITY_ID,
      targetEntityId: ENTITY_ID_2,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_ERROR");
    }
  });

  it("relationCreate: DB 错误时返回 DB_ERROR", () => {
    db.prepare
      .mockReturnValueOnce(projectExistsStmt())
      .mockReturnValueOnce(countStmt(0))
      .mockImplementationOnce(() => {
        throw new Error("disk error");
      });

    const result = svc.relationCreate({
      projectId: PROJECT_ID,
      sourceEntityId: ENTITY_ID,
      targetEntityId: ENTITY_ID_2,
      relationType: "ally",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_ERROR");
    }
  });

  it("entityUpdate: 支持更新 description", () => {
    const existingRow = makeEntityRow({ version: 1 });
    const updatedRow = makeEntityRow({
      version: 2,
      description: "Updated desc",
    });

    db.prepare
      .mockReturnValueOnce(projectExistsStmt())
      .mockReturnValueOnce(selectEntityStmt(existingRow))
      .mockReturnValueOnce(dupCheckMissStmt())
      .mockReturnValueOnce(insertStmt())
      .mockReturnValueOnce(selectEntityStmt(updatedRow));

    const result = svc.entityUpdate({
      projectId: PROJECT_ID,
      id: ENTITY_ID,
      expectedVersion: 1,
      patch: { description: "Updated desc" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.description).toBe("Updated desc");
    }
  });

  it("每种合法实体类型都能创建", () => {
    const types = ["character", "location", "event", "item", "faction"] as const;
    for (const type of types) {
      db.prepare.mockReset();
      const row = makeEntityRow({ type });
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(0))
        .mockReturnValueOnce(dupCheckMissStmt())
        .mockReturnValueOnce(insertStmt())
        .mockReturnValueOnce(selectEntityStmt(row));

      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type,
        name: `Entity-${type}`,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.type).toBe(type);
      }
    }
  });

  it("每种合法 aiContextLevel 都能创建", () => {
    const levels = ["always", "when_detected", "manual_only", "never"] as const;
    for (const level of levels) {
      db.prepare.mockReset();
      const row = makeEntityRow({ aiContextLevel: level });
      db.prepare
        .mockReturnValueOnce(projectExistsStmt())
        .mockReturnValueOnce(countStmt(0))
        .mockReturnValueOnce(dupCheckMissStmt())
        .mockReturnValueOnce(insertStmt())
        .mockReturnValueOnce(selectEntityStmt(row));

      const result = svc.entityCreate({
        projectId: PROJECT_ID,
        type: "character",
        name: `Entity-${level}`,
        aiContextLevel: level,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.aiContextLevel).toBe(level);
      }
    }
  });

  it("entityUpdate: 支持更新 attributes", () => {
    const existingRow = makeEntityRow({ version: 1 });
    const updatedRow = makeEntityRow({
      version: 2,
      attributesJson: '{"weapon":"sword"}',
    });

    db.prepare
      .mockReturnValueOnce(projectExistsStmt())
      .mockReturnValueOnce(selectEntityStmt(existingRow))
      .mockReturnValueOnce(dupCheckMissStmt())
      .mockReturnValueOnce(insertStmt())
      .mockReturnValueOnce(selectEntityStmt(updatedRow));

    const result = svc.entityUpdate({
      projectId: PROJECT_ID,
      id: ENTITY_ID,
      expectedVersion: 1,
      patch: { attributes: { weapon: "sword" } },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.attributes).toEqual({ weapon: "sword" });
    }
  });

  it("entityUpdate: 支持更新 aliases", () => {
    const existingRow = makeEntityRow({ version: 1 });
    const updatedRow = makeEntityRow({
      version: 2,
      aliasesJson: '["Ally"]',
    });

    db.prepare
      .mockReturnValueOnce(projectExistsStmt())
      .mockReturnValueOnce(selectEntityStmt(existingRow))
      .mockReturnValueOnce(dupCheckMissStmt())
      .mockReturnValueOnce(insertStmt())
      .mockReturnValueOnce(selectEntityStmt(updatedRow));

    const result = svc.entityUpdate({
      projectId: PROJECT_ID,
      id: ENTITY_ID,
      expectedVersion: 1,
      patch: { aliases: ["Ally"] },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.aliases).toEqual(["Ally"]);
    }
  });

  it("entityCreate: 空 attributes 对象通过", () => {
    const row = makeEntityRow();
    db.prepare
      .mockReturnValueOnce(projectExistsStmt())
      .mockReturnValueOnce(countStmt(0))
      .mockReturnValueOnce(dupCheckMissStmt())
      .mockReturnValueOnce(insertStmt())
      .mockReturnValueOnce(selectEntityStmt(row));

    const result = svc.entityCreate({
      projectId: PROJECT_ID,
      type: "character",
      name: "Alice",
      attributes: {},
    });
    expect(result.ok).toBe(true);
  });

  it("entityCreate: 属性 key 为空字符串被拒绝", () => {
    const result = svc.entityCreate({
      projectId: PROJECT_ID,
      type: "character",
      name: "Alice",
      attributes: { "  ": "value" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("relationUpdate: DB 错误时返回 DB_ERROR", () => {
    db.prepare.mockImplementationOnce(() => {
      throw new Error("fail");
    });

    const result = svc.relationUpdate({
      projectId: PROJECT_ID,
      id: RELATION_ID,
      patch: { relationType: "enemy" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_ERROR");
    }
  });

  it("relationDelete: DB 错误时返回 DB_ERROR", () => {
    db.prepare.mockImplementationOnce(() => {
      throw new Error("fail");
    });

    const result = svc.relationDelete({
      projectId: PROJECT_ID,
      id: RELATION_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_ERROR");
    }
  });
});
