/**
 * 001_initial_schema.ts — baseline schema for TypeScript migrations.
 *
 * IMPORTANT:
 * This baseline mirrors the repository's live SQLite runtime contract used by
 * init.ts (legacy SQL chain + bridge), so migration bookkeeping stays truthful
 * on existing databases. We intentionally preserve legacy shapes for
 * `settings`, `document_*`, and `kg_*` while also creating Task #87 baseline
 * tables (`versions` / `branches`) required by acceptance criteria.
 *
 * INV-1: versions + branches provide persistent snapshot lineage.
 * INV-9: cost_records provides persistent AI cost attribution.
 *
 * @rollback: manual — baseline schema rollback requires manual DB reset.
 */

import type Database from "better-sqlite3";

import type { Migration } from "../migrator";

const UP_SQL = /* sql */ `
  CREATE TABLE IF NOT EXISTS settings (
    scope      TEXT NOT NULL,
    key        TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (scope, key)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    project_id TEXT,
    started_at TEXT,
    ended_at   TEXT,
    state      TEXT
  );

  CREATE TABLE IF NOT EXISTS branches (
    id               TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    name             TEXT NOT NULL,
    parent_branch_id TEXT,
    fork_version_id  TEXT,
    created_at       TEXT NOT NULL,
    created_by       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS versions (
    id                TEXT PRIMARY KEY,
    branch_id         TEXT NOT NULL REFERENCES branches (id),
    parent_version_id TEXT,
    content_snapshot  TEXT,
    operation         TEXT,
    created_at        TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_versions_branch_created
    ON versions (branch_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS document_versions (
    version_id          TEXT PRIMARY KEY,
    project_id          TEXT NOT NULL,
    document_id         TEXT NOT NULL,
    actor               TEXT NOT NULL,
    content_json        TEXT NOT NULL,
    content_text        TEXT NOT NULL,
    content_md          TEXT NOT NULL,
    created_at          INTEGER NOT NULL,
    reason              TEXT NOT NULL DEFAULT '',
    content_hash        TEXT NOT NULL DEFAULT '',
    diff_format         TEXT NOT NULL DEFAULT '',
    diff_text           TEXT NOT NULL DEFAULT '',
    word_count          INTEGER NOT NULL DEFAULT 0,
    parent_snapshot_id  TEXT,
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents (document_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_document_versions_document_created
    ON document_versions (document_id, created_at DESC, version_id ASC);

  CREATE INDEX IF NOT EXISTS idx_document_versions_document_parent
    ON document_versions (document_id, parent_snapshot_id);

  CREATE TABLE IF NOT EXISTS document_branches (
    branch_id         TEXT PRIMARY KEY,
    document_id       TEXT NOT NULL,
    name              TEXT NOT NULL,
    base_snapshot_id  TEXT NOT NULL,
    head_snapshot_id  TEXT NOT NULL,
    created_by        TEXT NOT NULL,
    created_at        INTEGER NOT NULL,
    UNIQUE (document_id, name),
    FOREIGN KEY (document_id) REFERENCES documents (document_id) ON DELETE CASCADE,
    FOREIGN KEY (base_snapshot_id) REFERENCES document_versions (version_id),
    FOREIGN KEY (head_snapshot_id) REFERENCES document_versions (version_id)
  );

  CREATE INDEX IF NOT EXISTS idx_document_branches_document_created
    ON document_branches (document_id, created_at DESC, branch_id ASC);

  CREATE TABLE IF NOT EXISTS cost_records (
    id                 TEXT PRIMARY KEY,
    session_id         TEXT REFERENCES sessions (id),
    model              TEXT NOT NULL,
    input_tokens       INTEGER,
    output_tokens      INTEGER,
    cache_hit_tokens   INTEGER,
    duration_ms        INTEGER,
    estimated_cost_usd REAL,
    created_at         TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cost_records_session
    ON cost_records (session_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS entity_types (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    aliases            TEXT,
    is_builtin         INTEGER DEFAULT 0,
    icon               TEXT,
    default_properties TEXT,
    project_id         TEXT
  );

  CREATE TABLE IF NOT EXISTS relation_types (
    id                      TEXT PRIMARY KEY,
    name                    TEXT NOT NULL,
    aliases                 TEXT,
    is_builtin              INTEGER DEFAULT 0,
    is_directional          INTEGER DEFAULT 1,
    allowed_source_types    TEXT,
    allowed_target_types    TEXT,
    allow_free_text_target  INTEGER DEFAULT 1,
    project_id              TEXT
  );

  CREATE TABLE IF NOT EXISTS property_types (
    id                      TEXT PRIMARY KEY,
    name                    TEXT NOT NULL,
    aliases                 TEXT,
    is_builtin              INTEGER DEFAULT 0,
    value_type              TEXT NOT NULL,
    options                 TEXT,
    allow_multiple          INTEGER DEFAULT 0,
    applicable_entity_types TEXT,
    project_id              TEXT
  );

  CREATE TABLE IF NOT EXISTS entities (
    id             TEXT PRIMARY KEY,
    entity_type_id TEXT NOT NULL,
    name           TEXT NOT NULL,
    description    TEXT,
    icon           TEXT,
    project_id     TEXT NOT NULL,
    created_by     TEXT DEFAULT 'user',
    created_at     TEXT NOT NULL,
    FOREIGN KEY (entity_type_id) REFERENCES entity_types (id)
  );

  CREATE TABLE IF NOT EXISTS entity_properties (
    id               TEXT PRIMARY KEY,
    entity_id        TEXT NOT NULL,
    property_type_id TEXT NOT NULL,
    value            TEXT,
    layer            TEXT,
    known_by         TEXT,
    valid_from       TEXT,
    valid_until      TEXT,
    confidence       REAL DEFAULT 1.0,
    source_chapter   TEXT,
    created_by       TEXT DEFAULT 'user',
    FOREIGN KEY (entity_id) REFERENCES entities (id),
    FOREIGN KEY (property_type_id) REFERENCES property_types (id)
  );

  CREATE TABLE IF NOT EXISTS relations (
    id               TEXT PRIMARY KEY,
    source_entity_id TEXT NOT NULL,
    relation_type_id TEXT NOT NULL,
    target_entity_id TEXT,
    target_value     TEXT,
    layer            TEXT,
    known_by         TEXT,
    valid_from       TEXT,
    valid_until      TEXT,
    relation_detail  TEXT,
    confidence       REAL DEFAULT 1.0,
    source_chapter   TEXT,
    created_by       TEXT DEFAULT 'user',
    project_id       TEXT NOT NULL,
    FOREIGN KEY (source_entity_id) REFERENCES entities (id),
    FOREIGN KEY (relation_type_id) REFERENCES relation_types (id),
    FOREIGN KEY (target_entity_id) REFERENCES entities (id)
  );

  CREATE INDEX IF NOT EXISTS idx_relations_source
    ON relations (source_entity_id);

  CREATE INDEX IF NOT EXISTS idx_relations_target
    ON relations (target_entity_id);

  CREATE TABLE IF NOT EXISTS kg_entities (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('character', 'location', 'event', 'item', 'faction')),
    name           TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    attributes_json TEXT NOT NULL DEFAULT '{}',
    version        INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    ai_context_level TEXT NOT NULL DEFAULT 'when_detected',
    aliases        TEXT NOT NULL DEFAULT '[]',
    last_seen_state TEXT,
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_kg_entities_project
    ON kg_entities (project_id);

  CREATE INDEX IF NOT EXISTS idx_kg_entities_project_type
    ON kg_entities (project_id, type);

  CREATE INDEX IF NOT EXISTS idx_kg_entities_project_name
    ON kg_entities (project_id, name);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_entities_project_type_name
    ON kg_entities (project_id, type, lower(trim(name)));

  CREATE INDEX IF NOT EXISTS idx_kg_entities_project_context_level
    ON kg_entities (project_id, ai_context_level);

  CREATE TABLE IF NOT EXISTS kg_relation_types (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    key        TEXT NOT NULL,
    label      TEXT NOT NULL,
    builtin    INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (project_id, key),
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS kg_relations (
    id               TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    relation_type    TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
    FOREIGN KEY (source_entity_id) REFERENCES kg_entities (id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES kg_entities (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_kg_relations_project
    ON kg_relations (project_id);

  CREATE INDEX IF NOT EXISTS idx_kg_relations_source
    ON kg_relations (project_id, source_entity_id);

  CREATE INDEX IF NOT EXISTS idx_kg_relations_target
    ON kg_relations (project_id, target_entity_id);

  CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5 (
    name,
    description,
    content='entities',
    content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS entities_ai_fts
    AFTER INSERT ON entities
  BEGIN
    INSERT INTO entities_fts (rowid, name, description)
      VALUES (new.rowid, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_au_fts
    AFTER UPDATE ON entities
  BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description)
      VALUES('delete', old.rowid, old.name, old.description);
    INSERT INTO entities_fts(rowid, name, description)
      VALUES(new.rowid, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_ad_fts
    AFTER DELETE ON entities
  BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description)
      VALUES('delete', old.rowid, old.name, old.description);
  END;
`;

function assertTableColumns(
  db: Database.Database,
  args: { table: string; expected: readonly string[] },
): void {
  const tableExists = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    )
    .get(args.table);
  if (!tableExists) {
    return;
  }

  const actual = (
    db.pragma(`table_info(${args.table})`) as Array<{ name: string }>
  ).map((item) => item.name);
  const expected = [...args.expected];

  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `schema contract mismatch for ${args.table}: expected [${expected.join(", ")}], got [${actual.join(", ")}]`,
    );
  }
}

function hasTable(db: Database.Database, table: string): boolean {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(
      table,
    ),
  );
}

type ExpectedColumn = {
  name: string;
  type: string;
  notNull: boolean;
  pk: number;
  defaultValue: string | null;
};

function normalizeSql(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\(\s*/g, "(")
    .replace(/\s*\)\s*/g, ")")
    .trim();
}

function normalizeDefaultValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function assertTableColumnContract(
  db: Database.Database,
  args: {
    table: string;
    expected: readonly ExpectedColumn[];
  },
): void {
  if (!hasTable(db, args.table)) {
    return;
  }

  assertTableColumns(db, {
    table: args.table,
    expected: args.expected.map((column) => column.name),
  });

  const actual = db.pragma(`table_info(${args.table})`) as Array<{
    name: string;
    type: string;
    notnull: number;
    dflt_value: unknown;
    pk: number;
  }>;

  for (const expectedColumn of args.expected) {
    const actualColumn = actual.find((column) => column.name === expectedColumn.name);
    if (!actualColumn) {
      throw new Error(
        `schema contract mismatch for ${args.table}: missing column ${expectedColumn.name}`,
      );
    }
    const actualType = actualColumn.type.trim().toUpperCase();
    const expectedType = expectedColumn.type.trim().toUpperCase();
    if (actualType !== expectedType) {
      throw new Error(
        `schema contract mismatch for ${args.table}.${expectedColumn.name}: expected type ${expectedType}, got ${actualType}`,
      );
    }
    if ((actualColumn.notnull === 1) !== expectedColumn.notNull) {
      throw new Error(
        `schema contract mismatch for ${args.table}.${expectedColumn.name}: expected notNull=${String(expectedColumn.notNull)}, got notNull=${String(actualColumn.notnull === 1)}`,
      );
    }
    if (actualColumn.pk !== expectedColumn.pk) {
      throw new Error(
        `schema contract mismatch for ${args.table}.${expectedColumn.name}: expected pk=${expectedColumn.pk.toString()}, got pk=${actualColumn.pk.toString()}`,
      );
    }
    const actualDefault = normalizeDefaultValue(actualColumn.dflt_value);
    if (actualDefault !== expectedColumn.defaultValue) {
      throw new Error(
        `schema contract mismatch for ${args.table}.${expectedColumn.name}: expected default ${String(expectedColumn.defaultValue)}, got ${String(actualDefault)}`,
      );
    }
  }
}

function assertTableSqlContains(
  db: Database.Database,
  args: { table: string; requiredSnippets: readonly string[] },
): void {
  const row = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    )
    .get(args.table) as { sql: string | null } | undefined;
  if (!row || !row.sql) {
    return;
  }

  const normalizedSql = normalizeSql(row.sql);
  for (const snippet of args.requiredSnippets) {
    const normalizedSnippet = normalizeSql(snippet);
    if (!normalizedSql.includes(normalizedSnippet)) {
      throw new Error(
        `schema contract mismatch for ${args.table}: expected SQL snippet "${snippet}"`,
      );
    }
  }
}

function assertForeignKeys(
  db: Database.Database,
  args: {
    table: string;
    expected: ReadonlyArray<{
      table: string;
      from: string;
      to: string;
      onDelete: string;
    }>;
  },
): void {
  if (!hasTable(db, args.table)) {
    return;
  }

  const actual = db.pragma(`foreign_key_list(${args.table})`) as Array<{
    table: string;
    from: string;
    to: string;
    on_delete: string;
  }>;
  const actualSet = new Set(
    actual.map((item) =>
      [
        item.table,
        item.from,
        item.to,
        item.on_delete.toUpperCase(),
      ].join("|"),
    ),
  );

  for (const expectedFk of args.expected) {
    const key = [
      expectedFk.table,
      expectedFk.from,
      expectedFk.to,
      expectedFk.onDelete.toUpperCase(),
    ].join("|");
    if (!actualSet.has(key)) {
      throw new Error(
        `schema contract mismatch for ${args.table}: missing FK ${expectedFk.from} -> ${expectedFk.table}.${expectedFk.to} ON DELETE ${expectedFk.onDelete}`,
      );
    }
  }
}

function assertUniqueIndexOnColumns(
  db: Database.Database,
  args: { table: string; columns: readonly string[]; label: string },
): void {
  if (!hasTable(db, args.table)) {
    return;
  }

  const expected = [...args.columns];
  const indexes = db.pragma(`index_list(${args.table})`) as Array<{
    name: string;
    unique: number;
  }>;
  const matchFound = indexes.some((indexInfo) => {
    if (indexInfo.unique !== 1) {
      return false;
    }
    const columns = (
      db.pragma(`index_info(${indexInfo.name})`) as Array<{ name: string | null }>
    )
      .map((item) => item.name)
      .filter((item): item is string => typeof item === "string");
    return (
      columns.length === expected.length &&
      columns.every((column, index) => column === expected[index])
    );
  });

  if (!matchFound) {
    throw new Error(
      `schema contract mismatch for ${args.table}: missing unique index/constraint ${args.label}`,
    );
  }
}

function assertUniqueIndexSqlContains(
  db: Database.Database,
  args: { table: string; label: string; requiredSnippets: readonly string[] },
): void {
  if (!hasTable(db, args.table)) {
    return;
  }

  const rows = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL",
    )
    .all(args.table) as Array<{ sql: string }>;

  const matchFound = rows.some((row) => {
    const normalized = normalizeSql(row.sql);
    return args.requiredSnippets.every((snippet) =>
      normalized.includes(normalizeSql(snippet)),
    );
  });

  if (!matchFound) {
    throw new Error(
      `schema contract mismatch for ${args.table}: missing unique index/constraint ${args.label}`,
    );
  }
}

function up(db: Database.Database): void {
  const entitiesFtsExistsBeforeMigration = Boolean(
    db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      )
      .get("entities_fts"),
  );

  // Guard migration bookkeeping truthfulness:
  // if a table already exists with an incompatible shape, fail instead of
  // silently recording version 1 as applied.
  assertTableColumnContract(db, {
    table: "settings",
    expected: [
      {
        name: "scope",
        type: "TEXT",
        notNull: true,
        pk: 1,
        defaultValue: null,
      },
      {
        name: "key",
        type: "TEXT",
        notNull: true,
        pk: 2,
        defaultValue: null,
      },
      {
        name: "value_json",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "updated_at",
        type: "INTEGER",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "sessions",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "project_id",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "started_at",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "ended_at",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      { name: "state", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
    ],
  });
  assertTableColumnContract(db, {
    table: "branches",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "project_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      { name: "name", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      {
        name: "parent_branch_id",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "fork_version_id",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "created_at",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "created_by",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "versions",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "branch_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "parent_version_id",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "content_snapshot",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "operation",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "created_at",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertForeignKeys(db, {
    table: "versions",
    expected: [
      {
        table: "branches",
        from: "branch_id",
        to: "id",
        onDelete: "NO ACTION",
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "cost_records",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "session_id",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "model",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "input_tokens",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "output_tokens",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "cache_hit_tokens",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "duration_ms",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "estimated_cost_usd",
        type: "REAL",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "created_at",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertForeignKeys(db, {
    table: "cost_records",
    expected: [
      {
        table: "sessions",
        from: "session_id",
        to: "id",
        onDelete: "NO ACTION",
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "document_versions",
    expected: [
      { name: "version_id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      { name: "project_id", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "document_id", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "actor", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "content_json", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "content_text", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "content_md", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "created_at", type: "INTEGER", notNull: true, pk: 0, defaultValue: null },
      { name: "reason", type: "TEXT", notNull: true, pk: 0, defaultValue: "''" },
      { name: "content_hash", type: "TEXT", notNull: true, pk: 0, defaultValue: "''" },
      { name: "diff_format", type: "TEXT", notNull: true, pk: 0, defaultValue: "''" },
      { name: "diff_text", type: "TEXT", notNull: true, pk: 0, defaultValue: "''" },
      { name: "word_count", type: "INTEGER", notNull: true, pk: 0, defaultValue: "0" },
      {
        name: "parent_snapshot_id",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertForeignKeys(db, {
    table: "document_versions",
    expected: [
      {
        table: "projects",
        from: "project_id",
        to: "project_id",
        onDelete: "CASCADE",
      },
      {
        table: "documents",
        from: "document_id",
        to: "document_id",
        onDelete: "CASCADE",
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "document_branches",
    expected: [
      { name: "branch_id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "document_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      { name: "name", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      {
        name: "base_snapshot_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "head_snapshot_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      { name: "created_by", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      {
        name: "created_at",
        type: "INTEGER",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertUniqueIndexOnColumns(db, {
    table: "document_branches",
    columns: ["document_id", "name"],
    label: "UNIQUE(document_id, name)",
  });
  assertForeignKeys(db, {
    table: "document_branches",
    expected: [
      {
        table: "documents",
        from: "document_id",
        to: "document_id",
        onDelete: "CASCADE",
      },
      {
        table: "document_versions",
        from: "base_snapshot_id",
        to: "version_id",
        onDelete: "NO ACTION",
      },
      {
        table: "document_versions",
        from: "head_snapshot_id",
        to: "version_id",
        onDelete: "NO ACTION",
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "entity_types",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      { name: "name", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "aliases", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      {
        name: "is_builtin",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: "0",
      },
      { name: "icon", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      {
        name: "default_properties",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      { name: "project_id", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
    ],
  });
  assertTableColumnContract(db, {
    table: "relation_types",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      { name: "name", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "aliases", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      {
        name: "is_builtin",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: "0",
      },
      {
        name: "is_directional",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: "1",
      },
      {
        name: "allowed_source_types",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "allowed_target_types",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "allow_free_text_target",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: "1",
      },
      { name: "project_id", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
    ],
  });
  assertTableColumnContract(db, {
    table: "property_types",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      { name: "name", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "aliases", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      {
        name: "is_builtin",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: "0",
      },
      {
        name: "value_type",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      { name: "options", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      {
        name: "allow_multiple",
        type: "INTEGER",
        notNull: false,
        pk: 0,
        defaultValue: "0",
      },
      {
        name: "applicable_entity_types",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      { name: "project_id", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
    ],
  });
  assertTableColumnContract(db, {
    table: "entities",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "entity_type_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      { name: "name", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      {
        name: "description",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      { name: "icon", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      {
        name: "project_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "created_by",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: "'user'",
      },
      {
        name: "created_at",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "entity_properties",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "entity_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "property_type_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      { name: "value", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      { name: "layer", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      { name: "known_by", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      { name: "valid_from", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      { name: "valid_until", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      {
        name: "confidence",
        type: "REAL",
        notNull: false,
        pk: 0,
        defaultValue: "1.0",
      },
      {
        name: "source_chapter",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "created_by",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: "'user'",
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "relations",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "source_entity_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "relation_type_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "target_entity_id",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "target_value",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      { name: "layer", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      { name: "known_by", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      { name: "valid_from", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      { name: "valid_until", type: "TEXT", notNull: false, pk: 0, defaultValue: null },
      {
        name: "relation_detail",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "confidence",
        type: "REAL",
        notNull: false,
        pk: 0,
        defaultValue: "1.0",
      },
      {
        name: "source_chapter",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "created_by",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: "'user'",
      },
      {
        name: "project_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertForeignKeys(db, {
    table: "entities",
    expected: [
      {
        table: "entity_types",
        from: "entity_type_id",
        to: "id",
        onDelete: "NO ACTION",
      },
    ],
  });
  assertForeignKeys(db, {
    table: "entity_properties",
    expected: [
      {
        table: "entities",
        from: "entity_id",
        to: "id",
        onDelete: "NO ACTION",
      },
      {
        table: "property_types",
        from: "property_type_id",
        to: "id",
        onDelete: "NO ACTION",
      },
    ],
  });
  assertForeignKeys(db, {
    table: "relations",
    expected: [
      {
        table: "entities",
        from: "source_entity_id",
        to: "id",
        onDelete: "NO ACTION",
      },
      {
        table: "relation_types",
        from: "relation_type_id",
        to: "id",
        onDelete: "NO ACTION",
      },
      {
        table: "entities",
        from: "target_entity_id",
        to: "id",
        onDelete: "NO ACTION",
      },
    ],
  });
  assertTableSqlContains(db, {
    table: "entities_fts",
    requiredSnippets: ["content='entities'", "content_rowid='rowid'"],
  });
  assertTableColumnContract(db, {
    table: "kg_entities",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "project_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      { name: "type", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      { name: "name", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      {
        name: "description",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: "''",
      },
      {
        name: "attributes_json",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: "'{}'",
      },
      {
        name: "version",
        type: "INTEGER",
        notNull: true,
        pk: 0,
        defaultValue: "1",
      },
      {
        name: "created_at",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "updated_at",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "ai_context_level",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: "'when_detected'",
      },
      {
        name: "aliases",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: "'[]'",
      },
      {
        name: "last_seen_state",
        type: "TEXT",
        notNull: false,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "kg_relation_types",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "project_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      { name: "key", type: "TEXT", notNull: true, pk: 0, defaultValue: null },
      {
        name: "label",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "builtin",
        type: "INTEGER",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "created_at",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertTableColumnContract(db, {
    table: "kg_relations",
    expected: [
      { name: "id", type: "TEXT", notNull: false, pk: 1, defaultValue: null },
      {
        name: "project_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "source_entity_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "target_entity_id",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "relation_type",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
      {
        name: "description",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: "''",
      },
      {
        name: "created_at",
        type: "TEXT",
        notNull: true,
        pk: 0,
        defaultValue: null,
      },
    ],
  });
  assertTableSqlContains(db, {
    table: "kg_entities",
    requiredSnippets: [
      "check (type in ('character', 'location', 'event', 'item', 'faction'))",
    ],
  });
  assertForeignKeys(db, {
    table: "kg_entities",
    expected: [
      {
        table: "projects",
        from: "project_id",
        to: "project_id",
        onDelete: "CASCADE",
      },
    ],
  });
  assertUniqueIndexSqlContains(db, {
    table: "kg_entities",
    label: "UNIQUE(project_id, type, lower(trim(name)))",
    requiredSnippets: [
      "create unique index",
      "on kg_entities(project_id, type, lower(trim(name)))",
    ],
  });
  assertUniqueIndexOnColumns(db, {
    table: "kg_relation_types",
    columns: ["project_id", "key"],
    label: "UNIQUE(project_id, key)",
  });
  assertForeignKeys(db, {
    table: "kg_relation_types",
    expected: [
      {
        table: "projects",
        from: "project_id",
        to: "project_id",
        onDelete: "CASCADE",
      },
    ],
  });
  assertForeignKeys(db, {
    table: "kg_relations",
    expected: [
      {
        table: "projects",
        from: "project_id",
        to: "project_id",
        onDelete: "CASCADE",
      },
      {
        table: "kg_entities",
        from: "source_entity_id",
        to: "id",
        onDelete: "CASCADE",
      },
      {
        table: "kg_entities",
        from: "target_entity_id",
        to: "id",
        onDelete: "CASCADE",
      },
    ],
  });

  db.exec(UP_SQL);

  // Bridge path fix: when entities_fts is first created on existing databases
  // with pre-existing entities rows, rebuild the FTS index immediately so
  // search coverage is truthful right after migration.
  if (!entitiesFtsExistsBeforeMigration) {
    db.prepare("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')").run();
  }
}

// @rollback: manual — baseline schema rollback requires a manual DB reset.
export const initialSchemaMigration: Migration = {
  version: 1,
  name: "001_initial_schema",
  up,
};
