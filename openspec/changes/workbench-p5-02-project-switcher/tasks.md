## 1. Specification

- [ ] 1.1 审阅 `workbench/spec.md:220-263` 中项目切换器全部 Requirement 和 Scenario
- [ ] 1.2 审阅现有 `ProjectSwitcher.tsx:16-85` 实现差距（原生 `<select>` vs 可搜索下拉面板）
- [ ] 1.3 审阅 `Sidebar.tsx:132-145` 确认 ProjectSwitcher 集成点
- [ ] 1.4 审阅 IPC 契约 `project:project:switch`（`ipc-generated.ts:2430`）和 `project:project:list`（`ipc-generated.ts:2386`）的 request/response schema
- [ ] 1.5 依赖同步检查（Dependency Sync Check）：核对 Change 00 delta spec 确认的 IPC 通道名（`project:project:switch`、`project:project:list`）；结论待记录

## 2. TDD Mapping（先测前提）

- [ ] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.1 S-集成「项目切换器集成到 Sidebar 顶部」→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [ ] 2.2 S-下拉面板「项目切换器下拉面板样式」→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [ ] 2.3 S-搜索过滤「项目切换器搜索过滤」（主 Spec :251-256）→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [ ] 2.4 S-空状态「无项目时的空状态」（主 Spec :258-262）→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [ ] 2.5 S-切换「用户通过项目切换器切换项目」（主 Spec :241-249）→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [ ] 2.6 S-超时「项目切换超时进度条」→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`

## 3. Red（先写失败测试）

- [ ] 3.1 编写 ProjectSwitcher 集成到 Sidebar 的失败测试（断言 Sidebar 渲染 ProjectSwitcher）
- [ ] 3.2 编写下拉面板展开/搜索过滤/空状态的失败测试
- [ ] 3.3 编写项目切换 IPC 调用与超时进度条的失败测试
- [ ] 3.4 记录 Red 失败输出至 RUN_LOG

## 4. Green（最小实现通过）

- [ ] 4.1 重写 `ProjectSwitcher.tsx`：可搜索下拉面板替换原生 `<select>`
- [ ] 4.2 实现搜索过滤（debounce 150ms）、列表按最近打开时间降序
- [ ] 4.3 实现空状态（「暂无项目」+「创建新项目」按钮）
- [ ] 4.4 实现超时进度条（切换 >1s 显示 2px 进度条）
- [ ] 4.5 在 `Sidebar.tsx` 顶部集成 ProjectSwitcher
- [ ] 4.6 对接 IPC 通道 `project:project:switch`、`project:project:list`

## 5. Refactor（保持绿灯）

- [ ] 5.1 提取下拉面板为可复用的 `SearchableDropdown` 组件（如有价值）
- [ ] 5.2 新建 Storybook Story：展开态、搜索态、空态
- [ ] 5.3 全量回归保持绿灯

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
