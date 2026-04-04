import { getPreloadApi } from "@/lib/preloadApi";

export interface GlobalErrorEntry {
  message: string;
  name: string;
  source: "error" | "unhandledrejection";
  stack?: string;
  timestamp: string;
}

export const GLOBAL_ERROR_TOAST_EVENT = "cn:global-error-toast";
const TOAST_DEDUP_WINDOW_MS = 1000;

let globalErrorToastConsumerCount = 0;
let pendingGlobalErrorToasts: GlobalErrorEntry[] = [];

type InstallGlobalErrorHandlersOptions = {
  now?: () => number;
  target?: Window;
};

function normalizeErrorLike(input: unknown, fallbackName: string, fallbackMessage: string): Pick<GlobalErrorEntry, "message" | "name" | "stack"> {
  if (input instanceof Error) {
    return {
      name: input.name || fallbackName,
      message: input.message || fallbackMessage,
      stack: input.stack,
    };
  }

  if (typeof input === "string") {
    return {
      name: fallbackName,
      message: input || fallbackMessage,
    };
  }

  if (typeof input === "object" && input !== null) {
    const maybeRecord = input as Record<string, unknown>;
    const name = typeof maybeRecord.name === "string" && maybeRecord.name.length > 0 ? maybeRecord.name : fallbackName;
    const message = typeof maybeRecord.message === "string" && maybeRecord.message.length > 0 ? maybeRecord.message : fallbackMessage;
    const stack = typeof maybeRecord.stack === "string" ? maybeRecord.stack : undefined;
    return { name, message, stack };
  }

  return {
    name: fallbackName,
    message: fallbackMessage,
  };
}

function createEntry(source: GlobalErrorEntry["source"], errorLike: unknown, now: number): GlobalErrorEntry {
  const normalized = normalizeErrorLike(
    errorLike,
    source === "error" ? "WindowError" : "UnhandledRejection",
    source === "error" ? "An unexpected renderer error occurred" : "An unexpected async renderer error occurred",
  );

  return {
    source,
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
    timestamp: new Date(now).toISOString(),
  };
}

function getToastDedupKey(entry: GlobalErrorEntry): string {
  return `${entry.name}:${entry.message}`;
}

function publishGlobalErrorToast(target: Window, entry: GlobalErrorEntry): void {
  target.dispatchEvent(new CustomEvent<GlobalErrorEntry>(GLOBAL_ERROR_TOAST_EVENT, {
    detail: entry,
  }));

  if (globalErrorToastConsumerCount === 0) {
    pendingGlobalErrorToasts = [...pendingGlobalErrorToasts, entry];
  }
}

export function registerGlobalErrorToastConsumer(): () => void {
  globalErrorToastConsumerCount += 1;

  return () => {
    globalErrorToastConsumerCount = Math.max(0, globalErrorToastConsumerCount - 1);
  };
}

export function consumePendingGlobalErrorToasts(): GlobalErrorEntry[] {
  const queuedEntries = pendingGlobalErrorToasts;
  pendingGlobalErrorToasts = [];
  return queuedEntries;
}

export function resetGlobalErrorToastStateForTests(): void {
  globalErrorToastConsumerCount = 0;
  pendingGlobalErrorToasts = [];
}

async function invokeRendererLog(entry: GlobalErrorEntry): Promise<void> {
  const result = await getPreloadApi().app.logRendererError(entry);
  if (result.ok === false) {
    throw new Error(result.error.message);
  }
}

export function installGlobalErrorHandlers(options: InstallGlobalErrorHandlersOptions = {}): () => void {
  const target = options.target ?? window;
  const now = options.now ?? Date.now;
  const toastHistory = new Map<string, number>();

  const handleEntry = (entry: GlobalErrorEntry): void => {
    void invokeRendererLog(entry).catch((error: unknown) => {
      console.error("[GlobalErrorBridge] Failed to log renderer error", error);
    });

    const key = getToastDedupKey(entry);
    const currentTime = now();
    const previousTime = toastHistory.get(key);
    toastHistory.set(key, currentTime);

    if (previousTime !== undefined && currentTime - previousTime < TOAST_DEDUP_WINDOW_MS) {
      return;
    }

    publishGlobalErrorToast(target, entry);
  };

  const handleWindowError = (event: ErrorEvent): void => {
    handleEntry(createEntry("error", event.error ?? event.message, now()));
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    handleEntry(createEntry("unhandledrejection", event.reason, now()));
  };

  target.addEventListener("error", handleWindowError);
  target.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    target.removeEventListener("error", handleWindowError);
    target.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}
