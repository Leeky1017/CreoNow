import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluateCrossModuleContractGate,
  readGeneratedCrossModuleContractActual,
  type CrossModuleContractBaseline,
  type CrossModuleContractGateResult,
} from "./cross-module-contract-gate";

const BASELINE_PATH = path.join(
  "openspec",
  "guards",
  "cross-module-contract-baseline.json",
);
const IPC_CONTRACT_SOURCE_PATH = path.join(
  "apps",
  "desktop",
  "main",
  "src",
  "ipc",
  "contract",
  "ipc-contract.ts",
);

export type CrossModuleAutofixClassificationKind =
  | "IMPLEMENTATION_ALIGNMENT_REQUIRED"
  | "NEW_CONTRACT_ADDITION_CANDIDATE"
  | "SAFE_BASELINE_CLEANUP";

export type CrossModuleAutofixClassification = {
  kind: CrossModuleAutofixClassificationKind;
  source: "gate-issue" | "introduced-contract-item";
  target: string;
  reason: string;
};

export type SafeBaselineEditKind =
  | "REMOVE_STALE_ALIAS"
  | "REMOVE_STALE_MISSING_CHANNEL"
  | "REMOVE_STALE_MISSING_ERROR_CODE"
  | "REMOVE_STALE_ENVELOPE_DRIFT";

export type SafeBaselineEdit = {
  kind: SafeBaselineEditKind;
  target: string;
};

export type AutofixPlan = {
  classifications: CrossModuleAutofixClassification[];
  safeEdits: SafeBaselineEdit[];
};

export type GitRunnerResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type GitRunner = (args: string[], cwd?: string) => GitRunnerResult;

export type CommitAppliedAutofixChangesArgs = {
  repoRoot: string;
  branchName: string;
  gitRunner?: GitRunner;
};

export type CommitAppliedAutofixChangesResult = {
  committed: boolean;
  message: string;
};

type ContractSnapshot = {
  channels: string[];
  errorCodes: string[];
};

type BuildAutofixPlanArgs = {
  baseline: CrossModuleContractBaseline;
  gateResult: CrossModuleContractGateResult;
  introducedChannels: string[];
  introducedErrorCodes: string[];
};

type AutofixMainOptions = {
  apply: boolean;
  commit: boolean;
  baseRef: string;
};

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function readBaseline(repoRoot: string): CrossModuleContractBaseline {
  const absPath = path.resolve(repoRoot, BASELINE_PATH);
  if (!existsSync(absPath)) {
    throw new Error(`baseline not found: ${BASELINE_PATH}`);
  }
  return JSON.parse(
    readFileSync(absPath, "utf8"),
  ) as CrossModuleContractBaseline;
}

function writeBaseline(
  repoRoot: string,
  baseline: CrossModuleContractBaseline,
): void {
  const absPath = path.resolve(repoRoot, BASELINE_PATH);
  writeFileSync(absPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
}

function parseIssueCode(issue: string): string {
  const match = issue.match(/^\[([^\]]+)\]/);
  return match?.[1] ?? "unknown";
}

function parseIssueTarget(issue: string): string {
  const withoutPrefix = issue.replace(/^\[[^\]]+\]\s*/, "");
  return withoutPrefix.split(" ")[0] ?? withoutPrefix;
}

function parseStaleAliasKey(issue: string): string | null {
  const match = issue.match(
    /^\[stale-alias\]\s+([^\s]+)\s+now exists; remove alias /,
  );
  return match?.[1] ?? null;
}

function parseBranchIssueNumber(branchName: string): string | null {
  const match = branchName.match(/^task\/([0-9]+)-[a-z0-9-]+$/);
  return match?.[1] ?? null;
}

function defaultGitRunner(
  args: string[],
  cwd: string = process.cwd(),
): GitRunnerResult {
  const proc = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    code: proc.status ?? 1,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
  };
}

function readCurrentBranch(repoRoot: string): string {
  const res = defaultGitRunner(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
  if (res.code !== 0) {
    throw new Error(
      `failed to read current branch: ${res.stderr || res.stdout}`,
    );
  }
  return res.stdout.trim();
}

function readFileFromGitRef(
  repoRoot: string,
  gitRef: string,
  relPath: string,
): string | null {
  const res = defaultGitRunner(["show", `${gitRef}:${relPath}`], repoRoot);
  if (res.code !== 0) {
    return null;
  }
  return res.stdout;
}

function parseContractSnapshot(sourceContent: string): ContractSnapshot {
  const channelMatches = [
    ...sourceContent.matchAll(
      /"([a-z][a-z0-9]*:[a-z][a-z0-9]*:[a-z][a-z0-9]*)"\s*:/g,
    ),
  ];
  const channels = uniqueSorted(channelMatches.map((match) => match[1]));

  const errorCodeBlock = sourceContent.match(
    /export const IPC_ERROR_CODES = \[([\s\S]*?)\] as const;/m,
  );
  if (!errorCodeBlock) {
    throw new Error("failed to parse IPC_ERROR_CODES from ipc-contract.ts");
  }
  const errorCodes = uniqueSorted(
    [...errorCodeBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]),
  );

  return { channels, errorCodes };
}

function deriveIntroducedContractItems(args: {
  repoRoot: string;
  baseRef: string;
}): { channels: string[]; errorCodes: string[] } {
  const currentPath = path.resolve(args.repoRoot, IPC_CONTRACT_SOURCE_PATH);
  if (!existsSync(currentPath)) {
    return { channels: [], errorCodes: [] };
  }

  const currentSource = readFileSync(currentPath, "utf8");
  const current = parseContractSnapshot(currentSource);

  const baseSource = readFileFromGitRef(
    args.repoRoot,
    args.baseRef,
    IPC_CONTRACT_SOURCE_PATH,
  );
  if (!baseSource) {
    return { channels: [], errorCodes: [] };
  }
  const base = parseContractSnapshot(baseSource);

  const baseChannels = new Set(base.channels);
  const baseErrorCodes = new Set(base.errorCodes);

  return {
    channels: current.channels.filter((channel) => !baseChannels.has(channel)),
    errorCodes: current.errorCodes.filter((code) => !baseErrorCodes.has(code)),
  };
}

function issueToClassification(
  issue: string,
): CrossModuleAutofixClassification {
  const code = parseIssueCode(issue);
  const target = parseIssueTarget(issue);

  switch (code) {
    case "stale-alias":
    case "stale-missing-channel":
    case "stale-missing-error-code":
    case "stale-envelope-drift":
      return {
        kind: "SAFE_BASELINE_CLEANUP",
        source: "gate-issue",
        target,
        reason: issue,
      };
    default:
      return {
        kind: "IMPLEMENTATION_ALIGNMENT_REQUIRED",
        source: "gate-issue",
        target,
        reason: issue,
      };
  }
}

function issueToSafeEdit(issue: string): SafeBaselineEdit | null {
  const code = parseIssueCode(issue);
  if (code === "stale-alias") {
    const aliasKey = parseStaleAliasKey(issue);
    if (!aliasKey) {
      return null;
    }
    return { kind: "REMOVE_STALE_ALIAS", target: aliasKey };
  }

  if (code === "stale-missing-channel") {
    return {
      kind: "REMOVE_STALE_MISSING_CHANNEL",
      target: parseIssueTarget(issue),
    };
  }

  if (code === "stale-missing-error-code") {
    return {
      kind: "REMOVE_STALE_MISSING_ERROR_CODE",
      target: parseIssueTarget(issue),
    };
  }

  if (code === "stale-envelope-drift") {
    return {
      kind: "REMOVE_STALE_ENVELOPE_DRIFT",
      target: "approvedEnvelopeDrift",
    };
  }

  return null;
}

export function buildAutofixPlan(args: BuildAutofixPlanArgs): AutofixPlan {
  const classifications = args.gateResult.issues.map((issue) =>
    issueToClassification(issue),
  );
  const safeEdits = args.gateResult.issues
    .map((issue) => issueToSafeEdit(issue))
    .filter((item): item is SafeBaselineEdit => item !== null);

  const knownChannelSet = new Set([
    ...args.baseline.expectedChannels,
    ...(args.baseline.approvedMissingChannels ?? []),
    ...Object.values(args.baseline.channelAliases ?? {}),
  ]);
  const knownErrorCodeSet = new Set([
    ...args.baseline.expectedErrorCodes,
    ...(args.baseline.approvedMissingErrorCodes ?? []),
  ]);

  for (const channel of uniqueSorted(args.introducedChannels)) {
    if (knownChannelSet.has(channel)) {
      continue;
    }
    classifications.push({
      kind: "NEW_CONTRACT_ADDITION_CANDIDATE",
      source: "introduced-contract-item",
      target: channel,
      reason:
        "new channel introduced in ipc-contract.ts but not declared in cross-module baseline",
    });
  }

  for (const errorCode of uniqueSorted(args.introducedErrorCodes)) {
    if (knownErrorCodeSet.has(errorCode)) {
      continue;
    }
    classifications.push({
      kind: "NEW_CONTRACT_ADDITION_CANDIDATE",
      source: "introduced-contract-item",
      target: errorCode,
      reason:
        "new error code introduced in ipc-contract.ts but not declared in cross-module baseline",
    });
  }

  const dedupeKey = (item: CrossModuleAutofixClassification): string =>
    `${item.kind}::${item.target}::${item.source}`;
  const dedupedClassifications = [
    ...new Map(classifications.map((item) => [dedupeKey(item), item])).values(),
  ];

  const dedupedSafeEdits = [
    ...new Map(
      safeEdits.map((item) => [`${item.kind}::${item.target}`, item]),
    ).values(),
  ];

  return {
    classifications: dedupedClassifications,
    safeEdits: dedupedSafeEdits,
  };
}

export function applySafeBaselineEdits(
  baseline: CrossModuleContractBaseline,
  edits: SafeBaselineEdit[],
): CrossModuleContractBaseline {
  const alias = { ...(baseline.channelAliases ?? {}) };
  const approvedMissingChannels = [...(baseline.approvedMissingChannels ?? [])];
  const approvedMissingErrorCodes = [
    ...(baseline.approvedMissingErrorCodes ?? []),
  ];
  let approvedEnvelopeDrift = baseline.approvedEnvelopeDrift;

  for (const edit of edits) {
    switch (edit.kind) {
      case "REMOVE_STALE_ALIAS":
        delete alias[edit.target];
        break;
      case "REMOVE_STALE_MISSING_CHANNEL": {
        const idx = approvedMissingChannels.indexOf(edit.target);
        if (idx >= 0) {
          approvedMissingChannels.splice(idx, 1);
        }
        break;
      }
      case "REMOVE_STALE_MISSING_ERROR_CODE": {
        const idx = approvedMissingErrorCodes.indexOf(edit.target);
        if (idx >= 0) {
          approvedMissingErrorCodes.splice(idx, 1);
        }
        break;
      }
      case "REMOVE_STALE_ENVELOPE_DRIFT":
        approvedEnvelopeDrift = undefined;
        break;
      default:
        break;
    }
  }

  return {
    ...baseline,
    channelAliases: Object.keys(alias).length > 0 ? alias : undefined,
    approvedMissingChannels,
    approvedMissingErrorCodes,
    approvedEnvelopeDrift,
  };
}

export function commitAppliedAutofixChanges(
  args: CommitAppliedAutofixChangesArgs,
): CommitAppliedAutofixChangesResult {
  const issueNumber = parseBranchIssueNumber(args.branchName);
  if (!issueNumber) {
    throw new Error(
      `autofix commit requires task/<N>-<slug> branch, got: ${args.branchName}`,
    );
  }

  const runGit = args.gitRunner ?? defaultGitRunner;

  const add = runGit(
    ["add", "openspec/guards/cross-module-contract-baseline.json"],
    args.repoRoot,
  );
  if (add.code !== 0) {
    throw new Error(add.stderr || add.stdout || "git add failed");
  }

  const staged = runGit(["diff", "--cached", "--quiet"], args.repoRoot);
  if (staged.code === 0) {
    throw new Error("no staged autofix changes to commit");
  }
  if (staged.code !== 1) {
    throw new Error(staged.stderr || staged.stdout || "git diff failed");
  }

  const message = `chore: autofix cross-module baseline drift (#${issueNumber})`;
  const commit = runGit(["commit", "-m", message], args.repoRoot);
  if (commit.code !== 0) {
    throw new Error(commit.stderr || commit.stdout || "git commit failed");
  }

  return { committed: true, message };
}

function parseArgs(argv: string[]): AutofixMainOptions {
  let apply = false;
  let commit = false;
  let baseRef = "origin/main";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--commit") {
      commit = true;
      continue;
    }
    if (arg === "--base-ref") {
      baseRef = argv[i + 1] ?? baseRef;
      i += 1;
      continue;
    }
    if (arg.startsWith("--base-ref=")) {
      baseRef = arg.slice("--base-ref=".length);
    }
  }

  if (commit && !apply) {
    throw new Error("--commit requires --apply");
  }

  return { apply, commit, baseRef };
}

function printClassifications(items: CrossModuleAutofixClassification[]): void {
  for (const item of items) {
    console.error(
      `[CROSS_MODULE_AUTOFIX] ${item.kind} target=${item.target} reason=${item.reason}`,
    );
  }
}

function main(): number {
  const repoRoot = process.cwd();
  const options = parseArgs(process.argv.slice(2));

  const baselineBefore = readBaseline(repoRoot);
  const actual = readGeneratedCrossModuleContractActual(repoRoot);
  const gateResult = evaluateCrossModuleContractGate(baselineBefore, actual);
  const introduced = deriveIntroducedContractItems({
    repoRoot,
    baseRef: options.baseRef,
  });
  const plan = buildAutofixPlan({
    baseline: baselineBefore,
    gateResult,
    introducedChannels: introduced.channels,
    introducedErrorCodes: introduced.errorCodes,
  });

  if (plan.classifications.length > 0) {
    printClassifications(plan.classifications);
  }

  let baselineChanged = false;
  if (options.apply && plan.safeEdits.length > 0) {
    const nextBaseline = applySafeBaselineEdits(baselineBefore, plan.safeEdits);
    if (JSON.stringify(nextBaseline) !== JSON.stringify(baselineBefore)) {
      writeBaseline(repoRoot, nextBaseline);
      baselineChanged = true;
      console.log(
        `[CROSS_MODULE_AUTOFIX] APPLIED ${plan.safeEdits.length} safe baseline edit(s)`,
      );
    }
  }

  if (options.commit) {
    const branchName = readCurrentBranch(repoRoot);
    if (!baselineChanged) {
      throw new Error(
        "--commit requested but no safe edits were applied; no commit created",
      );
    }
    const commitResult = commitAppliedAutofixChanges({
      repoRoot,
      branchName,
    });
    console.log(`[CROSS_MODULE_AUTOFIX] COMMIT ${commitResult.message}`);
  }

  const baselineAfter = readBaseline(repoRoot);
  const finalGate = evaluateCrossModuleContractGate(baselineAfter, actual);
  const finalPlan = buildAutofixPlan({
    baseline: baselineAfter,
    gateResult: finalGate,
    introducedChannels: introduced.channels,
    introducedErrorCodes: introduced.errorCodes,
  });

  const blocking = finalPlan.classifications.filter(
    (item) => item.kind !== "SAFE_BASELINE_CLEANUP",
  );

  if (!options.apply && plan.safeEdits.length > 0) {
    console.error(
      "[CROSS_MODULE_AUTOFIX] SAFE_BASELINE_CLEANUP pending. rerun with --apply",
    );
    return 1;
  }

  if (blocking.length > 0) {
    printClassifications(blocking);
    return 1;
  }

  if (!finalGate.ok) {
    for (const issue of finalGate.issues) {
      console.error(`[CROSS_MODULE_AUTOFIX] FAIL ${issue}`);
    }
    return 1;
  }

  console.log("[CROSS_MODULE_AUTOFIX] PASS");
  return 0;
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    process.exit(main());
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `unknown error: ${String(error)}`;
    console.error(`[CROSS_MODULE_AUTOFIX] FAIL ${message}`);
    process.exit(1);
  }
}
