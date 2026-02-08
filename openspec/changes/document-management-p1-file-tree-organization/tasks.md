## 1. Specification

- [ ] 1.1 确认本 change 仅覆盖 1 个 requirement：文件树与章节组织（不跨到引用/导出）。
- [ ] 1.2 确认前置依赖 `document-management-p0-crud-types-status` 已归档并可作为 P1 输入基线。
- [ ] 1.3 确认主 spec 不改动，仅通过 delta spec 承载新增/细化约束。
- [ ] 1.4 确认验收范围覆盖：拖拽排序、文件夹层级、右键菜单、键盘导航、空态、Storybook 覆盖。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario -> Test 映射

- [ ] DM-P1-FT-S1 `用户拖拽调整章节顺序 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.drag-drop.test.tsx`
  - 用例：`should reorder sibling documents and persist via file:document:reorder`
- [ ] DM-P1-FT-S2 `用户将文档拖入文件夹并维护层级 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.drag-drop.test.tsx`
  - 用例：`should move document into target folder and persist parentId`
- [ ] DM-P1-FT-S3 `用户通过右键菜单执行文件树操作 [ADDED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.context-menu.test.tsx`
  - 用例：`should show rename/delete/copy/move/status actions and invoke corresponding operations`
- [ ] DM-P1-FT-S4 `用户使用键盘导航文件树 [ADDED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.keyboard-nav.test.tsx`
  - 用例：`should support Arrow/Enter/F2/Delete keyboard interactions for tree navigation`
- [ ] DM-P1-FT-S5 `文件树空状态 [MODIFIED]`
  - 目标测试：`apps/desktop/renderer/src/features/files/FileTreePanel.empty-state.test.tsx`
  - 用例：`should render empty state message and new file entry action when no documents exist`
- [ ] DM-P1-FT-S6 `文件树 Storybook 覆盖 [ADDED]`
  - 目标测试：`apps/desktop/tests/storybook/file-tree-panel.storybook.test.ts`
  - 用例：`should include nested/empty/dragging/context-menu/keyboard stories`

## 3. Red（先写失败测试）

- [ ] 3.1 先编写 DM-P1-FT-S1/DM-P1-FT-S2 的失败测试（拖拽排序与层级移动）。
- [ ] 3.2 再编写 DM-P1-FT-S3/DM-P1-FT-S4 的失败测试（右键菜单与键盘导航）。
- [ ] 3.3 最后编写 DM-P1-FT-S5/DM-P1-FT-S6 的失败测试（空态与 Storybook 覆盖）。
- [ ] 3.4 将首次失败输出记录到对应任务 RUN_LOG（`openspec/_ops/task_runs/ISSUE-<N>.md`）。

## 4. Green（最小实现通过）

- [ ] 4.1 仅实现让 DM-P1-FT-S1/DM-P1-FT-S2 通过的最小拖拽与层级持久化逻辑。
- [ ] 4.2 仅实现让 DM-P1-FT-S3/DM-P1-FT-S4 通过的最小菜单与键盘交互逻辑。
- [ ] 4.3 仅实现让 DM-P1-FT-S5/DM-P1-FT-S6 通过的最小空态与 Storybook 资产补齐。
- [ ] 4.4 Green 证据必须包含单测、组件测试、Storybook 校验命令输出。

## 5. Refactor（保持绿灯）

- [ ] 5.1 去重文件树交互逻辑（拖拽、菜单、键盘）并保持外部行为不变。
- [ ] 5.2 统一层级与排序数据更新入口，避免双路径写入。
- [ ] 5.3 Refactor 后复跑全部相关测试并保持全绿。

## 6. Evidence

- [ ] 6.1 RUN_LOG 必须记录 Scenario 映射、Red 失败证据、Green 通过证据与关键命令输出。
- [ ] 6.2 Rulebook task 必须存在且 validate 通过后，才可进入实现阶段。
- [ ] 6.3 交付前需确认 required checks 契约（`ci`/`openspec-log-guard`/`merge-serial`）一致。
