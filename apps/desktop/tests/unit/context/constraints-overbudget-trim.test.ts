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

function longText(label: string): string {
  return `${label} ` + "x".repeat(280);
}

// Scenario Mapping: CE4-R1-S3
{
  // Arrange
  const service = createContextLayerAssemblyService({
    rules: async () => ({
      chunks: [
        {
          source: "constraints:policy",
          content: "",
          constraints: [
            {
              id: "kg-low-a",
              text: longText("KG低优先级-A"),
              source: "kg",
              priority: 1,
              updatedAt: "2026-02-10T09:00:00.000Z",
              degradable: true,
            },
            {
              id: "kg-low-b",
              text: longText("KG低优先级-B"),
              source: "kg",
              priority: 2,
              updatedAt: "2026-02-10T09:10:00.000Z",
              degradable: true,
            },
            {
              id: "user-locked",
              text: longText("用户强约束"),
              source: "user",
              priority: 100,
              updatedAt: "2026-02-10T11:00:00.000Z",
              degradable: false,
            },
            {
              id: "user-soft",
              text: longText("用户可降级约束"),
              source: "user",
              priority: 60,
              updatedAt: "2026-02-10T10:30:00.000Z",
              degradable: true,
            },
          ] as ConstraintItem[],
        },
      ],
    }),
    settings: async () => ({ chunks: [] }),
    retrieved: async () => ({ chunks: [] }),
    immediate: async () => ({
      chunks: [{ source: "editor:cursor-window", content: "当前段落" }],
    }),
  });

  const updated = service.updateBudgetProfile({
    version: 1,
    tokenizerId: "cn-byte-estimator",
    tokenizerVersion: "1.0.0",
    layers: {
      rules: { ratio: 0.05, minimumTokens: 0 },
      settings: { ratio: 0.15, minimumTokens: 0 },
      retrieved: { ratio: 0.3, minimumTokens: 0 },
      immediate: { ratio: 0.5, minimumTokens: 0 },
    },
  });
  assert.equal(updated.ok, true);

  // Act
  const assembled = await service.assemble({
    projectId: "project-1",
    documentId: "doc-1",
    cursorPosition: 42,
    skillId: "continue-writing",
  });

  // Assert
  assert.equal(assembled.warnings.includes("CONTEXT_RULES_OVERBUDGET"), true);
  assert.equal(assembled.layers.rules.tokenCount <= 300, true);
  assert.match(assembled.prompt, /用户强约束/);
  assert.equal(assembled.prompt.includes("KG低优先级-A"), false);
}
