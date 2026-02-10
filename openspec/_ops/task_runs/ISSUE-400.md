# ISSUE-400

- Issue: #400
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/400
- Branch: task/400-editor-p1-bubble-menu-outline
- PR: https://github.com/Leeky1017/CreoNow/pull/403
- Scope: 完整交付 `openspec/changes/editor-p1-bubble-menu-outline`（Bubble Menu + Outline）并完成治理收口
- Out of Scope: AI 相关编辑交互（editor-p2）、Zen Mode（editor-p3）、A11y hardening（editor-p4）

## Plan

- [x] 准入：OPEN issue + task worktree + Rulebook task
- [x] Specification：Dependency Sync Check 完成并落盘
- [x] Red：先写失败测试并记录失败证据
- [x] Green：最小实现通过目标 Scenario
- [x] Refactor：抽象复用并保持绿灯
- [x] 门禁：typecheck/lint/contract/cross-module/test:unit/preflight
- [ ] 交付：PR + auto-merge + main 收口 + change/rulebook 归档 + worktree 清理

## Runs

### 2026-02-10 18:57 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Editor P1: Bubble Menu + Outline delivery" --body-file /tmp/issue-editor-p1-bubble-outline.md`
  - `scripts/agent_worktree_setup.sh 400 editor-p1-bubble-menu-outline`
  - `rulebook task create issue-400-editor-p1-bubble-menu-outline`
  - `rulebook task validate issue-400-editor-p1-bubble-menu-outline`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/400`
  - worktree 创建成功：`.worktrees/issue-400-editor-p1-bubble-menu-outline`
  - Rulebook task validate 通过

### 2026-02-10 19:00 +0800 Dependency Sync Check（editor-p0 → editor-p1）

- Input:
  - `openspec/changes/archive/editor-p0-tiptap-foundation-toolbar/specs/editor-delta.md`
  - `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `apps/desktop/renderer/src/features/editor/EditorToolbar.tsx`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - `apps/desktop/main/src/ipc/file.ts`
  - `packages/shared/types/ipc-generated.ts`
- Checkpoints:
  - 数据结构：`editorStore` 仍通过 `setEditorInstance` 暴露 TipTap editor，满足 bubble/outline 容器复用前提。
  - IPC 契约：`file:document:getcurrent/list/create/read/save/updatestatus` 与 p0 保持一致，本 change 无新增 IPC channel。
  - 错误码：`NOT_FOUND` / `INVALID_ARGUMENT` / `DB_ERROR` 语义保持不变，本 change 不引入新错误码。
  - 阈值：继续沿用编辑器 autosave 500ms 去抖；Bubble Menu 显示延迟/边界翻转仅在渲染层处理，不改变主进程阈值行为。
- Conclusion: `NO_DRIFT`

### 2026-02-10 19:03 +0800 Red（Bubble Menu 场景失败证据）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorPane.test.tsx renderer/src/features/outline/OutlinePanelContainer.test.tsx`
- Exit code: `1`
- Key output:
  - `Unable to find an element by: [data-testid="editor-bubble-menu"]`（Bubble Menu 未实现）
  - `Unable to find an element by: [data-testid="bubble-bold"]`（Bubble Menu 操作集未实现）
  - `expect(element).toBeDisabled()` 失败（Code Block 场景下固定工具栏 inline 按钮未禁用）

### 2026-02-10 19:06 +0800 Green（最小实现）

- Command:
  - `edit apps/desktop/renderer/src/features/editor/InlineFormatButton.tsx`
  - `edit apps/desktop/renderer/src/features/editor/EditorBubbleMenu.tsx`
  - `edit apps/desktop/renderer/src/features/editor/EditorToolbar.tsx`
  - `edit apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `edit apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
  - `edit apps/desktop/renderer/src/features/outline/OutlinePanelContainer.test.tsx`
  - `pnpm -C apps/desktop add @tiptap/extension-bubble-menu@^2.27.2 @tiptap/extension-link@^2.27.2`
- Exit code: `0`
- Key output:
  - 新增 `EditorBubbleMenu`（非空选区显示、折叠/Code Block/只读隐藏、定位翻转）
  - 新增共享 `InlineFormatButton` 并复用至固定工具栏（inline 按钮在 Code Block 场景禁用）
  - 集成 Link / BubbleMenu 扩展（生产环境启用，vitest 环境降级为无 tippy 渲染）

### 2026-02-10 19:08 +0800 Green 验证（目标回归）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorPane.test.tsx renderer/src/features/outline/OutlinePanelContainer.test.tsx`
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorToolbar.test.tsx renderer/src/features/outline/deriveOutline.test.ts renderer/src/features/outline/OutlinePanel.test.tsx`
- Exit code: `0`
- Key output:
  - Bubble Menu / Outline 目标测试：`Test Files 2 passed (2)`，`Tests 8 passed (8)`
  - Editor/Outline 回归：`Test Files 3 passed (3)`，`Tests 66 passed (66)`

### 2026-02-10 19:10 +0800 格式化修正

- Command:
  - `pnpm exec prettier --check $(git diff --name-only --diff-filter=ACMRTUXB)`
  - `pnpm exec prettier --write apps/desktop/renderer/src/features/editor/EditorPane.stories.tsx apps/desktop/renderer/src/features/editor/EditorPane.test.tsx pnpm-lock.yaml`
- Exit code:
  - `check=1`（发现 3 个文件格式不一致）
  - `write=0`
- Key output:
  - 格式化完成：`EditorPane.stories.tsx`、`EditorPane.test.tsx`、`pnpm-lock.yaml`

### 2026-02-10 19:11 +0800 门禁验证（type/lint/contract/cross-module/unit）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: 全部 `0`
- Key output:
  - `cross-module:check` 输出 `PASS`
  - `test:unit` 包含 Storybook inventory：`58/58` 一致，全部通过

### 2026-02-10 19:12 +0800 全量 UI 回归（desktop vitest）

- Command:
  - `pnpm -C apps/desktop test:run`
- Exit code: `0`
- Key output:
  - `Test Files 98 passed (98)`
  - `Tests 1260 passed (1260)`

### 2026-02-10 19:13 +0800 change 归档与顺序文档同步

- Command:
  - `mv openspec/changes/editor-p1-bubble-menu-outline openspec/changes/archive/`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `editor-p1-bubble-menu-outline` 已迁移至 `openspec/changes/archive/`
  - `EXECUTION_ORDER.md` 已同步活跃 change 数量 `12 -> 11`，并更新 editor 泳道拓扑

### 2026-02-10 19:14 +0800 Rulebook task 自归档

- Command:
  - `rulebook task archive issue-400-editor-p1-bubble-menu-outline`
- Exit code: `0`
- Key output:
  - Rulebook task 已迁移至 `rulebook/tasks/archive/2026-02-10-issue-400-editor-p1-bubble-menu-outline/`

### 2026-02-10 19:14 +0800 preflight 占位符阻断（预期）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-400.md: (待回填)`

### 2026-02-10 19:19 +0800 PR 创建与 RUN_LOG 回填

- Command:
  - `gh pr create --base main --head task/400-editor-p1-bubble-menu-outline --title "Deliver editor p1 bubble menu outline (#400)" --body-file /tmp/pr-400-body.md`
  - `edit openspec/_ops/task_runs/ISSUE-400.md`（回填 `PR` 字段）
- Exit code: `0`
- Key output:
  - PR 创建成功：`https://github.com/Leeky1017/CreoNow/pull/403`

### 2026-02-10 19:20 +0800 preflight 首次失败（格式化门禁）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `pnpm exec prettier --check ...` 失败，提示 5 个文件格式不一致：
    - `apps/desktop/renderer/src/features/editor/EditorBubbleMenu.tsx`
    - `apps/desktop/renderer/src/features/outline/OutlinePanelContainer.test.tsx`
    - `rulebook/tasks/archive/2026-02-10-issue-400-editor-p1-bubble-menu-outline/.metadata.json`
    - `rulebook/tasks/archive/2026-02-10-issue-400-editor-p1-bubble-menu-outline/proposal.md`
    - `rulebook/tasks/archive/2026-02-10-issue-400-editor-p1-bubble-menu-outline/tasks.md`

### 2026-02-10 19:22 +0800 preflight 重跑通过

- Command:
  - `pnpm exec prettier --write apps/desktop/renderer/src/features/editor/EditorBubbleMenu.tsx apps/desktop/renderer/src/features/outline/OutlinePanelContainer.test.tsx rulebook/tasks/archive/2026-02-10-issue-400-editor-p1-bubble-menu-outline/.metadata.json rulebook/tasks/archive/2026-02-10-issue-400-editor-p1-bubble-menu-outline/proposal.md rulebook/tasks/archive/2026-02-10-issue-400-editor-p1-bubble-menu-outline/tasks.md`
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`
- Key output:
  - `All matched files use Prettier code style!`
  - `pnpm typecheck` / `pnpm lint` / `pnpm contract:check` / `pnpm cross-module:check` / `pnpm test:unit` 全部通过
