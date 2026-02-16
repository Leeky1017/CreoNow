import assert from "node:assert/strict";

import {
  formatSelectionPreview,
  formatTokenValue,
  formatUsd,
  judgeSeverityClass,
} from "../../renderer/src/features/ai/aiPanelFormatting";

// Scenario Mapping: aud-h6c Core Path Stabilized
{
  assert.equal(formatTokenValue(1234.9), "1,234");
  assert.equal(formatUsd(0.34567), "$0.3457");
}

// Scenario Mapping: aud-h6c Error Path Deterministic
{
  assert.equal(judgeSeverityClass("high"), "text-[var(--color-error)]");
  assert.equal(
    formatSelectionPreview("x".repeat(130), 10),
    `${"x".repeat(10)}...`,
  );
}
