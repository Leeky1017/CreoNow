import assert from "node:assert/strict";

import {
  ContractGenerateError,
  type ContractGenerateErrorCode,
  validateContractDefinition,
} from "../../../../scripts/contract-generate";

import type { IpcSchema } from "../../main/src/ipc/contract/schema";

function emptyObjectSchema(): IpcSchema {
  return { kind: "object", fields: {} };
}

type ExpectErrorArgs = {
  run: () => void;
  expectedCode: ContractGenerateErrorCode;
  expectedMessageIncludes?: string;
  assertDetails?: (details: unknown) => void;
};

function expectError(args: ExpectErrorArgs): void {
  try {
    args.run();
    assert.fail(`expected ${args.expectedCode}`);
  } catch (error) {
    assert(error instanceof ContractGenerateError);
    assert.equal(error.code, args.expectedCode);
    if (args.expectedMessageIncludes) {
      assert.match(error.message, new RegExp(args.expectedMessageIncludes));
    }
    if (args.assertDetails) {
      args.assertDetails(error.details);
    }
  }
}

// S1: 非白名单 domain 注册被阻断 [ADDED]
expectError({
  run: () => {
    validateContractDefinition(
      {
        errorCodes: ["INTERNAL"] as const,
        channels: {
          "plugin:tool:run": {
            request: emptyObjectSchema(),
            response: emptyObjectSchema(),
          },
        },
      },
      {
        declaredChannelsInSource: ["plugin:tool:run"],
        channelSourceMap: {
          "plugin:tool:run": "packages/shared/types/ipc/plugin.ts",
        },
      },
    );
  },
  expectedCode: "IPC_CONTRACT_UNKNOWN_DOMAIN",
  assertDetails: (details) => {
    assert.equal(typeof details, "object");
    const payload = details as Record<string, unknown>;
    assert.equal(payload.channel, "plugin:tool:run");
    assert.equal(payload.filePath, "packages/shared/types/ipc/plugin.ts");
    assert.equal(payload.rule, "domain-whitelist");
  },
});

// S2: 两段式通道命名被阻断 [ADDED]
expectError({
  run: () => {
    validateContractDefinition(
      {
        errorCodes: ["INTERNAL"] as const,
        channels: {
          "project:create": {
            request: emptyObjectSchema(),
            response: emptyObjectSchema(),
          },
        },
      },
      {
        declaredChannelsInSource: ["project:create"],
        channelSourceMap: {
          "project:create": "packages/shared/types/ipc/project.ts",
        },
      },
    );
  },
  expectedCode: "IPC_CONTRACT_INVALID_NAME",
  expectedMessageIncludes: "<domain>:<resource>:<action>",
});

// S3: method 名冲突被阻断 [ADDED]
expectError({
  run: () => {
    validateContractDefinition(
      {
        errorCodes: ["INTERNAL"] as const,
        channels: {
          "project:meta:data": {
            request: emptyObjectSchema(),
            response: emptyObjectSchema(),
          },
          "project:met:adata": {
            request: emptyObjectSchema(),
            response: emptyObjectSchema(),
          },
        },
      },
      {
        declaredChannelsInSource: ["project:meta:data", "project:met:adata"],
        channelSourceMap: {
          "project:meta:data": "packages/shared/types/ipc/project.ts",
          "project:met:adata": "packages/shared/types/ipc/project-extra.ts",
        },
      },
    );
  },
  expectedCode: "IPC_CONTRACT_NAME_COLLISION",
  assertDetails: (details) => {
    assert.equal(typeof details, "object");
    const payload = details as Record<string, unknown>;
    assert.equal(payload.methodName, "metadata");
    assert.deepEqual(payload.channels, [
      "project:meta:data",
      "project:met:adata",
    ]);
    assert.deepEqual(payload.filePaths, [
      "packages/shared/types/ipc/project.ts",
      "packages/shared/types/ipc/project-extra.ts",
    ]);
  },
});

// S4: 命名违规返回可定位信息 [ADDED]
expectError({
  run: () => {
    validateContractDefinition(
      {
        errorCodes: ["INTERNAL"] as const,
        channels: {
          "project:meta:re-name": {
            request: emptyObjectSchema(),
            response: emptyObjectSchema(),
          },
        },
      },
      {
        declaredChannelsInSource: ["project:meta:re-name"],
        channelSourceMap: {
          "project:meta:re-name": "packages/shared/types/ipc/project.ts",
        },
      },
    );
  },
  expectedCode: "IPC_CONTRACT_INVALID_NAME",
  assertDetails: (details) => {
    assert.equal(typeof details, "object");
    const payload = details as Record<string, unknown>;
    assert.equal(payload.channel, "project:meta:re-name");
    assert.equal(payload.filePath, "packages/shared/types/ipc/project.ts");
    assert.equal(payload.rule, "resource-action-format");
  },
});
