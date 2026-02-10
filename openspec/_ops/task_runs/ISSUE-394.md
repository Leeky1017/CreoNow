# ISSUE-394

- Issue: #394
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/394
- Branch: task/394-version-control-p0-snapshot-history
- PR: https://github.com/Leeky1017/CreoNow/pull/397
- Scope: 完成交付 `openspec/changes/version-control-p0-snapshot-history` 全部任务（快照 create/list/read、4 类触发、autosave 合并、版本历史入口与展示）并合并回控制面 `main`
- Out of Scope: AI 区分显示（p1）、版本预览（p1）、Diff/回滚（p2）、分支/合并/冲突（p3）

## Plan

- [x] 准入：创建 OPEN issue + task 分支/worktree + Rulebook task
- [x] Dependency Sync Check：核对 IPC P0 + Document Management P0 + editor-p0，结论落盘
- [x] Red：先补齐失败测试并记录 Red 证据
- [x] Green：最小实现通过 Scenario 映射
- [x] Refactor：收敛实现并保持全绿
- [ ] preflight + PR auto-merge + main 收口 + cleanup

## Runs

### 2026-02-10 16:58 +0800 准入（Issue / Rulebook / Worktree）

- Command:
  - `gh issue create --title "Deliver version-control-p0-snapshot-history change and merge to main" --body "..."`
  - `gh issue view 394 --json number,state,title,url`
  - `rulebook task create issue-394-version-control-p0-snapshot-history`
  - `rulebook task validate issue-394-version-control-p0-snapshot-history`
  - `git stash push -u -m "issue-394-bootstrap-rulebook"`
  - `scripts/agent_worktree_setup.sh 394 version-control-p0-snapshot-history`
  - `git -C .worktrees/issue-394-version-control-p0-snapshot-history stash pop`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/394`
  - Issue 状态：`OPEN`
  - Rulebook task 创建成功并 validate 通过
  - worktree 创建成功：`.worktrees/issue-394-version-control-p0-snapshot-history`
  - 分支创建成功：`task/394-version-control-p0-snapshot-history`

### 2026-02-10 17:06 +0800 Dependency Sync Check（IPC / Document Management / editor-p0）

- Input:
  - `openspec/specs/ipc/spec.md`
  - `openspec/changes/archive/ipc-p0-runtime-validation-and-error-envelope/specs/ipc/spec.md`
  - `openspec/specs/document-management/spec.md`
  - `openspec/changes/archive/document-management-p0-crud-types-status/specs/document-management/spec.md`
  - `openspec/changes/editor-p0-tiptap-foundation-toolbar/specs/editor-delta.md`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - `apps/desktop/main/src/ipc/file.ts`
- Checkpoints:
  - 数据结构：`documentId/projectId` 仍为字符串 ID，未出现跨模块结构漂移。
  - IPC 契约：继续遵循 request-response envelope（`ok: true|false`），`file:document:save` 通道仍稳定可用。
  - 错误码：保存链路保持 `INVALID_ARGUMENT`、`NOT_FOUND`、`DB_ERROR` 可判定返回。
  - 触发接口：editor-p0 明确手动保存/自动保存触发与 `manual-save/autosave` 语义，与本 change 依赖假设一致。
- Conclusion: `NO_DRIFT`

### 2026-02-10 17:10 +0800 TDD Mapping Gate（Scenario → Tests）

- Input:
  - `openspec/changes/version-control-p0-snapshot-history/specs/version-control-delta.md`
  - `openspec/changes/version-control-p0-snapshot-history/tasks.md`
  - `apps/desktop/tests/unit/documentService.lifecycle.test.ts`
  - `apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `apps/desktop/renderer/src/features/files/FileTreePanel.context-menu.test.tsx`
  - `apps/desktop/renderer/src/features/rightpanel/InfoPanel.tsx`
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.test.tsx`
  - `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.test.tsx`
- Mapping:
  - S1 手动保存快照 → `documentService.lifecycle.test.ts`
  - S2 AI 接受快照（`ai-accept`） → `documentService.lifecycle.test.ts`
  - S3 autosave 5 分钟合并 → `documentService.lifecycle.test.ts`
  - S4 打开版本历史入口（文件右键 / Info / 命令面板） → `FileTreePanel.context-menu.test.tsx` + `InfoPanel.test.tsx` + `CommandPalette.test.tsx`
  - S5 actor 标识渲染 → `VersionHistoryPanel.test.tsx`
- Gate:
  - 进入实现前必须先跑出 Red 失败证据并记录命令输出。

### 2026-02-10 17:12 +0800 环境准备（依赖安装）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Lockfile is up to date`
  - `Packages: +978`
  - `tsx 4.21.0` 可执行已安装

### 2026-02-10 17:14 +0800 Red 失败验证（后端）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/documentService.lifecycle.test.ts`
- Exit code: `1` / `1`
- Key output:
  - `document-ipc-contract.test.ts` 失败：`missing required channel: version:snapshot:create`
  - `documentService.lifecycle.test.ts` 失败：`AI accept save should succeed`
- Conclusion:
  - Red 成功触发：`snapshot:create` 契约缺口、`ai-accept` 语义缺口已被测试捕获。

### 2026-02-10 17:15 +0800 Red 失败验证（前端入口 + actor 标识）

- Command:
  - `pnpm -C apps/desktop test:run src/features/files/FileTreePanel.context-menu.test.tsx src/features/rightpanel/InfoPanel.test.tsx src/features/commandPalette/CommandPalette.test.tsx src/features/version-history/VersionHistoryPanel.test.tsx`
- Exit code: `1`
- Key output:
  - `FileTreePanel.context-menu.test.tsx`：`Unable to find ... "Version History"`
  - `InfoPanel.test.tsx`：`Unable to find ... role "button" and name "查看版本历史"`
  - `CommandPalette.test.tsx`：`Unable to find ... "Open Version History"`
  - `VersionHistoryPanel.test.tsx`：`Unable to find ... "AI 修改"`（`ai-accept` 未映射）
- Conclusion:
  - Red 成功触发：三个入口与 actor reason 渲染缺口被测试覆盖并失败可复现。

### 2026-02-10 17:37 +0800 Green 目标测试回归（后端 + 前端）

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/documentService.lifecycle.test.ts`
  - `pnpm -C apps/desktop test:run src/features/files/FileTreePanel.context-menu.test.tsx src/features/rightpanel/InfoPanel.test.tsx src/features/commandPalette/CommandPalette.test.tsx src/features/version-history/VersionHistoryPanel.test.tsx`
- Exit code: `0` / `0` / `0`
- Key output:
  - `document-ipc-contract.test.ts: all assertions passed`
  - `documentService.lifecycle.test.ts: all assertions passed`
  - `4 files, 52 tests passed`（文件右键/Info/命令面板入口 + `ai-accept` 标签渲染全部通过）

### 2026-02-10 17:38 +0800 契约生成与门禁预检（type/lint/contract/cross-module）

- Command:
  - `pnpm contract:generate`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
- Exit code:
  - `contract:generate=0`
  - `typecheck=0`
  - `lint=0`
  - `contract:check=1（首次） → 0（修复后）`
  - `cross-module:check=0`
- Key output:
  - `contract:check` 首次失败原因为 `packages/shared/types/ipc-generated.ts` 存在未暂存生成差异（新增 `version:snapshot:create` + `wordCount` 字段）。
  - 修复动作：`git add packages/shared/types/ipc-generated.ts` 后重跑 `pnpm contract:check` 通过。
  - `cross-module-contract-gate` 输出：`[CROSS_MODULE_GATE] PASS`。

### 2026-02-10 17:39 +0800 全量回归（unit/integration）

- Command:
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code: `0` / `0`
- Key output:
  - Unit：`document-ipc-contract.test.ts` 与 `documentService.lifecycle.test.ts` 均通过；Storybook inventory 58/58 全部映射通过。
  - Integration：整套脚本链执行完成并返回成功退出码。

### 2026-02-10 17:40 +0800 受影响前端回归补充（layout/version-history）

- Command:
  - `pnpm -C apps/desktop test:run src/components/layout/RightPanel.test.tsx src/components/layout/Sidebar.test.tsx src/components/layout/AppShell.restoreConfirm.test.tsx src/features/version-history/VersionHistoryContainer.test.tsx`
- Exit code: `0`
- Key output:
  - `4 files, 41 tests passed`
  - 存在既有 `act(...)` 警告（`AiPanel`），不影响本次变更功能正确性与测试通过结论。

### 2026-02-10 17:46 +0800 change 归档与执行顺序同步

- Command:
  - `mv openspec/changes/version-control-p0-snapshot-history openspec/changes/archive/`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - change 已归档：`openspec/changes/archive/version-control-p0-snapshot-history`
  - `EXECUTION_ORDER.md` 已更新：活跃 change `15 -> 14`，更新时间 `2026-02-10 17:46`
  - Version Control 泳道更新为 `p1 -> p2 -> p3 -> p4`（`p0` 归档）

### 2026-02-10 17:47 +0800 Rulebook task 自归档（同 PR）

- Command:
  - `rulebook task archive issue-394-version-control-p0-snapshot-history`
- Exit code: `0`
- Key output:
  - `✅ Task issue-394-version-control-p0-snapshot-history archived successfully`
  - 归档路径：`rulebook/tasks/archive/2026-02-10-issue-394-version-control-p0-snapshot-history`

### 2026-02-10 17:52 +0800 交付前新鲜验证（verification-before-completion）

- Command:
  - `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm cross-module:check && pnpm test:unit && pnpm test:integration`
- Exit code: `0`
- Key output:
  - `typecheck` 通过
  - `lint` 通过
  - `contract:check` 通过（`contract:generate + git diff --exit-code` 无差异）
  - `cross-module:check` 输出：`[CROSS_MODULE_GATE] PASS`
  - `test:unit` 通过（含 `document-ipc-contract` / `documentService.lifecycle` / `storybook inventory 58/58`）
  - `test:integration` 全链路通过

### 2026-02-10 17:53 +0800 preflight 首次阻断（PR 链接占位符）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-394.md: (待回填)`
  - 结论：先创建 PR 并回填真实链接，再复跑 preflight

### 2026-02-10 17:54 +0800 提交与推送

- Command:
  - `git commit -m "feat: deliver version-control p0 snapshot history (#394)"`
  - `git push -u origin task/394-version-control-p0-snapshot-history`
- Exit code: `0`
- Key output:
  - commit: `90ff70cf`
  - 远端分支创建成功并建立 tracking

### 2026-02-10 17:55 +0800 创建 PR 并回填 RUN_LOG

- Command:
  - `gh pr create --base main --head task/394-version-control-p0-snapshot-history --title "Deliver version-control-p0-snapshot-history change (#394)" --body-file /tmp/pr-394-body.md`
  - `apply_patch openspec/_ops/task_runs/ISSUE-394.md`（回填 `- PR:` 为真实链接）
- Exit code: `0`
- Key output:
  - PR 创建成功：`https://github.com/Leeky1017/CreoNow/pull/397`

### 2026-02-10 17:55 +0800 preflight 二次阻断（Prettier）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `pnpm exec prettier --check` 失败，阻断文件共 8 个：
    - `apps/desktop/main/src/services/documents/documentService.ts`
    - `apps/desktop/renderer/src/components/layout/RightPanel.tsx`
    - `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.test.tsx`
    - `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.tsx`
    - `apps/desktop/tests/unit/document-ipc-contract.test.ts`
    - `apps/desktop/tests/unit/documentService.lifecycle.test.ts`
    - `openspec/changes/EXECUTION_ORDER.md`
    - `openspec/changes/archive/version-control-p0-snapshot-history/specs/version-control-delta.md`

### 2026-02-10 17:55 +0800 Prettier 修复与 preflight 复验

- Command:
  - `pnpm exec prettier --write <preflight 阻断文件列表>`
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0` / `0`
- Key output:
  - `prettier --check` 复验通过：`All matched files use Prettier code style!`
  - `typecheck/lint/contract/cross-module/test:unit` 全通过
