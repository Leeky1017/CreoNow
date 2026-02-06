# ISSUE-222

- Issue: #222
- Branch: `task/222-p0-002-version-preview-dialog`
- PR: <pending>

## Goal

- 完成 P0-002：Version Preview 调 `version:read` 展示真实只读内容，并在失败时可见错误码+错误消息。

## Status

- CURRENT: preflight 已通过，准备提交并创建 PR。

## Next Actions

- [x] 运行 preflight（typecheck/lint/contract:check/test:unit）。
- [ ] 提交并推送（commit message 含 `(#222)`）。
- [ ] 创建 PR（body 含 `Closes #222`）并启用 auto-merge。

## Decisions Made

- 2026-02-06: N2 仅实现 Preview 闭环，不混入 Restore 确认逻辑（该逻辑在 N3 交付）。
- 2026-02-06: Preview UI 使用独立 `VersionPreviewDialog`，避免 `VersionHistoryContainer` 过度膨胀。

## Errors Encountered

- 2026-02-06: 新 worktree 运行测试时报 `vitest: not found`。处理：执行 `pnpm install --frozen-lockfile`。
- 2026-02-06: 首次 preflight `pnpm typecheck` 失败（TS6133: unused `React` imports）。处理：移除 `VersionHistoryContainer.test.tsx` 与 `VersionPreviewDialog.tsx` 的未使用导入后重跑。

## Runs

### 2026-02-06 00:00 Issue bootstrap

- Command:
  - `gh issue create -t "[MVP-REMED] P0-002: Version Preview dialog real read-only" ...`
  - `scripts/agent_worktree_setup.sh 222 p0-002-version-preview-dialog`
  - `rulebook task create issue-222-p0-002-version-preview-dialog`
  - `rulebook task validate issue-222-p0-002-version-preview-dialog`
- Key output:
  - Issue `#222` created.
  - Worktree created at `.worktrees/issue-222-p0-002-version-preview-dialog`.
  - Rulebook task created and validated.
- Evidence:
  - `rulebook/tasks/issue-222-p0-002-version-preview-dialog/`

### 2026-02-06 00:00 TDD red-green for preview

- Command:
  - `pnpm -C apps/desktop test:run renderer/src/features/version-history/VersionHistoryContainer.test.tsx` (RED)
  - `pnpm install --frozen-lockfile`
  - `pnpm -C apps/desktop test:run renderer/src/features/version-history/VersionHistoryContainer.test.tsx` (RED)
  - Implement `VersionPreviewDialog` + `handlePreview(version:read)`
  - `pnpm -C apps/desktop test:run renderer/src/features/version-history/VersionHistoryContainer.test.tsx` (GREEN)
- Key output:
  - RED: tests failed because `handlePreview` only logged and never called `version:read`.
  - GREEN: `2 passed` in `VersionHistoryContainer.test.tsx`.
- Evidence:
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.test.tsx`
  - `apps/desktop/renderer/src/features/version-history/VersionPreviewDialog.tsx`
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx`

### 2026-02-06 00:00 Issue preflight verification

- Command:
  - `scripts/agent_pr_preflight.sh` (first run, failed)
  - `scripts/agent_pr_preflight.sh` (second run, passed)
- Key output:
  - First run failed at `pnpm typecheck` with TS6133 in two new files.
  - Second run passed end-to-end:
    - `pnpm typecheck` passed
    - `pnpm lint` passed (warnings only, no errors)
    - `pnpm contract:check` passed
    - `pnpm test:unit` passed
- Evidence:
  - `scripts/agent_pr_preflight.sh` output (latest run)

### 2026-02-06 00:00 Final preflight before commit

- Command:
  - `scripts/agent_pr_preflight.sh`
- Key output:
  - Preflight passed end-to-end after run-log updates.
  - `pnpm typecheck` passed.
  - `pnpm lint` passed with warnings only (0 errors).
  - `pnpm contract:check` passed.
  - `pnpm test:unit` passed.
- Evidence:
  - `scripts/agent_pr_preflight.sh` output (latest run)
