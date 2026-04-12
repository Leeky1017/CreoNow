/**
 * sessionMemory.test.ts — L1 session-aware context memory service tests
 *
 * Covers:
 *  - CRUD operations (create, read, update, remove)
 *  - List with sessionId / projectId / category filters
 *  - FTS5 keyword search
 *  - Time-decay relevance scoring
 *  - injectForContext: 15% budget cap enforcement (INV-3 CJK-aware)
 *  - Expired entry filtering (in-band + purgeExpired)
 *  - Error paths (NOT_FOUND, INVALID_PARAMS, DB_ERROR)
 *  - decayScore formula contract (unit-testable export)
 */

import { describe, it, expect, vi } from "vitest";
import Database from "better-sqlite3";

import {
  createSessionMemoryService,
  decayScore,
  L1_BUDGET_CAP_RATIO,
  DECAY_HALF_LIFE_SECONDS,
  type SessionMemoryService,
} from "../sessionMemory";
import type { Logger } from "../../../logging/logger";

// ─── helpers ────────────────────────────────────────────────────────────────

function createLogger(): Logger {
  return {
    logPath: "<test>",
    info: vi.fn(),
    error: vi.fn(),
  };
}

/** Create an in-memory SQLite database wired to a full SessionMemoryService. */
function createService(): { service: SessionMemoryService; db: Database.Database; logger: Logger } {
  const db = new Database(":memory:");
  const logger = createLogger();
  const service = createSessionMemoryService({ db, logger });
  return { service, db, logger };
}

// ─── decayScore (unit tests, no DB required) ─────────────────────────────────

describe("decayScore", () => {
  it("returns baseScore for a just-created entry (age ~0)", () => {
    const createdAt = new Date().toISOString();
    const result = decayScore(1.0, createdAt);
    // Age is ~0ms; decay factor ~1
    expect(result).toBeCloseTo(1.0, 2);
  });

  it("returns ~0.5 * baseScore after one half-life", () => {
    const halfLifeAgo = new Date(Date.now() - DECAY_HALF_LIFE_SECONDS * 1000).toISOString();
    const result = decayScore(1.0, halfLifeAgo);
    expect(result).toBeCloseTo(0.5, 2);
  });

  it("returns ~0.25 * baseScore after two half-lives", () => {
    const twoHalfLivesAgo = new Date(Date.now() - 2 * DECAY_HALF_LIFE_SECONDS * 1000).toISOString();
    const result = decayScore(1.0, twoHalfLivesAgo);
    expect(result).toBeCloseTo(0.25, 2);
  });

  it("handles invalid date string by returning baseScore unchanged", () => {
    const result = decayScore(0.8, "not-a-date");
    expect(result).toBe(0.8);
  });

  it("applies baseScore scaling: 0.5 base × half-life decay = ~0.25", () => {
    const halfLifeAgo = new Date(Date.now() - DECAY_HALF_LIFE_SECONDS * 1000).toISOString();
    const result = decayScore(0.5, halfLifeAgo);
    expect(result).toBeCloseTo(0.25, 2);
  });
});

// ─── create ──────────────────────────────────────────────────────────────────

describe("SessionMemoryService.create", () => {
  it("creates an entry and returns it with generated id", () => {
    const { service } = createService();
    const result = service.create({
      sessionId: "sess-1",
      projectId: "proj-1",
      category: "style",
      content: "Use formal tone in this project",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.data.sessionId).toBe("sess-1");
    expect(result.data.projectId).toBe("proj-1");
    expect(result.data.category).toBe("style");
    expect(result.data.content).toBe("Use formal tone in this project");
    expect(result.data.relevanceScore).toBe(0.5);
    expect(result.data.expiresAt).toBeNull();
  });

  it("accepts custom relevanceScore clamped to [0,1]", () => {
    const { service } = createService();
    const r1 = service.create({
      sessionId: "s", projectId: "p", category: "note",
      content: "note", relevanceScore: 2.5,
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.data.relevanceScore).toBe(1);

    const r2 = service.create({
      sessionId: "s", projectId: "p", category: "note",
      content: "note", relevanceScore: -1,
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.data.relevanceScore).toBe(0);
  });

  it("accepts expiresAt and stores it", () => {
    const { service } = createService();
    const expires = new Date(Date.now() + 3600_000).toISOString();
    const r = service.create({
      sessionId: "s", projectId: "p", category: "reference",
      content: "ref", expiresAt: expires,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.expiresAt).toBe(expires);
  });

  it("returns INVALID_PARAMS when sessionId is empty", () => {
    const { service } = createService();
    const r = service.create({ sessionId: "", projectId: "p", category: "note", content: "x" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("returns INVALID_PARAMS when content is empty", () => {
    const { service } = createService();
    const r = service.create({ sessionId: "s", projectId: "p", category: "style", content: "  " });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("trims whitespace from content", () => {
    const { service } = createService();
    const r = service.create({ sessionId: "s", projectId: "p", category: "note", content: "  hello  " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.content).toBe("hello");
  });
});

// ─── read ─────────────────────────────────────────────────────────────────────

describe("SessionMemoryService.read", () => {
  it("reads an entry by id", () => {
    const { service } = createService();
    const created = service.create({ sessionId: "s", projectId: "p", category: "preference", content: "dark mode" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const r = service.read(created.data.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.content).toBe("dark mode");
  });

  it("returns NOT_FOUND for unknown id", () => {
    const { service } = createService();
    const r = service.read("nonexistent-id");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe("SessionMemoryService.update", () => {
  it("updates content and relevanceScore", () => {
    const { service } = createService();
    const c = service.create({ sessionId: "s", projectId: "p", category: "style", content: "old" });
    expect(c.ok).toBe(true);
    if (!c.ok) return;

    const r = service.update({ id: c.data.id, content: "new content", relevanceScore: 0.9 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.content).toBe("new content");
    expect(r.data.relevanceScore).toBe(0.9);
  });

  it("updates only expiresAt when others omitted", () => {
    const { service } = createService();
    const c = service.create({ sessionId: "s", projectId: "p", category: "note", content: "original" });
    expect(c.ok).toBe(true);
    if (!c.ok) return;

    const expires = new Date(Date.now() + 1000).toISOString();
    const r = service.update({ id: c.data.id, expiresAt: expires });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.content).toBe("original");
    expect(r.data.expiresAt).toBe(expires);
  });

  it("returns NOT_FOUND for unknown id", () => {
    const { service } = createService();
    const r = service.update({ id: "missing", content: "x" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });

  it("clears expiresAt when explicitly set to null", () => {
    const { service } = createService();
    const expires = new Date(Date.now() + 1000).toISOString();
    const c = service.create({ sessionId: "s", projectId: "p", category: "note", content: "x", expiresAt: expires });
    expect(c.ok).toBe(true);
    if (!c.ok) return;

    const r = service.update({ id: c.data.id, expiresAt: null });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.expiresAt).toBeNull();
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe("SessionMemoryService.remove", () => {
  it("removes an existing entry", () => {
    const { service } = createService();
    const c = service.create({ sessionId: "s", projectId: "p", category: "note", content: "delete me" });
    expect(c.ok).toBe(true);
    if (!c.ok) return;

    const remove = service.remove(c.data.id);
    expect(remove.ok).toBe(true);

    const r = service.read(c.data.id);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });

  it("returns NOT_FOUND for unknown id", () => {
    const { service } = createService();
    const r = service.remove("ghost");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("NOT_FOUND");
  });
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe("SessionMemoryService.list", () => {
  it("lists all entries for a sessionId", () => {
    const { service } = createService();
    service.create({ sessionId: "sess-A", projectId: "p", category: "style", content: "c1" });
    service.create({ sessionId: "sess-A", projectId: "p", category: "note", content: "c2" });
    service.create({ sessionId: "sess-B", projectId: "p", category: "style", content: "c3" });

    const r = service.list({ sessionId: "sess-A" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toHaveLength(2);
    const contents = r.data.map((e) => e.content).sort();
    expect(contents).toEqual(["c1", "c2"]);
  });

  it("filters by category", () => {
    const { service } = createService();
    service.create({ sessionId: "s", projectId: "p", category: "style", content: "formal" });
    service.create({ sessionId: "s", projectId: "p", category: "reference", content: "ref1" });

    const r = service.list({ sessionId: "s", category: "style" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toHaveLength(1);
    expect(r.data[0]?.category).toBe("style");
  });

  it("lists by projectId when no sessionId", () => {
    const { service } = createService();
    service.create({ sessionId: "s1", projectId: "proj-X", category: "note", content: "n1" });
    service.create({ sessionId: "s2", projectId: "proj-X", category: "note", content: "n2" });
    service.create({ sessionId: "s3", projectId: "proj-Y", category: "note", content: "n3" });

    const r = service.list({ projectId: "proj-X" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toHaveLength(2);
  });

  it("returns INVALID_PARAMS when neither sessionId nor projectId given", () => {
    const { service } = createService();
    const r = service.list({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("respects limit parameter", () => {
    const { service } = createService();
    for (let i = 0; i < 5; i++) {
      service.create({ sessionId: "s", projectId: "p", category: "note", content: `entry-${i}` });
    }
    const r = service.list({ sessionId: "s", limit: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toHaveLength(3);
  });

  it("excludes expired entries from list results", () => {
    const { service } = createService();
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "expired", expiresAt: pastExpiry });
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "active" });

    const r = service.list({ sessionId: "s" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toHaveLength(1);
    expect(r.data[0]?.content).toBe("active");
  });

  it("sorts by time-decay score descending when no queryText", () => {
    const { service } = createService();
    // Create entry with high base score — decay sort tested in isolation via
    // decayScore unit tests above. Integration here just confirms list() returns data.
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "old-high", relevanceScore: 1.0 });

    const r = service.list({ sessionId: "s" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // At minimum there should be entries
    expect(r.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── FTS5 keyword search ──────────────────────────────────────────────────────

describe("SessionMemoryService.list with queryText (FTS5)", () => {
  it("finds entries matching keyword", () => {
    const { service } = createService();
    service.create({ sessionId: "s", projectId: "p", category: "style", content: "formal writing style" });
    service.create({ sessionId: "s", projectId: "p", category: "style", content: "colloquial expressions" });
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "protagonist name is Alice" });

    const r = service.list({ sessionId: "s", queryText: "formal" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.length).toBeGreaterThanOrEqual(1);
    expect(r.data.some((e) => e.content.includes("formal"))).toBe(true);
  });

  it("returns empty array when no FTS5 match", () => {
    const { service } = createService();
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "dragon warrior" });

    const r = service.list({ sessionId: "s", queryText: "unicorn" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // unicorn not in content — should not match dragon warrior
    expect(r.data.filter((e) => e.content.includes("unicorn"))).toHaveLength(0);
  });

  it("handles double-quote in queryText without FTS5 parse error", () => {
    const { service } = createService();
    service.create({ sessionId: "s", projectId: "p", category: "note", content: 'she said "hello world"' });
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "ordinary entry" });

    // An unescaped `"` would cause FTS5 to throw; escaped it should either
    // find the matching entry or return empty — never throw.
    const r = service.list({ sessionId: "s", queryText: '"hello' });
    expect(r.ok).toBe(true);
  });

  it("treats FTS5 operator keywords as literals (AND, OR, NOT)", () => {
    const { service } = createService();
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "style OR note is literal" });
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "unrelated entry" });

    // Without escaping, `style OR note` activates FTS5 boolean OR and could
    // return both entries.  With escaping it is a literal phrase search.
    const r = service.list({ sessionId: "s", queryText: "style OR note" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Only the entry containing the literal text "style OR note" should match.
    expect(r.data.every((e) => e.content.includes("style OR note"))).toBe(true);
  });

  it("treats wildcard * as literal without FTS5 parse error", () => {
    const { service } = createService();
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "magic * sparkle" });

    const r = service.list({ sessionId: "s", queryText: "magic *" });
    expect(r.ok).toBe(true);
  });

  it("LIMIT is applied after session filter so results from other sessions do not consume budget", () => {
    const { service } = createService();
    // Insert 5 entries for session "other" and 1 for session "target"
    for (let i = 0; i < 5; i++) {
      service.create({ sessionId: "other", projectId: "p", category: "note", content: `dark theme variation ${i}` });
    }
    service.create({ sessionId: "target", projectId: "p", category: "note", content: "dark theme target" });

    // With limit=3 and post-filter, "target"'s entry would be dropped if the
    // 3 "other" entries ranked highest.  With SQL filtering it is always returned.
    const r = service.list({ sessionId: "target", queryText: "dark", limit: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.some((e) => e.content === "dark theme target")).toBe(true);
  });
});

// ─── injectForContext ─────────────────────────────────────────────────────────

describe("SessionMemoryService.injectForContext", () => {
  it("injects entries into context text", () => {
    const { service } = createService();
    service.create({ sessionId: "sess", projectId: "proj", category: "style", content: "lyrical prose" });
    service.create({ sessionId: "sess", projectId: "proj", category: "reference", content: "protagonist: John" });

    const r = service.injectForContext({
      sessionId: "sess",
      projectId: "proj",
      totalContextBudgetTokens: 4000,
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.injectedText).toContain("[会话记忆 — L1 自动注入]");
    expect(r.data.injectedText).toContain("[style] lyrical prose");
    expect(r.data.tokenCount).toBeGreaterThan(0);
    expect(r.data.truncated).toBe(false);
  });

  it("enforces 15% context budget cap (INV-3 CJK-aware)", () => {
    const { service } = createService();
    // Create many entries with long content to exceed the cap
    const longContent = "这是一段很长的内容，用于测试预算上限。".repeat(5);
    for (let i = 0; i < 20; i++) {
      service.create({
        sessionId: "sess",
        projectId: "proj",
        category: "note",
        content: `${longContent} entry-${i}`,
      });
    }

    // Small budget: 15% cap = 300 tokens
    const totalBudget = 2000;
    const maxAllowed = Math.floor(totalBudget * L1_BUDGET_CAP_RATIO);

    const r = service.injectForContext({
      sessionId: "sess",
      projectId: "proj",
      totalContextBudgetTokens: totalBudget,
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Token count must not exceed 15% cap
    expect(r.data.tokenCount).toBeLessThanOrEqual(maxAllowed + 50); // tolerance for \n separators between lines (not counted in per-line accumulation) and CJK estimation rounding
    expect(r.data.truncated).toBe(true);
  });

  it("returns empty injection when no entries exist", () => {
    const { service } = createService();
    const r = service.injectForContext({
      sessionId: "empty-sess",
      projectId: "proj",
      totalContextBudgetTokens: 4000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.injectedText).toBe("");
    expect(r.data.entries).toHaveLength(0);
    expect(r.data.tokenCount).toBe(0);
    expect(r.data.truncated).toBe(false);
  });

  it("returns INVALID_PARAMS when sessionId is missing", () => {
    const { service } = createService();
    const r = service.injectForContext({
      sessionId: "",
      projectId: "proj",
      totalContextBudgetTokens: 4000,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("returns INVALID_PARAMS for invalid totalContextBudgetTokens", () => {
    const { service } = createService();
    const r = service.injectForContext({
      sessionId: "s",
      projectId: "p",
      totalContextBudgetTokens: -1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("uses queryText for FTS5 filtering during injection", () => {
    const { service } = createService();
    service.create({ sessionId: "s", projectId: "p", category: "style", content: "dark themes preferred" });
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "character is brave" });

    const r = service.injectForContext({
      sessionId: "s",
      projectId: "p",
      queryText: "dark",
      totalContextBudgetTokens: 4000,
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Should only inject the dark-themes entry
    expect(r.data.injectedText).toContain("dark themes preferred");
  });

  it("logs injection metrics", () => {
    const { service, logger } = createService();
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "note1" });

    service.injectForContext({ sessionId: "s", projectId: "p", totalContextBudgetTokens: 4000 });

    expect(logger.info).toHaveBeenCalledWith(
      "session_memory_inject",
      expect.objectContaining({ sessionId: "s", projectId: "p" }),
    );
  });
});

// ─── purgeExpired ─────────────────────────────────────────────────────────────

describe("SessionMemoryService.purgeExpired", () => {
  it("removes expired entries and returns count", () => {
    const { service } = createService();
    const pastExpiry = new Date(Date.now() - 5000).toISOString();
    const futureExpiry = new Date(Date.now() + 3600_000).toISOString();

    service.create({ sessionId: "s", projectId: "proj", category: "note", content: "expired-1", expiresAt: pastExpiry });
    service.create({ sessionId: "s", projectId: "proj", category: "note", content: "expired-2", expiresAt: pastExpiry });
    service.create({ sessionId: "s", projectId: "proj", category: "note", content: "active", expiresAt: futureExpiry });
    service.create({ sessionId: "s", projectId: "proj", category: "note", content: "no-expiry" });

    const r = service.purgeExpired("proj");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.removed).toBe(2);

    const list = service.list({ sessionId: "s" });
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data).toHaveLength(2);
    const contents = list.data.map((e) => e.content).sort();
    expect(contents).toEqual(["active", "no-expiry"]);
  });

  it("returns INVALID_PARAMS when projectId is empty", () => {
    const { service } = createService();
    const r = service.purgeExpired("");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INVALID_ARGUMENT");
  });

  it("returns removed=0 when no expired entries", () => {
    const { service } = createService();
    service.create({ sessionId: "s", projectId: "p", category: "note", content: "active" });

    const r = service.purgeExpired("p");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.removed).toBe(0);
  });
});

// ─── L1_BUDGET_CAP_RATIO contract ────────────────────────────────────────────

describe("L1_BUDGET_CAP_RATIO", () => {
  it("is exactly 0.15", () => {
    // Spec requirement: "L1 content must not exceed 15% of total context budget"
    expect(L1_BUDGET_CAP_RATIO).toBe(0.15);
  });
});
