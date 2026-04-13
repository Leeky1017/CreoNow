import type Database from "better-sqlite3";
import type { Migration } from "../migrator";

export const kgEntityTypeExtensionMigration: Migration = {
  version: 2,
  name: "002_kg_entity_type_extension",
  up(db: Database.Database): void {
    // SQLite CHECK constraints cannot be ALTERed — must recreate table.
    // Extends type allowlist with 'inspiration' (ENG-04 quick capture) and
    // 'foreshadowing' (ENG-03 foreshadowing tracker) for production writes.
    db.exec(`
      CREATE TABLE kg_entities_new (
        id               TEXT PRIMARY KEY,
        project_id       TEXT NOT NULL,
        type             TEXT NOT NULL CHECK (type IN ('character','location','event','item','faction','inspiration','foreshadowing')),
        name             TEXT NOT NULL,
        description      TEXT NOT NULL DEFAULT '',
        attributes_json  TEXT NOT NULL DEFAULT '{}',
        version          INTEGER NOT NULL DEFAULT 1,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL,
        ai_context_level TEXT NOT NULL DEFAULT 'when_detected',
        aliases          TEXT NOT NULL DEFAULT '[]',
        last_seen_state  TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE
      );

      INSERT INTO kg_entities_new SELECT * FROM kg_entities;

      DROP TABLE kg_entities;

      ALTER TABLE kg_entities_new RENAME TO kg_entities;

      CREATE INDEX idx_kg_entities_project
        ON kg_entities (project_id);

      CREATE INDEX idx_kg_entities_project_type
        ON kg_entities (project_id, type);

      CREATE INDEX idx_kg_entities_project_name
        ON kg_entities (project_id, name);

      CREATE UNIQUE INDEX idx_kg_entities_project_type_name
        ON kg_entities (project_id, type, lower(trim(name)));

      CREATE INDEX idx_kg_entities_project_context_level
        ON kg_entities (project_id, ai_context_level);
    `);
  },
};
