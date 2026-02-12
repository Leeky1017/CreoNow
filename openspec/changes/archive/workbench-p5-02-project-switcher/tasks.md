## 1. Specification

- [x] 1.1 审阅 `workbench/spec.md:220-263` 中项目切换器全部 Requirement 和 Scenario
- [x] 1.2 审阅基线实现 `ProjectSwitcher.tsx:16-85`（origin/main）差距（原生 `<select>` vs 可搜索下拉面板）
- [x] 1.3 审阅 `Sidebar.tsx` 结构，确认 ProjectSwitcher 集成到 Sidebar 顶部
- [x] 1.4 审阅 IPC 契约 `project:project:switch`（`packages/shared/types/ipc-generated.ts:2430`）和 `project:project:list`（`packages/shared/types/ipc-generated.ts:2386`）schema
- [x] 1.5 依赖同步检查（Dependency Sync Check）：核对 Change 00 delta spec 与实际契约，结论为“无漂移，可进入 Red/Green”

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S-集成「项目切换器集成到 Sidebar 顶部」→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [x] 2.2 S-下拉面板「项目切换器下拉面板样式」→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [x] 2.3 S-搜索过滤「项目切换器搜索过滤」（主 Spec :251-256）→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [x] 2.4 S-空状态「无项目时的空状态」（主 Spec :258-262）→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [x] 2.5 S-切换「用户通过项目切换器切换项目」（主 Spec :241-249）→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`
- [x] 2.6 S-超时「项目切换超时进度条」→ `apps/desktop/renderer/src/features/projects/ProjectSwitcher.test.tsx`

## 3. Red（先写失败测试）

- [x] 3.1 编写 ProjectSwitcher 集成到 Sidebar 的失败测试（断言 Sidebar 渲染 ProjectSwitcher）
- [x] 3.2 编写下拉面板展开/搜索过滤/空状态的失败测试
- [x] 3.3 编写项目切换 IPC 调用与超时进度条的失败测试
- [x] 3.4 记录 Red 失败输出至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 重写 `ProjectSwitcher.tsx`：可搜索下拉面板替换原生 `<select>`
- [x] 4.2 实现搜索过滤（debounce 150ms）、列表按最近打开时间降序
- [x] 4.3 实现空状态（「暂无项目」+「创建新项目」按钮）
- [x] 4.4 实现超时进度条（切换 >1s 显示 2px 进度条）
- [x] 4.5 在 `Sidebar.tsx` 顶部集成 ProjectSwitcher
- [x] 4.6 对接 IPC 通道 `project:project:switch`、`project:project:list`

## 5. Refactor（保持绿灯）

- [x] 5.1 评估提取 `SearchableDropdown`：当前仅单点使用，暂不提取（避免过度抽象）
- [x] 5.2 新建 Storybook Story：展开态、搜索态、空态
- [x] 5.3 全量回归保持绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
