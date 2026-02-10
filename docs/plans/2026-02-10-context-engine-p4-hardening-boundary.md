# Context Engine P4 Hardening Boundary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver `openspec/changes/context-engine-p4-hardening-boundary` end-to-end with CE5 boundary protections, mapped tests, and governance closeout.

**Architecture:** Keep existing `context:prompt:assemble`/`context:prompt:inspect` contracts stable while adding boundary guards in IPC and scope validation in context assembly service. Enforce CE5 error codes at IPC boundary, then validate through unit/integration tests mapped one-to-one to CE5 scenarios.

**Tech Stack:** TypeScript (strict), Electron IPC handlers, Context service (`layerAssemblyService`), `tsx`-based unit/integration tests, OpenSpec + Rulebook docs.

---

### Task 1: Admission + Spec/Rulebook/RUN_LOG Baseline

**Files:**

- Modify: `rulebook/tasks/issue-381-context-engine-p4-hardening-boundary/proposal.md`
- Modify: `rulebook/tasks/issue-381-context-engine-p4-hardening-boundary/tasks.md`
- Create: `openspec/_ops/task_runs/ISSUE-381.md`

**Step 1: Fill Rulebook proposal and tasks with CE5 scope**

Write explicit CE5 scenario scope, dependency sync requirement, and delivery gates.

**Step 2: Add RUN_LOG scaffold with issue/branch/scope**

Create run log sections for admission, dependency sync check, red/green evidence, and merge closure.

**Step 3: Validate Rulebook task**

Run: `rulebook task validate issue-381-context-engine-p4-hardening-boundary`  
Expected: PASS

### Task 2: Red Tests for CE5 Scenario Matrix

**Files:**

- Create: `apps/desktop/tests/integration/context/context-slo-thresholds.test.ts`
- Create: `apps/desktop/tests/unit/context/context-inspect-permission.test.ts`
- Create: `apps/desktop/tests/unit/context/context-budget-update-conflict.test.ts`
- Create: `apps/desktop/tests/unit/context/context-scope-violation.test.ts`
- Create: `apps/desktop/tests/unit/context/context-input-too-large.test.ts`
- Create: `apps/desktop/tests/integration/context/context-backpressure-redaction.test.ts`
- Modify: `package.json`

**Step 1: Write failing unit tests for inspect permission / scope violation / input-too-large**

Add CE5-R1-S2, CE5-R2-S2, CE5-R3-S1 cases first.

**Step 2: Write failing integration tests for SLO-threshold config and backpressure+redaction**

Add CE5-R1-S1 and CE5-R3-S2 cases.

**Step 3: Run red commands and capture failing evidence**

Run:

- `pnpm exec tsx apps/desktop/tests/unit/context/context-inspect-permission.test.ts`
- `pnpm exec tsx apps/desktop/tests/unit/context/context-scope-violation.test.ts`
- `pnpm exec tsx apps/desktop/tests/unit/context/context-input-too-large.test.ts`
- `pnpm exec tsx apps/desktop/tests/integration/context/context-backpressure-redaction.test.ts`

Expected: FAIL on missing CE5 guards/error codes.

### Task 3: Green Minimal CE5 Implementation

**Files:**

- Modify: `apps/desktop/main/src/services/context/layerAssemblyService.ts`
- Modify: `apps/desktop/main/src/ipc/context.ts`
- Modify: `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Modify: `packages/shared/types/ipc-generated.ts` (generated)

**Step 1: Add CE5 error codes + inspect request role field to IPC contract**

Update IPC schema for `CONTEXT_INSPECT_FORBIDDEN`, `CONTEXT_INPUT_TOO_LARGE`, `CONTEXT_BACKPRESSURE`.

**Step 2: Add scope validation and retrieved chunk cap in layer assembly service**

Block cross-project layer chunk injection with `CONTEXT_SCOPE_VIOLATION`.

**Step 3: Add IPC hardening guards**

Implement inspect permission gate, input token cap (`64k`), per-document in-flight backpressure (`4`), and redacted/summarized logging.

**Step 4: Regenerate contract types**

Run: `pnpm contract:generate`  
Expected: generated types updated and compile-ready.

**Step 5: Re-run CE5 tests**

Run all six CE5 mapped tests and expect PASS.

### Task 4: Refactor + Governance Closeout

**Files:**

- Modify: `openspec/changes/context-engine-p4-hardening-boundary/tasks.md`
- Move: `openspec/changes/context-engine-p4-hardening-boundary` -> `openspec/changes/archive/context-engine-p4-hardening-boundary`
- Modify: `openspec/changes/EXECUTION_ORDER.md`
- Update: `rulebook/tasks/issue-381-context-engine-p4-hardening-boundary/tasks.md`
- Update: `openspec/_ops/task_runs/ISSUE-381.md`

**Step 1: Refactor helper functions without changing CE5 error contract**

Keep redaction/backpressure/scope checks centralized.

**Step 2: Run gate commands**

Run:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm contract:check`
- `pnpm cross-module:check`
- `pnpm test:unit`
- `scripts/agent_pr_preflight.sh` (after PR URL backfill)

Expected: PASS.

**Step 3: Archive completed OpenSpec change + sync execution order**

Ensure active change list and timestamps are updated.

**Step 4: PR auto-merge and controlplane main closeout**

Use repository delivery scripts, wait checks green, sync `main`, archive Rulebook task, cleanup worktree.
