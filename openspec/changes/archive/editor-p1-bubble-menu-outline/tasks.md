## 1. Specification

- [x] 1.1 审阅主 spec `editor/spec.md` 中「选中文本浮动工具栏（Bubble Menu）」的全部 Scenario（5 个）
- [x] 1.2 审阅主 spec `editor/spec.md` 中「大纲视图（Outline View）」的全部 Scenario（4 个）
- [x] 1.3 审阅 Bubble Menu 的可见性规则、定位逻辑、与固定工具栏共存规则
- [x] 1.4 审阅 Outline 的交互矩阵（展开/折叠、搜索、拖拽、多选、键盘导航、行内重命名）
- [x] 1.5 依赖同步检查（Dependency Sync Check）：上游 `editor-p0`；核对 TipTap editor 实例暴露方式、toolbar active 状态 hook

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S「Selection triggers Bubble Menu appearance」→ `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
- [x] 2.2 S「Applying format via Bubble Menu preserves selection」→ `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
- [x] 2.3 S「Bubble Menu hides when selection is collapsed」→ `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
- [x] 2.4 S「Bubble Menu suppressed inside Code Block」→ `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
- [x] 2.5 S「Bubble Menu repositions to avoid window boundary」→ `apps/desktop/renderer/src/features/editor/EditorPane.test.tsx`
- [x] 2.6 S「Outline generated from document headings」→ `apps/desktop/renderer/src/features/outline/deriveOutline.test.ts`
- [x] 2.7 S「Outline navigation scrolls editor to heading」→ `apps/desktop/renderer/src/features/outline/OutlinePanelContainer.test.tsx`
- [x] 2.8 S「Empty document shows empty state」→ `apps/desktop/renderer/src/features/outline/OutlinePanel.test.tsx`
- [x] 2.9 S「Outline search filters items」→ `apps/desktop/renderer/src/features/outline/OutlinePanel.test.tsx`

## 3. Red（先写失败测试）

- [x] 3.1 编写 Bubble Menu 全部 Scenario 的失败测试
- [x] 3.2 编写 Outline 全部 Scenario 的测试并完成场景对照
- [x] 3.3 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 最小实现 Bubble Menu 组件（可见性、定位、操作集、active 同步）
- [x] 4.2 最小实现 `deriveOutline()` 与 `OutlinePanel`（提取、显示、导航、高亮）
- [x] 4.3 最小实现 Outline 交互（展开/折叠、搜索、拖拽、多选、键盘、行内重命名）

## 5. Refactor（保持绿灯）

- [x] 5.1 抽象 Bubble Menu 按钮为共享 `InlineFormatButton` 组件（与工具栏复用）
- [x] 5.2 优化 `deriveOutline` 性能（可取消任务，仅保留最新计算）
- [x] 5.3 全量回归保持绿灯

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
