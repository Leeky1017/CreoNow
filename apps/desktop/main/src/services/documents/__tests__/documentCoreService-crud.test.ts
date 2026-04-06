/**
 * documentCoreService — CRUD, validation, navigation tests
 *
 * Tests create/read/update/delete/list/save/reorder/updateStatus/getCurrent/setCurrent.
 * Uses stub DB to avoid migration dependency; validates behavioral contracts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createDocumentCoreService } from "../documentCoreService";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../db/migrations",
);

const fakeLogger = {
  logPath: "<test>",
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

function applyMigrations(db: Database.Database): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && !file.includes("vec"))
    .sort();

  for (const file of files) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }
}

function seedProject(db: Database.Database, projectId: string): void {
  const ts = Date.now();
  db.prepare(
    "INSERT INTO projects (project_id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(projectId, "Test Project", "/test", ts, ts);
}

describe("documentCoreService — create", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("creates a document with default title based on type", () => {
    const res = svc.create({ projectId: "proj-1" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.documentId).toBeDefined();
    expect(res.data.documentId.length).toBeGreaterThan(0);
  });

  it("creates with explicit title", () => {
    const res = svc.create({ projectId: "proj-1", title: "My Chapter" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const readRes = svc.read({ projectId: "proj-1", documentId: res.data.documentId });
    expect(readRes.ok).toBe(true);
    if (readRes.ok) {
      expect(readRes.data.title).toBe("My Chapter");
    }
  });

  it("creates with different document types", () => {
    const types = ["chapter", "note", "setting", "timeline", "character"] as const;
    for (const type of types) {
      const res = svc.create({ projectId: "proj-1", type });
      expect(res.ok).toBe(true);
      if (res.ok) {
        const readRes = svc.read({ projectId: "proj-1", documentId: res.data.documentId });
        if (readRes.ok) {
          expect(readRes.data.type).toBe(type);
        }
      }
    }
  });

  it("rejects unsupported document type", () => {
    const res = svc.create({ projectId: "proj-1", type: "unsupported" as "chapter" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("documentCoreService — read", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("reads an existing document", () => {
    const created = svc.create({ projectId: "proj-1", title: "Read Test" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const res = svc.read({ projectId: "proj-1", documentId: created.data.documentId });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.title).toBe("Read Test");
      expect(res.data.projectId).toBe("proj-1");
      expect(res.data.status).toBe("draft");
    }
  });

  it("returns NOT_FOUND for missing document", () => {
    const res = svc.read({ projectId: "proj-1", documentId: "non-existent" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("documentCoreService — update", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("updates document title", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const res = svc.update({
      projectId: "proj-1",
      documentId: created.data.documentId,
      title: "New Title",
    });
    expect(res.ok).toBe(true);

    const readRes = svc.read({ projectId: "proj-1", documentId: created.data.documentId });
    if (readRes.ok) {
      expect(readRes.data.title).toBe("New Title");
    }
  });

  it("rejects empty title", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const res = svc.update({
      projectId: "proj-1",
      documentId: created.data.documentId,
      title: "   ",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects title exceeding 200 characters", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const longTitle = "a".repeat(201);
    const res = svc.update({
      projectId: "proj-1",
      documentId: created.data.documentId,
      title: longTitle,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects unsupported type in update", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const res = svc.update({
      projectId: "proj-1",
      documentId: created.data.documentId,
      type: "invalid_type" as "chapter",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects update with no fields", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const res = svc.update({
      projectId: "proj-1",
      documentId: created.data.documentId,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("NOT_FOUND for missing document update", () => {
    const res = svc.update({
      projectId: "proj-1",
      documentId: "non-existent",
      title: "Test",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });

  it("rejects invalid sortOrder", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const res = svc.update({
      projectId: "proj-1",
      documentId: created.data.documentId,
      sortOrder: -1,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("documentCoreService — delete", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("deletes an existing document", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const res = svc.delete({ projectId: "proj-1", documentId: created.data.documentId });
    expect(res.ok).toBe(true);

    const readRes = svc.read({ projectId: "proj-1", documentId: created.data.documentId });
    expect(readRes.ok).toBe(false);
  });

  it("NOT_FOUND for missing document delete", () => {
    const res = svc.delete({ projectId: "proj-1", documentId: "non-existent" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });

  it("creates replacement chapter when deleting the last document", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    svc.delete({ projectId: "proj-1", documentId: created.data.documentId });

    const listRes = svc.list({ projectId: "proj-1" });
    expect(listRes.ok).toBe(true);
    if (listRes.ok) {
      expect(listRes.data.items.length).toBe(1);
      expect(listRes.data.items[0].title).toBe("Untitled Chapter");
    }
  });
});

describe("documentCoreService — list", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("lists documents ordered by sortOrder", () => {
    svc.create({ projectId: "proj-1", title: "First" });
    svc.create({ projectId: "proj-1", title: "Second" });
    svc.create({ projectId: "proj-1", title: "Third" });

    const res = svc.list({ projectId: "proj-1" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.items).toHaveLength(3);
      expect(res.data.items[0].title).toBe("First");
      expect(res.data.items[1].title).toBe("Second");
      expect(res.data.items[2].title).toBe("Third");
    }
  });

  it("returns empty list for project with no documents", () => {
    const res = svc.list({ projectId: "proj-empty" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.items).toHaveLength(0);
    }
  });
});

describe("documentCoreService — save", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("saves content and returns contentHash", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const contentJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello, world!" }],
        },
      ],
    };

    const res = svc.save({
      projectId: "proj-1",
      documentId: created.data.documentId,
      contentJson,
      actor: "user",
      reason: "manual-save",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.contentHash).toBeDefined();
      expect(res.data.contentHash.length).toBeGreaterThan(0);
      expect(res.data.updatedAt).toBeGreaterThan(0);
    }
  });

  it("rejects actor/reason mismatch", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const res = svc.save({
      projectId: "proj-1",
      documentId: created.data.documentId,
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
      actor: "auto",
      reason: "manual-save",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects document exceeding 5MB size limit", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const hugeText = "x".repeat(6 * 1024 * 1024);
    const res = svc.save({
      projectId: "proj-1",
      documentId: created.data.documentId,
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: hugeText }] }],
      },
      actor: "user",
      reason: "manual-save",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("DOCUMENT_SIZE_EXCEEDED");
    }
  });

  it("save NOT_FOUND for missing document", () => {
    const res = svc.save({
      projectId: "proj-1",
      documentId: "non-existent",
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
      actor: "user",
      reason: "manual-save",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });

  it("save creates version snapshot", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    svc.save({
      projectId: "proj-1",
      documentId: created.data.documentId,
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "v1" }] }],
      },
      actor: "user",
      reason: "manual-save",
    });

    const versions = svc.listVersions({
      projectId: "proj-1",
      documentId: created.data.documentId,
    });

    expect(versions.ok).toBe(true);
    if (versions.ok) {
      expect(versions.data.items.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("documentCoreService — reorder", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("reorders documents", () => {
    const d1 = svc.create({ projectId: "proj-1", title: "A" });
    const d2 = svc.create({ projectId: "proj-1", title: "B" });
    const d3 = svc.create({ projectId: "proj-1", title: "C" });
    if (!d1.ok || !d2.ok || !d3.ok) return;

    const res = svc.reorder({
      projectId: "proj-1",
      orderedDocumentIds: [d3.data.documentId, d1.data.documentId, d2.data.documentId],
    });
    expect(res.ok).toBe(true);

    const listRes = svc.list({ projectId: "proj-1" });
    if (listRes.ok) {
      expect(listRes.data.items[0].title).toBe("C");
      expect(listRes.data.items[1].title).toBe("A");
      expect(listRes.data.items[2].title).toBe("B");
    }
  });

  it("rejects duplicate documentIds", () => {
    const res = svc.reorder({
      projectId: "proj-1",
      orderedDocumentIds: ["doc-1", "doc-1"],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("rejects empty orderedDocumentIds", () => {
    const res = svc.reorder({
      projectId: "proj-1",
      orderedDocumentIds: [],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });
});

describe("documentCoreService — updateStatus", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("updates status from draft to final", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const res = svc.updateStatus({
      projectId: "proj-1",
      documentId: created.data.documentId,
      status: "final",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe("final");
    }
  });

  it("rejects unsupported status", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const res = svc.updateStatus({
      projectId: "proj-1",
      documentId: created.data.documentId,
      status: "archived" as "draft",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("INVALID_ARGUMENT");
    }
  });

  it("status change creates a version snapshot", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    svc.updateStatus({
      projectId: "proj-1",
      documentId: created.data.documentId,
      status: "final",
    });

    const versions = svc.listVersions({
      projectId: "proj-1",
      documentId: created.data.documentId,
    });

    expect(versions.ok).toBe(true);
    if (versions.ok) {
      const statusVersions = versions.data.items.filter(
        (v) => v.reason === "status-change",
      );
      expect(statusVersions.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("documentCoreService — getCurrent / setCurrent", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("setCurrent + getCurrent round-trip", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const setRes = svc.setCurrent({
      projectId: "proj-1",
      documentId: created.data.documentId,
    });
    expect(setRes.ok).toBe(true);

    const getRes = svc.getCurrent({ projectId: "proj-1" });
    expect(getRes.ok).toBe(true);
    if (getRes.ok) {
      expect(getRes.data.documentId).toBe(created.data.documentId);
    }
  });

  it("getCurrent NOT_FOUND when no current set", () => {
    const res = svc.getCurrent({ projectId: "proj-1" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });

  it("getCurrent clears stale reference when document deleted", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    svc.setCurrent({ projectId: "proj-1", documentId: created.data.documentId });
    svc.delete({ projectId: "proj-1", documentId: created.data.documentId });

    const getRes = svc.getCurrent({ projectId: "proj-1" });
    if (getRes.ok) {
      expect(getRes.data.documentId).not.toBe(created.data.documentId);
    }
  });

  it("setCurrent rejects missing document", () => {
    const res = svc.setCurrent({ projectId: "proj-1", documentId: "non-existent" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("documentCoreService — version operations", () => {
  let db: Database.Database;
  let svc: ReturnType<typeof createDocumentCoreService>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    seedProject(db, "proj-1");
    svc = createDocumentCoreService({ db, logger: fakeLogger });
  });

  afterEach(() => {
    db.close();
  });

  it("listVersions returns versions after saves", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    svc.save({
      projectId: "proj-1",
      documentId: created.data.documentId,
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "v1" }] }],
      },
      actor: "user",
      reason: "manual-save",
    });
    svc.save({
      projectId: "proj-1",
      documentId: created.data.documentId,
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "v2" }] }],
      },
      actor: "user",
      reason: "manual-save",
    });

    const res = svc.listVersions({
      projectId: "proj-1",
      documentId: created.data.documentId,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.items.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("rollbackVersion restores content", () => {
    const created = svc.create({ projectId: "proj-1" });
    if (!created.ok) return;

    const v1Content = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Original" }] }],
    };
    svc.save({
      projectId: "proj-1",
      documentId: created.data.documentId,
      contentJson: v1Content,
      actor: "user",
      reason: "manual-save",
    });

    const versions = svc.listVersions({
      projectId: "proj-1",
      documentId: created.data.documentId,
    });
    if (!versions.ok || versions.data.items.length === 0) return;

    svc.save({
      projectId: "proj-1",
      documentId: created.data.documentId,
      contentJson: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Modified" }] }],
      },
      actor: "user",
      reason: "manual-save",
    });

    const rollbackRes = svc.rollbackVersion({
      projectId: "proj-1",
      documentId: created.data.documentId,
      versionId: versions.data.items[0].versionId,
    });
    expect(rollbackRes.ok).toBe(true);
    if (rollbackRes.ok) {
      expect(rollbackRes.data.restored).toBe(true);
      expect(rollbackRes.data.preRollbackVersionId.length).toBeGreaterThan(0);
      expect(rollbackRes.data.rollbackVersionId.length).toBeGreaterThan(0);
    }

    const readRes = svc.read({ projectId: "proj-1", documentId: created.data.documentId });
    if (readRes.ok) {
      expect(readRes.data.contentText).toContain("Original");
    }
  });
});
