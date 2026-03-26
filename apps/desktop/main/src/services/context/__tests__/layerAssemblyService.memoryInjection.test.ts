import assert from "node:assert/strict";

import { createContextLayerAssemblyService } from "../layerAssemblyService";

const request = {
  projectId: "proj-memory-injection",
  documentId: "doc-1",
  cursorPosition: 12,
  skillId: "continue-writing",
  additionalInput: "继续写这一段动作场景",
};

// Scenario: MS-S2-MI-S3
// should expose memory injection end-to-end and keep inspect content consistent with assembled prompt
{
  const service = createContextLayerAssemblyService(
    {
      rules: async () => ({
        chunks: [{ source: "rules:test", content: "规则约束" }],
      }),
      retrieved: async () => ({
        chunks: [{ source: "retrieved:test", content: "召回片段" }],
      }),
      immediate: async () => ({
        chunks: [{ source: "immediate:test", content: "当前正文" }],
      }),
    },
    {
      memoryService: {
        previewInjection: () => ({
          ok: true,
          data: {
            mode: "deterministic",
            items: [
              {
                id: "m-1",
                type: "preference",
                scope: "project",
                origin: "learned",
                content: "动作场景偏好短句",
                reason: { kind: "deterministic" },
              },
            ],
          },
        }),
      },
    },
  );

  const assembleResult = await service.assemble(request);
  const inspectResult = await service.inspect({
    ...request,
    debugMode: true,
    requestedBy: "unit-test",
  });

  const settingsContent = inspectResult.layersDetail.settings.content;

  assert.equal(settingsContent.includes("动作场景偏好短句"), true);
  assert.deepEqual(inspectResult.layersDetail.settings.source, [
    "memory:injection",
  ]);
  assert.equal(assembleResult.prompt.includes(settingsContent), true);
}

console.log(
  "layerAssemblyService.memoryInjection.test.ts: all assertions passed",
);
