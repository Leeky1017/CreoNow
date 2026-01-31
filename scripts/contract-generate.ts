import fs from "node:fs/promises";
import path from "node:path";

import { ipcContract } from "../apps/desktop/main/src/ipc/contract/ipc-contract";
import type { IpcSchema } from "../apps/desktop/main/src/ipc/contract/schema";

function assertNever(x: never): never {
  throw new Error(`unreachable: ${JSON.stringify(x)}`);
}

function renderLiteral(value: string | number | boolean): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

function renderSchema(schema: IpcSchema): string {
  switch (schema.kind) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "literal":
      return renderLiteral(schema.value);
    case "array":
      return `Array<${renderSchema(schema.element)}>`;
    case "union": {
      const parts = [...schema.variants].map((v) => renderSchema(v));
      return parts.join(" | ");
    }
    case "optional":
      return `${renderSchema(schema.schema)} | undefined`;
    case "object": {
      const entries = Object.entries(schema.fields);
      if (entries.length === 0) {
        return "Record<string, never>";
      }

      const lines = entries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, valueSchema]) => {
          const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
            ? key
            : JSON.stringify(key);

          if (valueSchema.kind === "optional") {
            return `  ${safeKey}?: ${renderSchema(valueSchema.schema)};`;
          }
          return `  ${safeKey}: ${renderSchema(valueSchema)};`;
        });
      return `{\n${lines.join("\n")}\n}`;
    }
    default:
      return assertNever(schema);
  }
}

function normalizeNewlines(s: string): string {
  return s.replaceAll("\r\n", "\n");
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const outPath = path.join(repoRoot, "packages/shared/types/ipc-generated.ts");

  const channels = Object.keys(ipcContract.channels).sort();
  const channelSpecLines = channels.map((channel) => {
    const spec =
      ipcContract.channels[channel as keyof typeof ipcContract.channels];
    const req = renderSchema(spec.request);
    const res = renderSchema(spec.response);
    return `  ${JSON.stringify(channel)}: {\n    request: ${req};\n    response: ${res};\n  };`;
  });

  const errorCodeLines = [...ipcContract.errorCodes]
    .slice()
    .sort()
    .map((c) => `  | ${JSON.stringify(c)}`);

  const content = normalizeNewlines(
    `/* eslint-disable */
/**
 * GENERATED FILE - DO NOT EDIT.
 * Source: apps/desktop/main/src/ipc/contract/ipc-contract.ts
 * Run: pnpm contract:generate
 */

export type IpcErrorCode =
${errorCodeLines.join("\n")};

export type IpcMeta = {
  requestId: string;
  ts: number;
};

export type IpcError = {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
  retryable?: boolean;
};

export type IpcOk<TData> = {
  ok: true;
  data: TData;
  meta?: IpcMeta;
};

export type IpcErr = {
  ok: false;
  error: IpcError;
  meta?: IpcMeta;
};

export type IpcResponse<TData> = IpcOk<TData> | IpcErr;

export const IPC_CHANNELS = ${JSON.stringify(channels, null, 2)} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[number];

export type IpcChannelSpec = {
${channelSpecLines.join("\n")}
};

export type IpcRequest<C extends IpcChannel> = IpcChannelSpec[C]["request"];

export type IpcResponseData<C extends IpcChannel> = IpcChannelSpec[C]["response"];

export type IpcInvokeResult<C extends IpcChannel> = IpcResponse<IpcResponseData<C>>;
`,
  );

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, content, "utf8");
}

await main();
