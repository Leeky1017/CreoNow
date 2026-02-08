## 1. Specification

- [x] 1.1 确认本 change 仅覆盖“文件树与章节组织” requirement，不扩展到引用/导出。
- [x] 1.2 确认前置依赖 `document-management-p0-crud-types-status` 已归档并作为输入基线。
- [x] 1.3 确认主 spec 不改动，仅通过 delta spec 承载 P1 约束。
- [x] 1.4 确认验收范围覆盖：拖拽排序、文件夹层级、右键菜单、键盘导航、空态、Storybook 覆盖。

## 2. TDD Mapping（先测前提）

- [x] 2.1 为 delta spec 每个 Scenario 建立至少一个测试用例映射。
- [x] 2.2 为测试映射补齐 Scenario ID 与目标测试文件，保证可追踪。
- [x] 2.3 建立门禁：未出现 Red（失败测试）不得进入实现。

### Scenario -> Test 映射

- [x] DM-P1-FT-S1 `用户拖拽调整章节顺序 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.drag-drop.test.tsx`
  - 用例：`should reorder sibling documents and persist via file:document:reorder`
- [x] DM-P1-FT-S2 `用户将文档拖入文件夹并维护层级 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.drag-drop.test.tsx`
  - 用例：`should move document into target folder and persist parentId`
- [x] DM-P1-FT-S3 `用户通过右键菜单执行文件树操作 [ADDED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.context-menu.test.tsx`
  - 用例：`should show rename/delete/copy/move/status actions and invoke corresponding operations`
- [x] DM-P1-FT-S4 `用户使用键盘导航文件树 [ADDED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.keyboard-nav.test.tsx`
  - 用例：`should support Arrow/Enter/F2/Delete keyboard interactions for tree navigation`
- [x] DM-P1-FT-S5 `文件树空状态 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.empty-state.test.tsx`
  - 用例：`should render empty state message and new file entry action when no documents exist`
- [x] DM-P1-FT-S6 `文件树 Storybook 覆盖 [ADDED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.storybook-coverage.test.ts`
  - 用例：`should include nested/empty/dragging/context-menu/keyboard stories`

## 3. Red（先写失败测试）

- [x] 3.1 先为 DM-P1-FT-S1/S2 编写失败测试（拖拽排序、层级移动）。
- [x] 3.2 再为 DM-P1-FT-S3/S4 编写失败测试（右键菜单、键盘导航）。
- [x] 3.3 最后为 DM-P1-FT-S5/S6 编写失败测试（空态、Storybook 覆盖）。
- [x] 3.4 将首次失败输出记录到 `openspec/_ops/task_runs/ISSUE-278.md`。

## 4. Green（最小实现通过）

- [x] 4.1 实现最小拖拽排序与层级持久化链路（`reorder` / `moveToFolder`）。
- [x] 4.2 实现最小右键菜单与键盘导航交互。
- [x] 4.3 实现空态文案/首个新建入口与 Storybook 覆盖补齐。
- [x] 4.4 Green 证据包含组件测试/单测通过输出。

## 5. Refactor（保持绿灯）

- [x] 5.1 重构文件树层级快照与可见节点拍平逻辑，统一拖拽/键盘行为输入。
- [x] 5.2 统一排序/层级更新入口，避免重复写入路径。
- [x] 5.3 修复展开集合状态更新导致的重复渲染风险，并复跑相关测试保持全绿。

## 6. Evidence

- [x] 6.1 `openspec/_ops/task_runs/ISSUE-278.md` 记录 Scenario 映射、Red/Green 证据、关键命令输出。
- [x] 6.2 `rulebook task validate issue-278-document-management-p1-file-tree-organization` 通过后继续交付。
- [x] 6.3 交付前确认 required checks 契约：`ci` / `openspec-log-guard` / `merge-serial`。
