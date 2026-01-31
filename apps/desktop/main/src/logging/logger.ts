import fs from "node:fs";
import path from "node:path";

export type LogLevel = "info" | "error";

export type LogRecord = {
  ts: number;
  level: LogLevel;
  event: string;
  data?: Record<string, unknown>;
};

export type Logger = {
  logPath: string;
  info: (event: string, data?: Record<string, unknown>) => void;
  error: (event: string, data?: Record<string, unknown>) => void;
};

/**
 * Return an epoch-ms timestamp for log records.
 */
function nowTs(): number {
  return Date.now();
}

/**
 * Best-effort append a JSONL record to disk.
 *
 * Why: logging must never crash the app; on failure we fall back to stderr.
 */
function safeWriteLine(logPath: string, record: LogRecord): void {
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    // Why: logging must never crash the app; fallback to stderr for observability.
    console.error("main logger write failed", { logPath, error });
  }
}

/**
 * Compute the main process log path under userData.
 */
export function getMainLogPath(userDataDir: string): string {
  return path.join(userDataDir, "logs", "main.log");
}

/**
 * Create a structured JSONL logger for the main process.
 */
export function createMainLogger(userDataDir: string): Logger {
  const logPath = getMainLogPath(userDataDir);

  return {
    logPath,
    info: (event, data) =>
      safeWriteLine(logPath, { ts: nowTs(), level: "info", event, data }),
    error: (event, data) =>
      safeWriteLine(logPath, { ts: nowTs(), level: "error", event, data }),
  };
}
