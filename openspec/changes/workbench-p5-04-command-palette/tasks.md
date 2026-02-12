## 1. Specification

- [ ] 1.1 审阅 `workbench/spec.md:266-295` 中命令面板全部 Requirement 和 Scenario
- [ ] 1.2 审阅 `workbench/spec.md:478-483` 中超大结果集分页 Scenario
- [ ] 1.3 审阅 `workbench/spec.md:417-422` 中命令面板性能 Scenario（120ms 唤起、200ms 首批结果）
- [ ] 1.4 审阅 `CommandPalette.tsx:376-529` 中 `defaultCommands` 结构和 `commands` prop 接口
- [ ] 1.5 审阅 `AppShell.tsx:744-750` 中 CommandPalette 集成点（未传入 `commands` prop）
- [ ] 1.6 依赖同步检查（Dependency Sync Check）：核对 Change 00 delta spec 中 IPC 通道名；核对 `fileStore` 数据结构；结论待记录

## 2. TDD Mapping（先测前提）

- [ ] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.1 S-分类搜索「命令面板分类搜索结果」→ `apps/desktop/renderer/src/features/commandPalette/CommandPalette.test.tsx`
- [ ] 2.2 S-文件搜索「命令面板文件搜索」→ `apps/desktop/renderer/src/features/commandPalette/CommandPalette.test.tsx`
- [ ] 2.3 S-文件打开「命令面板选中文件打开文档」→ `apps/desktop/renderer/src/features/commandPalette/CommandPalette.test.tsx`
- [ ] 2.4 S-无结果「命令面板无搜索结果」→ `apps/desktop/renderer/src/features/commandPalette/CommandPalette.test.tsx`
- [ ] 2.5 S-分页「命令面板首屏分页」→ `apps/desktop/renderer/src/features/commandPalette/CommandPalette.test.tsx`
- [ ] 2.6 S-最近使用 最近使用记录存取与 FIFO 淘汰 → `apps/desktop/renderer/src/features/commandPalette/recentItems.test.ts`

## 3. Red（先写失败测试）

- [ ] 3.1 编写分类搜索结果展示的失败测试（断言 "最近使用"/"文件"/"命令" 分组）
- [ ] 3.2 编写文件搜索匹配与选中打开文档的失败测试
- [ ] 3.3 编写无结果文案展示的失败测试
- [ ] 3.4 编写首屏 100 项分页与滚动加载的失败测试
- [ ] 3.5 编写最近使用记录 FIFO 淘汰的失败测试
- [ ] 3.6 记录 Red 失败输出至 RUN_LOG

## 4. Green（最小实现通过）

- [ ] 4.1 实现最近使用记录存取逻辑（localStorage，上限 20 项，FIFO）
- [ ] 4.2 实现文件搜索逻辑（从 `fileStore.items` 做 includes 匹配）
- [ ] 4.3 修改 `AppShell.tsx` 集成点：动态构建 `commands` prop，注入最近使用 + 文件 + 命令三类
- [ ] 4.4 实现文件项选中后调用 `editorStore.openDocument` 并关闭面板
- [ ] 4.5 实现无结果文案「未找到匹配结果」
- [ ] 4.6 实现首屏 100 项 + 滚动加载分页

## 5. Refactor（保持绿灯）

- [ ] 5.1 提取最近使用记录逻辑为独立 hook 或 util（`useRecentItems`）
- [ ] 5.2 补齐 Storybook Story：默认态、分类搜索结果态、无结果态
- [ ] 5.3 全量回归保持绿灯

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
