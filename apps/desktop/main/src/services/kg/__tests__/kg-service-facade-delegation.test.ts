import assert from "node:assert/strict";

import type { KnowledgeGraphQueryService } from "../kgQueryService";
import type { KnowledgeGraphWriteService } from "../kgWriteService";
import {
  createKnowledgeGraphServiceFacade,
  type KnowledgeGraphService,
} from "../kgService";

type CallLog = {
  method: keyof KnowledgeGraphService;
  args: unknown;
};

const calls: CallLog[] = [];

const writeService: KnowledgeGraphWriteService = {
  entityCreate: (args) => {
    calls.push({ method: "entityCreate", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  entityRead: (args) => {
    calls.push({ method: "entityRead", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  entityList: (args) => {
    calls.push({ method: "entityList", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  entityUpdate: (args) => {
    calls.push({ method: "entityUpdate", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  entityDelete: (args) => {
    calls.push({ method: "entityDelete", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  relationCreate: (args) => {
    calls.push({ method: "relationCreate", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  relationList: (args) => {
    calls.push({ method: "relationList", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  relationUpdate: (args) => {
    calls.push({ method: "relationUpdate", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  relationDelete: (args) => {
    calls.push({ method: "relationDelete", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
};

const queryService: KnowledgeGraphQueryService = {
  querySubgraph: (args) => {
    calls.push({ method: "querySubgraph", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  queryPath: (args) => {
    calls.push({ method: "queryPath", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  queryValidate: (args) => {
    calls.push({ method: "queryValidate", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  queryRelevant: (args) => {
    calls.push({ method: "queryRelevant", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  queryByIds: (args) => {
    calls.push({ method: "queryByIds", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
  buildRulesInjection: (args) => {
    calls.push({ method: "buildRulesInjection", args });
    return { ok: false, error: { code: "NOT_FOUND", message: "mock" } };
  },
};

const facade = createKnowledgeGraphServiceFacade({ queryService, writeService });

// KG-S1-KSE-S2
// should delegate facade methods to query/write services without contract drift
facade.entityCreate({
  projectId: "p",
  type: "character",
  name: "n",
});
facade.entityRead({ projectId: "p", id: "e1" });
facade.entityList({ projectId: "p" });
facade.entityUpdate({
  projectId: "p",
  id: "e1",
  expectedVersion: 1,
  patch: { name: "new" },
});
facade.entityDelete({ projectId: "p", id: "e1" });
facade.relationCreate({
  projectId: "p",
  sourceEntityId: "e1",
  targetEntityId: "e2",
  relationType: "ally",
});
facade.relationList({ projectId: "p" });
facade.relationUpdate({
  projectId: "p",
  id: "r1",
  patch: { relationType: "enemy" },
});
facade.relationDelete({ projectId: "p", id: "r1" });
facade.querySubgraph({ projectId: "p", centerEntityId: "e1", k: 1 });
facade.queryPath({
  projectId: "p",
  sourceEntityId: "e1",
  targetEntityId: "e2",
});
facade.queryValidate({ projectId: "p" });
facade.queryRelevant({ projectId: "p", excerpt: "x" });
facade.queryByIds({ projectId: "p", entityIds: ["e1"] });
facade.buildRulesInjection({
  projectId: "p",
  documentId: "d",
  excerpt: "x",
  traceId: "t",
});

assert.deepEqual(
  calls.map((call) => call.method),
  [
    "entityCreate",
    "entityRead",
    "entityList",
    "entityUpdate",
    "entityDelete",
    "relationCreate",
    "relationList",
    "relationUpdate",
    "relationDelete",
    "querySubgraph",
    "queryPath",
    "queryValidate",
    "queryRelevant",
    "queryByIds",
    "buildRulesInjection",
  ],
);
