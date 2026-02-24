import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  collectLocaleKeysByLocale,
  validateI18nSubmissionGate,
  type Phase4I18nSubmission,
} from "../../../../../scripts/phase4-governance";

type LocaleTree = {
  [key: string]: LocaleTree | string;
};

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const zhLocale = JSON.parse(
  readFileSync(
    path.join(repoRoot, "apps/desktop/renderer/src/i18n/locales/zh-CN.json"),
    "utf8",
  ),
) as LocaleTree;
const enLocale = JSON.parse(
  readFileSync(
    path.join(repoRoot, "apps/desktop/renderer/src/i18n/locales/en.json"),
    "utf8",
  ),
) as LocaleTree;

const localeKeysByLocale = collectLocaleKeysByLocale({
  "zh-CN": zhLocale,
  "en-US": enLocale,
});

// PM-P4-S7
// 新增 UI 文案按 i18n 规范交付
{
  const validSubmission: Phase4I18nSubmission = {
    uiChanges: [
      {
        componentPath:
          "apps/desktop/renderer/src/features/settings/SettingsPanel.tsx",
        i18nKey: "workbench.commandPalette.searchPlaceholder",
      },
    ],
    localeKeysByLocale,
    formattingRequirements: ["date", "number"],
    intlCalls: ["Intl.DateTimeFormat", "Intl.NumberFormat"],
    hardcodedFormattingPatterns: [],
  };

  const result = validateI18nSubmissionGate(validSubmission);
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
}

// PM-P4-S8
// 文案未提取或格式化违规触发门禁阻断
{
  const invalidSubmission: Phase4I18nSubmission = {
    uiChanges: [
      {
        componentPath:
          "apps/desktop/renderer/src/features/settings/SettingsPanel.tsx",
        rawLiteral: "设置页新增标题",
      },
    ],
    localeKeysByLocale,
    formattingRequirements: ["date"],
    intlCalls: [],
    hardcodedFormattingPatterns: ["YYYY-MM-DD"],
  };

  const result = validateI18nSubmissionGate(invalidSubmission);
  assert.equal(result.ok, false);
  assert.equal(
    result.errors.some((error) => error.code === "I18N_LITERAL_NOT_EXTRACTED"),
    true,
    JSON.stringify(result.errors, null, 2),
  );
  assert.equal(
    result.errors.some((error) => error.code === "I18N_INTL_MISSING"),
    true,
    JSON.stringify(result.errors, null, 2),
  );
}

// PM-P4-S8 edge case
// en-US 未保留新增 key 时必须阻断
{
  const missingFallbackSubmission: Phase4I18nSubmission = {
    uiChanges: [
      {
        componentPath:
          "apps/desktop/renderer/src/features/settings/SettingsPanel.tsx",
        i18nKey: "workbench.commandPalette.searchPlaceholder",
      },
    ],
    localeKeysByLocale: {
      ...localeKeysByLocale,
      "en-US": localeKeysByLocale["en-US"].filter(
        (key) => key !== "workbench.commandPalette.searchPlaceholder",
      ),
    },
    formattingRequirements: ["date"],
    intlCalls: ["Intl.DateTimeFormat"],
    hardcodedFormattingPatterns: [],
  };

  const result = validateI18nSubmissionGate(missingFallbackSubmission);
  assert.equal(result.ok, false);
  assert.equal(
    result.errors.some(
      (error) => error.code === "I18N_KEY_NOT_IN_FALLBACK_LOCALE",
    ),
    true,
    JSON.stringify(result.errors, null, 2),
  );
}
