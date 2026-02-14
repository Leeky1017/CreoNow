import assert from "node:assert/strict";

import type {
  KnowledgeEntity,
  KnowledgeGraphService,
} from "../../kg/kgService";
import { createRulesFetcher } from "../fetchers/rulesFetcher";
import { formatEntityForContext } from "../utils/formatEntity";

function createEntity(args: {
  id: string;
  projectId?: string;
  name: string;
  type: KnowledgeEntity["type"];
  description: string;
  attributes?: Record<string, string>;
  aliases?: string[];
}): KnowledgeEntity & { aliases: string[] } {
  return {
    id: args.id,
    projectId: args.projectId ?? "proj-rules-fetcher",
    name: args.name,
    type: args.type,
    description: args.description,
    attributes: args.attributes ?? {},
    aiContextLevel: "always",
    version: 1,
    createdAt: "2026-02-13T00:00:00.000Z",
    updatedAt: "2026-02-13T00:00:00.000Z",
    aliases: args.aliases ?? [],
  };
}

// S1
// should inject always entities into rules layer
{
  const calls: Array<Parameters<KnowledgeGraphService["entityList"]>[0]> = [];
  const kgService: Pick<KnowledgeGraphService, "entityList"> = {
    entityList: (args) => {
      calls.push(args);
      return {
        ok: true,
        data: {
          items: [
            createEntity({
              id: "ent-1",
              name: "林默",
              type: "character",
              description: "28岁侦探",
              attributes: { age: "28" },
              aliases: ["小默"],
            }),
            createEntity({
              id: "ent-2",
              name: "魔法系统",
              type: "item",
              description: "本世界的超能力体系",
            }),
          ],
        },
      };
    },
  };
  const fetcher = createRulesFetcher({ kgService });

  const result = await fetcher({
    projectId: "proj-rules-fetcher",
    documentId: "doc-1",
    cursorPosition: 8,
    skillId: "continue-writing",
  });

  assert.deepEqual(calls, [
    {
      projectId: "proj-rules-fetcher",
      filter: { aiContextLevel: "always" },
    },
  ]);
  assert.equal(result.chunks.length >= 2, true);
  assert.equal(result.chunks[0]?.source, "kg:always:ent-1");
  assert.equal(result.chunks[0]?.content.includes("林默"), true);
  assert.equal(result.chunks[0]?.content.includes("28岁侦探"), true);
  assert.equal(result.chunks[1]?.content.includes("魔法系统"), true);
}

// S2
// should return empty chunks when no always entities
{
  const kgService: Pick<KnowledgeGraphService, "entityList"> = {
    entityList: (_args) => ({
      ok: true,
      data: { items: [] },
    }),
  };
  const fetcher = createRulesFetcher({ kgService });

  const result = await fetcher({
    projectId: "proj-rules-fetcher",
    documentId: "doc-2",
    cursorPosition: 9,
    skillId: "continue-writing",
  });

  assert.deepEqual(result.chunks, []);
  assert.equal(result.warnings, undefined);
}

// S3
// should degrade with KG_UNAVAILABLE warning on error
{
  const kgService: Pick<KnowledgeGraphService, "entityList"> = {
    entityList: (_args) => {
      throw new Error("DB connection lost");
    },
  };
  const fetcher = createRulesFetcher({ kgService });

  const result = await fetcher({
    projectId: "proj-rules-fetcher",
    documentId: "doc-3",
    cursorPosition: 10,
    skillId: "continue-writing",
  });

  assert.deepEqual(result.chunks, []);
  assert.equal(result.warnings?.[0]?.includes("KG_UNAVAILABLE"), true);
}

// S4
// should format entity with type, description, attributes
{
  const content = formatEntityForContext(
    createEntity({
      id: "ent-format",
      name: "林默",
      type: "character",
      description: "侦探",
      attributes: { age: "28", skill: "推理" },
    }),
  );

  assert.equal(content.includes("## 角色：林默"), true);
  assert.equal(content.includes("类型：character"), true);
  assert.equal(content.includes("描述：侦探"), true);
  assert.equal(content.includes("age=28"), true);
  assert.equal(content.includes("skill=推理"), true);
}
