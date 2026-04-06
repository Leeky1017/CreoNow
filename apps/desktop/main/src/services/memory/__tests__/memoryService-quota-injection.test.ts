/**
 * memoryService — quota, expiry, batch, settings, injection tests
 *
 * Complements simple-memory.test.ts and memoryService.crud.test.ts by covering:
 * settings thresholds, injection modes, deterministic sort, scope validation edge
 * cases, and semantic degradation fallback.
 */
import { describe, it, expect, vi } from "vitest";

import type Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import {
  createMemoryService,
  deterministicMemorySort,
  formatMemoryInjectionBlock,
  type UserMemoryItem,
} from "../memoryService";

// ── helpers ──────────────────────────────────────────────────────────

function createLogger(): Logger {
  return { logPath: "<test>", info: vi.fn(), error: vi.fn() };
}

type MemoryRow = {
  memoryId: string;
  type: string;
  scope: string;
  projectId: string | null;
  documentId: string | null;
  origin: string;
  sourceRef: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

type SettingsRow = {
  scope: string;
  key: string;
  valueJson: string;
};

function makeMemoryRow(overrides?: Partial<MemoryRow>): MemoryRow {
  return {
    memoryId: "mem-1",
    type: "preference",
    scope: "global",
    projectId: null,
    documentId: null,
    origin: "manual",
    sourceRef: null,
    content: "Test memory content",
    createdAt: 1_700_000_000,
    updatedAt: 1_700_000_000,
    deletedAt: null,
    ...overrides,
  };
}

function createCrudDbStub(args?: {
  memories?: MemoryRow[];
  settings?: SettingsRow[];
  documentExists?: boolean;
  onInsertMemory?: (params: unknown[]) => void;
  onUpdateMemory?: (params: unknown[]) => void;
  onSoftDelete?: (params: unknown[]) => void;
}): Database.Database {
  const memories = [...(args?.memories ?? [])];
  const settings = [...(args?.settings ?? [])];
  const documentExists = args?.documentExists ?? true;

  const db = {
    prepare: (sql: string) => {
      // settings read
      if (
        sql.includes("FROM settings WHERE scope = ?") &&
        sql.includes("key = ?")
      ) {
        return {
          get: (scope: string, key: string) => {
            const row = settings.find(
              (s) => s.scope === scope && s.key === key,
            );
            return row ? { valueJson: row.valueJson } : undefined;
          },
        };
      }

      // settings upsert
      if (sql.includes("INSERT INTO settings")) {
        return {
          run: (...params: unknown[]) => {
            const [scope, key, valueJson] = params as [string, string, string];
            const idx = settings.findIndex(
              (s) => s.scope === scope && s.key === key,
            );
            if (idx >= 0) {
              settings[idx] = { scope, key, valueJson };
            } else {
              settings.push({ scope, key, valueJson });
            }
            return { changes: 1 };
          },
        };
      }

      // document FK check
      if (
        sql.includes("FROM documents WHERE document_id") &&
        sql.includes("project_id")
      ) {
        return {
          get: () => (documentExists ? { exists: 1 } : undefined),
        };
      }

      // memory select by ID
      if (
        sql.includes("FROM user_memory WHERE memory_id = ?")
      ) {
        return {
          get: (memoryId: string) =>
            memories.find((m) => m.memoryId === memoryId && m.deletedAt === null) ??
            memories.find((m) => m.memoryId === memoryId) ??
            undefined,
        };
      }

      // memory select for deleted_at check
      if (
        sql.includes("deleted_at as deletedAt FROM user_memory WHERE memory_id")
      ) {
        return {
          get: (memoryId: string) => {
            const m = memories.find((mem) => mem.memoryId === memoryId);
            return m ? { deletedAt: m.deletedAt } : undefined;
          },
        };
      }

      // memory list
      if (sql.includes("FROM user_memory") && sql.includes("WHERE")) {
        return {
          all: (..._params: unknown[]) =>
            memories.filter((m) => m.deletedAt === null),
        };
      }

      // memory insert
      if (sql.includes("INSERT INTO user_memory")) {
        return {
          run: (...params: unknown[]) => {
            args?.onInsertMemory?.(params);
            const [memoryId, type, scope, projectId, documentId, content, createdAt, updatedAt] =
              params as [string, string, string, string | null, string | null, string, number, number];
            memories.push({
              memoryId,
              type,
              scope,
              projectId,
              documentId,
              origin: "manual",
              sourceRef: null,
              content,
              createdAt,
              updatedAt,
              deletedAt: null,
            });
            return { changes: 1 };
          },
        };
      }

      // memory update
      if (sql.includes("UPDATE user_memory SET")) {
        return {
          run: (...params: unknown[]) => {
            args?.onUpdateMemory?.(params);
            return { changes: 1 };
          },
        };
      }

      return {
        get: () => undefined,
        all: () => [],
        run: () => ({ changes: 0 }),
      };
    },
    transaction: (fn: () => void) => {
      return () => fn();
    },
  } as unknown as Database.Database;

  return db;
}

function makeItem(overrides?: Partial<UserMemoryItem>): UserMemoryItem {
  return {
    memoryId: "mem-1",
    type: "preference",
    scope: "global",
    origin: "manual",
    content: "Test content",
    createdAt: 1_700_000_000,
    updatedAt: 1_700_000_000,
    ...overrides,
  };
}

// ── tests ────────────────────────────────────────────────────────────

describe("memoryService — settings", () => {
  it("getSettings returns defaults when no settings stored", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.getSettings();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.injectionEnabled).toBe(true);
      expect(res.data.preferenceLearningEnabled).toBe(true);
      expect(res.data.privacyModeEnabled).toBe(false);
      expect(res.data.preferenceLearningThreshold).toBe(3);
    }
  });

  it("updateSettings persists and returns updated values", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.updateSettings({
      patch: {
        injectionEnabled: false,
        preferenceLearningThreshold: 5,
      },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.injectionEnabled).toBe(false);
      expect(res.data.preferenceLearningThreshold).toBe(5);
    }
  });

  it("updateSettings rejects threshold outside 1-100", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.updateSettings({
      patch: { preferenceLearningThreshold: 0 },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }

    const res2 = svc.updateSettings({
      patch: { preferenceLearningThreshold: 101 },
    });
    expect(res2.ok).toBe(false);
  });

  it("updateSettings rejects non-integer threshold", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.updateSettings({
      patch: { preferenceLearningThreshold: 3.5 },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("updateSettings rejects empty patch", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.updateSettings({ patch: {} });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("memoryService — scope validation", () => {
  it("create global memory rejects projectId", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.create({
      type: "preference",
      scope: "global",
      projectId: "proj-1",
      content: "test",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
      expect(res.error.message).toContain("projectId");
    }
  });

  it("create project memory requires projectId", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.create({
      type: "fact",
      scope: "project",
      content: "test",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
      expect(res.error.message).toContain("projectId");
    }
  });

  it("create document memory requires both projectId and documentId", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.create({
      type: "note",
      scope: "document",
      projectId: "proj-1",
      content: "test",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
      expect(res.error.message).toContain("documentId");
    }
  });

  it("create document memory checks document FK", () => {
    const svc = createMemoryService({
      db: createCrudDbStub({ documentExists: false }),
      logger: createLogger(),
    });

    const res = svc.create({
      type: "note",
      scope: "document",
      projectId: "proj-1",
      documentId: "doc-999",
      content: "test",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });

  it("create rejects empty content", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.create({
      type: "preference",
      scope: "global",
      content: "   ",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("create rejects invalid type", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.create({
      type: "invalid" as "preference",
      scope: "global",
      content: "test",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("memoryService — update edge cases", () => {
  it("update rejects empty memoryId", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.update({
      memoryId: "  ",
      patch: { content: "new" },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("update rejects empty patch", () => {
    const svc = createMemoryService({
      db: createCrudDbStub({ memories: [makeMemoryRow()] }),
      logger: createLogger(),
    });

    const res = svc.update({
      memoryId: "mem-1",
      patch: {},
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("update NOT_FOUND for missing memory", () => {
    const svc = createMemoryService({
      db: createCrudDbStub({ memories: [] }),
      logger: createLogger(),
    });

    const res = svc.update({
      memoryId: "non-existent",
      patch: { content: "new" },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });

  it("update rejects documentId when scope is not document", () => {
    const row = makeMemoryRow({ scope: "project", projectId: "proj-1" });
    const svc = createMemoryService({
      db: createCrudDbStub({ memories: [row] }),
      logger: createLogger(),
    });

    const res = svc.update({
      memoryId: "mem-1",
      patch: { documentId: "doc-1" },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("memoryService — delete", () => {
  it("delete returns deleted: true for existing memory", () => {
    const row = makeMemoryRow();
    const svc = createMemoryService({
      db: createCrudDbStub({ memories: [row] }),
      logger: createLogger(),
    });

    const res = svc.delete({ memoryId: "mem-1" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.deleted).toBe(true);
    }
  });

  it("delete NOT_FOUND for missing memory", () => {
    const svc = createMemoryService({
      db: createCrudDbStub({ memories: [] }),
      logger: createLogger(),
    });

    const res = svc.delete({ memoryId: "non-existent" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });

  it("delete rejects empty memoryId", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.delete({ memoryId: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("memoryService — list and scope hierarchy", () => {
  it("list with documentId requires projectId", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.list({ documentId: "doc-1" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
      expect(res.error.message).toContain("projectId");
    }
  });
});

describe("memoryService — previewInjection", () => {
  it("returns empty items when injection is disabled", () => {
    const settings: SettingsRow[] = [
      {
        scope: "app",
        key: "creonow.memory.injectionEnabled",
        valueJson: JSON.stringify(false),
      },
    ];
    const svc = createMemoryService({
      db: createCrudDbStub({ settings }),
      logger: createLogger(),
    });

    const res = svc.previewInjection({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.items).toHaveLength(0);
      expect(res.data.mode).toBe("deterministic");
    }
  });

  it("previewInjection with documentId but no projectId returns error", () => {
    const svc = createMemoryService({
      db: createCrudDbStub(),
      logger: createLogger(),
    });

    const res = svc.previewInjection({ documentId: "doc-1" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("previewInjection without queryText returns deterministic mode", () => {
    const memories = [
      makeMemoryRow({ memoryId: "mem-1", type: "preference", scope: "global" }),
    ];
    const svc = createMemoryService({
      db: createCrudDbStub({ memories }),
      logger: createLogger(),
    });

    const res = svc.previewInjection({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.mode).toBe("deterministic");
      expect(res.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.data.items[0].reason).toEqual({ kind: "deterministic" });
    }
  });
});

describe("deterministicMemorySort", () => {
  it("sorts by scope rank: document < project < global", () => {
    const items: UserMemoryItem[] = [
      makeItem({ memoryId: "a", scope: "global", updatedAt: 100 }),
      makeItem({ memoryId: "b", scope: "document", projectId: "p", documentId: "d", updatedAt: 100 }),
      makeItem({ memoryId: "c", scope: "project", projectId: "p", updatedAt: 100 }),
    ];

    const sorted = deterministicMemorySort(items);
    expect(sorted[0].scope).toBe("document");
    expect(sorted[1].scope).toBe("project");
    expect(sorted[2].scope).toBe("global");
  });

  it("within same scope, sorts by type rank: preference < fact < note", () => {
    const items: UserMemoryItem[] = [
      makeItem({ memoryId: "a", type: "note", updatedAt: 100 }),
      makeItem({ memoryId: "b", type: "preference", updatedAt: 100 }),
      makeItem({ memoryId: "c", type: "fact", updatedAt: 100 }),
    ];

    const sorted = deterministicMemorySort(items);
    expect(sorted[0].type).toBe("preference");
    expect(sorted[1].type).toBe("fact");
    expect(sorted[2].type).toBe("note");
  });

  it("within same scope+type, sorts by updatedAt DESC then memoryId ASC", () => {
    const items: UserMemoryItem[] = [
      makeItem({ memoryId: "b", updatedAt: 100 }),
      makeItem({ memoryId: "a", updatedAt: 200 }),
      makeItem({ memoryId: "c", updatedAt: 100 }),
    ];

    const sorted = deterministicMemorySort(items);
    expect(sorted[0].memoryId).toBe("a");
    expect(sorted[1].memoryId).toBe("b");
    expect(sorted[2].memoryId).toBe("c");
  });
});

describe("formatMemoryInjectionBlock", () => {
  it("produces stable injection block format", () => {
    const items = [
      { type: "preference" as const, scope: "global" as const, content: "Dark mode" },
      { type: "fact" as const, scope: "project" as const, content: "Main character is Alice" },
    ];

    const block = formatMemoryInjectionBlock({ items });
    expect(block).toContain("=== CREONOW_MEMORY_START ===");
    expect(block).toContain("=== CREONOW_MEMORY_END ===");
    expect(block).toContain("(global/preference) Dark mode");
    expect(block).toContain("(project/fact) Main character is Alice");
  });

  it("produces empty block with headers for no items", () => {
    const block = formatMemoryInjectionBlock({ items: [] });
    expect(block).toContain("=== CREONOW_MEMORY_START ===");
    expect(block).toContain("=== CREONOW_MEMORY_END ===");
    const lines = block.split("\n");
    expect(lines).toHaveLength(2);
  });
});
