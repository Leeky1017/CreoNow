## 1. Specification

- [x] 1.1 审阅 Change 00 delta spec 确认的 IconBar 最终顺序：files → search → outline → versionHistory → memory → characters → knowledgeGraph
- [x] 1.2 审阅 `openspec/specs/workbench/spec.md:87-92` 中图标规格要求（24px、40×40px、居中、`aria-label`、`--color-accent` 指示条）
- [x] 1.3 审阅 `openspec/specs/workbench/spec.md:36-46` 中三栏布局约束与 Storybook 四态覆盖要求
- [x] 1.4 审阅 `openspec/specs/workbench/spec.md:111,139` 中偏好持久化 key（`creonow.layout.sidebarCollapsed`、`creonow.layout.sidebarWidth`）
- [x] 1.5 依赖同步检查（Dependency Sync Check）：核对 Change 00 delta spec 产出（IconBar 列表、`graph` → `knowledgeGraph` 重命名）；结论已记录（无漂移）

依赖同步检查结论：

- 数据结构：`LeftPanelType` 与 IconBar ID 保持 `knowledgeGraph` 一致，无 `graph` 残留。
- IPC 契约：本 change 不新增/修改 IPC 通道，沿用 Change 00 基线。
- 错误码：本 change 不引入新增错误码路径，N/A。
- 阈值：本 change 不涉及阈值配置，N/A。
- 处理动作：无需更新 proposal/spec/tasks 的依赖假设，可进入 Red。

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S-IconBar 激活指示条「IconBar 激活指示条正确渲染」→ `apps/desktop/renderer/src/components/layout/IconBar.test.tsx`
- [x] 2.2 S-IconBar 顺序「IconBar 顺序与 delta spec 一致」→ `apps/desktop/renderer/src/components/layout/IconBar.test.tsx`
- [x] 2.3 S-IconBar 图标规格「IconBar 图标规格符合 Spec」→ `apps/desktop/renderer/src/components/layout/IconBar.test.tsx`
- [x] 2.4 S-折叠动画「侧栏折叠/展开动画过渡」→ `apps/desktop/renderer/src/components/layout/AppShell.test.tsx`
- [x] 2.5 S-偏好持久化 验证 `sidebarCollapsed`/`sidebarWidth` 持久化 → `apps/desktop/renderer/src/stores/layoutStore.test.ts`

## 3. Red（先写失败测试）

- [x] 3.1 编写 IconBar 激活指示条样式断言的失败测试（断言 `border-left` 而非 `border` 矩形）
- [x] 3.2 编写 IconBar 顺序断言的失败测试（断言 7 项顺序）
- [x] 3.3 编写 IconBar 图标尺寸与 `aria-label` 的失败测试
- [x] 3.4 编写侧栏折叠动画过渡 CSS 属性的失败测试
- [x] 3.5 记录 Red 失败输出至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 调整 `IconBar.tsx` 的 `MAIN_ICONS` 数组为最终顺序
- [x] 4.2 替换 `iconButtonActive` 样式为左侧 2px `--color-accent` 指示条
- [x] 4.3 确认图标尺寸 24px、按钮 40×40px、flexbox 居中、`aria-label`
- [x] 4.4 确认/添加侧栏折叠动画 `transition` 属性使用 `var(--duration-slow)`
- [x] 4.5 验证偏好持久化逻辑正确

## 5. Refactor（保持绿灯）

- [x] 5.1 提取 IconBar 激活/非激活样式为语义化 CSS class 或 Tailwind 工具类
- [x] 5.2 补齐 Storybook Story：AppShell 四种折叠态、IconBar 默认/激活/悬停态
- [x] 5.3 全量回归保持绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
