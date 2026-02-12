# ISSUE-415

- Issue: #415
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/415
- Branch: task/415-editor-p3-zen-mode
- PR: https://github.com/Leeky1017/CreoNow/pull/417
- Scope: 完整交付 `openspec/changes/editor-p3-zen-mode` 全部规划任务，并按 OpenSpec/Rulebook/GitHub 门禁合并回控制面 `main`
- Out of Scope: `editor-p4-a11y-hardening`、非 Editor 模块变更

## Plan

- [x] 准入：创建 OPEN issue + task worktree + Rulebook task
- [x] Dependency Sync Check：核对 `editor-p0/p1/p2` 产物与本 change 假设
- [x] Red：先写失败测试并记录证据
- [x] Green：最小实现转绿并完成目标回归
- [x] Refactor：样式 token 收敛并保持全绿
- [x] 门禁：typecheck/lint/contract/cross-module/test:unit/preflight
- [ ] 交付：PR + auto-merge + main 收口 + change/rulebook 归档 + worktree 清理

## Runs

### 2026-02-12 10:08 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Deliver editor-p3-zen-mode change and merge to main" ...`
  - `git fetch origin main`
  - `git worktree add -b task/415-editor-p3-zen-mode .worktrees/issue-415-editor-p3-zen-mode origin/main`
  - `rulebook task create issue-415-editor-p3-zen-mode`
  - `rulebook task validate issue-415-editor-p3-zen-mode`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/415`
  - Worktree 创建成功：`.worktrees/issue-415-editor-p3-zen-mode`
  - Rulebook task validate 通过（warning: `No spec files found`）

### 2026-02-12 10:10 +0800 Dependency Sync Check（editor-p0 / editor-p1 / editor-p2）

- Input:
  - `openspec/changes/archive/editor-p0-tiptap-foundation-toolbar/specs/editor-delta.md`
  - `openspec/changes/archive/editor-p1-bubble-menu-outline/specs/editor-delta.md`
  - `openspec/changes/archive/editor-p2-diff-ai-collaboration/specs/editor-delta.md`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - `apps/desktop/renderer/src/stores/layoutStore.tsx`
  - `apps/desktop/renderer/src/components/layout/{AppShell,RightPanel}.tsx`
- Checkpoints:
  - 数据结构：`editorStore.autosaveStatus/documentContentJson`、`layoutStore.zenMode` 字段已具备，能承接 Zen 状态栏与内容提取链路。
  - IPC 契约：Zen change 不新增 IPC；沿用 `file:document:*` 只读/保存契约，无 drift。
  - 错误码：Zen 流程不引入新错误码，现有 `autosaveStatus=error` 透传链路保持一致。
  - 阈值：`extractZenModeContent()` 词数统计与 `readTimeMinutes` 计算链路存在，可直接复用；未发现与上游 Spec 冲突阈值。
- Conclusion: `NO_DRIFT`

### 2026-02-12 10:11 +0800 Red 失败证据（Zen Scenario）

- Command:
  - `pnpm -C apps/desktop test:run renderer/src/features/zen-mode/ZenMode.test.tsx renderer/src/components/layout/AppShell.test.tsx`
- Exit code: `1`
- Key output:
  - `ZenMode.test.tsx`: `Unable to find [data-testid="zen-cursor"]`（空文档无段落时未渲染闪烁光标）。
  - `AppShell.test.tsx`: `Zen 模式下 Ctrl + P 不应打开命令面板` 失败（命令面板仍被打开）。
  - `AppShell.test.tsx`: `Zen 模式下 Ctrl + L 不应展开右侧面板` 失败（右侧 AI 面板被快捷键展开）。

### 2026-02-12 10:12 +0800 Green 通过证据（最小实现）

- Code changes:
  - `ZenMode`：空文档 (`paragraphs.length === 0`) 且 `showCursor` 时渲染 `BlinkingCursor`。
  - `AppShell`：Zen 模式下仅允许 `F11/Escape` 退出路径，阻断其它快捷键（含 `Ctrl/Cmd+P`、`Ctrl/Cmd+L`）。
  - `tokens.css` + `ZenMode`：将 Zen 背景/文字/微光替换为 design token 引用，去除硬编码值。
- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm -C apps/desktop test:run renderer/src/features/zen-mode/ZenMode.test.tsx renderer/src/components/layout/AppShell.test.tsx`
- Exit code: `0`
- Key output:
  - `Test Files 2 passed`
  - `Tests 42 passed`

### 2026-02-12 10:13 +0800 门禁回归（本地全量）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: `0`
- Key output:
  - `typecheck` 通过：`tsc --noEmit`
  - `lint` 通过：`eslint . --ext .ts,.tsx`
  - `contract:check` 通过：`ipc-generated.ts` 无漂移
  - `cross-module:check` 通过：`[CROSS_MODULE_GATE] PASS`
  - `test:unit` 通过：包含 `document-ipc-contract.test.ts` / `version-diff-rollback.ipc.test.ts` / Storybook inventory `58/58`

### 2026-02-12 10:15 +0800 Change/Rulebook 归档 + 执行顺序同步

- Command:
  - `mv openspec/changes/editor-p3-zen-mode openspec/changes/archive/editor-p3-zen-mode`
  - `mv rulebook/tasks/issue-415-editor-p3-zen-mode rulebook/tasks/archive/2026-02-12-issue-415-editor-p3-zen-mode`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`（活跃数 6→5，更新时间 `2026-02-12 10:15`）
- Exit code: `0`
- Key output:
  - `editor-p3-zen-mode` 已从活跃目录归档至 `openspec/changes/archive/`
  - 当前任务 Rulebook 已按同 PR 自归档规则迁移至 `rulebook/tasks/archive/`
