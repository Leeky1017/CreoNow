# ISSUE-412

- Issue: #412
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/412
- Branch: task/412-version-control-p2-diff-rollback
- PR: TBD
- Scope: 完成交付 `openspec/changes/version-control-p2-diff-rollback` 的全部规划任务（版本对比 + 安全回滚），并按 OpenSpec/Rulebook/GitHub 门禁合并回控制面 `main`
- Out of Scope: 分支管理/合并冲突（`version-control-p3`）、硬化边界（`version-control-p4`）、批量回滚

## Plan

- [x] 准入：创建 OPEN issue + task 分支/worktree + Rulebook task
- [x] 规格基线：审阅主 spec/change 文档并完成 Dependency Sync Check
- [x] Red：先写失败测试并记录 Red 证据
- [x] Green：最小实现通过 Scenario 映射
- [x] Refactor：收敛实现并保持回归全绿
- [ ] preflight + PR auto-merge + main 收口 + cleanup

## Runs

### 2026-02-12 01:01 +0800 准入（Issue / Worktree）

- Command:
  - `gh issue create --title "Deliver version-control-p2-diff-rollback change and merge to main" ...`
  - `gh issue edit 412 --body ...`
  - `scripts/agent_controlplane_sync.sh`
  - `scripts/agent_worktree_setup.sh 412 version-control-p2-diff-rollback`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/412`
  - Issue 状态：`OPEN`
  - worktree 创建成功：`.worktrees/issue-412-version-control-p2-diff-rollback`
  - 分支创建成功：`task/412-version-control-p2-diff-rollback`

### 2026-02-12 01:02 +0800 Rulebook task 初始化

- Command:
  - `rulebook task create issue-412-version-control-p2-diff-rollback`
  - `mv /tmp/issue-412-version-control-p2-diff-rollback rulebook/tasks/`
- Exit code: `0`
- Key output:
  - Rulebook task 已创建并放入当前 task worktree。
  - 下一步将补齐 proposal/tasks 内容并执行 validate。

### 2026-02-12 01:03 +0800 Rulebook validate

- Command:
  - `rulebook task validate issue-412-version-control-p2-diff-rollback`
- Exit code: `0`
- Key output:
  - `Task issue-412-version-control-p2-diff-rollback is valid`
  - Warning: `No spec files found (specs/*/spec.md)`（不阻断）

### 2026-02-12 01:08 +0800 Dependency Sync Check（version-control-p0/p1 + editor-p2）

- Input:
  - `openspec/specs/version-control/spec.md`
  - `openspec/changes/version-control-p2-diff-rollback/{proposal.md,tasks.md,specs/version-control-delta.md}`
  - `openspec/changes/archive/version-control-p0-snapshot-history/specs/version-control-delta.md`
  - `openspec/changes/archive/version-control-p1-ai-mark-preview/specs/version-control-delta.md`
  - `openspec/changes/archive/editor-p2-diff-ai-collaboration/specs/editor-delta.md`
  - `apps/desktop/renderer/src/features/diff/{DiffViewPanel.tsx,MultiVersionCompare.tsx,DiffHeader.tsx}`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/ipc/version.ts`
- Checkpoints:
  - 数据结构：`version:snapshot:list/read` 结构与 p0/p1 假设一致；`wordCount` 与 `actor/reason` 字段可复用。
  - IPC 契约：当前主干缺少 `version:diff` / `version:rollback`，属于本 change 待实现项，不构成上游漂移。
  - 组件 API：`DiffViewPanel` 与 `MultiVersionCompare` API 与归档 `editor-p2` 保持一致，可直接复用。
  - AI 标记偏好：`creonow.editor.showAiMarks` 已由 p1 落地，可用于条件渲染虚线下划线。
  - 错误码/阈值：未发现与上游 change 定义冲突的新增硬编码阈值。
- Conclusion: `NO_DRIFT`

### 2026-02-12 01:10 +0800 Red 前环境准备（worktree 依赖）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Packages: +981`
  - worktree 依赖安装完成，可执行 `tsx` / `vitest`

### 2026-02-12 01:11 +0800 Red 失败验证（版本对比 + 回滚）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/version-diff-rollback.ipc.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `pnpm -C apps/desktop test:run renderer/src/features/version-history/useVersionCompare.test.tsx renderer/src/features/version-history/VersionHistoryContainer.test.tsx renderer/src/components/layout/AppShell.restoreConfirm.test.tsx`
- Exit code: `1` / `1` / `1`
- Key output:
  - `version-diff-rollback.ipc.test.ts`：`AssertionError: version:diff handler should be registered`
  - `document-ipc-contract.test.ts`：`missing required channel: version:diff`
  - `useVersionCompare.test.tsx`：期望 `version:diff`，实际调用 `version:snapshot:read`
  - `VersionHistoryContainer.test.tsx` 与 `AppShell.restoreConfirm.test.tsx`：期望 `version:rollback` 调用计数为 1，实际为 0
- Conclusion:
  - Red 成功触发，缺口已覆盖到 IPC contract、后端 handler、前端 compare 调用链与 rollback 调用链。

### 2026-02-12 01:24 +0800 Green 补齐后首次门禁（typecheck/lint）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
- Exit code: `1` / `0`
- Key output:
  - `typecheck` 失败：`apps/desktop/tests/unit/version-diff-rollback.ipc.test.ts` 中 `compareCurrent.data` / `compareSame.data` 触发 `TS18048`（possibly undefined）。
  - 修复：在测试中补充 `if (!result.data) throw ...` 的显式收窄，保持断言语义不变。
  - `lint` 通过：`eslint . --ext .ts,.tsx`。

### 2026-02-12 01:26 +0800 Fresh 门禁验证（本轮）

- Command:
  - `pnpm typecheck`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm -C apps/desktop test:run renderer/src/features/diff/DiffViewPanel.test.tsx renderer/src/features/version-history/useVersionCompare.test.tsx renderer/src/features/version-history/VersionHistoryContainer.test.tsx renderer/src/components/layout/AppShell.restoreConfirm.test.tsx`
  - `pnpm -C apps/desktop test:run`
- Exit code: `0` / `1` / `0` / `0` / `0` / `0`
- Key output:
  - `typecheck` 通过：`tsc --noEmit`。
  - `contract:check` 首次失败原因为：`packages/shared/types/ipc-generated.ts` 新增 `version:snapshot:diff` / `version:snapshot:rollback` 生成结果尚未入索引（命令为 `git diff --exit-code`）。
  - `cross-module:check` 输出：`[CROSS_MODULE_GATE] PASS`。
  - `test:unit` 通过（包含 `document-ipc-contract.test.ts` 与 `version-diff-rollback.ipc.test.ts`）。
  - 受影响 renderer 测试通过：`4 files, 10 tests`。
  - `apps/desktop` 全量 vitest 通过：`Test Files 106 passed`, `Tests 1280 passed`。

### 2026-02-12 01:28 +0800 Contract gate 修复（本轮）

- Command:
  - `git add packages/shared/types/ipc-generated.ts`
  - `pnpm contract:check`
- Exit code: `0`
- Key output:
  - `contract:check` 复跑通过（`pnpm contract:generate` 后 `ipc-generated.ts` 无额外差异）。

### 2026-02-12 01:33 +0800 Change / Rulebook 归档准备（本轮）

- Command:
  - `mv openspec/changes/version-control-p2-diff-rollback openspec/changes/archive/`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`
  - `mv rulebook/tasks/issue-412-version-control-p2-diff-rollback rulebook/tasks/archive/2026-02-12-issue-412-version-control-p2-diff-rollback`
- Exit code: `0`
- Key output:
  - 活跃 change 已归档到 `openspec/changes/archive/version-control-p2-diff-rollback`。
  - `EXECUTION_ORDER.md` 已同步为活跃 `6` 项，Version Control 泳道更新为 `p3 → p4`。
  - Rulebook task 已完成同 PR 自归档。

### 2026-02-12 01:34 +0800 Prettier 预检与格式修复

- Command:
  - `pnpm exec prettier --check $(git diff --name-only --diff-filter=ACMR; git ls-files --others --exclude-standard)`
  - `pnpm exec prettier --write apps/desktop/main/src/services/documents/documentService.ts apps/desktop/renderer/src/features/version-history/useVersionCompare.test.tsx apps/desktop/tests/unit/version-diff-rollback.ipc.test.ts rulebook/tasks/archive/2026-02-12-issue-412-version-control-p2-diff-rollback/.metadata.json`
- Exit code: `1` / `0`
- Key output:
  - 首次 `--check` 报告 4 个文件格式不符合（`documentService.ts`、新增测试、Rulebook metadata）。
  - `--write` 修复完成，待进入 preflight 复检。

### 2026-02-12 01:37 +0800 Fresh 门禁复跑（格式修复后）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: `0` / `0` / `0` / `0` / `0`
- Key output:
  - `typecheck`、`lint`、`contract:check`、`cross-module:check` 全部通过。
  - `test:unit` 通过（包含 `version-diff-rollback.ipc.test.ts` 与 `document-ipc-contract.test.ts`）。
