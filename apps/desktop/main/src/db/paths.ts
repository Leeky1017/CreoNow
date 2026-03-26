import path from "node:path";

export type DbPaths = {
  dbDir: string;
  dbPath: string;
};

/**
 * Compute the filesystem paths for the SQLite database.
 *
 * Why: P0 requires a stable, E2E-isolated location under `userData`.
 */
export function getDbPaths(userDataDir: string): DbPaths {
  const dbDir = path.join(userDataDir, "data");
  const dbPath = path.join(dbDir, "creonow.db");
  return { dbDir, dbPath };
}

/**
 * Redact an absolute path so logs never leak user machine paths.
 */
export function redactUserDataPath(
  userDataDir: string,
  absolutePath: string,
): string {
  const rel = path.relative(userDataDir, absolutePath);
  const isInside =
    rel.length > 0 && !rel.startsWith("..") && !path.isAbsolute(rel);
  if (!isInside) {
    return "<redacted>";
  }
  const normalized = rel.split(path.sep).join("/");
  return `<userData>/${normalized}`;
}
