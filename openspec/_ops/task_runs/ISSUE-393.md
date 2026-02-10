# ISSUE-393

- Issue: #393
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/393
- Branch: task/393-editor-p0-tiptap-foundation-toolbar
- PR: (待回填)
- Scope: 完整交付 `openspec/changes/editor-p0-tiptap-foundation-toolbar`，覆盖 TipTap 基础、工具栏、快捷键、IPC bootstrap、autosave、粘贴清洗与治理收口
- Out of Scope: Bubble Menu/Outline（P1）、AI diff/引用（P2）、Zen Mode（P3）、A11y hardening（P4）

## Plan

- [x] 准入：创建 OPEN issue + task worktree + Rulebook task
- [x] Specification：完成 Dependency Sync Check 并落盘
- [x] Red：先写失败测试并记录失败输出
- [x] Green：最小实现通过目标 Scenario
- [x] Refactor：保持绿灯并整理实现
- [ ] 门禁：typecheck/lint/contract/cross-module/test:unit/preflight
- [ ] 交付：PR + auto-merge + main 收口 + change/rulebook 归档 + worktree 清理

## Runs

### 2026-02-10 17:03 +0800 准入（Issue / Worktree / Rulebook）

- Command:
  - `gh issue create --title "Editor P0: TipTap foundation toolbar delivery" ...`
  - `gh issue edit 393 --body-file /tmp/issue-393-body.md`
  - `git worktree add -b task/393-editor-p0-tiptap-foundation-toolbar .worktrees/issue-393-editor-p0-tiptap-foundation-toolbar origin/main`
  - `rulebook task create issue-393-editor-p0-tiptap-foundation-toolbar`
  - `rulebook task validate issue-393-editor-p0-tiptap-foundation-toolbar`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/393`
  - worktree 创建成功：`.worktrees/issue-393-editor-p0-tiptap-foundation-toolbar`
  - Rulebook task validate 通过（仅提示无 spec 文件 warning）

### 2026-02-10 17:04 +0800 依赖安装（worktree）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - workspace 依赖安装完成（lockfile 无变更）

### 2026-02-10 17:06 +0800 Dependency Sync Check（Editor P0）

- Input:
  - `openspec/changes/archive/ipc-p0-contract-ssot-and-codegen/specs/ipc/spec.md`
  - `openspec/changes/archive/document-management-p1-file-tree-organization/specs/document-management/spec.md`
  - `apps/desktop/main/src/ipc/file.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Checkpoints:
  - 数据结构：`file:document:list/read` 返回字段与 editorStore 读取字段一致（`documentId/status/contentJson/...`）。
  - IPC 契约：`file:document:getcurrent/list/create/read/save/setcurrent` 均在契约注册表中定义且主进程已注册 handler。
  - 错误码：`NOT_FOUND`（空项目分支）、`INVALID_ARGUMENT`/`DB_ERROR`（参数/存储失败）与 editorStore 分支匹配。
  - 阈值：autosave 500ms 去抖仅在渲染层执行，不与 IPC 层超时/重试语义冲突。
- Conclusion: `NO_DRIFT`

### 2026-02-10 17:10 +0800 Red（Scenario 测试失败证据）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorToolbar.test.tsx renderer/src/features/editor/EditorPane.test.tsx renderer/src/features/editor/useAutosave.test.tsx renderer/src/stores/editorStore.test.ts`
- Exit code: `1`
- Key output:
  - `TypeError: sanitizePastedHtml is not a function`（paste 清洗实现缺失）
  - `Expected title "Bold (⌘B)" but received "Bold (⌘+B)"`（快捷键展示不符合 spec）
  - `Unable to find [data-testid="toolbar-underline"]`（Underline 控件与扩展缺失）
  - `useAutosave` 新测试超时（测试前置尚未稳定）

### 2026-02-10 17:11 +0800 Green（最小实现）

- Command:
  - `edit apps/desktop/renderer/src/config/shortcuts.ts`
  - `edit apps/desktop/renderer/src/features/editor/EditorToolbar.tsx`
  - `edit apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `edit apps/desktop/renderer/src/features/editor/useAutosave.test.tsx`
  - `pnpm -C apps/desktop add @tiptap/extension-underline@^2.27.2`
- Exit code: `0`
- Key output:
  - 新增 Underline 依赖并在 `EditorPane` 扩展链路启用
  - `EditorToolbar` 新增 Underline 控件，支持 `aria`/tooltip/active
  - 新增 `sanitizePastedHtml()` 并通过 `transformPastedHTML` 接入编辑器
  - 快捷键展示改为 macOS 样式（`⌘B`）并对齐部分 spec 键位定义

### 2026-02-10 17:13 +0800 Green 验证（目标测试）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorToolbar.test.tsx renderer/src/features/editor/EditorPane.test.tsx renderer/src/features/editor/useAutosave.test.tsx renderer/src/stores/editorStore.test.ts`
- Exit code: `0`
- Key output:
  - `Test Files 4 passed (4)`
  - `Tests 16 passed (16)`

### 2026-02-10 17:14 +0800 Refactor/回归确认（desktop vitest 全量）

- Command:
  - `pnpm -C apps/desktop test:run`
- Exit code: `0`
- Key output:
  - `Test Files 96 passed (96)`
  - `Tests 1251 passed (1251)`

### 2026-02-10 17:18 +0800 change 归档与顺序文档同步

- Command:
  - `mv openspec/changes/editor-p0-tiptap-foundation-toolbar openspec/changes/archive/`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `editor-p0-tiptap-foundation-toolbar` 已迁移到 archive
  - `EXECUTION_ORDER.md` 已同步活跃数量 `15 -> 14`，并更新 editor 泳道为 `p1~p4`

### 2026-02-10 17:23 +0800 Rulebook task 自归档

- Command:
  - `rulebook task archive issue-393-editor-p0-tiptap-foundation-toolbar`
  - `edit rulebook/tasks/archive/2026-02-10-issue-393-editor-p0-tiptap-foundation-toolbar/tasks.md`
- Exit code: `0`
- Key output:
  - Rulebook task 已迁移至 archive 路径
  - 证据项 `6.3`（归档完成）已回填为完成态

### 2026-02-10 17:19 +0800 Rulebook spec 补齐与 validate

- Command:
  - `create rulebook/tasks/issue-393-editor-p0-tiptap-foundation-toolbar/specs/editor/spec.md`
  - `rulebook task validate issue-393-editor-p0-tiptap-foundation-toolbar`
- Exit code:
  - 首次 `1`（Scenario 标题级别 `###` 不合规）
  - 修复后 `0`
- Key output:
  - 规则修复：`Scenario` 标题改为 `####`
  - 最终：`Task issue-393-editor-p0-tiptap-foundation-toolbar is valid`

### 2026-02-10 17:20 +0800 preflight 占位符阻断（预期）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-393.md: (待回填)`

### 2026-02-10 17:21 +0800 prettier 检查与修复

- Command:
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm exec prettier --write apps/desktop/renderer/src/config/shortcuts.ts apps/desktop/renderer/src/features/editor/EditorPane.test.tsx apps/desktop/renderer/src/features/editor/EditorToolbar.test.tsx apps/desktop/renderer/src/features/editor/EditorToolbar.tsx apps/desktop/renderer/src/features/editor/useAutosave.test.tsx apps/desktop/renderer/src/stores/editorStore.test.ts openspec/changes/EXECUTION_ORDER.md pnpm-lock.yaml rulebook/tasks/issue-393-editor-p0-tiptap-foundation-toolbar/.metadata.json`
- Exit code:
  - `check=1`（9 文件格式不一致）
  - `write=0`
- Key output:
  - 已格式化全部不一致文件，消除 preflight 的格式风险

### 2026-02-10 17:22 +0800 typecheck 回归失败与修复

- Command:
  - `pnpm typecheck`
  - `edit apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
  - `edit apps/desktop/renderer/src/features/editor/useAutosave.test.tsx`
  - `pnpm typecheck`
- Exit code:
  - 首次 `1`（测试中 `payload` 联合类型未收窄 + 错误 import 相对路径）
  - 修复后 `0`
- Key output:
  - 通过 `IpcRequest<"file:document:save">` 显式收窄 payload
  - 修正 shared type 导入路径到 `../../../../../../packages/shared/types/ipc-generated`

### 2026-02-10 17:22 +0800 门禁验证（type/lint/contract/cross-module/unit）

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: 全部 `0`
- Key output:
  - `cross-module:check` 输出 `PASS`
  - `test:unit` 全链路通过（含 Storybook inventory）

### 2026-02-10 17:22 +0800 目标回归（editor 相关）

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorToolbar.test.tsx renderer/src/features/editor/EditorPane.test.tsx renderer/src/features/editor/useAutosave.test.tsx renderer/src/stores/editorStore.test.ts`
- Exit code: `0`
- Key output:
  - `Test Files 4 passed (4)`
  - `Tests 16 passed (16)`
