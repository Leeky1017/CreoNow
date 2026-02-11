# ISSUE-409

- Issue: #409
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/409
- Branch: task/409-editor-p2-diff-ai-collaboration
- PR: https://github.com/Leeky1017/CreoNow/pull/411
- Scope: 完整交付 `openspec/changes/editor-p2-diff-ai-collaboration`（selection reference card + AI inline diff + multi-version compare）并收口到控制面 `main`
- Out of Scope: 禅模式（editor-p3）、A11y hardening（editor-p4）、版本快照持久化

## Plan

- [x] 准入：创建 OPEN issue + task worktree + Rulebook task
- [x] Dependency Sync Check：核对 editor-p0/editor-p1 + ai-service-p3 产物与当前 change 假设
- [x] Red：补齐 selection reference / AI inline diff / multi-version compare 的失败测试证据
- [x] Green：最小实现转绿并完成回归
- [x] Refactor：抽象可复用逻辑并保持绿灯
- [x] 门禁：typecheck/lint/contract/cross-module/test:unit/preflight
- [ ] 交付：PR + auto-merge + main 收口 + change/rulebook 归档 + worktree 清理

## Runs

### 2026-02-11 23:26 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Editor P2: Diff + AI collaboration delivery" --body-file /tmp/issue-editor-p2-diff-ai-collaboration.md`
  - `scripts/agent_worktree_setup.sh 409 editor-p2-diff-ai-collaboration`
  - `rulebook task create issue-409-editor-p2-diff-ai-collaboration`
  - `rulebook task validate issue-409-editor-p2-diff-ai-collaboration`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/409`
  - worktree 创建成功：`.worktrees/issue-409-editor-p2-diff-ai-collaboration`
  - Rulebook task validate 通过（warning: `No spec files found`）

### 2026-02-11 23:31 +0800 Dependency Sync Check（editor-p0 / editor-p1 / ai-service-p3）

- Input:
  - `openspec/changes/archive/editor-p0-tiptap-foundation-toolbar/specs/editor-delta.md`
  - `openspec/changes/archive/editor-p1-bubble-menu-outline/specs/editor-delta.md`
  - `openspec/changes/archive/ai-service-p3-judge-quality-pipeline/specs/ai-service-delta.md`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - `apps/desktop/renderer/src/stores/aiStore.ts`
  - `packages/shared/types/ipc-generated.ts`（`ai:skill:run` request/response 结构）
- Checkpoints:
  - 数据结构：`editorStore.compareMode/compareVersionId`、`aiStore.selectionText/selectionRef` 字段均已存在，可承接 p2 状态机。
  - IPC 契约：`ai:skill:run` 仍包含 `input/mode/model/stream/candidateCount/context(projectId/documentId)` 与 `runId/executionId/candidates/usage`，无 breaking drift。
  - 错误码：`applySelection` 冲突链路使用 `CONFLICT`，与共享错误码集合一致。
  - 阈值：p0 autosave 500ms 与 p1 bubble/outline 行为无变更，p2 不引入新的后端阈值。
- Conclusion: `NO_DRIFT`

### 2026-02-11 23:47 +0800 门禁回归（首次）与失败修复

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: `1`（首次门禁存在失败）
- Key output:
  - `typecheck` 失败：`AiPanel.selection-reference.test.tsx(229,55): TS2493 Tuple type '[]'...`
  - 修复：为测试中的 `mocks.aiState.run` 添加可选参数签名，消除 `mock.calls[0][0]` 类型越界。
  - `test:unit` 失败：`unifiedDiff.test.ts` 断言仍使用旧 hunk 头（`@@ -1,2 +1,2 @@`）。
  - 修复：更新为新行为断言（`@@ -1,1 +1,1 @@`），并补充 `computeDiffHunks/applyHunkDecisions` 行为用例。

### 2026-02-11 23:55 +0800 环境阻断修复（better-sqlite3 ABI mismatch）

- Command:
  - `pnpm test:unit`
  - `pnpm -C apps/desktop rebuild:native`
  - `pnpm -C apps/desktop rebuild better-sqlite3`
  - `node -e "const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.close(); console.log('ok');"`
- Exit code: `0`（修复后验证）
- Key output:
  - 失败日志：`better_sqlite3.node ... NODE_MODULE_VERSION 143 ... requires 115`
  - 根因：本地 Node ABI 与当前 native binary 不匹配。
  - 有效修复：在 `apps/desktop` 作用域执行 `pnpm rebuild better-sqlite3`，Node 侧 `Database(':memory:')` 验证通过。

### 2026-02-11 23:56 +0800 Green 证据（目标场景）

- Command:
  - `pnpm -C apps/desktop test:run renderer/src/features/ai/AiPanel.selection-reference.test.tsx renderer/src/components/layout/AppShell.ai-inline-diff.test.tsx renderer/src/features/diff/DiffViewPanel.test.tsx`
- Exit code: `0`
- Key output:
  - `Test Files 3 passed`
  - `Tests 11 passed`
  - 注：存在 React `act(...)` warning，不影响用例通过。

### 2026-02-12 00:00 +0800 文档归档与执行顺序同步

- Command:
  - `mv openspec/changes/editor-p2-diff-ai-collaboration openspec/changes/archive/editor-p2-diff-ai-collaboration`
  - `rulebook task archive issue-409-editor-p2-diff-ai-collaboration`
  - `pnpm exec prettier --write <changed-files>`
- Exit code: `0`
- Key output:
  - change 已归档到：`openspec/changes/archive/editor-p2-diff-ai-collaboration`
  - Rulebook task 已归档到：`rulebook/tasks/archive/2026-02-11-issue-409-editor-p2-diff-ai-collaboration`
  - `openspec/changes/EXECUTION_ORDER.md` 已同步为 7 个活跃 change，更新时间 `2026-02-11 23:59`

### 2026-02-12 00:07 +0800 门禁回归（最终）

- Command:
  - `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm cross-module:check && pnpm test:unit`
- Exit code: `0`
- Key output:
  - `cross-module`：`[CROSS_MODULE_GATE] PASS`
  - `test:unit`：全链路通过（含 Storybook inventory `58/58`）

### 2026-02-12 00:08 +0800 目标 Vitest 回归（最终）

- Command:
  - `pnpm -C apps/desktop test:run renderer/src/features/ai/AiPanel.selection-reference.test.tsx renderer/src/components/layout/AppShell.ai-inline-diff.test.tsx renderer/src/features/diff/DiffViewPanel.test.tsx`
- Exit code: `0`
- Key output:
  - `Test Files 3 passed`
  - `Tests 11 passed`

### 2026-02-12 00:13 +0800 PR Preflight（通过）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `0`
- Key output:
  - Issue OPEN 校验：`#409 OPEN`
  - Rulebook 路径校验：当前任务位于 archive 路径（按同 PR 自归档规则）
  - Prettier / typecheck / lint / contract / cross-module / test:unit 全部通过

### 2026-02-12 00:16 +0800 CI 阻断（windows-e2e 失败）

- Command:
  - `scripts/agent_pr_automerge_and_sync.sh --pr 411 --no-create`
  - `gh run view 21912933775 --job 63271885431 --log`
- Exit code: `1`（auto-merge 阶段被 CI 阻断）
- Key output:
  - 失败检查：`CI/windows-e2e`
  - 失败点：`tests/e2e/ai-apply.spec.ts` 在 `getByTestId("ai-diff")` 上不稳定（找不到或 strict-mode 多匹配）
  - 结论：需要对 AI compare 交互与 E2E 选择器做收敛修复后重跑。

### 2026-02-12 00:32 +0800 CI 修复（AI compare + E2E 对齐）

- Code changes:
  - `AiPanel`：引入 pending selection snapshot ref，发送后清空 reference card 但保留本次 run 的选区上下文用于 proposal 生成。
  - `DiffView`：支持可配置 `testId`，避免主区 diff 与 AI 面板 diff 的 `ai-diff` 冲突。
  - `AppShell`：AI compare 接受链路增加 `lastMountedEditorRef` 回退，避免 compare 时 editor store 短时为 null 导致 Accept All 失效。
  - `ai-apply.e2e`：改用主区 DiffViewPanel 选择器 + `Accept All/Reject All` 交互路径，加入 selection reference card 可见性前置校验。
- Verification:
  - `pnpm -C apps/desktop test:run renderer/src/components/layout/AppShell.ai-inline-diff.test.tsx renderer/src/features/ai/AiPanel.selection-reference.test.tsx renderer/src/features/diff/DiffViewPanel.test.tsx renderer/src/features/diff/DiffView.test.tsx` → `25 passed`
  - `pnpm -C apps/desktop rebuild:native && pnpm -C apps/desktop build && pnpm -C apps/desktop exec playwright test -c tests/e2e/playwright.config.ts tests/e2e/ai-apply.spec.ts` → `2 passed`
  - `pnpm typecheck && pnpm lint && pnpm contract:check && pnpm cross-module:check` → pass
  - `pnpm -C apps/desktop rebuild better-sqlite3 && pnpm test:unit` → pass
