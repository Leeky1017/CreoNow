import type Database from "better-sqlite3";
import type { Migration } from "../migrator";

export const kgEntityTypeExtensionMigration: Migration = {
  version: 2,
  name: "002_kg_entity_type_extension",
  up(db: Database.Database): void {
    // SQLite CHECK constraints cannot be ALTERed — must recreate table.
    // Extends type allowlist with 'inspiration' (ENG-04 quick capture) and
    // 'foreshadowing' (ENG-03 foreshadowing tracker) for production writes.
    //
    // IMPORTANT: With PRAGMA foreign_keys = ON (set in init.ts), DROP TABLE
    // triggers an implicit DELETE FROM first, which cascades to kg_relations
    // via ON DELETE CASCADE. We must save and restore kg_relations to prevent
    // data loss.
    db.exec(`
      -- 1. Save kg_relations data (child FK table referencing kg_entities)
      CREATE TABLE _kg_relations_backup AS SELECT * FROM kg_relations;

      -- 2. Empty kg_relations so CASCADE from DROP has nothing to delete
      DELETE FROM kg_relations;

      -- 3. Create new kg_entities with extended CHECK
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

      -- 4. Copy all entity data
      INSERT INTO kg_entities_new SELECT * FROM kg_entities;

      -- 5. Drop old table (safe: kg_relations is empty, CASCADE deletes nothing)
      DROP TABLE kg_entities;

      -- 6. Rename new table
      ALTER TABLE kg_entities_new RENAME TO kg_entities;

      -- 7. Rebuild all indexes
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

      -- 8. Restore kg_relations data
      INSERT INTO kg_relations SELECT * FROM _kg_relations_backup;

      -- 9. Clean up backup table
      DROP TABLE _kg_relations_backup;
    `);
  },
};
