import assert from "node:assert/strict";
import type { AiContextLevel } from "../kgService";
import { matchEntities, type MatchableEntity } from "../entityMatcher";

function createEntity(args: {
  id: string;
  name: string;
  aliases?: string[];
  aiContextLevel?: AiContextLevel;
}): MatchableEntity {
  return {
    id: args.id,
    name: args.name,
    aliases: args.aliases ?? [],
    aiContextLevel: args.aiContextLevel ?? "when_detected",
  };
}

// S1
// should match entities by name when text contains their names
{
  const text = "林默推开门，走进长安城";
  const entities: MatchableEntity[] = [
    createEntity({ id: "e1", name: "林默" }),
    createEntity({ id: "e2", name: "长安城", aliases: ["长安"] }),
  ];

  const results = matchEntities(text, entities);

  assert.equal(results.length, 2);
  assert.deepEqual(results, [
    { entityId: "e1", matchedTerm: "林默", position: text.indexOf("林默") },
    {
      entityId: "e2",
      matchedTerm: "长安城",
      position: text.indexOf("长安城"),
    },
  ]);
}

// S2
// should match entities by alias when name is absent
{
  const text = "小默推开门";
  const entities: MatchableEntity[] = [
    createEntity({ id: "e1", name: "林默", aliases: ["小默", "默哥"] }),
  ];

  const results = matchEntities(text, entities);

  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    entityId: "e1",
    matchedTerm: "小默",
    position: text.indexOf("小默"),
  });
}

// S3
// should skip non-when_detected entities when matching
{
  const text = "林默和张薇在讨论";
  const entities: MatchableEntity[] = [
    createEntity({ id: "e1", name: "林默", aiContextLevel: "always" }),
    createEntity({ id: "e2", name: "张薇", aiContextLevel: "never" }),
    createEntity({ id: "e3", name: "讨论", aiContextLevel: "manual_only" }),
  ];

  const results = matchEntities(text, entities);

  assert.equal(results.length, 0);
}

// S4
// should deduplicate by entityId when both name and alias match
{
  const text = "林默和小默一起出发";
  const entities: MatchableEntity[] = [
    createEntity({ id: "e1", name: "林默", aliases: ["小默"] }),
  ];

  const results = matchEntities(text, entities);

  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    entityId: "e1",
    matchedTerm: "林默",
    position: text.indexOf("林默"),
  });
}

// S5
// should return empty for empty text
{
  const entities: MatchableEntity[] = [
    createEntity({ id: "e1", name: "林默" }),
  ];

  const results = matchEntities("", entities);

  assert.deepEqual(results, []);
}

// S6
// should complete within 10ms for 100 entities x 1000 chars
{
  const entities: MatchableEntity[] = Array.from({ length: 100 }, (_, index) =>
    createEntity({
      id: `e-${index}`,
      name: `角色${index}`,
      aliases: [`别名${index}-A`, `别名${index}-B`],
    }),
  );
  const text = "天地玄黄宇宙洪荒".repeat(125);
  assert.equal(text.length, 1000);

  const startedAt = performance.now();
  matchEntities(text, entities);
  const elapsed = performance.now() - startedAt;

  assert.equal(elapsed < 10, true);
}
