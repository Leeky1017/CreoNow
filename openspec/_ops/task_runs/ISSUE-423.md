# ISSUE-423

- Issue: #423
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/423
- Branch: task/423-editor-p4-a11y-hardening
- PR: https://github.com/Leeky1017/CreoNow/pull/427
- Scope: 完整交付 `openspec/changes/editor-p4-a11y-hardening` 全部规划任务，并按 OpenSpec/Rulebook/GitHub 门禁合并回控制面 `main`
- Out of Scope: `skill-system-p4-hardening-boundary`、`version-control-p4-hardening-boundary`、非 Editor 模块功能扩展

## Plan

- [x] 准入：创建 OPEN issue + task worktree + Rulebook task
- [x] Dependency Sync Check：核对 `editor-p0~p3` 产物与本 change 假设
- [x] Red：先写失败测试并记录证据
- [x] Green：最小实现转绿并完成目标回归
- [x] Refactor：收敛重复实现并保持全绿
- [x] 门禁：typecheck/lint/contract/cross-module/test:unit/preflight
- [ ] 交付：PR + auto-merge + main 收口 + change/rulebook 归档 + worktree 清理

## Runs

### 2026-02-12 12:00 +0800 准入（Issue / Rulebook / Worktree）

- Command:
  - `gh issue list --state open --limit 200 --json number,title,state,url`
  - `gh issue create --title "Deliver editor-p4-a11y-hardening change and merge to main" ...`
  - `scripts/agent_controlplane_sync.sh`
  - `git worktree add -b task/423-editor-p4-a11y-hardening .worktrees/issue-423-editor-p4-a11y-hardening origin/main`
  - `rulebook task create issue-423-editor-p4-a11y-hardening`
  - `rulebook task validate issue-423-editor-p4-a11y-hardening`
- Exit code: `0`
- Key output:
  - OPEN issue 列表为空：`[]`，因此创建新任务 issue。
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/423`
  - Worktree 创建成功：`.worktrees/issue-423-editor-p4-a11y-hardening`
  - Rulebook task validate 通过（warning: `No spec files found (specs/*/spec.md)`）。

### 2026-02-12 12:02 +0800 并行任务识别（Unexpected change guard）

- Command:
  - `gh issue view 424 --json number,title,state,url`
  - `find rulebook/tasks/issue-424-skill-system-p4-hardening-boundary -maxdepth 2 -type f`
- Exit code: `0`
- Key output:
  - 识别到并行任务目录 `rulebook/tasks/issue-424-skill-system-p4-hardening-boundary`，对应 OPEN issue：`#424`。
  - 处理策略：按隔离原则仅在 `task/423` worktree 内推进本任务，不修改并行任务文件。

### 2026-02-12 12:10 +0800 Dependency Sync Check（editor-p0 ~ editor-p3）

- Input:
  - `openspec/changes/archive/editor-p0-tiptap-foundation-toolbar/specs/editor-delta.md`
  - `openspec/changes/archive/editor-p1-bubble-menu-outline/specs/editor-delta.md`
  - `openspec/changes/archive/editor-p2-diff-ai-collaboration/specs/editor-delta.md`
  - `openspec/changes/archive/editor-p3-zen-mode/specs/editor-delta.md`
  - `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - `apps/desktop/renderer/src/features/outline/OutlinePanelContainer.tsx`
  - `apps/desktop/renderer/src/features/ai/applySelection.ts`
- Checkpoints:
  - 数据结构：`editorStore` 已具备 `autosaveStatus/autosaveError/documentContentJson` 主状态字段；本 change 仅新增容量提示字段，不破坏上游状态语义。
  - IPC 契约：保存仍走 `file:document:save`，未新增 channel；`manual-save/autosave` reason 语义保持不变。
  - 错误码：AI 应用冲突仍沿用 `CONFLICT`（`applySelection`），未引入漂移错误码。
  - 阈值：focus ring token（2px/2px）与 `tokens.css` 对齐；p4 性能阈值通过新增 benchmark 测试落盘验证。
- Conclusion: `NO_DRIFT`

### 2026-02-12 12:18 +0800 Red 失败证据（p4 场景）

- Command:
  - `pnpm -C apps/desktop test:run renderer/src/stores/editorStore.test.ts renderer/src/components/layout/StatusBar.test.tsx renderer/src/features/editor/EditorPane.test.tsx renderer/src/features/editor/EditorToolbar.test.tsx renderer/src/features/outline/OutlinePanelContainer.test.tsx renderer/src/features/ai/applySelection.test.ts renderer/src/features/editor/editor-p4-performance.test.tsx`
- Exit code: `1`
- Key output:
  - `editorStore.test.ts`：手动保存优先断言失败（`autosave` 与 `manual-save` 未进入统一优先队列）。
  - `StatusBar.test.tsx`：缺失 `editor-capacity-warning`。
  - `EditorPane.test.tsx`：`chunkLargePasteText / shouldConfirmOverflowPaste / shouldWarnDocumentCapacity` 不存在。
  - `OutlinePanelContainer.test.tsx`：重算取消场景超时（测试策略需改为 act + 真实 debounce 观测）。

### 2026-02-12 12:22 +0800 Green 通过证据（最小实现 + Refactor）

- Code changes:
  - `editorStore`：引入统一保存队列，`manual-save` 在同文档队列中优先于排队 autosave。
  - `EditorPane`：新增文档容量阈值检查、超大粘贴分块与超限确认 helper + 处理逻辑。
  - `StatusBar`：新增容量上限提示（`editor-capacity-warning`）。
  - `OutlinePanelContainer`：补齐“快速更新仅保留最后一次重算结果”的行为测试。
  - `Editor` a11y：新增 `createToggleButtonA11yProps()`，统一 Toolbar/Bubble button ARIA 构造。
- Command:
  - `pnpm install --frozen-lockfile`
  - `pnpm -C apps/desktop test:run renderer/src/features/editor/a11y.test.ts renderer/src/stores/editorStore.test.ts renderer/src/components/layout/StatusBar.test.tsx renderer/src/features/editor/EditorPane.test.tsx renderer/src/features/editor/EditorToolbar.test.tsx renderer/src/features/outline/OutlinePanelContainer.test.tsx renderer/src/features/ai/applySelection.test.ts renderer/src/features/editor/editor-p4-performance.test.tsx`
- Exit code: `0`
- Key output:
  - `Test Files 8 passed`
  - `Tests 47 passed`

### 2026-02-12 12:31 +0800 门禁回归（本地）

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
  - `test:unit` 通过：`document-ipc-contract.test.ts` / `version-diff-rollback.ipc.test.ts` / Storybook inventory `58/58`

### 2026-02-12 12:34 +0800 Change/Rulebook 归档 + 执行顺序同步

- Command:
  - `mv openspec/changes/editor-p4-a11y-hardening openspec/changes/archive/editor-p4-a11y-hardening`
  - `mv rulebook/tasks/issue-423-editor-p4-a11y-hardening rulebook/tasks/archive/2026-02-12-issue-423-editor-p4-a11y-hardening`
  - 更新 `openspec/changes/EXECUTION_ORDER.md`（活跃数 `3 → 2`，更新时间 `2026-02-12 12:28`）
- Exit code: `0`
- Key output:
  - `editor-p4-a11y-hardening` 已归档至 `openspec/changes/archive/`
  - 当前任务 Rulebook 已按“同 PR 自归档”规则迁移至 `rulebook/tasks/archive/`

### 2026-02-12 12:37 +0800 Preflight（提交前总检）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`
- Key output:
  - `prettier --check` 全部通过
  - `typecheck/lint/contract/cross-module/test:unit` 全链路通过
  - Issue freshness 检查通过：`#423 OPEN`
  - Rulebook 定位通过：当前任务归档路径 `rulebook/tasks/archive/2026-02-12-issue-423-editor-p4-a11y-hardening`

### 2026-02-12 12:39 +0800 Editor p4 场景回归（目标测试）

- Command:
  - `pnpm -C apps/desktop test:run renderer/src/features/editor/a11y.test.ts renderer/src/stores/editorStore.test.ts renderer/src/components/layout/StatusBar.test.tsx renderer/src/features/editor/EditorPane.test.tsx renderer/src/features/editor/EditorToolbar.test.tsx renderer/src/features/outline/OutlinePanelContainer.test.tsx renderer/src/features/ai/applySelection.test.ts renderer/src/features/editor/editor-p4-performance.test.tsx`
- Exit code: `0`
- Key output:
  - `Test Files 8 passed`
  - `Tests 47 passed`
