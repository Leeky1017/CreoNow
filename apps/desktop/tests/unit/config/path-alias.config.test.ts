import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

type TsConfig = {
  extends?: string;
  compilerOptions?: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
};

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");

// S1-PA-1
// should expose @shared/* -> packages/shared/* in tsconfig.base.json and remain inheritable by desktop tsconfig
{
  const baseTsconfig = readJson<TsConfig>(
    path.join(repoRoot, "tsconfig.base.json"),
  );
  const desktopTsconfig = readJson<TsConfig>(
    path.join(repoRoot, "apps/desktop/tsconfig.json"),
  );

  assert.equal(baseTsconfig.compilerOptions?.baseUrl, ".");
  assert.deepEqual(baseTsconfig.compilerOptions?.paths?.["@shared/*"], [
    "packages/shared/*",
  ]);

  assert.equal(desktopTsconfig.extends, "../../tsconfig.base.json");
  if (desktopTsconfig.compilerOptions?.paths) {
    assert.deepEqual(desktopTsconfig.compilerOptions.paths["@shared/*"], [
      "packages/shared/*",
    ]);
  }
}
