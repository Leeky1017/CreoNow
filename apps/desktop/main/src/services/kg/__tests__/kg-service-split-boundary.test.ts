import assert from "node:assert/strict";

import Database from "better-sqlite3";

import type { Logger } from "../../../logging/logger";
import { createKnowledgeGraphQueryService } from "../kgQueryService";
import { createKnowledgeGraphWriteService } from "../kgWriteService";

const logger: Logger = {
  logPath: "<test>",
  info: () => {},
  error: () => {},
};

const db = new Database(":memory:");
try {
  // KG-S1-KSE-S1
  // should split query and write responsibilities into dedicated services
  const queryService = createKnowledgeGraphQueryService({ db, logger });
  const writeService = createKnowledgeGraphWriteService({ db, logger });

  assert.deepEqual(Object.keys(queryService).sort(), [
    "buildRulesInjection",
    "queryByIds",
    "queryPath",
    "queryRelevant",
    "querySubgraph",
    "queryValidate",
  ]);

  assert.deepEqual(Object.keys(writeService).sort(), [
    "entityCreate",
    "entityDelete",
    "entityList",
    "entityRead",
    "entityUpdate",
    "relationCreate",
    "relationDelete",
    "relationList",
    "relationUpdate",
  ]);

  assert.equal("entityCreate" in queryService, false);
  assert.equal("queryRelevant" in writeService, false);
} finally {
  db.close();
}
