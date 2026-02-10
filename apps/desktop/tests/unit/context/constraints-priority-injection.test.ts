import assert from "node:assert/strict";

import { createContextLayerAssemblyService } from "../../../main/src/services/context/layerAssemblyService";

type ConstraintSource = "user" | "kg";

type ConstraintItem = {
  id: string;
  text: string;
  source: ConstraintSource;
  priority: number;
  updatedAt: string;
  degradable?: boolean;
};

// Scenario Mapping: CE4-R1-S2
{
  // Arrange
  const constraints: ConstraintItem[] = [
    {
      id: "u-2",
      text: "用户约束-B（同时间戳）",
      source: "user",
      priority: 90,
      updatedAt: "2026-02-10T10:00:00.000Z",
    },
    {
      id: "k-1",
      text: "KG约束-A（时间更新但应排在用户后）",
      source: "kg",
      priority: 95,
      updatedAt: "2026-02-11T00:00:00.000Z",
    },
    {
      id: "u-1",
      text: "用户约束-A（同时间戳，id更小）",
      source: "user",
      priority: 90,
      updatedAt: "2026-02-10T10:00:00.000Z",
    },
    {
      id: "u-3",
      text: "用户约束-C（更早更新时间）",
      source: "user",
      priority: 90,
      updatedAt: "2026-02-09T10:00:00.000Z",
    },
  ];

  const service = createContextLayerAssemblyService({
    rules: async () => ({
      chunks: [
        {
          source: "constraints:policy",
          content: "",
          constraints,
        },
      ],
    }),
    settings: async () => ({ chunks: [] }),
    retrieved: async () => ({ chunks: [] }),
    immediate: async () => ({
      chunks: [{ source: "editor:cursor-window", content: "当前段落" }],
    }),
  });

  // Act
  const inspected = await service.inspect({
    projectId: "project-1",
    documentId: "doc-1",
    cursorPosition: 88,
    skillId: "continue-writing",
  });

  // Assert
  const rulesContent = inspected.layersDetail.rules.content;
  assert.match(rulesContent, /\[创作约束 - 不可违反\]/);

  const idxU1 = rulesContent.indexOf("用户约束-A（同时间戳，id更小）");
  const idxU2 = rulesContent.indexOf("用户约束-B（同时间戳）");
  const idxU3 = rulesContent.indexOf("用户约束-C（更早更新时间）");
  const idxK1 = rulesContent.indexOf("KG约束-A（时间更新但应排在用户后）");

  assert.equal(idxU1 >= 0, true);
  assert.equal(idxU2 >= 0, true);
  assert.equal(idxU3 >= 0, true);
  assert.equal(idxK1 >= 0, true);

  assert.equal(idxU1 < idxU2, true);
  assert.equal(idxU2 < idxU3, true);
  assert.equal(idxU3 < idxK1, true);
}
