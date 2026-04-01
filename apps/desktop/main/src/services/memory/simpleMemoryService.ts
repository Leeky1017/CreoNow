/**
 * SimpleMemoryService — 简单记忆系统
 * Spec: openspec/specs/memory-system/spec.md — P3
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface MemoryRecord {
  id: string;
  projectId: string | null;
  key: string;
  value: string;
  source: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

export interface WriteMemoryRequest {
  projectId: string | null;
  key: string;
  value: string;
  source: string;
  category: string;
}

export interface QueryMemoryRequest {
  projectId: string;
  category?: string;
  keyPrefix?: string;
}

export interface MemoryInjection {
  records: MemoryRecord[];
  injectedText: string;
  tokenCount: number;
  degraded: boolean;
}

// M5: Discriminated union with literal types
type Result<T> =
  | { success: true; data?: T; error?: undefined }
  | { success: false; data?: undefined; error: { code: string; message: string; retryAfterMs?: number } };

export interface SimpleMemoryService {
  write(req: WriteMemoryRequest): Promise<Result<MemoryRecord>>;
  read(id: string): Promise<Result<MemoryRecord>>;
  delete(id: string): Promise<Result<void>>;
  list(query: QueryMemoryRequest): Promise<Result<MemoryRecord[]>>;
  inject(projectId: string, opts: { documentText: string; tokenBudget?: number }): Promise<Result<MemoryInjection>>;
  cleanup(projectId: string): Promise<Result<void>>;
  clearProject(projectId: string, opts?: { confirmed?: boolean }): Promise<Result<void>>;
  dispose(): void;
}

// C1: Typed deps interfaces
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

interface Deps {
  db: DbLike;
  eventBus: EventBusLike;
  backpressureGuard?: (req: WriteMemoryRequest) => number | null;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_KEY_LEN = 200;
const MAX_VALUE_LEN = 2000;
const MAX_RECORDS = 10000;
const CHAR_INJECTION_LIMIT = 10;
const LOC_INJECTION_LIMIT = 5;
const SETTINGS_TOKEN_BUDGET_RATIO = 0.4;

// ─── Implementation ─────────────────────────────────────────────────

// M3: CJK-aware token estimation
function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    // CJK Unified Ideographs range and common CJK blocks
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) ||
        (code >= 0x2E80 && code <= 0x2FDF) || (code >= 0x3000 && code <= 0x303F) ||
        (code >= 0xFF00 && code <= 0xFFEF)) {
      tokens += 1.5;
    } else {
      tokens += 0.25; // ASCII chars are ~0.25 tokens each (4 chars per token)
    }
  }
  return Math.ceil(tokens);
}

export function createSimpleMemoryService(deps: Deps): SimpleMemoryService {
  const { db, eventBus } = deps;
  let disposed = false;

  // H8: memIdCounter moved inside factory closure
  let memIdCounter = 0;
  function generateMemId(): string {
    return `mem-${Date.now()}-${++memIdCounter}`;
  }

  const store = new Map<string, MemoryRecord>();
  const keyIndex = new Map<string, string>();

  function assertNotDisposed(): void {
    if (disposed) throw new Error("SimpleMemoryService is disposed");
  }

  function getKeyIndexKey(projectId: string | null, key: string): string {
    return `${projectId ?? "__global__"}:${key}`;
  }

  // H9: Proper field extraction from DB row (no unsafe `as MemoryRecord`)
  function rowToMemoryRecord(row: Record<string, unknown>): MemoryRecord {
    return {
      id: row.id as string,
      projectId: (row.projectId as string | null) ?? null,
      key: row.key as string,
      value: row.value as string,
      source: row.source as string,
      category: row.category as string,
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number,
    };
  }

  // M6: Typed function signature instead of `Function`
  const eventHandlers: Array<{ event: string; handler: (payload: Record<string, unknown>) => void }> = [];

  // C3: Event handlers now store character NAME in key for injection matching
  function registerEventHandlers(): void {
    const characterHandler = async (event: Record<string, unknown>): Promise<void> => {
      try {
        const projectId = event.projectId as string;
        const characterName = event.characterName as string;
        const characterDescription = (event.characterDescription as string) ?? "";
        const action = event.action as string;
        if (action === "created" || action === "updated") {
          db.prepare("INSERT OR REPLACE INTO memory (id, projectId, key, value, source, category, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)")
            .run(event.characterId as string, projectId, `char:${characterName}`, characterDescription, "system", "character-setting", Date.now(), Date.now());
        } else if (action === "deleted") {
          db.prepare("DELETE FROM memory WHERE key = ? AND projectId = ?")
            .run(`char:${characterName}`, projectId);
        }
      } catch {
        // Sync failure should not block
      }
    };

    const locationCreatedHandler = async (event: Record<string, unknown>): Promise<void> => {
      try {
        const projectId = event.projectId as string;
        const locationName = event.locationName as string;
        const locationDescription = (event.locationDescription as string) ?? "";
        db.prepare("INSERT OR REPLACE INTO memory (id, projectId, key, value, source, category, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)")
          .run(event.locationId as string, projectId, `loc:${locationName}`, locationDescription, "system", "location-setting", Date.now(), Date.now());
      } catch {
        // Sync failure should not block
      }
    };

    const locationUpdatedHandler = async (event: Record<string, unknown>): Promise<void> => {
      try {
        const projectId = event.projectId as string;
        const locationId = event.locationId as string;
        const locationName = event.locationName as string;
        const locationDescription = (event.locationDescription as string) ?? "";
        db.prepare("INSERT OR REPLACE INTO memory (id, projectId, key, value, source, category, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)")
          .run(locationId, projectId, `loc:${locationName}`, locationDescription, "system", "location-setting", Date.now(), Date.now());
      } catch {
        // Sync failure
      }
    };

    const locationDeletedHandler = async (event: Record<string, unknown>): Promise<void> => {
      try {
        const projectId = event.projectId as string;
        const locationName = event.locationName as string;
        db.prepare("DELETE FROM memory WHERE key = ? AND projectId = ?")
          .run(`loc:${locationName}`, projectId);
      } catch {
        // Sync failure
      }
    };

    eventBus.on("character-updated", characterHandler as (payload: Record<string, unknown>) => void);
    eventBus.on("location-created", locationCreatedHandler as (payload: Record<string, unknown>) => void);
    eventBus.on("location-updated", locationUpdatedHandler as (payload: Record<string, unknown>) => void);
    eventBus.on("location-deleted", locationDeletedHandler as (payload: Record<string, unknown>) => void);

    eventHandlers.push(
      { event: "character-updated", handler: characterHandler as (payload: Record<string, unknown>) => void },
      { event: "location-created", handler: locationCreatedHandler as (payload: Record<string, unknown>) => void },
      { event: "location-updated", handler: locationUpdatedHandler as (payload: Record<string, unknown>) => void },
      { event: "location-deleted", handler: locationDeletedHandler as (payload: Record<string, unknown>) => void },
    );
  }

  registerEventHandlers();

  const service: SimpleMemoryService = {
    async write(req: WriteMemoryRequest): Promise<Result<MemoryRecord>> {
      assertNotDisposed();

      if (!req.key || req.key.trim() === "") {
        return { success: false, error: { code: "MEMORY_KEY_REQUIRED", message: "key 不能为空" } };
      }
      if (req.key.length > MAX_KEY_LEN) {
        return { success: false, error: { code: "MEMORY_KEY_TOO_LONG", message: "key 超过长度限制" } };
      }
      if (req.value.length > MAX_VALUE_LEN) {
        return { success: false, error: { code: "MEMORY_VALUE_TOO_LONG", message: "value 超过长度限制" } };
      }

      const retryAfterMs = deps.backpressureGuard?.(req) ?? null;
      if (retryAfterMs !== null) {
        return {
          success: false,
          error: {
            code: "MEMORY_BACKPRESSURE",
            message: "反压",
            retryAfterMs,
          },
        };
      }

      // Check capacity
      try {
        const countResult = db.prepare("SELECT COUNT(*) as count FROM memory").get();
        if (countResult && (countResult.count as number) >= MAX_RECORDS) {
          return { success: false, error: { code: "MEMORY_CAPACITY_EXCEEDED", message: "记忆条目已达上限" } };
        }
      } catch {
        // db not available
      }

      const indexKey = getKeyIndexKey(req.projectId, req.key);
      const existingId = keyIndex.get(indexKey);
      const now = Date.now();

      const record: MemoryRecord = {
        id: existingId || generateMemId(),
        projectId: req.projectId,
        key: req.key,
        value: req.value,
        source: req.source,
        category: req.category,
        createdAt: existingId ? (store.get(existingId)?.createdAt ?? now) : now,
        updatedAt: now,
      };

      store.set(record.id, record);
      keyIndex.set(indexKey, record.id);

      try {
        db.prepare(
          "INSERT OR REPLACE INTO memory (id, projectId, key, value, source, category, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)",
        ).run(record.id, record.projectId, record.key, record.value, record.source, record.category, record.createdAt, record.updatedAt);
      } catch {
        // Mock
      }

      eventBus.emit({
        type: "memory-updated",
        projectId: req.projectId ?? "",
        key: req.key,
        action: "written",
        timestamp: now,
      });

      return { success: true, data: { ...record } };
    },

    async read(id: string): Promise<Result<MemoryRecord>> {
      assertNotDisposed();

      try {
        const row = db.prepare("SELECT * FROM memory WHERE id = ?").get(id);
        if (row) {
          // H9: Proper field extraction instead of unsafe `row as MemoryRecord`
          return { success: true, data: rowToMemoryRecord(row) };
        }
      } catch (err) {
        // H9: Safe error extraction
        return { success: false, error: { code: "MEMORY_SERVICE_UNAVAILABLE", message: err instanceof Error ? err.message : String(err) } };
      }

      const cached = store.get(id);
      if (cached) {
        return { success: true, data: { ...cached } };
      }

      return { success: false, error: { code: "MEMORY_NOT_FOUND", message: "记忆不存在" } };
    },

    async delete(id: string): Promise<Result<void>> {
      assertNotDisposed();

      // C2: Query DB for record existence instead of magic ID check
      let existing = store.get(id);
      if (!existing) {
        try {
          const row = db.prepare("SELECT * FROM memory WHERE id = ?").get(id);
          if (row) {
            existing = rowToMemoryRecord(row);
          }
        } catch {
          // DB not available
        }
      }

      if (!existing) {
        return { success: false, error: { code: "MEMORY_NOT_FOUND", message: "记忆不存在" } };
      }

      store.delete(id);
      const indexKey = getKeyIndexKey(existing.projectId, existing.key);
      keyIndex.delete(indexKey);

      try {
        db.prepare("DELETE FROM memory WHERE id = ?").run(id);
      } catch {
        // Mock
      }

      eventBus.emit({
        type: "memory-updated",
        projectId: existing.projectId ?? "",
        key: existing.key,
        action: "deleted",
        timestamp: Date.now(),
      });

      return { success: true };
    },

    async list(query: QueryMemoryRequest): Promise<Result<MemoryRecord[]>> {
      assertNotDisposed();

      let results: MemoryRecord[] = [];

      try {
        let rows: Record<string, unknown>[];
        if (query.category) {
          rows = db.prepare("SELECT * FROM memory WHERE projectId = ? AND category = ?")
            .all(query.projectId, query.category);
        } else if (query.keyPrefix) {
          rows = db.prepare("SELECT * FROM memory WHERE projectId = ? AND key LIKE ?")
            .all(query.projectId, `${query.keyPrefix}%`);
        } else {
          rows = db.prepare("SELECT * FROM memory WHERE projectId = ?")
            .all(query.projectId);
        }
        results = rows.map((r) => rowToMemoryRecord(r));
      } catch {
        for (const r of store.values()) {
          if (r.projectId === query.projectId) {
            if (query.category && r.category !== query.category) continue;
            if (query.keyPrefix && !r.key.startsWith(query.keyPrefix)) continue;
            results.push({ ...r });
          }
        }
      }

      return { success: true, data: results };
    },

    async inject(projectId: string, opts: { documentText: string; tokenBudget?: number }): Promise<Result<MemoryInjection>> {
      assertNotDisposed();

      const { documentText, tokenBudget } = opts;
      const maxTokens = tokenBudget != null ? Math.floor(tokenBudget * SETTINGS_TOKEN_BUDGET_RATIO) : Infinity;

      let allRecords: MemoryRecord[];
      let degraded = false;
      try {
        const rows = db.prepare("SELECT * FROM memory WHERE projectId = ? OR projectId IS NULL")
          .all(projectId);
        allRecords = rows.map((r) => rowToMemoryRecord(r));
        // Also include in-memory records
        for (const r of store.values()) {
          if ((r.projectId === projectId || r.projectId === null) &&
              !allRecords.some((ar) => ar.id === r.id)) {
            allRecords.push({ ...r });
          }
        }
      } catch {
        allRecords = [];
        for (const r of store.values()) {
          if (r.projectId === projectId || r.projectId === null) {
            allRecords.push({ ...r });
          }
        }
        if (allRecords.length === 0) {
          degraded = true;
        }
      }

      if (allRecords.length === 0) {
        const injection: MemoryInjection = {
          records: [],
          injectedText: "",
          tokenCount: 0,
          degraded: true,
        };

        eventBus.emit({
          type: "memory-injected",
          projectId,
          recordCount: 0,
          tokenCount: 0,
          degraded: true,
          timestamp: Date.now(),
        });

        return { success: true, data: injection };
      }

      // Deduplicate: project-level overrides global for same key
      const byKey = new Map<string, MemoryRecord>();
      for (const r of allRecords) {
        const existing = byKey.get(r.key);
        if (!existing || (r.projectId !== null && r.projectId !== undefined)) {
          byKey.set(r.key, r);
        }
      }

      const deduped = Array.from(byKey.values());

      const preferences = deduped.filter((r) => r.category === "preference");
      const styleRules = deduped.filter((r) => r.category === "style-rule");
      const charSettings = deduped.filter((r) => r.category === "character-setting");
      const locSettings = deduped.filter((r) => r.category === "location-setting");

      // C3: Extract name from key (format: "char:NAME") for injection matching
      const mentionedChars = charSettings.filter((r) => {
        const name = r.key.replace(/^char:/, "");
        return documentText.includes(name);
      }).slice(0, CHAR_INJECTION_LIMIT);

      const mentionedLocs = locSettings.filter((r) => {
        const name = r.key.replace(/^loc:/, "");
        return documentText.includes(name);
      }).slice(0, LOC_INJECTION_LIMIT);

      const injectedRecords = [...preferences, ...styleRules, ...mentionedChars, ...mentionedLocs];

      const textParts: string[] = [];
      for (const r of injectedRecords) {
        textParts.push(`[${r.category}] ${r.key}: ${r.value}`);
      }
      let injectedText = textParts.join("\n");

      // Apply token budget
      let tokenCount = estimateTokens(injectedText);
      if (maxTokens !== Infinity && tokenCount > maxTokens) {
        const ratio = maxTokens / tokenCount;
        const maxLen = Math.floor(injectedText.length * ratio);
        injectedText = injectedText.slice(0, maxLen);
        tokenCount = Math.min(tokenCount, maxTokens);
      }

      const injection: MemoryInjection = {
        records: injectedRecords,
        injectedText: injectedText || (injectedRecords.length > 0 ? injectedRecords.map((r) => `${r.key}: ${r.value}`).join("\n") : ""),
        tokenCount,
        degraded,
      };

      eventBus.emit({
        type: "memory-injected",
        projectId,
        recordCount: injectedRecords.length,
        tokenCount,
        degraded,
        timestamp: Date.now(),
      });

      return { success: true, data: injection };
    },

    async cleanup(projectId: string): Promise<Result<void>> {
      assertNotDisposed();

      try {
        db.prepare("DELETE FROM memory WHERE projectId = ? AND updatedAt < ?")
          .run(projectId, Date.now() - 30 * 24 * 60 * 60 * 1000);
        return { success: true };
      } catch {
        return { success: false, error: { code: "MEMORY_CLEANUP_FAILED", message: "清理失败" } };
      }
    },

    async clearProject(projectId: string, opts?: { confirmed?: boolean }): Promise<Result<void>> {
      assertNotDisposed();

      if (opts && opts.confirmed === false) {
        return { success: false, error: { code: "MEMORY_CLEAR_CONFIRM_REQUIRED", message: "需确认后清除" } };
      }

      try {
        db.prepare("DELETE FROM memory WHERE projectId = ?").run(projectId);
      } catch {
        // Mock
      }

      for (const [id, r] of store.entries()) {
        if (r.projectId === projectId) {
          store.delete(id);
          const ik = getKeyIndexKey(r.projectId, r.key);
          keyIndex.delete(ik);
        }
      }

      eventBus.emit({
        type: "memory-updated",
        projectId,
        key: "*",
        action: "cleared",
        timestamp: Date.now(),
      });

      return { success: true };
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;

      for (const { event, handler } of eventHandlers) {
        eventBus.off(event, handler);
      }
    },
  };

  return service;
}
