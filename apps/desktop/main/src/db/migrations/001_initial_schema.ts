/**
 * 001_initial_schema.ts — baseline schema for TypeScript migrations.
 *
 * IMPORTANT:
 * This baseline mirrors the repository's live SQLite runtime contract so the
 * init.ts bridge can record migration state truthfully on existing databases.
 * We intentionally reuse legacy table shapes for `settings` and `kg_*`.
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
    content='kg_entities',
    content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS entities_ai_fts
    AFTER INSERT ON kg_entities
  BEGIN
    INSERT INTO entities_fts (rowid, name, description)
      VALUES (new.rowid, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_au_fts
    AFTER UPDATE ON kg_entities
  BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description)
      VALUES('delete', old.rowid, old.name, old.description);
    INSERT INTO entities_fts(rowid, name, description)
      VALUES(new.rowid, new.name, new.description);
  END;

  CREATE TRIGGER IF NOT EXISTS entities_ad_fts
    AFTER DELETE ON kg_entities
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
  // with pre-existing kg_entities rows, rebuild the FTS index immediately so
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
