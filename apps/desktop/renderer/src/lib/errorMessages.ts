import type { TFunction } from "i18next";

import type { IpcError } from "@shared/types/ipc-generated";

const MESSAGE_KEYS: Record<string, string> = {
  AI_NOT_CONFIGURED: "errors.aiNotConfigured",
  DB_ERROR: "errors.db",
  DOCUMENT_SIZE_EXCEEDED: "errors.documentTooLarge",
  INVALID_ARGUMENT: "errors.invalidArgument",
  IPC_CHANNEL_FORBIDDEN: "errors.channelForbidden",
  IPC_PAYLOAD_TOO_LARGE: "errors.payloadTooLarge",
  NOT_FOUND: "errors.notFound",
  TIMEOUT: "errors.timeout",
};

export function getHumanErrorMessage(error: IpcError | Error, t: TFunction): string {
  if ("code" in error) {
    const key = MESSAGE_KEYS[error.code];
    if (key) {
      return t(key);
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return t("errors.generic");
}
