# ISSUE-273

- Issue: #273
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/273
- Branch: `task/273-windows-e2e-startup-readiness`
- PR: https://github.com/Leeky1017/CreoNow/pull/274
- Scope: 修复 Windows E2E 启动就绪竞态与命令面板跨用例状态泄漏（Spec-first + TDD）
- Out of Scope: 业务功能扩展、主 spec 直接修改、非本次失败链路的 UI/后端重构

## Goal

- 建立 `windows-e2e-startup-readiness` change（proposal/tasks/delta spec）。
- 通过 Red→Green 修复以下失败模式：
  - 创建项目后 `tiptap-editor` 不可见超时（多文件复现）
  - 命令面板 `Search commands` 输入框偶发不可定位（弹窗残留）
  - 文档 IPC 响应契约失败：`parent_id = NULL` 导致响应校验报错
- 完成 required checks 并合并收口到控制面 `main`。

## Status

- CURRENT: `IN_PROGRESS`（PR 已创建且 auto-merge 已开启，待 required checks 绿灯后自动合并）

## Plan

- 提交当前变更并推送分支。
- 创建 PR（`Closes #273`）并开启 auto-merge。
- 等待 `ci` / `openspec-log-guard` / `merge-serial` 全绿后收口 `main`。

## Runs

### 2026-02-08 14:58 +0800 issue bootstrap

- Command:
  - `gh issue create --title "[Windows E2E] Startup readiness + command palette test isolation" --body-file ...`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/273`

### 2026-02-08 14:59 +0800 worktree bootstrap

- Command:
  - `scripts/agent_worktree_setup.sh 273 windows-e2e-startup-readiness`
- Exit code: `0`
- Key output:
  - `Worktree created: .worktrees/issue-273-windows-e2e-startup-readiness`
  - `Branch: task/273-windows-e2e-startup-readiness`

### 2026-02-08 15:00 +0800 rulebook bootstrap

- Command:
  - `rulebook task create issue-273-windows-e2e-startup-readiness`
  - `rulebook task validate issue-273-windows-e2e-startup-readiness`
- Exit code: `0`
- Key output:
  - `✅ Task issue-273-windows-e2e-startup-readiness is valid`
  - `⚠️ Warnings: No spec files found (specs/*/spec.md)`

### 2026-02-08 15:05 +0800 historical failure evidence collection

- Command:
  - `gh run view 21793667176 --repo Leeky1017/CreoNow --log-failed`
- Exit code: `0`
- Key output:
  - `windows-e2e` job: `18 failed`, `1 flaky`, `31 passed`
  - 失败主链路：`getByTestId('tiptap-editor')` 在创建项目后超时
  - flaky：`command-palette.spec.ts` 中 `Search commands` 输入框 `fill` 超时

### 2026-02-08 15:07 +0800 change apply (spec docs)

- Command:
  - `mkdir -p openspec/changes/windows-e2e-startup-readiness/specs/{project-management,workbench}`
  - `cat > openspec/changes/windows-e2e-startup-readiness/{proposal.md,tasks.md}`
  - `cat > openspec/changes/windows-e2e-startup-readiness/specs/project-management/spec.md`
  - `cat > openspec/changes/windows-e2e-startup-readiness/specs/workbench/spec.md`
- Exit code: `0`
- Key output:
  - change 文档创建完成，Requirement 数量控制在 2（<=3）

### 2026-02-08 15:10 +0800 Red reproduction (current branch)

- Command:
  - `pnpm -C apps/desktop exec playwright test tests/e2e/documents-filetree.spec.ts tests/e2e/system-dialog.spec.ts --config tests/e2e/playwright.config.ts`
- Exit code: `1`
- Key output:
  - `documents-filetree.spec.ts` 超时：等待 `file-actions-<docId>`
  - `system-dialog.spec.ts` 超时：等待 `file-row-<docId> ... file-actions-*`

### 2026-02-08 15:15 +0800 root cause capture

- Evidence:
  - 文档服务日志显示 IPC 契约失败：`ipc_response_validation_failed`（`file:document:list` / `file:document:read`）
  - 根因 1：数据库 `parent_id` 为 `NULL`，IPC 契约要求 `string | undefined`，导致 contract validation 失败。
  - 根因 2：`file-create` 后新文档默认进入 inline rename 模式，该行不渲染 `file-actions-*`，测试直接点 actions 触发超时。

### 2026-02-08 15:20 +0800 Green implementation

- Changes:
  - `apps/desktop/main/src/services/documents/documentService.ts`
    - 增加 `normalizeParentId`，`list/read` 将 `null` 归一化为 `undefined`。
  - `apps/desktop/tests/unit/documentService.lifecycle.test.ts`
    - 新增回归断言：`list/read` 对 `parentId` 返回 `undefined`。
  - `apps/desktop/tests/e2e/_helpers/projectReadiness.ts`
    - 新增共享就绪 helper：`waitForProjectIpcReady` / `waitForEditorReady` / `createProjectViaWelcomeAndWaitForEditor` / `ensureWorkbenchDialogsClosed`。
  - 多个 E2E 用例迁移到共享 helper，命令面板加入前后置弹窗清理。
  - `documents-filetree.spec.ts` / `system-dialog.spec.ts`
    - 新建文档后先处理 inline rename，再执行删除路径。
    - 文件行操作改用更稳的 context-menu 路径。

### 2026-02-08 15:30 +0800 targeted E2E verification

- Command:
  - `pnpm -C apps/desktop exec playwright test tests/e2e/documents-filetree.spec.ts tests/e2e/system-dialog.spec.ts --config tests/e2e/playwright.config.ts`
- Exit code: `0`
- Key output:
  - `2 passed`

### 2026-02-08 15:33 +0800 touched E2E suite verification

- Command:
  - `pnpm -C apps/desktop exec playwright test tests/e2e/ai-apply.spec.ts tests/e2e/analytics.spec.ts tests/e2e/command-palette.spec.ts tests/e2e/documents-filetree.spec.ts tests/e2e/editor-autosave.spec.ts tests/e2e/export-markdown.spec.ts tests/e2e/knowledge-graph.spec.ts tests/e2e/outline-panel.spec.ts tests/e2e/rightpanel-info-quality.spec.ts tests/e2e/system-dialog.spec.ts tests/e2e/version-history.spec.ts --config tests/e2e/playwright.config.ts`
- Exit code: `0`
- Key output:
  - `29 passed`, `1 skipped`

### 2026-02-08 15:35 +0800 unit/integration/static verification

- Commands:
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm -C apps/desktop test:run`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
- Exit code:
  - `test:unit` 初次失败（native ABI mismatch）
  - 其余命令最终成功
- Key output:
  - 失败原因：`better-sqlite3.node` ABI `143`（Electron）与 Node ABI `115` 不匹配
  - 修复命令：`pnpm -C apps/desktop exec npm rebuild better-sqlite3 --build-from-source`
  - 修复后：`test:unit` 全绿

### 2026-02-08 15:41 +0800 rulebook re-validate

- Command:
  - `rulebook task validate issue-273-windows-e2e-startup-readiness`
- Exit code: `0`
- Key output:
  - `✅ Task issue-273-windows-e2e-startup-readiness is valid`
  - `⚠️ Warnings: No spec files found (specs/*/spec.md)`

### 2026-02-08 15:44 +0800 formatting + ABI switching evidence

- Commands:
  - `pnpm exec prettier --write apps/desktop/tests/e2e/documents-filetree.spec.ts apps/desktop/tests/e2e/rightpanel-info-quality.spec.ts apps/desktop/tests/e2e/system-dialog.spec.ts`
  - `pnpm -C apps/desktop exec playwright test tests/e2e/documents-filetree.spec.ts tests/e2e/system-dialog.spec.ts tests/e2e/rightpanel-info-quality.spec.ts --config tests/e2e/playwright.config.ts`
- Exit code:
  - `prettier --write`: `0`
  - `playwright subset`: `1`
- Key output:
  - 失败原因不是业务回归，而是 native ABI 切换后 Electron 运行期数据库加载失败，`waitForProjectIpcReady` 轮询结果持续为 `DB_ERROR`。

### 2026-02-08 15:47 +0800 ABI recover + final local green

- Commands:
  - `pnpm -C apps/desktop rebuild:native`
  - `pnpm -C apps/desktop exec playwright test tests/e2e/documents-filetree.spec.ts tests/e2e/system-dialog.spec.ts tests/e2e/rightpanel-info-quality.spec.ts --config tests/e2e/playwright.config.ts`
  - `pnpm -C apps/desktop exec npm rebuild better-sqlite3 --build-from-source`
  - `pnpm test:unit`
  - `pnpm exec prettier --check $(git diff --name-only --diff-filter=ACMR)`
  - `pnpm lint`
- Exit code: `0`
- Key output:
  - E2E 子集：`7 passed`
  - Unit：全绿
  - Prettier：`All matched files use Prettier code style!`
  - Lint：仅历史 warning，无 error

### 2026-02-08 15:49 +0800 branch push + PR open

- Commands:
  - `git push -u origin task/273-windows-e2e-startup-readiness`
  - `gh pr create --title \"Stabilize Windows E2E startup readiness (#273)\" --body ...`
  - `gh pr edit 274 --body-file /tmp/pr274.md`
- Exit code: `0`
- Key output:
  - PR URL: `https://github.com/Leeky1017/CreoNow/pull/274`
  - PR body 已修正并包含 `Closes #273`

### 2026-02-08 15:51 +0800 auto-merge + preflight

- Commands:
  - `gh pr merge 274 --auto --squash`
  - `scripts/agent_pr_preflight.sh`
- Exit code:
  - `gh pr merge --auto`: `0`
  - `agent_pr_preflight.sh`: `0`（首次因 markdown 格式失败后修复重跑通过）
- Key output:
  - PR `autoMergeRequest.mergeMethod = SQUASH`
  - preflight 覆盖通过：Issue OPEN、Rulebook validate、Prettier、Typecheck、Lint、Contract、Unit

## Blockers

- NONE（当前无技术阻塞）

## Next

- 等待 required checks 全绿后合并收口 `main`，归档 change 与 Rulebook task。
