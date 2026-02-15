import assert from "node:assert/strict";

import { parseLintRatchetBaseline } from "../lint-ratchet";

// CMI-S3-LR-S3
// should reject baseline updates that omit governance traceability fields
{
  assert.throws(
    () =>
      parseLintRatchetBaseline(
        JSON.stringify({
          version: "2026-02-15",
          generatedAt: "2026-02-15T00:00:00.000Z",
          source: "eslint@8",
          governance: {
            issue: "#556",
          },
          snapshot: {
            totalViolations: 1,
            byRule: {
              complexity: 1,
            },
          },
        }),
      ),
    /governance\.reason/,
  );

  assert.throws(
    () =>
      parseLintRatchetBaseline(
        JSON.stringify({
          version: "2026-02-15",
          generatedAt: "2026-02-15T00:00:00.000Z",
          source: "eslint@8",
          governance: {
            reason: "missing issue",
          },
          snapshot: {
            totalViolations: 1,
            byRule: {
              complexity: 1,
            },
          },
        }),
      ),
    /governance\.issue/,
  );
}
