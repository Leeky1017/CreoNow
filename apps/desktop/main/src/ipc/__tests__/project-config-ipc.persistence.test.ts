import Database from "better-sqlite3";
import type { IpcMain } from "electron";
import { afterEach, describe, expect, it } from "vitest";

import { registerProjectIpcHandlers } from "../project";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

interface IpcResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function createHarness() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE projects (
      project_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      root_path TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      stage TEXT NOT NULL,
      target_word_count INTEGER,
      target_chapter_count INTEGER,
      narrative_person TEXT NOT NULL,
      language_style TEXT NOT NULL,
      target_audience TEXT NOT NULL,
      default_skill_set_id TEXT,
      knowledge_graph_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    );
    CREATE TABLE documents (
      document_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      content_text TEXT NOT NULL,
      content_md TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    );
  `);

  db.prepare(`
    INSERT INTO projects (
      project_id, name, root_path, type, description, stage,
      target_word_count, target_chapter_count, narrative_person,
      language_style, target_audience, default_skill_set_id,
      knowledge_graph_id, created_at, updated_at, archived_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(
    "proj-real",
    "真实项目",
    "/mock/projects/proj-real",
    "novel",
    "从持久化层读取",
    "draft",
    80000,
    12,
    "third-limited",
    "冷静克制",
    "成年人",
    null,
    "kg-real",
    1_720_000_000_000,
    1_720_000_100_000,
  );
  db.prepare(`
    INSERT INTO documents (
      document_id, project_id, title, content_json, content_text, content_md, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "doc-real-1",
    "proj-real",
    "第一章",
    JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "林远走进仓库" }] }],
    }),
    "林远走进仓库",
    "林远走进仓库",
    1_720_000_000_000,
    1_720_000_100_000,
  );
  db.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
  ).run("project:proj-real", "character:linyuan", JSON.stringify({ name: "林远" }), 1);
  db.prepare(
    "INSERT INTO settings (scope, key, value_json, updated_at) VALUES (?, ?, ?, ?)",
  ).run("project:proj-real", "location:warehouse", JSON.stringify({ name: "仓库" }), 1);

  const handlers = new Map<string, Handler>();
  const ipcMain = {
    handle: (channel: string, listener: Handler) => {
      handlers.set(channel, listener);
    },
  } as unknown as IpcMain;

  registerProjectIpcHandlers({
    ipcMain,
    db: db as never,
    userDataDir: "/mock/user-data",
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    } as never,
  });

  return {
    db,
    invoke: async <T>(channel: string, payload?: unknown) =>
      (await handlers.get(channel)?.({ sender: { id: 1 } }, payload)) as IpcResponse<T>,
  };
}

describe("project config IPC persistence path", () => {
  const databases: Array<InstanceType<typeof Database>> = [];

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.close();
    }
  });

  it("从持久化项目返回 config / documents / overview，并支持 round-trip 更新", async () => {
    const harness = createHarness();
    databases.push(harness.db);

    const config = await harness.invoke<{
      id: string;
      knowledgeGraphId: string | null;
      style: { narrativePerson: string; languageStyle: string; genre: string; tone: string };
      goals: { targetWordCount: number | null; targetChapterCount: number | null };
    }>("project:config:get", {
      projectId: "proj-real",
    });
    expect(config.ok).toBe(true);
    expect(config.data?.id).toBe("proj-real");
    expect(config.data?.knowledgeGraphId).toBe("kg-real");
    expect(config.data?.style.narrativePerson).toBe("third-limited");
    expect(config.data?.style.languageStyle).toBe("冷静克制");
    expect(config.data?.goals).toEqual({ targetWordCount: 80000, targetChapterCount: 12 });

    const documents = await harness.invoke<{ items: Array<{ id: string; title: string }> }>(
      "project:documents:list",
      { projectId: "proj-real" },
    );
    expect(documents.ok).toBe(true);
    expect(documents.data?.items).toEqual([
      expect.objectContaining({ id: "doc-real-1", title: "第一章" }),
    ]);

    const overview = await harness.invoke<{
      documentCount: number;
      chapterCount: number;
      characterCount: number;
      locationCount: number;
      totalWordCount: number;
    }>("project:overview:get", {
      projectId: "proj-real",
    });
    expect(overview.ok).toBe(true);
    expect(overview.data?.documentCount).toBe(1);
    expect(overview.data?.chapterCount).toBe(1);
    expect(overview.data?.characterCount).toBe(1);
    expect(overview.data?.locationCount).toBe(1);
    expect(overview.data?.totalWordCount).toBeGreaterThan(0);

    const updated = await harness.invoke<{
      knowledgeGraphId: string | null;
      style: { genre: string; tone: string };
      goals: { targetWordCount: number | null; targetChapterCount: number | null };
    }>("project:config:update", {
      projectId: "proj-real",
      patch: {
        style: { genre: "悬疑", tone: "克制" },
        goals: { targetWordCount: null, targetChapterCount: null },
        knowledgeGraphId: "kg-roundtrip",
      },
    });
    expect(updated.ok).toBe(true);
    expect(updated.data?.knowledgeGraphId).toBe("kg-roundtrip");
    expect(updated.data?.style.genre).toBe("悬疑");
    expect(updated.data?.style.tone).toBe("克制");
    expect(updated.data?.goals.targetWordCount).toBeNull();
    expect(updated.data?.goals.targetChapterCount).toBeNull();

    const reloaded = await harness.invoke<{
      knowledgeGraphId: string | null;
      style: { genre: string; tone: string };
      goals: { targetWordCount: number | null; targetChapterCount: number | null };
    }>("project:config:get", {
      projectId: "proj-real",
    });
    expect(reloaded.ok).toBe(true);
    expect(reloaded.data?.knowledgeGraphId).toBe("kg-roundtrip");
    expect(reloaded.data?.style.genre).toBe("悬疑");
    expect(reloaded.data?.style.tone).toBe("克制");
    expect(reloaded.data?.goals).toEqual({
      targetWordCount: null,
      targetChapterCount: null,
    });
  });

  it("project:project:update 允许用 null 清空 nullable 关联字段", async () => {
    const harness = createHarness();
    databases.push(harness.db);

    const seeded = await harness.invoke<{ updated: true }>("project:project:update", {
      projectId: "proj-real",
      patch: {
        defaultSkillSetId: "skill-real",
        knowledgeGraphId: "kg-linked",
      },
    });
    expect(seeded.ok).toBe(true);

    const cleared = await harness.invoke<{ updated: true }>("project:project:update", {
      projectId: "proj-real",
      patch: {
        defaultSkillSetId: null,
        knowledgeGraphId: null,
      },
    });
    expect(cleared.ok).toBe(true);
    expect(cleared.data).toEqual({ updated: true });

    const reloaded = await harness.invoke<{
      defaultSkillSetId: string | null;
      knowledgeGraphId: string | null;
    }>("project:config:get", {
      projectId: "proj-real",
    });
    expect(reloaded.ok).toBe(true);
    expect(reloaded.data?.defaultSkillSetId).toBeNull();
    expect(reloaded.data?.knowledgeGraphId).toBeNull();
  });
});
