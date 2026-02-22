import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const AI_OVERLAY_TARGET_FILES = [
  "apps/desktop/renderer/src/features/ai/ModelPicker.tsx",
  "apps/desktop/renderer/src/features/ai/ChatHistory.tsx",
  "apps/desktop/renderer/src/features/ai/SkillPicker.tsx",
  "apps/desktop/renderer/src/features/ai/ModePicker.tsx",
] as const;

export type GuardPattern = {
  rule: string;
  regex: RegExp;
};

export type Violation = {
  file: string;
  rule: string;
  match: string;
};

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../../..",
);

export function collectPatternViolations(
  targetFiles: readonly string[],
  patterns: readonly GuardPattern[],
): Violation[] {
  const violations: Violation[] = [];

  for (const targetFile of targetFiles) {
    const source = fs.readFileSync(path.join(REPO_ROOT, targetFile), "utf8");

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern.regex)) {
        violations.push({
          file: targetFile,
          rule: pattern.rule,
          match: match[0],
        });
      }
    }
  }

  return violations;
}
