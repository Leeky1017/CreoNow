import type { IpcError, IpcErrorCode } from "@shared/types/ipc-generated";

type JsonObject = Record<string, unknown>;

function asObject(x: unknown): JsonObject | null {
  if (typeof x !== "object" || x === null) {
    return null;
  }
  return x as JsonObject;
}

export function mapUpstreamStatusToIpcErrorCode(status: number): IpcErrorCode {
  if (status === 401 || status === 403) {
    return "AI_AUTH_FAILED";
  }
  if (status === 429) {
    return "AI_RATE_LIMITED";
  }
  return "LLM_API_ERROR";
}

function upstreamError(args: { status: number; message: string }): IpcError {
  const code = mapUpstreamStatusToIpcErrorCode(args.status);
  const message =
    code === "AI_AUTH_FAILED"
      ? "AI upstream unauthorized"
      : code === "AI_RATE_LIMITED"
        ? "AI upstream rate limited"
        : args.message;
  return {
    code,
    message,
    details: { status: args.status },
  };
}

async function readUpstreamErrorMessage(args: {
  res: Response;
  fallback: string;
}): Promise<string> {
  const contentType = args.res.headers.get("content-type") ?? "";
  const raw = await args.res.text();

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const obj = asObject(parsed);
      const nestedError = asObject(obj?.error);
      const nestedMessage = nestedError?.message;
      if (
        typeof nestedMessage === "string" &&
        nestedMessage.trim().length > 0
      ) {
        return nestedMessage.trim();
      }
      const directMessage = obj?.message;
      if (
        typeof directMessage === "string" &&
        directMessage.trim().length > 0
      ) {
        return directMessage.trim();
      }
    } catch {
      return args.fallback;
    }
  }

  return args.fallback;
}

export async function buildUpstreamHttpError(args: {
  res: Response;
  fallbackMessage: string;
}): Promise<IpcError> {
  const upstreamMessage = await readUpstreamErrorMessage({
    res: args.res,
    fallback: args.fallbackMessage,
  });
  const mapped = upstreamError({
    status: args.res.status,
    message: upstreamMessage,
  });
  return {
    ...mapped,
    details: {
      ...(asObject(mapped.details) ?? {}),
      upstreamMessage,
    },
  };
}
