import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(import.meta.dirname, "../exportService.ts");
const source = readFileSync(sourcePath, "utf8");

// S1: project bundle export must stream sections instead of materializing join buffer [ADDED]
assert.match(
  source,
  /createWriteStream\(/,
  "exportProjectBundle should write through stream API",
);
assert.doesNotMatch(
  source,
  /sections\.join\(/,
  "exportProjectBundle should not concatenate all sections in memory",
);
