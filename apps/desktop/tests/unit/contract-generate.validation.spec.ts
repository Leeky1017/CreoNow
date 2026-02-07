import assert from "node:assert/strict";

import {
  ContractGenerateError,
  buildGeneratedTypes,
  validateContractDefinition,
  validateIpcBindingsFromSource,
} from "../../../../scripts/contract-generate";

import type { IpcSchema } from "../../main/src/ipc/contract/schema";

function emptyObjectSchema(): IpcSchema {
  return { kind: "object", fields: {} };
}

function expectErrorCode(
  run: () => void,
  expectedCode:
    | "IPC_CONTRACT_INVALID_NAME"
    | "IPC_CONTRACT_MISSING_SCHEMA"
    | "IPC_CONTRACT_DUPLICATED_CHANNEL"
    | "IPC_CONTRACT_INVALID_SCHEMA_REFERENCE"
    | "IPC_CONTRACT_UNREGISTERED_BINDING",
): void {
  try {
    run();
    assert.fail(`expected ${expectedCode}`);
  } catch (error) {
    assert(error instanceof ContractGenerateError);
    assert.equal(error.code, expectedCode);
  }
}

const stableContract = {
  errorCodes: ["INTERNAL"] as const,
  channels: {
    "memory:episode:record": {
      request: emptyObjectSchema(),
      response: emptyObjectSchema(),
    },
  },
};

const generatedA = await buildGeneratedTypes(stableContract);
const generatedB = await buildGeneratedTypes(stableContract);
assert.equal(generatedA, generatedB);

expectErrorCode(() => {
  validateContractDefinition(
    {
      errorCodes: ["INTERNAL"] as const,
      channels: {
        memory_episode_record: {
          request: emptyObjectSchema(),
          response: emptyObjectSchema(),
        },
      },
    },
    {
      declaredChannelsInSource: ["memory_episode_record"],
    },
  );
}, "IPC_CONTRACT_INVALID_NAME");

expectErrorCode(() => {
  validateContractDefinition(
    {
      errorCodes: ["INTERNAL"] as const,
      channels: {
        "memory:episode:record": {
          request: emptyObjectSchema(),
        },
      },
    },
    {
      declaredChannelsInSource: ["memory:episode:record"],
    },
  );
}, "IPC_CONTRACT_MISSING_SCHEMA");

expectErrorCode(() => {
  validateContractDefinition(
    {
      errorCodes: ["INTERNAL"] as const,
      channels: {
        "memory:episode:record": {
          request: emptyObjectSchema(),
          response: emptyObjectSchema(),
        },
      },
    },
    {
      declaredChannelsInSource: [
        "memory:episode:record",
        "memory:episode:record",
      ],
    },
  );
}, "IPC_CONTRACT_DUPLICATED_CHANNEL");

expectErrorCode(() => {
  validateContractDefinition(
    {
      errorCodes: ["INTERNAL"] as const,
      channels: {
        "memory:episode:record": {
          request: {
            kind: "object",
            fields: {
              invalid: { kind: "unknown" } as unknown as IpcSchema,
            },
          },
          response: emptyObjectSchema(),
        },
      },
    },
    {
      declaredChannelsInSource: ["memory:episode:record"],
    },
  );
}, "IPC_CONTRACT_INVALID_SCHEMA_REFERENCE");

expectErrorCode(() => {
  validateIpcBindingsFromSource(
    new Set(["memory:episode:record"]),
    `
      ipcMain.handle("memory:episode:record", async () => ({ ok: true }));
      ipcMain.handle("x:y:z", async () => ({ ok: true }));
    `,
    "apps/desktop/main/src/ipc/example.ts",
  );
}, "IPC_CONTRACT_UNREGISTERED_BINDING");
