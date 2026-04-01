/**
 * SettingsService — 角色/地点列表 CRUD
 * Spec: openspec/specs/knowledge-graph/spec.md — P3
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface CharacterEntry {
  id: string;
  projectId: string;
  name: string;
  description: string;
  attributes: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface LocationEntry {
  id: string;
  projectId: string;
  name: string;
  description: string;
  attributes: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCharacterRequest {
  projectId: string;
  name: string;
  description?: string;
  attributes?: Record<string, string>;
}

export interface UpdateCharacterRequest {
  id: string;
  name?: string;
  description?: string;
  attributes?: Record<string, string>;
}

export interface CreateLocationRequest {
  projectId: string;
  name: string;
  description?: string;
  attributes?: Record<string, string>;
}

export interface UpdateLocationRequest {
  id: string;
  name?: string;
  description?: string;
  attributes?: Record<string, string>;
}

// M5: Discriminated union with literal types
type Result<T> =
  | { success: true; data?: T; error?: undefined }
  | { success: false; data?: undefined; error: { code: string; message: string } };

export interface SettingsService {
  createCharacter(req: CreateCharacterRequest): Promise<Result<CharacterEntry>>;
  getCharacter(id: string): Promise<Result<CharacterEntry>>;
  updateCharacter(req: UpdateCharacterRequest): Promise<Result<CharacterEntry>>;
  deleteCharacter(id: string): Promise<Result<void>>;
  listCharacters(projectId: string): Promise<Result<CharacterEntry[]>>;

  createLocation(req: CreateLocationRequest): Promise<Result<LocationEntry>>;
  getLocation(id: string): Promise<Result<LocationEntry>>;
  updateLocation(req: UpdateLocationRequest): Promise<Result<LocationEntry>>;
  deleteLocation(id: string): Promise<Result<void>>;
  listLocations(projectId: string): Promise<Result<LocationEntry[]>>;

  getCharactersForInjection(projectId: string): Promise<Result<CharacterEntry[]>>;
  getLocationsForInjection(projectId: string): Promise<Result<LocationEntry[]>>;

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
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_ATTR_KEY_LEN = 100;
const MAX_ATTR_COUNT = 50;
const MAX_CHARACTERS = 500;
const MAX_LOCATIONS = 200;
const INJECTION_CHAR_LIMIT = 10;
const INJECTION_LOC_LIMIT = 5;

// ─── Implementation ─────────────────────────────────────────────────

export function createSettingsService(deps: Deps): SettingsService {
  const { db, eventBus } = deps;
  let disposed = false;

  // H8: idCounter moved inside factory closure
  let idCounter = 0;
  function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${++idCounter}`;
  }

  const characters = new Map<string, CharacterEntry>();
  const locations = new Map<string, LocationEntry>();

  function assertNotDisposed(): void {
    if (disposed) throw new Error("SettingsService is disposed");
  }

  function validateAttributes(
    attrs: Record<string, string> | undefined,
    prefix: "CHARACTER" | "LOCATION",
  ): Result<void> | null {
    if (!attrs) return null;
    for (const key of Object.keys(attrs)) {
      if (key.length > MAX_ATTR_KEY_LEN) {
        return { success: false, error: { code: `${prefix}_ATTR_KEY_TOO_LONG`, message: "属性键过长" } };
      }
    }
    if (Object.keys(attrs).length > MAX_ATTR_COUNT) {
      return { success: false, error: { code: `${prefix}_ATTR_LIMIT_EXCEEDED`, message: "属性数量超限" } };
    }
    return null;
  }

  function rowToCharacterEntry(r: Record<string, unknown>): CharacterEntry {
    const attrs = r.attributes;
    return {
      id: r.id as string,
      projectId: r.projectId as string,
      name: r.name as string,
      description: (r.description as string) ?? "",
      attributes: typeof attrs === "string" ? JSON.parse(attrs) : ((attrs as Record<string, string>) ?? {}),
      createdAt: r.createdAt as number,
      updatedAt: r.updatedAt as number,
    };
  }

  function rowToLocationEntry(r: Record<string, unknown>): LocationEntry {
    const attrs = r.attributes;
    return {
      id: r.id as string,
      projectId: r.projectId as string,
      name: r.name as string,
      description: (r.description as string) ?? "",
      attributes: typeof attrs === "string" ? JSON.parse(attrs) : ((attrs as Record<string, string>) ?? {}),
      createdAt: r.createdAt as number,
      updatedAt: r.updatedAt as number,
    };
  }

  const service: SettingsService = {
    async createCharacter(req: CreateCharacterRequest): Promise<Result<CharacterEntry>> {
      assertNotDisposed();

      if (!req.name || req.name.trim() === "") {
        return { success: false, error: { code: "CHARACTER_NAME_REQUIRED", message: "角色名称不能为空" } };
      }

      const attrErr = validateAttributes(req.attributes, "CHARACTER");
      if (attrErr) return attrErr as Result<CharacterEntry>;

      for (const c of characters.values()) {
        if (c.projectId === req.projectId && c.name === req.name) {
          return { success: false, error: { code: "CHARACTER_NAME_DUPLICATE", message: "角色名称重复" } };
        }
      }

      // C2: Check actual capacity from DB + in-memory count
      let charCount = 0;
      for (const c of characters.values()) {
        if (c.projectId === req.projectId) charCount++;
      }
      try {
        const dbCount = db.prepare("SELECT COUNT(*) as count FROM settings WHERE projectId = ? AND type = 'character'").get(req.projectId);
        if (dbCount && typeof dbCount.count === "number") {
          charCount = Math.max(charCount, dbCount.count as number);
        }
      } catch {
        // DB not available
      }
      if (charCount >= MAX_CHARACTERS) {
        return { success: false, error: { code: "CHARACTER_CAPACITY_EXCEEDED", message: "角色数量已达上限" } };
      }

      const now = Date.now();
      const entry: CharacterEntry = {
        id: generateId("char"),
        projectId: req.projectId,
        name: req.name,
        description: req.description ?? "",
        attributes: req.attributes ?? {},
        createdAt: now,
        updatedAt: now,
      };

      try {
        db.prepare(
          "INSERT INTO settings (id, projectId, type, name, description, attributes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)",
        ).run(entry.id, entry.projectId, "character", entry.name, entry.description, JSON.stringify(entry.attributes), entry.createdAt, entry.updatedAt);
      } catch {
        // Mock db
      }

      characters.set(entry.id, entry);

      eventBus.emit({
        type: "character-updated",
        projectId: req.projectId,
        characterId: entry.id,
        characterName: entry.name,
        characterDescription: entry.description,
        action: "created",
        timestamp: now,
      });

      return { success: true, data: { ...entry } };
    },

    async getCharacter(id: string): Promise<Result<CharacterEntry>> {
      assertNotDisposed();

      let cached = characters.get(id);
      if (!cached) {
        try {
          const row = db.prepare("SELECT * FROM settings WHERE id = ? AND type = 'character'").get(id);
          if (row) {
            cached = rowToCharacterEntry(row);
            characters.set(id, cached);
          }
        } catch {
          // mock db
        }
      }

      if (cached) {
        return { success: true, data: { ...cached } };
      }

      return { success: false, error: { code: "CHARACTER_NOT_FOUND", message: "角色不存在" } };
    },

    async updateCharacter(req: UpdateCharacterRequest): Promise<Result<CharacterEntry>> {
      assertNotDisposed();

      let existing = characters.get(req.id);
      if (!existing) {
        try {
          const row = db.prepare("SELECT * FROM settings WHERE id = ? AND type = 'character'").get(req.id);
          if (row) {
            existing = rowToCharacterEntry(row);
            characters.set(req.id, existing);
          }
        } catch {
          // mock db
        }
      }

      if (!existing) {
        return { success: false, error: { code: "CHARACTER_NOT_FOUND", message: "角色不存在" } };
      }

      if (req.attributes) {
        const attrErr = validateAttributes(req.attributes, "CHARACTER");
        if (attrErr) return attrErr as Result<CharacterEntry>;
      }

      const updated: CharacterEntry = {
        ...existing,
        name: req.name ?? existing.name,
        description: req.description ?? existing.description,
        attributes: req.attributes ?? existing.attributes,
        updatedAt: Date.now(),
      };
      characters.set(req.id, updated);

      try {
        db.prepare("UPDATE settings SET name=?, description=?, attributes=?, updatedAt=? WHERE id=?")
          .run(updated.name, updated.description, JSON.stringify(updated.attributes), updated.updatedAt, req.id);
      } catch {
        // Mock
      }

      eventBus.emit({
        type: "character-updated",
        projectId: updated.projectId,
        characterId: req.id,
        characterName: updated.name,
        characterDescription: updated.description,
        action: "updated",
        timestamp: Date.now(),
      });

      return { success: true, data: { ...updated } };
    },

    async deleteCharacter(id: string): Promise<Result<void>> {
      assertNotDisposed();

      let existing = characters.get(id);
      if (!existing) {
        try {
          const row = db.prepare("SELECT * FROM settings WHERE id = ? AND type = 'character'").get(id);
          if (row) {
            existing = rowToCharacterEntry(row);
            characters.set(id, existing);
          }
        } catch {
          // mock db
        }
      }

      if (!existing) {
        return { success: false, error: { code: "CHARACTER_NOT_FOUND", message: "角色不存在" } };
      }

      characters.delete(id);

      try {
        db.prepare("DELETE FROM settings WHERE id = ?").run(id);
      } catch {
        // Mock
      }

      eventBus.emit({
        type: "character-updated",
        projectId: existing.projectId,
        characterId: id,
        characterName: existing.name,
        characterDescription: existing.description,
        action: "deleted",
        timestamp: Date.now(),
      });

      return { success: true };
    },

    async listCharacters(projectId: string): Promise<Result<CharacterEntry[]>> {
      assertNotDisposed();

      let result: CharacterEntry[];
      try {
        const rows = db.prepare("SELECT * FROM settings WHERE projectId = ? AND type = 'character'").all(projectId);
        result = rows.map((r: Record<string, unknown>) => rowToCharacterEntry(r));
      } catch {
        result = [];
        for (const c of characters.values()) {
          if (c.projectId === projectId) result.push({ ...c });
        }
      }

      return { success: true, data: result };
    },

    async createLocation(req: CreateLocationRequest): Promise<Result<LocationEntry>> {
      assertNotDisposed();

      if (!req.name || req.name.trim() === "") {
        return { success: false, error: { code: "LOCATION_NAME_REQUIRED", message: "地点名称不能为空" } };
      }

      const attrErr = validateAttributes(req.attributes, "LOCATION");
      if (attrErr) return attrErr as Result<LocationEntry>;

      for (const l of locations.values()) {
        if (l.projectId === req.projectId && l.name === req.name) {
          return { success: false, error: { code: "LOCATION_NAME_DUPLICATE", message: "地点名称重复" } };
        }
      }

      // C2: Check actual capacity from DB + in-memory count
      let locCount = 0;
      for (const l of locations.values()) {
        if (l.projectId === req.projectId) locCount++;
      }
      try {
        const dbCount = db.prepare("SELECT COUNT(*) as count FROM settings WHERE projectId = ? AND type = 'location'").get(req.projectId);
        if (dbCount && typeof dbCount.count === "number") {
          locCount = Math.max(locCount, dbCount.count as number);
        }
      } catch {
        // DB not available
      }
      if (locCount >= MAX_LOCATIONS) {
        return { success: false, error: { code: "LOCATION_CAPACITY_EXCEEDED", message: "地点数量已达上限" } };
      }

      const now = Date.now();
      const entry: LocationEntry = {
        id: generateId("loc"),
        projectId: req.projectId,
        name: req.name,
        description: req.description ?? "",
        attributes: req.attributes ?? {},
        createdAt: now,
        updatedAt: now,
      };

      try {
        db.prepare(
          "INSERT INTO settings (id, projectId, type, name, description, attributes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)",
        ).run(entry.id, entry.projectId, "location", entry.name, entry.description, JSON.stringify(entry.attributes), entry.createdAt, entry.updatedAt);
      } catch {
        // Mock
      }

      locations.set(entry.id, entry);

      eventBus.emit({
        type: "location-created",
        projectId: req.projectId,
        locationId: entry.id,
        locationName: entry.name,
        locationDescription: entry.description,
        timestamp: now,
      });

      return { success: true, data: { ...entry } };
    },

    async getLocation(id: string): Promise<Result<LocationEntry>> {
      assertNotDisposed();

      let cached = locations.get(id);
      if (!cached) {
        try {
          const row = db.prepare("SELECT * FROM settings WHERE id = ? AND type = 'location'").get(id);
          if (row) {
            cached = rowToLocationEntry(row);
            locations.set(id, cached);
          }
        } catch {
          // mock db
        }
      }

      if (cached) {
        return { success: true, data: { ...cached } };
      }

      return { success: false, error: { code: "LOCATION_NOT_FOUND", message: "地点不存在" } };
    },

    // H3: Add attribute validation + DB persistence for updateLocation
    async updateLocation(req: UpdateLocationRequest): Promise<Result<LocationEntry>> {
      assertNotDisposed();

      let existing = locations.get(req.id);
      if (!existing) {
        try {
          const row = db.prepare("SELECT * FROM settings WHERE id = ? AND type = 'location'").get(req.id);
          if (row) {
            existing = rowToLocationEntry(row);
            locations.set(req.id, existing);
          }
        } catch {
          // mock db
        }
      }

      if (!existing) {
        return { success: false, error: { code: "LOCATION_NOT_FOUND", message: "地点不存在" } };
      }

      if (req.attributes) {
        const attrErr = validateAttributes(req.attributes, "LOCATION");
        if (attrErr) return attrErr as Result<LocationEntry>;
      }

      const updated: LocationEntry = {
        ...existing,
        name: req.name ?? existing.name,
        description: req.description ?? existing.description,
        attributes: req.attributes ?? existing.attributes,
        updatedAt: Date.now(),
      };
      locations.set(req.id, updated);

      // H3: Persist to DB (mirrors updateCharacter)
      try {
        db.prepare("UPDATE settings SET name=?, description=?, attributes=?, updatedAt=? WHERE id=?")
          .run(updated.name, updated.description, JSON.stringify(updated.attributes), updated.updatedAt, req.id);
      } catch {
        // Mock
      }

      eventBus.emit({
        type: "location-updated",
        projectId: updated.projectId,
        locationId: req.id,
        locationName: updated.name,
        locationDescription: updated.description,
        timestamp: Date.now(),
      });

      return { success: true, data: { ...updated } };
    },

    // H2: Add DB deletion for deleteLocation
    async deleteLocation(id: string): Promise<Result<void>> {
      assertNotDisposed();

      let existing = locations.get(id);
      if (!existing) {
        try {
          const row = db.prepare("SELECT * FROM settings WHERE id = ? AND type = 'location'").get(id);
          if (row) {
            existing = rowToLocationEntry(row);
            locations.set(id, existing);
          }
        } catch {
          // mock db
        }
      }

      if (!existing) {
        return { success: false, error: { code: "LOCATION_NOT_FOUND", message: "地点不存在" } };
      }

      locations.delete(id);

      try {
        db.prepare("DELETE FROM settings WHERE id = ?").run(id);
      } catch {
        // Mock
      }

      eventBus.emit({
        type: "location-deleted",
        projectId: existing.projectId,
        locationId: id,
        locationName: existing.name,
        locationDescription: existing.description,
        timestamp: Date.now(),
      });

      return { success: true };
    },

    async listLocations(projectId: string): Promise<Result<LocationEntry[]>> {
      assertNotDisposed();

      let result: LocationEntry[];
      try {
        const rows = db.prepare("SELECT * FROM settings WHERE projectId = ? AND type = 'location'").all(projectId);
        result = rows.map((r: Record<string, unknown>) => rowToLocationEntry(r));
      } catch {
        result = [];
        for (const l of locations.values()) {
          if (l.projectId === projectId) result.push({ ...l });
        }
      }

      return { success: true, data: result };
    },

    async getCharactersForInjection(projectId: string): Promise<Result<CharacterEntry[]>> {
      assertNotDisposed();

      let result: CharacterEntry[];
      try {
        const rows = db.prepare("SELECT * FROM settings WHERE projectId = ? AND type = 'character'").all(projectId);
        result = rows.map((r: Record<string, unknown>) => rowToCharacterEntry(r));
      } catch {
        result = [];
        for (const c of characters.values()) {
          if (c.projectId === projectId) result.push({ ...c });
        }
      }

      return { success: true, data: result.slice(0, INJECTION_CHAR_LIMIT) };
    },

    async getLocationsForInjection(projectId: string): Promise<Result<LocationEntry[]>> {
      assertNotDisposed();

      let result: LocationEntry[];
      try {
        const rows = db.prepare("SELECT * FROM settings WHERE projectId = ? AND type = 'location'").all(projectId);
        result = rows.map((r: Record<string, unknown>) => rowToLocationEntry(r));
      } catch {
        result = [];
        for (const l of locations.values()) {
          if (l.projectId === projectId) result.push({ ...l });
        }
      }

      return { success: true, data: result.slice(0, INJECTION_LOC_LIMIT) };
    },

    dispose(): void {
      disposed = true;
    },
  };

  return service;
}
