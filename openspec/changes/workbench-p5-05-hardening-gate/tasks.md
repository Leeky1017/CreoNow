## 1. Specification

- [ ] 1.1 审阅 `workbench/spec.md:393-409` 中模块级可验收标准（zod 校验、失败处理策略）
- [ ] 1.2 审阅 `workbench/spec.md:426-448` 中异常与边界覆盖矩阵全部 Scenario
- [ ] 1.3 审阅 `workbench/spec.md:452-490` 中 NFR 全部阈值和并发 Scenario
- [ ] 1.4 审阅 `workbench/spec.md:331-357` 中主题切换 + 跟随系统 Scenario
- [ ] 1.5 审阅 `workbench/spec.md:133-138` 中 Resizer 悬停规格
- [ ] 1.6 审阅 `workbench/spec.md:189,213` 中右侧面板折叠按钮要求
- [ ] 1.7 依赖同步检查（Dependency Sync Check）：核对 Change 01–04 全部 delta spec 和实现产出（数据结构、store API、组件 prop、错误码）；结论待 Change 01–04 合并后记录

## 2. TDD Mapping（先测前提）

- [ ] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [ ] 2.1 S-zod-layout「layoutStore zod 校验与回退」→ `apps/desktop/renderer/src/stores/layoutStore.test.ts`
- [ ] 2.2 S-zod-theme「themeStore zod 校验与写回」→ `apps/desktop/renderer/src/stores/themeStore.test.ts`
- [ ] 2.3 S-system-theme「主题跟随系统自动切换」→ `apps/desktop/renderer/src/stores/themeStore.test.ts`
- [ ] 2.4 S-debounce「并发快捷键去抖」→ `apps/desktop/renderer/src/components/layout/AppShell.test.tsx`
- [ ] 2.5 S-resizer-hover「Resizer 悬停样式」→ `apps/desktop/renderer/src/components/layout/Resizer.test.tsx`
- [ ] 2.6 S-dual-drag「双拖拽 last-write-wins」→ `apps/desktop/renderer/src/components/layout/Resizer.test.tsx`
- [ ] 2.7 S-panel-collapse-btn「右侧面板折叠按钮」→ `apps/desktop/renderer/src/components/layout/RightPanel.test.tsx`
- [ ] 2.8 S-left-panel-persist「activeLeftPanel 持久化与恢复」→ `apps/desktop/renderer/src/stores/layoutStore.test.ts`
- [ ] 2.9 S-nfr 布局初始化 TTI / 侧栏动画 / 命令面板唤起性能 → `apps/desktop/tests/perf/workbench-nfr.benchmark.test.ts`

## 3. Red（先写失败测试）

- [ ] 3.1 编写 layoutStore zod 校验（非法 sidebarWidth/panelWidth）+ 回退 + 写回 + 提示的失败测试
- [ ] 3.2 编写 themeStore zod 校验（非法 mode）+ 写回修正值的失败测试
- [ ] 3.3 编写主题跟随系统（matchMedia 监听 + 自动切换）的失败测试
- [ ] 3.4 编写布局快捷键 300ms debounce 的失败测试
- [ ] 3.5 编写 Resizer 悬停样式（2px 高亮 + col-resize）的失败测试
- [ ] 3.6 编写双拖拽 last-write-wins 的失败测试
- [ ] 3.7 编写右侧面板折叠按钮的失败测试
- [ ] 3.8 编写 activeLeftPanel 持久化的失败测试
- [ ] 3.9 编写 NFR 阈值测量的失败测试（p95 断言）
- [ ] 3.10 记录 Red 失败输出至 RUN_LOG

## 4. Green（最小实现通过）

- [ ] 4.1 `layoutStore` 添加 zod schema 校验 + 校验失败回退默认值 + 写入修正值 + 状态栏提示
- [ ] 4.2 `themeStore` 用 zod schema 替代手写 `normalizeMode` + 非法值写回修正值
- [ ] 4.3 `themeStore` 添加 `matchMedia` 监听，system 模式自动跟随 OS
- [ ] 4.4 `AppShell` 布局快捷键添加 300ms debounce
- [ ] 4.5 `Resizer` 添加悬停样式（2px 高亮 + col-resize）
- [ ] 4.6 `Resizer` 添加全局 dragging flag 实现 last-write-wins
- [ ] 4.7 `RightPanel` 添加折叠按钮
- [ ] 4.8 `layoutStore` 补齐 `activeLeftPanel` 持久化
- [ ] 4.9 NFR 性能测试通过阈值断言

## 5. Refactor（保持绿灯）

- [ ] 5.1 提取 zod schema 定义到 `layoutStore.schemas.ts`（如有价值）
- [ ] 5.2 提取 debounce 工具为通用 hook `useDebouncedCallback`
- [ ] 5.3 补齐 Storybook Story：Resizer 悬停态/拖拽中、RightPanel 折叠按钮态
- [ ] 5.4 全量 Storybook 覆盖度审计，补齐缺失状态组合
- [ ] 5.5 全量回归保持绿灯

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据、NFR 性能测量结果与关键命令输出）
- [ ] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
- [ ] 6.3 所有 P5 change（00–05）的 RUN_LOG 完整性终审、PR 链接回填
