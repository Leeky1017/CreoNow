/**
 * P1-04 Smoke Test: Skill Manifest Loader
 *
 * Verifies that:
 *   1. The SkillService can load real SKILL.md manifests from builtinSkillsDir
 *   2. Core skills (rewrite, polish, continue) are resolvable and have valid prompts
 *   3. The manifest-loaded skill IDs are compatible with the WritingOrchestrator's
 *      validSkillIds config — i.e., `orchestrator.execute({ skillId: 'builtin:rewrite' })`
 *      proceeds past validation without "Unknown skill" error
 *   4. The SkillRegistry correctly rejects truly unknown skill IDs
 *
 * INV-6: All Skill operations must go through the Skill pipeline (not bare LLM).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { createSkillService } from "../skillService";
import {
  createWritingOrchestrator,
  type OrchestratorConfig,
  type WritingRequest,
  type WritingEvent,
} from "../orchestrator";
import { createToolRegistry } from "../toolRegistry";

// ── helpers ──────────────────────────────────────────────────────────────────

function createNoopLogger() {
  return {
    logPath: "" as const,
    info: () => {},
    error: () => {},
  };
}

function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE projects (
      project_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      root_path TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'novel',
      description TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'outline',
      target_word_count INTEGER,
      target_chapter_count INTEGER,
      narrative_person TEXT NOT NULL DEFAULT 'first',
      language_style TEXT NOT NULL DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT '',
      default_skill_set_id TEXT,
      knowledge_graph_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    );
    CREATE TABLE documents (
      document_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'chapter',
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      content_text TEXT NOT NULL,
      content_md TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      cover_image_url TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );
    CREATE TABLE settings (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    );
    CREATE TABLE skills (
      skill_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL,
      valid INTEGER NOT NULL,
      error_code TEXT,
      error_message TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE custom_skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      input_type TEXT NOT NULL,
      context_rules TEXT NOT NULL,
      scope TEXT NOT NULL,
      project_id TEXT,
      enabled INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return db;
}

/**
 * Write a minimal SKILL.md manifest into the given builtinSkillsDir.
 */
function writeSkillManifest(args: {
  builtinSkillsDir: string;
  skillName: string;
  skillId: string;
  inputType?: "selection" | "document";
}): void {
  const filePath = path.join(
    args.builtinSkillsDir,
    "packages",
    "pkg.creonow.builtin",
    "1.0.0",
    "skills",
    args.skillName,
    "SKILL.md",
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---
id: ${args.skillId}
name: ${args.skillName}
description: Smoke test skill
version: "1.0.0"
tags: ["test"]
kind: single
scope: builtin
packageId: pkg.creonow.builtin
context_rules:
  surrounding: 500
  user_preferences: true
  style_guide: false
  characters: false
  outline: false
  recent_summary: 0
  knowledge_graph: false
prompt:
  system: |
    You are a writing assistant.
  user: |
    Process the following text.

    {{input}}
---

# ${args.skillId}
`,
    "utf8",
  );
}

/** Collect all events from an async generator. */
async function collectEvents(gen: AsyncGenerator<WritingEvent>): Promise<WritingEvent[]> {
  const events: WritingEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

/** Build an OrchestratorConfig with mocked AI + permission + tools. */
function buildOrchestratorConfig(overrides: Partial<OrchestratorConfig> = {}): OrchestratorConfig {
  const toolRegistry = createToolRegistry();
  toolRegistry.register({
    name: "documentRead",
    description: "Read document text",
    isConcurrencySafe: true,
    execute: vi.fn().mockResolvedValue({ success: true, data: "text" }),
  });
  toolRegistry.register({
    name: "documentWrite",
    description: "Write text to document",
    isConcurrencySafe: false,
    execute: vi.fn().mockResolvedValue({ success: true, data: { versionId: "snap-001" } }),
  });
  toolRegistry.register({
    name: "versionSnapshot",
    description: "Create version snapshot",
    isConcurrencySafe: false,
    execute: vi.fn().mockResolvedValue({ success: true, data: { versionId: "snap-pre-001" } }),
  });

  return {
    aiService: {
      async *streamChat(_messages, options) {
        options.onApiCallStarted?.();
        yield { delta: "result text", finishReason: "stop", accumulatedTokens: 2 };
        options.onComplete({ content: "result text", usage: { promptTokens: 5, completionTokens: 2, totalTokens: 7, cachedTokens: 0 }, wasRetried: false });
      },
      estimateTokens: (text: string) => Math.ceil(text.length / 4),
      abort: vi.fn(),
    },
    toolRegistry,
    permissionGate: {
      confirmTimeoutMs: 120_000,
      evaluate: vi.fn().mockResolvedValue({ level: "preview-confirm", granted: true }),
      requestPermission: vi.fn().mockResolvedValue(true),
      releasePendingPermission: vi.fn(),
    },
    postWritingHooks: [],
    defaultTimeoutMs: 30_000,
    ...overrides,
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("P1-04 Skill Manifest Loader — smoke", () => {
  let tmpDir: string;
  let builtinSkillsDir: string;
  let userDataDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "creonow-manifest-smoke-"));
    builtinSkillsDir = path.join(tmpDir, "builtin-skills");
    userDataDir = path.join(tmpDir, "user-data");
    fs.mkdirSync(builtinSkillsDir, { recursive: true });
    fs.mkdirSync(userDataDir, { recursive: true });
  });

  it("SMK-01: skillService.list() returns all installed SKILL.md manifests", () => {
    // Write 3 manifests
    writeSkillManifest({ builtinSkillsDir, skillName: "rewrite", skillId: "builtin:rewrite" });
    writeSkillManifest({ builtinSkillsDir, skillName: "polish", skillId: "builtin:polish" });
    writeSkillManifest({ builtinSkillsDir, skillName: "continue", skillId: "builtin:continue", inputType: "document" });

    const db = createTestDb();
    const svc = createSkillService({ db, userDataDir, builtinSkillsDir, logger: createNoopLogger() });

    const listed = svc.list({ includeDisabled: false });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const ids = listed.data.items.map((i) => i.id);
    expect(ids).toContain("builtin:rewrite");
    expect(ids).toContain("builtin:polish");
    expect(ids).toContain("builtin:continue");
  });

  it("SMK-02: resolveForRun returns valid skill with prompt for rewrite/polish/continue", () => {
    writeSkillManifest({ builtinSkillsDir, skillName: "rewrite", skillId: "builtin:rewrite" });
    writeSkillManifest({ builtinSkillsDir, skillName: "polish", skillId: "builtin:polish" });
    writeSkillManifest({ builtinSkillsDir, skillName: "continue", skillId: "builtin:continue", inputType: "document" });

    const db = createTestDb();
    const svc = createSkillService({ db, userDataDir, builtinSkillsDir, logger: createNoopLogger() });

    for (const skillId of ["builtin:rewrite", "builtin:polish", "builtin:continue"]) {
      const resolved = svc.resolveForRun({ id: skillId });
      expect(resolved.ok, `${skillId} resolveForRun should succeed`).toBe(true);
      if (!resolved.ok) continue;
      expect(resolved.data.skill.valid, `${skillId} should be valid`).toBe(true);
      expect(resolved.data.skill.prompt?.system.length, `${skillId} should have system prompt`).toBeGreaterThan(0);
      expect(resolved.data.skill.prompt?.user.length, `${skillId} should have user prompt`).toBeGreaterThan(0);
    }
  });

  it("SMK-03: WritingOrchestrator with manifest-loaded validSkillIds accepts rewrite/polish/continue", async () => {
    writeSkillManifest({ builtinSkillsDir, skillName: "rewrite", skillId: "builtin:rewrite" });
    writeSkillManifest({ builtinSkillsDir, skillName: "polish", skillId: "builtin:polish" });
    writeSkillManifest({ builtinSkillsDir, skillName: "continue", skillId: "builtin:continue", inputType: "document" });

    const db = createTestDb();
    const svc = createSkillService({ db, userDataDir, builtinSkillsDir, logger: createNoopLogger() });
    const listed = svc.list({ includeDisabled: false });
    assert(listed.ok, "list must succeed");

    // Simulate what ai.ts does: extract leaf IDs from manifests
    const validSkillIds = listed.data.items
      .filter((item) => item.valid)
      .map((item) => {
        const parts = item.id.split(":");
        return parts[parts.length - 1] ?? item.id;
      });

    expect(validSkillIds).toContain("rewrite");
    expect(validSkillIds).toContain("polish");
    expect(validSkillIds).toContain("continue");

    // Verify the orchestrator accepts these skill IDs
    const orchestrator = createWritingOrchestrator(
      buildOrchestratorConfig({ validSkillIds }),
    );

    const request: WritingRequest = {
      requestId: "test-req-001",
      skillId: "builtin:rewrite",
      documentId: "doc-001",
      input: { selectedText: "Some text to rewrite." },
      selection: { from: 0, to: 21, text: "Some text to rewrite.", selectionTextHash: "abc" },
    };

    const events = await collectEvents(orchestrator.execute(request));
    const errorEvent = events.find((e) => e.type === "error");

    // Should NOT have SKILL_INPUT_INVALID — rewrite is now accepted
    if (errorEvent) {
      const err = (errorEvent as unknown as { error: { code: string } }).error;
      expect(err.code).not.toBe("SKILL_INPUT_INVALID");
    }
    expect(events.some((e) => e.type === "intent-resolved")).toBe(true);

    orchestrator.dispose();
  });

  it("SMK-04: WritingOrchestrator still rejects truly unknown skill IDs", async () => {
    writeSkillManifest({ builtinSkillsDir, skillName: "rewrite", skillId: "builtin:rewrite" });

    const db = createTestDb();
    const svc = createSkillService({ db, userDataDir, builtinSkillsDir, logger: createNoopLogger() });
    const listed = svc.list({ includeDisabled: false });
    assert(listed.ok, "list must succeed");

    const validSkillIds = listed.data.items
      .filter((item) => item.valid)
      .map((item) => {
        const parts = item.id.split(":");
        return parts[parts.length - 1] ?? item.id;
      });

    const orchestrator = createWritingOrchestrator(
      buildOrchestratorConfig({ validSkillIds }),
    );

    const request: WritingRequest = {
      requestId: "test-req-002",
      skillId: "nonexistent-skill",
      documentId: "doc-001",
      input: { selectedText: "text" },
    };

    const events = await collectEvents(orchestrator.execute(request));
    const errorEvent = events.find((e) => e.type === "error");

    expect(errorEvent).toBeDefined();
    const err = (errorEvent as unknown as { error: { code: string } }).error;
    expect(err.code).toBe("SKILL_INPUT_INVALID");

    orchestrator.dispose();
  });

  it("SMK-05: manifest-loaded IDs include skills beyond the legacy VALID_SKILL_IDS whitelist", () => {
    // Write manifests for skills that were NOT in the old hardcoded list
    writeSkillManifest({ builtinSkillsDir, skillName: "brainstorm", skillId: "builtin:brainstorm" });
    writeSkillManifest({ builtinSkillsDir, skillName: "chat", skillId: "builtin:chat" });
    writeSkillManifest({ builtinSkillsDir, skillName: "shrink", skillId: "builtin:shrink" });

    const db = createTestDb();
    const svc = createSkillService({ db, userDataDir, builtinSkillsDir, logger: createNoopLogger() });
    const listed = svc.list({ includeDisabled: false });
    assert(listed.ok, "list must succeed");

    // Verify all 3 are discovered (regardless of validity — discovery correctness is what matters here)
    const discoveredIds = listed.data.items.map((i) => i.id);
    expect(discoveredIds).toContain("builtin:brainstorm");
    expect(discoveredIds).toContain("builtin:chat");
    expect(discoveredIds).toContain("builtin:shrink");

    const validSkillIds = listed.data.items
      .filter((item) => item.valid)
      .map((item) => {
        const parts = item.id.split(":");
        return parts[parts.length - 1] ?? item.id;
      });

    // All three should be present in the runtime-loaded list (all use valid minimal manifests)
    expect(validSkillIds).toContain("brainstorm");
    expect(validSkillIds).toContain("chat");
    expect(validSkillIds).toContain("shrink");
  });
});
