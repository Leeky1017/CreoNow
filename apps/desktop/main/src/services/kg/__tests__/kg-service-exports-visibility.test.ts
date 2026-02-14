import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createKnowledgeGraphQueryService } from "../kgQueryService";
import {
  AI_CONTEXT_LEVELS as SERVICE_AI_CONTEXT_LEVELS,
  createKnowledgeGraphService,
  KNOWLEDGE_ENTITY_TYPES as SERVICE_KNOWLEDGE_ENTITY_TYPES,
} from "../kgService";
import { AI_CONTEXT_LEVELS, KNOWLEDGE_ENTITY_TYPES } from "../types";

const logger: Logger = {
  logPath: "<test>",
  info: () => {},
  error: () => {},
};

// KG-S1-KSE-S3
// should keep key exports and buildRulesInjection import path visible
assert.deepEqual(KNOWLEDGE_ENTITY_TYPES, [
  "character",
  "location",
  "event",
  "item",
  "faction",
]);
assert.deepEqual(AI_CONTEXT_LEVELS, [
  "always",
  "when_detected",
  "manual_only",
  "never",
]);
assert.deepEqual(SERVICE_KNOWLEDGE_ENTITY_TYPES, KNOWLEDGE_ENTITY_TYPES);
assert.deepEqual(SERVICE_AI_CONTEXT_LEVELS, AI_CONTEXT_LEVELS);

const db = new Database(":memory:");
try {
  db.exec(`
    CREATE TABLE projects (
      project_id TEXT PRIMARY KEY
    );
    CREATE TABLE kg_entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      attributes_json TEXT NOT NULL DEFAULT '{}',
      ai_context_level TEXT NOT NULL DEFAULT 'when_detected',
      aliases TEXT NOT NULL DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE kg_relations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);
  db.prepare("INSERT INTO projects (project_id) VALUES (?)").run(
    "proj-exports",
  );

  const queryService = createKnowledgeGraphQueryService({ db, logger });
  const builtByQuery = queryService.buildRulesInjection({
    projectId: "proj-exports",
    documentId: "doc-1",
    excerpt: "irrelevant",
    traceId: "trace-1",
  });

  assert.equal(builtByQuery.ok, true);
  if (!builtByQuery.ok) {
    assert.fail("query buildRulesInjection should be available");
  }
  assert.deepEqual(builtByQuery.data.injectedEntities, []);
  assert.equal(builtByQuery.data.source, "kg-rules-mock");

  const facadeService = createKnowledgeGraphService({ db, logger });
  const builtByFacade = facadeService.buildRulesInjection({
    projectId: "proj-exports",
    documentId: "doc-2",
    excerpt: "irrelevant",
    traceId: "trace-2",
  });

  assert.equal(builtByFacade.ok, true);
  if (!builtByFacade.ok) {
    assert.fail("facade buildRulesInjection should be available");
  }
  assert.deepEqual(builtByFacade.data.injectedEntities, []);
  assert.equal(builtByFacade.data.source, "kg-rules-mock");
} finally {
  db.close();
}

const contextFormatPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../context/utils/formatEntity.ts",
);
const contextFormatSource = await readFile(contextFormatPath, "utf8");
assert.match(contextFormatSource, /from\s+["']\.\.\/\.\.\/kg\/kgService["']/);
