## 1. Specification

- [x] 1.1 确认本 change 仅覆盖 3 个 requirement：CRUD IPC、类型体系、状态管理
- [x] 1.2 确认主 spec 不改动，仅通过 delta spec 表达变更范围
- [x] 1.3 确认本 change 的 out-of-scope（文件树高级能力、导出、引用、并发边界）已明确

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → Test 映射

- [x] DM-P0-S1 `CRUD IPC 通道在主进程与渲染进程保持同一份类型合同 [MODIFIED]`
  - 目标测试：`apps/desktop/tests/unit/document-ipc-contract.test.ts`
  - 用例：`S1: CRUD IPC channels match P0 baseline naming and remove legacy aliases`
- [x] DM-P0-S2 `删除文档时执行确认并保证项目至少保留一个文档 [MODIFIED]`
  - 目标测试：`apps/desktop/tests/unit/documentService.lifecycle.test.ts`
  - 用例：`S2: deleting the last document should auto-create a new blank chapter document`
- [x] DM-P0-S3 `用户创建章节类型文档 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.types-status.test.tsx`
  - 用例：`should create chapter document from default create button`
- [x] DM-P0-S4 `用户创建笔记类型文档 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.types-status.test.tsx`
  - 用例：`should render note type icon in file row`
- [x] DM-P0-S5 `用户将文档标记为定稿 [MODIFIED]`
  - 目标测试：`apps/desktop/tests/unit/documentService.lifecycle.test.ts`
  - 用例：`S5: status update API must exist and support draft/final transitions`
- [x] DM-P0-S6 `编辑定稿文档时的确认与取消路径 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/editor/final-document-edit-guard.test.ts`
  - 用例：`should switch final document back to draft when user confirms` / `should keep final status when user cancels`

## 3. Red（先写失败测试）

- [x] 3.1 先为 DM-P0-S1/DM-P0-S2 编写失败测试（IPC 契约与删除兜底）
- [x] 3.2 再为 DM-P0-S3/DM-P0-S4 编写失败测试（类型入口与图标渲染）
- [x] 3.3 最后为 DM-P0-S5/DM-P0-S6 编写失败测试（状态切换与确认弹窗）
- [x] 3.4 Red 证据（失败阶段）已记录至 `openspec/_ops/task_runs/ISSUE-271.md`（含 `pnpm test:unit` 初次失败日志）

## 4. Green（最小实现通过）

- [x] 4.1 仅实现让 CRUD IPC 契约测试通过的最小代码
- [x] 4.2 仅实现让类型创建与图标测试通过的最小代码
- [x] 4.3 仅实现让状态切换与编辑确认测试通过的最小代码
- [x] 4.4 Green 证据（通过阶段）已记录：`pnpm test:unit`、`pnpm -C apps/desktop test:run`、`pnpm test:integration`

## 5. Refactor（保持绿灯）

- [x] 5.1 去除重复逻辑，统一文档元信息与状态变更入口
- [x] 5.2 在不改变外部行为前提下重构，保持所有场景测试绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Scenario 映射、Red 失败证据、Green 通过证据）
- [x] 6.2 记录关键命令输出（测试、校验、门禁）并附到任务证据中
- [x] 6.3 规则校验：`rulebook task validate issue-271-document-management-p0-crud-types-status` 通过
