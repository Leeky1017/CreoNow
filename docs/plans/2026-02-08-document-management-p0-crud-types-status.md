# Document Management P0 CRUD Types Status Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 `document-management-p0-crud-types-status` 的 TDD 实现，并通过门禁合并回控制面 `main`。

**Architecture:** 以 SQLite `documents` 表扩展（type/status/sort/parent）为数据基座，收敛 `file:document:*` 通道命名到主 spec 约定；Renderer 端通过 store + FileTree + Editor 最小改造落实类型展示与定稿编辑确认。

**Tech Stack:** Electron IPC, TypeScript, Zustand, TipTap, SQLite, Vitest/tsx。

---

### Task 1: Red - 后端文档服务与 IPC 契约失败测试

**Files:**
- Create: `apps/desktop/tests/unit/document-ipc-contract.test.ts`
- Create: `apps/desktop/tests/unit/documentService.lifecycle.test.ts`

**Step 1: Write the failing test**
- 为通道集合断言写失败用例：必须包含 `create/read/update/save/delete/list/getCurrent/reorder/updateStatus`，且不接受旧命名。
- 为删除最后一个文档写失败用例：删除后系统必须自动补创建 `chapter` 文档。
- 为状态切换写失败用例：`updateStatus(final)` 后必须可读出 `final`。

**Step 2: Run test to verify it fails**
- Run: `tsx apps/desktop/tests/unit/document-ipc-contract.test.ts`
- Run: `tsx apps/desktop/tests/unit/documentService.lifecycle.test.ts`
- Expected: FAIL（缺少新通道/行为不满足）。

**Step 3: Write minimal implementation**
- 不做；本任务仅 Red。

**Step 4: Run test to verify it passes**
- 不做；留到 Green。

**Step 5: Commit**
- 不做；留到 Green 后统一提交。

### Task 2: Red - 前端类型与定稿交互失败测试

**Files:**
- Modify: `apps/desktop/renderer/src/features/files/FileTreePanel.test.tsx`
- Create: `apps/desktop/renderer/src/features/editor/final-document-edit-guard.test.tsx`

**Step 1: Write the failing test**
- 新增章节创建后进入 rename 模式的失败测试。
- 新增 note 类型显示图标的失败测试。
- 新增 final 文档编辑确认（确认回 draft / 取消保持 final）失败测试。

**Step 2: Run test to verify it fails**
- Run: `pnpm -C apps/desktop vitest run apps/desktop/renderer/src/features/files/FileTreePanel.test.tsx`
- Run: `pnpm -C apps/desktop vitest run apps/desktop/renderer/src/features/editor/final-document-edit-guard.test.tsx`
- Expected: FAIL（缺少实现）。

**Step 3: Write minimal implementation**
- 不做；本任务仅 Red。

**Step 4: Run test to verify it passes**
- 不做；留到 Green。

**Step 5: Commit**
- 不做；留到 Green 后统一提交。

### Task 3: Green - 合同、服务、UI 最小实现

**Files:**
- Modify: `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Modify: `packages/shared/types/ipc-generated.ts`（由 `pnpm contract:generate` 生成）
- Modify: `apps/desktop/main/src/ipc/file.ts`
- Modify: `apps/desktop/main/src/services/documents/documentService.ts`
- Create: `apps/desktop/main/src/db/migrations/0011_document_type_status.sql`
- Modify: `apps/desktop/main/src/db/init.ts`
- Modify: `apps/desktop/renderer/src/stores/fileStore.ts`
- Modify: `apps/desktop/renderer/src/stores/editorStore.tsx`
- Modify: `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`
- Modify: `apps/desktop/renderer/src/stores/aiStore.ts`
- Modify: 旧通道引用的 e2e/story/test 文件

**Step 1: Write the failing test**
- 已在 Task 1/2 完成。

**Step 2: Run test to verify it fails**
- 已在 Task 1/2 完成。

**Step 3: Write minimal implementation**
- 迁移通道命名与 schema。
- 增加 documents 元信息字段和服务方法。
- 文件树渲染类型图标/状态点。
- 编辑器增加 final 编辑确认分支。

**Step 4: Run test to verify it passes**
- Run: 新增单测 + 改动相关现有测试。
- Expected: PASS。

**Step 5: Commit**
- `git commit -m "feat: implement document-management p0 crud/types/status (#271)"`

### Task 4: Refactor + Evidence + Delivery

**Files:**
- Modify: `openspec/changes/document-management-p0-crud-types-status/tasks.md`
- Modify: `openspec/_ops/task_runs/ISSUE-271.md`
- Move: `openspec/changes/document-management-p0-crud-types-status` -> `openspec/changes/archive/`
- Modify: `rulebook/tasks/issue-271-document-management-p0-crud-types-status/*`

**Step 1: Write the failing test**
- 不新增行为，仅回归验证。

**Step 2: Run test to verify it fails**
- 不适用。

**Step 3: Write minimal implementation**
- 勾选 tasks，补全证据，归档 change，更新 Rulebook 状态。

**Step 4: Run test to verify it passes**
- Run: `pnpm test:unit`
- Run: `pnpm test:integration`
- Run: `pnpm typecheck`
- Run: `scripts/agent_pr_preflight.sh`
- Expected: PASS。

**Step 5: Commit**
- `git commit -m "chore: archive document-management p0 change and evidence (#271)"`
