# Cross-Module Drift Zero Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all registered cross-module drift exceptions by aligning real contracts and baseline so `cross-module:check` emits only PASS.

**Architecture:** Keep IPC naming governance unchanged (3 segments, lowercase resource/action). Resolve historical spec conflicts via OpenSpec delta, and implement missing runtime/contract items (`ai:chat:send`, `export:project:bundle`, split stream channels) with minimal code-path change.

**Tech Stack:** TypeScript, Electron IPC, pnpm, OpenSpec, Rulebook, Vitest.

---

### Task 1: Spec/Rulebook Admission

**Files:**

- Modify: `openspec/changes/issue-332-cross-module-drift-zero/proposal.md`
- Modify: `openspec/changes/issue-332-cross-module-drift-zero/tasks.md`
- Modify: `openspec/changes/issue-332-cross-module-drift-zero/specs/cross-module-integration-spec/spec.md`
- Modify: `openspec/changes/issue-332-cross-module-drift-zero/specs/skill-system/spec.md`
- Modify: `openspec/changes/issue-332-cross-module-drift-zero/specs/document-management/spec.md`
- Modify: `rulebook/tasks/issue-332-cross-module-drift-zero/proposal.md`
- Modify: `rulebook/tasks/issue-332-cross-module-drift-zero/tasks.md`

1. Write change/rulebook docs with dependency sync check and scenario mapping.
2. Run `rulebook task validate issue-332-cross-module-drift-zero`.

### Task 2: Red Tests

**Files:**

- Modify: `apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
- Modify: `apps/desktop/tests/unit/ipc-preload-security.spec.ts`

1. Update tests to drift-zero target behavior.
2. Run targeted tests to capture Red evidence.

### Task 3: Green Implementation

**Files:**

- Modify: `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Modify: `packages/shared/types/ai.ts`
- Modify: `apps/desktop/main/src/ipc/ai.ts`
- Modify: `apps/desktop/preload/src/aiStreamBridge.ts`
- Modify: `apps/desktop/renderer/src/features/ai/useAiStream.ts`
- Modify: `apps/desktop/main/src/ipc/export.ts`
- Modify: `apps/desktop/main/src/services/export/exportService.ts`
- Modify: `scripts/cross-module-contract-gate.ts`
- Modify: `openspec/guards/cross-module-contract-baseline.json`

1. Add/adjust channels, errors, and stream channel sampling.
2. Regenerate contract types via `pnpm contract:generate`.

### Task 4: Verify & Deliver

**Files:**

- Modify: `openspec/_ops/task_runs/ISSUE-332.md`
- Modify: `openspec/changes/EXECUTION_ORDER.md`

1. Run full verification commands.
2. Update RUN_LOG with command/output evidence.
3. Commit, push, PR (`Closes #332`), auto-merge, and closure on `main`.
