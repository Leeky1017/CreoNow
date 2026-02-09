import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  applySafeBaselineEdits,
  buildAutofixPlan,
  commitAppliedAutofixChanges,
  type CrossModuleAutofixClassification,
  type GitRunner,
} from "../../../../scripts/cross-module-contract-autofix";
import type {
  CrossModuleContractBaseline,
  CrossModuleContractGateResult,
} from "../../../../scripts/cross-module-contract-gate";

function classificationKinds(
  items: CrossModuleAutofixClassification[],
): string[] {
  return items.map((item) => item.kind);
}

const baseline: CrossModuleContractBaseline = {
  version: "2026-02-09",
  expectedChannels: ["memory:episode:record", "skill:execute", "ai:chat:send"],
  channelAliases: {
    "skill:execute": "ai:skill:run",
  },
  approvedMissingChannels: ["ai:chat:send"],
  expectedErrorCodes: ["KG_QUERY_TIMEOUT", "SKILL_TIMEOUT"],
  approvedMissingErrorCodes: ["SKILL_TIMEOUT"],
  desiredEnvelope: "success",
  approvedEnvelopeDrift: {
    actual: "ok",
    reason: "legacy envelope before migration",
  },
};

// S1: 缺失 expected 项必须归类为实现对齐修复 [ADDED]
// should classify missing expected channel as implementation alignment required
{
  const result: CrossModuleContractGateResult = {
    ok: false,
    drifts: [],
    issues: ["[missing-channel] ai:chat:send"],
  };

  const plan = buildAutofixPlan({
    baseline,
    gateResult: result,
    introducedChannels: [],
    introducedErrorCodes: [],
  });

  assert.deepEqual(classificationKinds(plan.classifications), [
    "IMPLEMENTATION_ALIGNMENT_REQUIRED",
  ]);
  assert.equal(plan.safeEdits.length, 0);
}

// S2: 出现未登记新增项必须归类为新增候选 [ADDED]
// should classify unexpected channel/error code as new contract addition candidate
{
  const result: CrossModuleContractGateResult = {
    ok: true,
    drifts: [],
    issues: [],
  };

  const plan = buildAutofixPlan({
    baseline,
    gateResult: result,
    introducedChannels: ["skill:stream:delta"],
    introducedErrorCodes: ["SKILL_STREAM_ABORTED"],
  });

  assert.deepEqual(classificationKinds(plan.classifications), [
    "NEW_CONTRACT_ADDITION_CANDIDATE",
    "NEW_CONTRACT_ADDITION_CANDIDATE",
  ]);
}

// S3: 陈旧漂移自动清理并可通过门禁 [ADDED]
// should remove stale approved drift entries during autofix apply
{
  const result: CrossModuleContractGateResult = {
    ok: false,
    drifts: [],
    issues: [
      "[stale-alias] skill:execute now exists; remove alias skill:execute -> ai:skill:run",
      "[stale-missing-channel] ai:chat:send now exists; remove approved missing entry",
      "[stale-missing-error-code] SKILL_TIMEOUT now exists; remove approved missing entry",
      "[stale-envelope-drift] desired=success already matches actual; remove approved drift",
    ],
  };

  const plan = buildAutofixPlan({
    baseline,
    gateResult: result,
    introducedChannels: [],
    introducedErrorCodes: [],
  });
  const updated = applySafeBaselineEdits(baseline, plan.safeEdits);

  assert.equal(updated.channelAliases?.["skill:execute"], undefined);
  assert.deepEqual(updated.approvedMissingChannels, []);
  assert.deepEqual(updated.approvedMissingErrorCodes, []);
  assert.equal(updated.approvedEnvelopeDrift, undefined);
}

// S4: 开发分支启用 --commit 自动提交 [ADDED]
// should create commit when apply+commit is enabled on task branch
{
  const calls: string[] = [];
  const runner: GitRunner = (args) => {
    const line = args.join(" ");
    calls.push(line);

    if (line === "diff --cached --quiet") {
      return { code: 1, stdout: "", stderr: "" };
    }
    if (line.startsWith("commit -m ")) {
      return { code: 0, stdout: "[task/330] commit", stderr: "" };
    }
    return { code: 0, stdout: "", stderr: "" };
  };

  const output = commitAppliedAutofixChanges({
    repoRoot: "/tmp/repo",
    branchName: "task/330-cross-module-gate-autofix-classification",
    gitRunner: runner,
  });

  assert.equal(output.committed, true);
  assert.match(output.message, /#330/);
  assert.ok(
    calls.includes("add openspec/guards/cross-module-contract-baseline.json"),
  );
}

// S5: 无可自动修复项时不得伪提交 [ADDED]
// should fail without commit when no safe fixes are available
{
  const runner: GitRunner = (args) => {
    if (args.join(" ") === "diff --cached --quiet") {
      return { code: 0, stdout: "", stderr: "" };
    }
    return { code: 0, stdout: "", stderr: "" };
  };

  assert.throws(
    () =>
      commitAppliedAutofixChanges({
        repoRoot: "/tmp/repo",
        branchName: "task/330-cross-module-gate-autofix-classification",
        gitRunner: runner,
      }),
    /no staged autofix changes/i,
  );
}

// S6: CI 仍只执行 check 不执行 autofix [ADDED]
// should keep ci wiring check-only without autofix step
{
  const repoRoot = path.resolve(import.meta.dirname, "../../../..");
  const ciWorkflow = readFileSync(
    path.join(repoRoot, ".github/workflows/ci.yml"),
    "utf8",
  );

  assert.match(ciWorkflow, /cross-module:check/);
  assert.doesNotMatch(ciWorkflow, /cross-module:autofix/);
}
