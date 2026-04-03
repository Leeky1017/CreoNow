import type { TFunction } from "i18next";
import type { IpcError } from "@shared/types/ipc-generated";
import { describe, expect, it, vi } from "vitest";

import { getHumanErrorMessage, IPC_ERROR_MESSAGE_KEYS } from "@/lib/errorMessages";

const translate = vi.fn((key: string) => `translated:${key}`);
const t = translate as unknown as TFunction;

describe("getHumanErrorMessage", () => {
  it("localizes representative IPC codes through the controlled mapping", () => {
    const codes = [
      "AI_NOT_CONFIGURED",
      "AI_AUTH_FAILED",
      "DB_ERROR",
      "DOCUMENT_SIZE_EXCEEDED",
      "IPC_CHANNEL_FORBIDDEN",
      "KG_QUERY_TIMEOUT",
      "MEMORY_SCOPE_DENIED",
      "UNSUPPORTED",
      "UPSTREAM_ERROR",
    ] as const satisfies readonly IpcError["code"][];

    for (const code of codes) {
      const message = getHumanErrorMessage({ code, message: `raw:${code}` }, t);
      expect(message).toBe(`translated:${IPC_ERROR_MESSAGE_KEYS[code]}`);
    }
  });

  it("falls back to the generic copy for non-IPC errors without leaking raw messages", () => {
    const message = getHumanErrorMessage(new Error("sensitive upstream failure"), t);

    expect(message).toBe("translated:errors.generic");
    expect(message).not.toContain("sensitive upstream failure");
  });

  it("falls back to the generic copy when runtime data carries an unknown code", () => {
    const message = getHumanErrorMessage(
      { code: "UNKNOWN_RUNTIME_CODE", message: "do not expose me" } as unknown as IpcError,
      t,
    );

    expect(message).toBe("translated:errors.generic");
    expect(message).not.toContain("do not expose me");
  });
});